using Intext2.Infrastructure;
using Intext2.Data;
using Intext2.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ----------------------------------------------------------------
// Database
// ----------------------------------------------------------------
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ----------------------------------------------------------------
// ASP.NET Identity
// ----------------------------------------------------------------
builder.Services
    .AddIdentityApiEndpoints<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

// ----------------------------------------------------------------
// Password Policy (per professor's instructions)
// ----------------------------------------------------------------
builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit           = false;
    options.Password.RequireLowercase       = false;
    options.Password.RequireUppercase       = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredUniqueChars    = 1;
    options.Password.RequiredLength         = 14;
});

// ----------------------------------------------------------------
// Cookie settings (per professor's instructions)
// ----------------------------------------------------------------
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly      = true;
    options.Cookie.SecurePolicy  = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
    options.Cookie.SameSite      = Microsoft.AspNetCore.Http.SameSiteMode.None;
    options.ExpireTimeSpan       = TimeSpan.FromHours(1);
    options.SlidingExpiration    = true;
});

// ----------------------------------------------------------------
// Authorization policies
// ----------------------------------------------------------------
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.ManageData, policy =>
        policy.RequireRole(AuthRoles.Admin));
});

// ----------------------------------------------------------------
// CORS
// ----------------------------------------------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:5173",
                "https://jolly-moss-00018721e.1.azurestaticapps.net"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();

// Let action methods handle ModelState manually so normalization (e.g. Sex → "F")
// runs before validation is checked.
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ----------------------------------------------------------------
// Build
// ----------------------------------------------------------------
var app = builder.Build();

// ----------------------------------------------------------------
// Seed roles and default admin on startup
// ----------------------------------------------------------------
await SeedAsync(app);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseSecurityHeaders();
app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Map Identity API endpoints (register, login, etc.)
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();

app.MapControllers();
app.Run();

// ----------------------------------------------------------------
// Seed helper
// ----------------------------------------------------------------
static async Task SeedAsync(WebApplication app)
{
    using var scope   = app.Services.CreateScope();
    var roleManager   = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager   = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var logger        = app.Logger;

    // Roles
    foreach (var role in new[] { AuthRoles.Admin, AuthRoles.Customer })
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
            logger.LogInformation("Created role: {Role}", role);
        }
    }

    // Admin user from config
    var config        = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var adminSection  = config.GetSection("GenerateDefaultIdentityAdmin");
    var adminEmail    = adminSection["Email"];
    var adminPassword = adminSection["Password"];

    if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
    {
        var existing = await userManager.FindByEmailAsync(adminEmail);
        if (existing is null)
        {
            var admin = new ApplicationUser
            {
                UserName  = adminEmail,
                Email     = adminEmail,
                FirstName = "Admin",
                LastName  = "User",
                IsActive  = true,
                EmailConfirmed = true,
            };

            var result = await userManager.CreateAsync(admin, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, AuthRoles.Admin);
                logger.LogInformation("Seeded admin user: {Email}", adminEmail);
            }
            else
            {
                foreach (var err in result.Errors)
                    logger.LogError("Seed error: {Code} — {Description}", err.Code, err.Description);
            }
        }
        else if (!await userManager.IsInRoleAsync(existing, AuthRoles.Admin))
        {
            await userManager.AddToRoleAsync(existing, AuthRoles.Admin);
        }
    }
}