using Intext2.Infrastructure;
using Intext2.Data;
using Intext2.Models;
using Intext2.Services;
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
// CORS (credentials + cookies require explicit origins; see Cors:AllowedOrigins for extras)
// ----------------------------------------------------------------
var defaultCorsOrigins = new[]
{
    "http://localhost:3000",
    "http://localhost:5173",
    "https://jolly-moss-00018721e.1.azurestaticapps.net",
    "https://jolly-moss-00018721e.5.azurestaticapps.net",
};
var extraCorsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var corsOrigins = defaultCorsOrigins
    .Concat(extraCorsOrigins)
    .Where(static o => !string.IsNullOrWhiteSpace(o))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ----------------------------------------------------------------
// Email service (gracefully skips if SMTP not configured)
// ----------------------------------------------------------------
var smtpSettings = builder.Configuration.GetSection("Smtp").Get<SmtpSettings>() ?? new SmtpSettings();
builder.Services.AddSingleton(smtpSettings);
builder.Services.AddSingleton<IEmailService, EmailService>();

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
try { await SeedAsync(app); } catch (Exception ex) { app.Logger.LogError(ex, "Seeding failed — app will continue."); }

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
// Avoid redirecting http://localhost:5030 → https (breaks CORS preflight for SPA on :5173)
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

// CORS must run after UseRouting and before auth for endpoint routing + preflight OPTIONS.
app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Map Identity API endpoints (register, login, etc.)
app.MapGroup("/api/auth")
    .RequireCors("AllowFrontend")
    .MapIdentityApi<ApplicationUser>();

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
    foreach (var role in new[] { AuthRoles.Admin, AuthRoles.CaseManager, AuthRoles.Donor })
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
            logger.LogInformation("Created role: {Role}", role);
        }
    }

    // Migrate legacy "Customer" role to "Donor"
    if (await roleManager.RoleExistsAsync(AuthRoles.LegacyCustomer))
    {
        var usersInCustomer = await userManager.GetUsersInRoleAsync(AuthRoles.LegacyCustomer);
        foreach (var u in usersInCustomer)
        {
            if (!await userManager.IsInRoleAsync(u, AuthRoles.Donor))
                await userManager.AddToRoleAsync(u, AuthRoles.Donor);
            await userManager.RemoveFromRoleAsync(u, AuthRoles.LegacyCustomer);
        }

        var legacy = await roleManager.FindByNameAsync(AuthRoles.LegacyCustomer);
        if (legacy is not null)
            await roleManager.DeleteAsync(legacy);
        logger.LogInformation("Migrated role {From} to {To}", AuthRoles.LegacyCustomer, AuthRoles.Donor);
    }

    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    await SeedIdentityUserIfConfigured(
        userManager, logger,
        config.GetSection("GenerateDefaultIdentityAdmin"),
        AuthRoles.Admin, "Admin", "User");

    await SeedIdentityUserIfConfigured(
        userManager, logger,
        config.GetSection("GenerateDefaultCaseManager"),
        AuthRoles.CaseManager, "Case", "Manager");

    await SeedIdentityUserIfConfigured(
        userManager, logger,
        config.GetSection("GenerateDefaultDonor"),
        AuthRoles.Donor, "Demo", "Donor");

    await LinkDemoPortalDataAsync(scope, config, userManager, logger);
}

static async Task LinkDemoPortalDataAsync(
    IServiceScope scope,
    IConfiguration config,
    UserManager<ApplicationUser> userManager,
    ILogger logger)
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    var donorEmail = config["GenerateDefaultDonor:Email"];
    if (!string.IsNullOrWhiteSpace(donorEmail))
    {
        donorEmail = donorEmail.Trim();
        var donorUser = await userManager.FindByEmailAsync(donorEmail);
        if (donorUser is not null && donorUser.SupporterId is null)
        {
            var supporter = await db.Supporters
                .FirstOrDefaultAsync(s => s.Email != null && s.Email.ToLower() == donorEmail.ToLowerInvariant());
            if (supporter is null)
            {
                supporter = new Supporter
                {
                    SupporterType    = "Individual",
                    DisplayName      = $"{donorUser.FirstName} {donorUser.LastName}".Trim(),
                    FirstName        = donorUser.FirstName,
                    LastName         = donorUser.LastName,
                    RelationshipType = "Donor",
                    Email            = donorEmail,
                    Status           = "Active",
                    CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                };
                db.Supporters.Add(supporter);
                await db.SaveChangesAsync();
                logger.LogInformation("Created demo Supporter row for donor {Email}", donorEmail);
            }

            donorUser.SupporterId = supporter.SupporterId;
            await userManager.UpdateAsync(donorUser);
            logger.LogInformation("Linked donor login to supporter_id {Id}", supporter.SupporterId);
        }
    }

    var cmEmail = config["GenerateDefaultCaseManager:Email"];
    if (!string.IsNullOrWhiteSpace(cmEmail))
    {
        cmEmail = cmEmail.Trim();
        var cmUser = await userManager.FindByEmailAsync(cmEmail);
        if (cmUser is not null)
        {
            var batch = await db.Residents
                .Where(r => r.CaseManagerId == null)
                .OrderBy(r => r.ResidentId)
                .Take(25)
                .ToListAsync();
            foreach (var r in batch)
                r.CaseManagerId = cmUser.Id;
            if (batch.Count > 0)
            {
                await db.SaveChangesAsync();
                logger.LogInformation("Assigned {N} residents to case manager {Email}", batch.Count, cmEmail);
            }
        }
    }
}

static async Task SeedIdentityUserIfConfigured(
    UserManager<ApplicationUser> userManager,
    ILogger logger,
    IConfigurationSection section,
    string role,
    string firstName,
    string lastName)
{
    var email    = section["Email"];
    var password = section["Password"];

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        return;

    var existing = await userManager.FindByEmailAsync(email);
    if (existing is null)
    {
        var user = new ApplicationUser
        {
            UserName       = email,
            Email          = email,
            FirstName      = firstName,
            LastName       = lastName,
            IsActive       = true,
            EmailConfirmed = true,
        };

        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(user, role);
            logger.LogInformation("Seeded {Role} user: {Email}", role, email);
        }
        else
        {
            foreach (var err in result.Errors)
                logger.LogError("Seed error ({Role}): {Code} — {Description}", role, err.Code, err.Description);
        }

        return;
    }

    if (!await userManager.IsInRoleAsync(existing, role))
        await userManager.AddToRoleAsync(existing, role);
}