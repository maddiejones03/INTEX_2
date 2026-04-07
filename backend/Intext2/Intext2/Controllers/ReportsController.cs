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
    [Authorize]
    public async Task<IActionResult> DonationsByMonth()
    {
        try
        {
            var data = await _db.Donations
                .Where(d => d.Amount.HasValue)
                .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
                .Select(g => new
                {
                    Year         = g.Key.Year,
                    Month        = g.Key.Month,
                    TotalAmount  = g.Sum(d => d.Amount ?? 0),
                    DonationCount = g.Count(),
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate donations-by-month report.", detail = ex.Message });
        }
    }

    // GET /api/reports/residents-by-safehouse
    [HttpGet("residents-by-safehouse")]
    [Authorize]
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
    [Authorize]
    public async Task<IActionResult> AvgHealthScores()
    {
        try
        {
            var data = await _db.HealthWellbeingRecords
                .GroupBy(h => new { h.RecordDate.Year, h.RecordDate.Month })
                .Select(g => new
                {
                    Year                = g.Key.Year,
                    Month               = g.Key.Month,
                    AvgGeneralHealth    = g.Average(h => (double?)h.GeneralHealthScore),
                    AvgNutrition        = g.Average(h => (double?)h.NutritionScore),
                    AvgSleepQuality     = g.Average(h => (double?)h.SleepQualityScore),
                    AvgEnergyLevel      = g.Average(h => (double?)h.EnergyLevelScore),
                    AvgBmi              = g.Average(h => (double?)h.Bmi),
                    RecordCount         = g.Count(),
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate avg-health-scores report.", detail = ex.Message });
        }
    }

    // GET /api/reports/avg-education-scores
    [HttpGet("avg-education-scores")]
    [Authorize]
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
    [Authorize]
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
    [Authorize]
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
                .SumAsync(d => (decimal?)d.Amount ?? 0);

            var caseByCategory = await _db.Residents
                .GroupBy(r => r.CaseCategory)
                .Select(g => new { Category = g.Key, Count = g.Count() })
                .ToListAsync();

            var donationsByMonth = await _db.Donations
                .Where(d => d.Amount.HasValue)
                .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
                .Select(g => new
                {
                    Year        = g.Key.Year,
                    Month       = g.Key.Month,
                    TotalAmount = g.Sum(d => d.Amount ?? 0),
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            var safehouses = await _db.Safehouses
                .Where(s => s.Status == "Active")
                .Select(s => new
                {
                    s.Name,
                    s.City,
                    s.CapacityGirls,
                    ActiveResidents = s.Residents.Count(r => r.CaseStatus == "Active"),
                })
                .ToListAsync();

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
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to generate public impact data.", detail = ex.Message });
        }
    }
}
