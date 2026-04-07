using System.Security.Claims;
using Intext2.Data;
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
    // GET /api/auth/me
    // ----------------------------------------------------------------
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentSession()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Ok(new
            {
                isAuthenticated = false,
                username        = (string?)null,
                email           = (string?)null,
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
            username        = user?.UserName,
            email           = user?.Email,
            roles,
        });
    }

    // ----------------------------------------------------------------
    // POST /api/auth/logout
    // ----------------------------------------------------------------
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok(new { message = "Logged out successfully." });
    }
}
