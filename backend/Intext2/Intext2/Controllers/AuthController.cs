using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Intext2.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser>  _users;
    private readonly SignInManager<ApplicationUser> _signIn;
    private readonly IConfiguration                _config;

    public AuthController(
        UserManager<ApplicationUser>  users,
        SignInManager<ApplicationUser> signIn,
        IConfiguration                config)
    {
        _users  = users;
        _signIn = signIn;
        _config  = config;
    }

    // ----------------------------------------------------------------
    // POST /api/auth/login
    // ----------------------------------------------------------------
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var user = await _users.FindByEmailAsync(dto.Email);
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "Invalid credentials." });

        var result = await _signIn.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
            return StatusCode(423, new { message = "Account is locked. Try again later." });

        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid credentials." });

        var roles = await _users.GetRolesAsync(user);
        var role  = roles.FirstOrDefault() ?? "Public";

        var token = BuildJwt(user, role);

        return Ok(new AuthResponseDto
        {
            Token     = token,
            Email     = user.Email ?? string.Empty,
            Role      = role,
            FirstName = user.FirstName,
            LastName  = user.LastName,
        });
    }

    // ----------------------------------------------------------------
    // POST /api/auth/logout
    // ----------------------------------------------------------------
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signIn.SignOutAsync();
        return Ok(new { message = "Logged out." });
    }

    // ----------------------------------------------------------------
    // GET /api/auth/me
    // ----------------------------------------------------------------
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var user = await _users.FindByIdAsync(userId);
        if (user is null || !user.IsActive) return Unauthorized();

        var roles = await _users.GetRolesAsync(user);

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.IsActive,
            Roles = roles,
        });
    }

    // ----------------------------------------------------------------
    // POST /api/auth/register  (Admin only)
    // ----------------------------------------------------------------
    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var allowedRoles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "Admin", "Donor", "Public" };

        if (!allowedRoles.Contains(dto.Role))
            return BadRequest(new { message = $"Role must be one of: {string.Join(", ", allowedRoles)}" });

        var existing = await _users.FindByEmailAsync(dto.Email);
        if (existing is not null)
            return Conflict(new { message = "A user with that email already exists." });

        var user = new ApplicationUser
        {
            UserName  = dto.Email,
            Email     = dto.Email,
            FirstName = dto.FirstName,
            LastName  = dto.LastName,
            IsActive  = true,
        };

        var createResult = await _users.CreateAsync(user, dto.Password);
        if (!createResult.Succeeded)
            return BadRequest(new { errors = createResult.Errors.Select(e => e.Description) });

        // Normalise role casing to match seeded role names
        var normalised = allowedRoles.First(r =>
            string.Equals(r, dto.Role, StringComparison.OrdinalIgnoreCase));

        await _users.AddToRoleAsync(user, normalised);

        return CreatedAtAction(nameof(Me), new
        {
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            Role = normalised,
        });
    }

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------
    private string BuildJwt(ApplicationUser user, string role)
    {
        var secret   = Environment.GetEnvironmentVariable("JWT_SECRET")
                       ?? throw new InvalidOperationException("JWT_SECRET not set.");
        var issuer   = Environment.GetEnvironmentVariable("JWT_ISSUER")
                       ?? throw new InvalidOperationException("JWT_ISSUER not set.");
        var audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
                       ?? throw new InvalidOperationException("JWT_AUDIENCE not set.");

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.NameIdentifier,     user.Id),
            new Claim(ClaimTypes.Role,               role),
        };

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
