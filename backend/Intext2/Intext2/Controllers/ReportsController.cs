using Intext2.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public ReportsController(ApplicationDbContext db) => _db = db;

    // GET /api/reports/donations-by-month
    [HttpGet("donations-by-month")]
    [Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> DonationsByMonth()
    {
        try
        {
            var rows = await _db.Donations
                .Where(d => d.Amount.HasValue)
                .ToListAsync();

            var data = rows
                .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
                .Select(g => new
                {
                    Year          = g.Key.Year,
                    Month         = g.Key.Month,
                    TotalAmount   = g.Sum(x => x.Amount ?? 0),
                    DonationCount = g.Count(),
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToList();

            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate donations-by-month report.", detail = ex.Message });
        }
    }

    // GET /api/reports/residents-by-safehouse
    [HttpGet("residents-by-safehouse")]
    [Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> ResidentsBySafehouse()
    {
        try
        {
            var data = await _db.Safehouses
                .Select(sh => new
                {
                    sh.SafehouseId,
                    sh.Name,
                    sh.City,
                    sh.CapacityGirls,
                    sh.CurrentOccupancy,
                    ActiveResidents = sh.Residents.Count(r => r.CaseStatus == "Active"),
                    TotalResidents  = sh.Residents.Count(),
                    HighRisk        = sh.Residents.Count(r => r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical"),
                })
                .OrderBy(x => x.Name)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate residents-by-safehouse report.", detail = ex.Message });
        }
    }

    // GET /api/reports/avg-health-scores
    [HttpGet("avg-health-scores")]
    [Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> AvgHealthScores()
    {
        try
        {
            var rows = await _db.HealthWellbeingRecords.ToListAsync();

            var data = rows
                .GroupBy(h => new { h.RecordDate.Year, h.RecordDate.Month })
                .Select(g => new
                {
                    Year             = g.Key.Year,
                    Month            = g.Key.Month,
                    AvgGeneralHealth = g.Average(x => (double?)x.GeneralHealthScore),
                    AvgNutrition     = g.Average(x => (double?)x.NutritionScore),
                    AvgSleepQuality  = g.Average(x => (double?)x.SleepQualityScore),
                    AvgEnergyLevel   = g.Average(x => (double?)x.EnergyLevelScore),
                    AvgBmi           = g.Average(x => (double?)x.Bmi),
                    RecordCount      = g.Count(),
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToList();

            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate avg-health-scores report.", detail = ex.Message });
        }
    }

    // GET /api/reports/avg-education-scores
    [HttpGet("avg-education-scores")]
    [Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> AvgEducationScores()
    {
        try
        {
            var data = await _db.EducationRecords
                .GroupBy(e => new { e.EducationLevel, e.CompletionStatus })
                .Select(g => new
                {
                    EducationLevel    = g.Key.EducationLevel,
                    CompletionStatus  = g.Key.CompletionStatus,
                    AvgAttendanceRate = g.Average(e => (double?)e.AttendanceRate),
                    AvgProgress       = g.Average(e => (double?)e.ProgressPercent),
                    RecordCount       = g.Count(),
                })
                .OrderBy(x => x.EducationLevel)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate avg-education-scores report.", detail = ex.Message });
        }
    }

    // GET /api/reports/reintegration-success-rates
    [HttpGet("reintegration-success-rates")]
    [Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> ReintegrationSuccessRates()
    {
        try
        {
            var data = await _db.Residents
                .GroupBy(r => new { r.CaseCategory, r.ReintegrationStatus })
                .Select(g => new
                {
                    CaseCategory        = g.Key.CaseCategory,
                    ReintegrationStatus = g.Key.ReintegrationStatus ?? "Not Started",
                    Count               = g.Count(),
                })
                .OrderBy(x => x.CaseCategory)
                .ToListAsync();

            // Summary totals per category
            var summary = await _db.Residents
                .GroupBy(r => r.CaseCategory)
                .Select(g => new
                {
                    CaseCategory        = g.Key,
                    Total               = g.Count(),
                    Completed           = g.Count(r => r.ReintegrationStatus == "Completed"),
                    InProgress          = g.Count(r => r.ReintegrationStatus == "In Progress"),
                    NotStarted          = g.Count(r => r.ReintegrationStatus == null || r.ReintegrationStatus == "Not Started"),
                })
                .OrderBy(x => x.CaseCategory)
                .ToListAsync();

            return Ok(new { breakdown = data, summary });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate reintegration-success-rates report.", detail = ex.Message });
        }
    }

    // GET /api/reports/social-media-performance
    [HttpGet("social-media-performance")]
    [Authorize(Roles = AuthRoles.Admin)]
    public async Task<IActionResult> SocialMediaPerformance()
    {
        try
        {
            var byPlatform = await _db.SocialMediaPosts
                .GroupBy(p => p.Platform)
                .Select(g => new
                {
                    Platform             = g.Key,
                    PostCount            = g.Count(),
                    AvgEngagementRate    = g.Average(p => (double?)p.EngagementRate),
                    TotalImpressions     = g.Sum(p => p.Impressions),
                    TotalReach           = g.Sum(p => p.Reach),
                    TotalLikes           = g.Sum(p => p.Likes),
                    TotalShares          = g.Sum(p => p.Shares),
                    TotalDonationRefs    = g.Sum(p => p.DonationReferrals),
                    TotalEstDonationVal  = g.Sum(p => p.EstimatedDonationValuePhp),
                })
                .OrderByDescending(x => x.AvgEngagementRate)
                .ToListAsync();

            var byPostType = await _db.SocialMediaPosts
                .GroupBy(p => p.PostType)
                .Select(g => new
                {
                    PostType          = g.Key,
                    PostCount         = g.Count(),
                    AvgEngagementRate = g.Average(p => (double?)p.EngagementRate),
                    TotalImpressions  = g.Sum(p => p.Impressions),
                })
                .OrderByDescending(x => x.AvgEngagementRate)
                .ToListAsync();

            return Ok(new { byPlatform, byPostType });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate social-media-performance report.", detail = ex.Message });
        }
    }

    // GET /api/reports/public-impact  — NO auth, fully anonymized aggregate data
    [HttpGet("public-impact")]
    [AllowAnonymous]
    public async Task<IActionResult> PublicImpact()
    {
        try
        {
            var totalResidents   = await _db.Residents.CountAsync();
            var activeResidents  = await _db.Residents.CountAsync(r => r.CaseStatus == "Active");
            var reintegrated     = await _db.Residents.CountAsync(r => r.ReintegrationStatus == "Completed");
            var totalSafehouses  = await _db.Safehouses.CountAsync(s => s.Status == "Active");

            var totalDonations   = await _db.Donations
                .Where(d => d.Amount.HasValue)
                .SumAsync(d => (double?)d.Amount ?? 0);

            var caseByCategory = await _db.Residents
                .GroupBy(r => r.CaseCategory)
                .Select(g => new { Category = g.Key, Count = g.Count() })
                .ToListAsync();

            var donationRows = await _db.Donations
                .Where(d => d.Amount.HasValue || d.EstimatedValue.HasValue)
                .ToListAsync();
            var donationsByMonth = donationRows
                .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
                .Select(g => new
                {
                    Year        = g.Key.Year,
                    Month       = g.Key.Month,
                    Monetary    = g.Where(x => x.DonationType == "Monetary").Sum(x => x.Amount ?? x.EstimatedValue ?? 0),
                    InKind      = g.Where(x => x.DonationType == "InKind").Sum(x => x.EstimatedValue ?? x.Amount ?? 0),
                    Volunteer   = g.Where(x => x.DonationType == "Time" || x.DonationType == "Volunteer")
                                   .Sum(x => x.EstimatedValue ?? x.Amount ?? 0),
                    TotalAmount = g.Sum(x => x.Amount ?? x.EstimatedValue ?? 0),
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToList();

            var safehouses = await _db.Safehouses
                .Where(s => s.Status == "Active")
                .Select(s => new
                {
                    s.Name,
                    s.City,
                    s.CapacityGirls,
                    ActiveResidents = s.Residents.Count(r => r.CaseStatus == "Active"),
                    ReintegratedResidents = s.Residents.Count(r => r.ReintegrationStatus == "Completed"),
                })
                .ToListAsync();

            // Outcome aggregates built from real resident statuses.
            var residentsForOutcomes = await _db.Residents
                .Select(r => new { r.ReintegrationStatus, r.ReintegrationType, r.DateOfAdmission })
                .ToListAsync();

            var outcomeByCategory = residentsForOutcomes
                .GroupBy(r => string.IsNullOrWhiteSpace(r.ReintegrationType) ? "General" : r.ReintegrationType!)
                .Select(g => new
                {
                    Category     = g.Key,
                    Reintegrated = g.Count(x => string.Equals(x.ReintegrationStatus, "Completed", StringComparison.OrdinalIgnoreCase)),
                    InProgress   = g.Count(x => string.Equals(x.ReintegrationStatus, "In Progress", StringComparison.OrdinalIgnoreCase)
                                             || string.Equals(x.ReintegrationStatus, "Not Started", StringComparison.OrdinalIgnoreCase)
                                             || string.Equals(x.ReintegrationStatus, "On Hold", StringComparison.OrdinalIgnoreCase)),
                    Transferred  = g.Count(x => string.Equals(x.ReintegrationStatus, "Transferred", StringComparison.OrdinalIgnoreCase)
                                             || string.Equals(x.ReintegrationStatus, "Closed", StringComparison.OrdinalIgnoreCase)),
                })
                .OrderByDescending(x => x.Reintegrated + x.InProgress + x.Transferred)
                .ToList();

            var outcomeByYear = residentsForOutcomes
                .Select(r => new
                {
                    Year = r.DateOfAdmission?.Year ?? 0,
                    r.ReintegrationStatus,
                    r.ReintegrationType,
                })
                .Where(x => x.Year > 0)
                .GroupBy(x => x.Year)
                .Select(g => new
                {
                    Year         = g.Key,
                    Reintegrated = g.Count(x => string.Equals(x.ReintegrationStatus, "Completed", StringComparison.OrdinalIgnoreCase)),
                    Transferred  = g.Count(x => string.Equals(x.ReintegrationStatus, "Transferred", StringComparison.OrdinalIgnoreCase)
                                             || string.Equals(x.ReintegrationStatus, "Closed", StringComparison.OrdinalIgnoreCase)),
                    Independent  = g.Count(x => string.Equals(x.ReintegrationType, "Independent Living", StringComparison.OrdinalIgnoreCase)),
                })
                .OrderBy(x => x.Year)
                .ToList();

            return Ok(new
            {
                totalResidents,
                activeResidents,
                reintegrated,
                reintegrationRate    = totalResidents > 0
                    ? Math.Round((double)reintegrated / totalResidents * 100, 1)
                    : 0,
                totalSafehouses,
                totalDonationsPhp    = totalDonations,
                caseByCategory,
                donationsByMonth,
                safehouses,
                outcomeByCategory,
                outcomeByYear,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate public impact data.", detail = ex.Message });
        }
    }  // ← PublicImpact closes here

    // GET /api/reports/program-impact
    [HttpGet("program-impact")]
    [Authorize(Roles = AuthRoles.Admin)]
    public IActionResult ProgramImpact()
    {
        try
        {
            var artifactsPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "..", "..", "..", "ml-pipelines", "artifacts", "impact_per_1000.json"
            );
            if (!System.IO.File.Exists(artifactsPath))
                artifactsPath = Path.Combine(AppContext.BaseDirectory, "artifacts", "impact_per_1000.json");

            if (!System.IO.File.Exists(artifactsPath))
                return NotFound(new { message = "impact_per_1000.json not found. Run train_pipeline2.py first." });

            var json = System.IO.File.ReadAllText(artifactsPath);
            var data = System.Text.Json.JsonSerializer.Deserialize<object>(json);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to load program impact data.", detail = ex.Message });
        }
    }

    // GET /api/reports/public-program-impact
    [HttpGet("public-program-impact")]
    [AllowAnonymous]
    public IActionResult PublicProgramImpact()
    {
        try
        {
            var artifactsPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "..", "..", "..", "ml-pipelines", "artifacts", "impact_per_1000.json"
            );
            if (!System.IO.File.Exists(artifactsPath))
                artifactsPath = Path.Combine(AppContext.BaseDirectory, "artifacts", "impact_per_1000.json");

            if (!System.IO.File.Exists(artifactsPath))
                return NotFound(new { message = "Impact data not yet available." });

            var json = System.IO.File.ReadAllText(artifactsPath);
            var full = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(json);

            return Ok(new
            {
                generatedAt        = full.GetProperty("generated_at").GetString(),
                unit               = full.GetProperty("unit").GetString(),
                topProgramArea     = full.GetProperty("top_program_area").GetString(),
                topEduImpact       = full.GetProperty("top_edu_impact").GetDouble(),
                programAreaRanking = full.GetProperty("program_area_ranking"),
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to load public impact data.", detail = ex.Message });
        }
    }

} 
