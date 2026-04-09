using System.Security.Claims;
using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intext2.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser>   _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;

    public AuthController(
        UserManager<ApplicationUser>   userManager,
        SignInManager<ApplicationUser> signInManager)
    {
        _userManager   = userManager;
        _signInManager = signInManager;
    }

    // ----------------------------------------------------------------
    // POST /api/auth/sign-in
    // Portal must match an Identity role on the user (Admin, CaseManager, Donor).
    // Query flags mirror MapIdentityApi login: useSessionCookies | useCookies
    // ----------------------------------------------------------------
    [HttpPost("sign-in")]
    [AllowAnonymous]
    public async Task<IActionResult> SignIn(
        [FromBody] SignInRequestDto body,
        [FromQuery] bool useCookies = false,
        [FromQuery] bool useSessionCookies = true)
    {
        var expectedRole = NormalizePortalToRole(body.Portal);
        if (expectedRole is null)
            return BadRequest(new { error = "Invalid portal. Use Admin, CaseManager, or Donor." });

        var email = body.Email.Trim();
        var user  = await _userManager.FindByEmailAsync(email);
        if (user is null || !user.IsActive)
            return Unauthorized(new { error = "Invalid email or password." });

        var check = await _signInManager.CheckPasswordSignInAsync(user, body.Password, lockoutOnFailure: true);
        if (check.IsLockedOut)
            return Unauthorized(new { error = "Account is locked out. Try again later." });
        if (check.RequiresTwoFactor)
            return Unauthorized(new { error = "Additional verification is required." });
        if (!check.Succeeded)
            return Unauthorized(new { error = "Invalid email or password." });

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains(expectedRole))
        {
            var message = expectedRole switch
            {
                AuthRoles.Donor       => "This account is not a donor portal account.",
                AuthRoles.CaseManager => "This account is not a case manager portal account.",
                AuthRoles.Admin       => "This account is not an admin portal account.",
                _                     => "This account is not allowed for the selected portal.",
            };
            return Unauthorized(new { error = message });
        }

        var isPersistent = useCookies && !useSessionCookies;
        await _signInManager.SignInAsync(user, isPersistent, authenticationMethod: string.Empty);

        return Ok(new { message = "Signed in successfully." });
    }

    private static string? NormalizePortalToRole(string? portal)
    {
        if (string.IsNullOrWhiteSpace(portal))
            return null;

        return portal.Trim() switch
        {
            AuthRoles.Admin       => AuthRoles.Admin,
            AuthRoles.CaseManager => AuthRoles.CaseManager,
            AuthRoles.Donor       => AuthRoles.Donor,
            _                     => null,
        };
    }

    // ----------------------------------------------------------------
    // GET /api/auth/me
    // ----------------------------------------------------------------
    [HttpGet("me")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCurrentSession()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Ok(new
            {
                isAuthenticated = false,
                userId          = (string?)null,
                username        = (string?)null,
                email           = (string?)null,
                supporterId     = (int?)null,
                roles           = Array.Empty<string>(),
            });
        }

        var user = await _userManager.GetUserAsync(User);

        var roles = User.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .Distinct()
            .OrderBy(r => r)
            .ToArray();

        return Ok(new
        {
            isAuthenticated = true,
            userId          = user?.Id,
            username        = user?.UserName,
            email           = user?.Email,
            supporterId     = user?.SupporterId,
            roles,
        });
    }

    // ----------------------------------------------------------------
    // POST /api/auth/logout
    // ----------------------------------------------------------------
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok(new { message = "Logged out successfully." });
    }
}
