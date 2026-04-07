using System.Text;
using DotNetEnv;
using Intext2.Data;
using Intext2.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// ----------------------------------------------------------------
// Load .env (no-op in production if file is absent)
// ----------------------------------------------------------------
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// ----------------------------------------------------------------
// Database
// ----------------------------------------------------------------
var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
    ?? throw new InvalidOperationException("DB_CONNECTION_STRING is not set.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// ----------------------------------------------------------------
// ASP.NET Identity
// ----------------------------------------------------------------
builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        // Password policy
        options.Password.RequiredLength         = 12;
        options.Password.RequireUppercase       = true;
        options.Password.RequireLowercase       = true;
        options.Password.RequireDigit           = true;
        options.Password.RequireNonAlphanumeric = true;

        // Lockout
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan  = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers      = true;

        // User
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// ----------------------------------------------------------------
// JWT Authentication
// ----------------------------------------------------------------
var jwtSecret   = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? throw new InvalidOperationException("JWT_SECRET is not set.");
var jwtIssuer   = Environment.GetEnvironmentVariable("JWT_ISSUER")
    ?? throw new InvalidOperationException("JWT_ISSUER is not set.");
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
    ?? throw new InvalidOperationException("JWT_AUDIENCE is not set.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAudience,
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew                = TimeSpan.Zero,
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ----------------------------------------------------------------
// Build
// ----------------------------------------------------------------
var app = builder.Build();

// ----------------------------------------------------------------
// Seed roles and default admin on startup
// ----------------------------------------------------------------
await SeedAsync(app);

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

// ----------------------------------------------------------------
// Seed helper — only Identity scaffolding, no domain data
// ----------------------------------------------------------------
static async Task SeedAsync(WebApplication app)
{
    using var scope  = app.Services.CreateScope();
    var roleManager  = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager  = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var db           = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger       = app.Logger;

    // Apply any pending EF migrations
    await db.Database.MigrateAsync();

    // ----------------------------------------------------------
    // 1. Roles
    // ----------------------------------------------------------
    foreach (var role in new[] { "Admin", "Donor", "Public" })
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
            logger.LogInformation("Created role: {Role}", role);
        }
    }

    // ----------------------------------------------------------
    // 2. Admin user
    // ----------------------------------------------------------
    await EnsureUserAsync(
        userManager, logger,
        email:     Environment.GetEnvironmentVariable("ADMIN_EMAIL"),
        password:  Environment.GetEnvironmentVariable("ADMIN_PASSWORD"),
        firstName: "Admin",
        lastName:  "User",
        role:      "Admin",
        label:     "admin");

    // ----------------------------------------------------------
    // 3. Donor demo user (grader testing)
    // ----------------------------------------------------------
    await EnsureUserAsync(
        userManager, logger,
        email:     Environment.GetEnvironmentVariable("DONOR_EMAIL"),
        password:  Environment.GetEnvironmentVariable("DONOR_PASSWORD"),
        firstName: "Donor",
        lastName:  "Demo",
        role:      "Donor",
        label:     "donor demo");
}

static async Task EnsureUserAsync(
    UserManager<ApplicationUser> userManager,
    ILogger                      logger,
    string?                      email,
    string?                      password,
    string                       firstName,
    string                       lastName,
    string                       role,
    string                       label)
{
    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
    {
        logger.LogWarning(
            "Skipping {Label} seed — env vars not set.", label);
        return;
    }

    if (await userManager.FindByEmailAsync(email) is not null)
        return; // already exists, nothing to do

    var user = new ApplicationUser
    {
        UserName  = email,
        Email     = email,
        FirstName = firstName,
        LastName  = lastName,
        IsActive  = true,
    };

    var result = await userManager.CreateAsync(user, password);
    if (result.Succeeded)
    {
        await userManager.AddToRoleAsync(user, role);
        logger.LogInformation("Seeded {Label} user: {Email}", label, email);
    }
    else
    {
        foreach (var err in result.Errors)
            logger.LogError("Seed error ({Label}): {Code} — {Description}",
                label, err.Code, err.Description);
    }
}
