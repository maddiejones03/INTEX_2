using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intext2.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Roles = AuthRoles.Admin)]
public class StaffUsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public StaffUsersController(UserManager<ApplicationUser> userManager) => _userManager = userManager;

    private static object UserShape(ApplicationUser u) => new
    {
        id = u.Id,
        email     = u.Email,
        userName  = u.UserName,
        firstName = u.FirstName,
        lastName  = u.LastName,
        isActive  = u.IsActive,
    };

    [HttpGet("admins")]
    public async Task<IActionResult> ListAdmins()
    {
        var users = await _userManager.GetUsersInRoleAsync(AuthRoles.Admin);
        var list  = users.OrderBy(u => u.LastName).ThenBy(u => u.FirstName).Select(UserShape).ToList();
        return Ok(list);
    }

    [HttpGet("case-managers")]
    public async Task<IActionResult> ListCaseManagers()
    {
        var users = await _userManager.GetUsersInRoleAsync(AuthRoles.CaseManager);
        var list  = users.OrderBy(u => u.LastName).ThenBy(u => u.FirstName).Select(UserShape).ToList();
        return Ok(list);
    }

    [HttpPost("admins")]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateStaffUserDto dto)
    {
        return await CreateWithRole(dto, AuthRoles.Admin);
    }

    [HttpPost("case-managers")]
    public async Task<IActionResult> CreateCaseManager([FromBody] CreateStaffUserDto dto)
    {
        return await CreateWithRole(dto, AuthRoles.CaseManager);
    }

    private async Task<IActionResult> CreateWithRole(CreateStaffUserDto dto, string role)
    {
        var email = dto.Email.Trim();
        if (await _userManager.FindByEmailAsync(email) is not null)
            return Conflict(new { message = "An account with this email already exists." });

        var user = new ApplicationUser
        {
            UserName  = email,
            Email     = email,
            FirstName = dto.FirstName.Trim(),
            LastName  = dto.LastName.Trim(),
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = "Could not create user.", errors = result.Errors.Select(e => e.Description) });

        var created = await _userManager.FindByEmailAsync(email);
        if (created is null)
            return StatusCode(500, new { message = "User creation failed after save." });

        var roleResult = await _userManager.AddToRoleAsync(created, role);
        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(created);
            return StatusCode(500, new { message = "Role assignment failed.", errors = roleResult.Errors.Select(e => e.Description) });
        }

        return StatusCode(201, UserShape(created));
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateStaffUserDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var isAdmin       = await _userManager.IsInRoleAsync(user, AuthRoles.Admin);
        var isCaseManager = await _userManager.IsInRoleAsync(user, AuthRoles.CaseManager);
        if (!isAdmin && !isCaseManager)
            return BadRequest(new { message = "This account is not an admin or case manager." });

        user.FirstName = dto.FirstName.Trim();
        user.LastName  = dto.LastName.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var newEmail = dto.Email.Trim();
            var existing = await _userManager.FindByEmailAsync(newEmail);
            if (existing is not null && existing.Id != user.Id)
                return Conflict(new { message = "Another account already uses this email." });

            user.Email    = newEmail;
            user.UserName = newEmail;
        }

        user.IsActive = dto.IsActive;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return BadRequest(new { message = "Update failed.", errors = updateResult.Errors.Select(e => e.Description) });

        return Ok(UserShape(user));
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeactivateUser(string id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed) return BadRequest(new { message = "Deletion must be confirmed." });

        var current = await _userManager.GetUserAsync(User);
        if (current is not null && current.Id == id)
            return BadRequest(new { message = "You cannot deactivate your own account." });

        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var isAdmin       = await _userManager.IsInRoleAsync(user, AuthRoles.Admin);
        var isCaseManager = await _userManager.IsInRoleAsync(user, AuthRoles.CaseManager);
        if (!isAdmin && !isCaseManager)
            return BadRequest(new { message = "This account is not an admin or case manager." });

        if (isAdmin)
        {
            var admins = await _userManager.GetUsersInRoleAsync(AuthRoles.Admin);
            var activeOthers = admins.Count(u => u.Id != id && u.IsActive);
            if (activeOthers == 0)
                return BadRequest(new { message = "Cannot deactivate the last active admin." });
        }

        user.IsActive  = false;
        user.UpdatedAt = DateTime.UtcNow;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = "Deactivation failed.", errors = result.Errors.Select(e => e.Description) });

        return Ok(new { message = "User deactivated." });
    }
}
