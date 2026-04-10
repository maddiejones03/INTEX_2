using Intext2.Data;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/earlywarning")]
[Authorize]
public class EarlyWarningController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public EarlyWarningController(ApplicationDbContext db) => _db = db;

    // GET /api/earlywarning/dashboard
    // Summary counts for the dashboard banner
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        try
        {
            var alertCounts = await _db.RiskAlerts
                .GroupBy(a => a.Severity)
                .Select(g => new { Severity = g.Key, Count = g.Count() })
                .ToListAsync();

            var trendCounts = await _db.ResidentEarlyWarnings
                .GroupBy(r => r.TrendDirection)
                .Select(g => new { TrendDirection = g.Key, Count = g.Count() })
                .ToListAsync();

            var topAtRisk = await _db.ResidentEarlyWarnings
                .Where(r => r.RiskRegressionProbability != null)
                .OrderByDescending(r => r.RiskRegressionProbability)
                .Take(5)
                .Select(r => new
                {
                    r.ResidentId,
                    r.RiskCategory,
                    r.RiskRegressionProbability,
                    r.TrendDirection,
                    r.TopRiskFactor1,
                    r.ComputedAt,
                })
                .ToListAsync();

            return Ok(new { alertCounts, trendCounts, topAtRisk });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve dashboard.", detail = ex.Message });
        }
    }

    // GET /api/earlywarning/residents?trendDirection=Declining&riskCategory=High
    [HttpGet("residents")]
    public async Task<IActionResult> GetResidents(
        [FromQuery] string? trendDirection,
        [FromQuery] string? riskCategory,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            if (page < 1)       page     = 1;
            if (pageSize < 1)   pageSize = 50;
            if (pageSize > 200) pageSize = 200;

            var query = _db.ResidentEarlyWarnings.AsQueryable();

            if (!string.IsNullOrWhiteSpace(trendDirection))
                query = query.Where(r => r.TrendDirection == trendDirection);

            if (!string.IsNullOrWhiteSpace(riskCategory))
                query = query.Where(r => r.RiskCategory == riskCategory);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(r => r.RiskRegressionProbability)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve residents.", detail = ex.Message });
        }
    }

    // GET /api/earlywarning/residents/{residentId}
    [HttpGet("residents/{residentId:int}")]
    public async Task<IActionResult> GetResident(int residentId)
    {
        try
        {
            var record = await _db.ResidentEarlyWarnings
                .FirstOrDefaultAsync(r => r.ResidentId == residentId);

            if (record is null)
                return NotFound(new { message = $"No early warning record for resident {residentId}." });

            var alerts = await _db.RiskAlerts
                .Where(a => a.ResidentId == residentId)
                .OrderByDescending(a => a.ComputedAt)
                .ToListAsync();

            return Ok(new { record, alerts });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve resident.", detail = ex.Message });
        }
    }

    // GET /api/earlywarning/kr-compliance
    // KR: % of residents with a High alert OR High/Critical EW risk that have ≥1 process recording
    // AND ≥1 home visitation in the last 14 days
    [HttpGet("kr-compliance")]
    public async Task<IActionResult> GetKrCompliance()
    {
        try
        {
            var today    = DateOnly.FromDateTime(DateTime.UtcNow);
            var pastDate = today.AddDays(-14);

            // Group 1: residents with at least one High severity active alert
            var alertResidentIds = await _db.RiskAlerts
                .Where(a => a.Severity == "High")
                .Select(a => a.ResidentId)
                .Distinct()
                .ToListAsync();

            // Group 2: residents the EW model flags as High or Critical risk
            var ewResidentIds = await _db.ResidentEarlyWarnings
                .Where(r => r.RiskCategory == "High" || r.RiskCategory == "Critical")
                .Select(r => r.ResidentId)
                .Distinct()
                .ToListAsync();

            // Union of both groups
            var targetIds = alertResidentIds.Union(ewResidentIds).Distinct().ToList();
            var total = targetIds.Count;

            // Session logged in the last 14 days (past)
            var recordingIds = await _db.ProcessRecordings
                .Where(p => targetIds.Contains(p.ResidentId) && p.SessionDate >= pastDate && p.SessionDate <= today)
                .Select(p => p.ResidentId)
                .Distinct()
                .ToListAsync();

            // Home visit in the last 14 days (past)
            var visitationIds = await _db.HomeVisitations
                .Where(h => targetIds.Contains(h.ResidentId) && h.VisitDate >= pastDate && h.VisitDate <= today)
                .Select(h => h.ResidentId)
                .Distinct()
                .ToListAsync();

            var fullyEngaged = recordingIds.Intersect(visitationIds).Count();

            return Ok(new
            {
                totalAtRisk  = total,
                fullyEngaged = fullyEngaged,
                krPct        = total == 0 ? 100 : (int)Math.Round((double)fullyEngaged / total * 100),
                krMet        = total == 0 || fullyEngaged == total,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve KR compliance.", detail = ex.Message });
        }
    }

    // GET /api/earlywarning/alerts?severity=High&alertType=CooperationDecline
    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts(
        [FromQuery] string? severity,
        [FromQuery] string? alertType,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            if (page < 1)       page     = 1;
            if (pageSize < 1)   pageSize = 50;
            if (pageSize > 200) pageSize = 200;

            var query = _db.RiskAlerts.AsQueryable();

            if (!string.IsNullOrWhiteSpace(severity))
                query = query.Where(a => a.Severity == severity);

            if (!string.IsNullOrWhiteSpace(alertType))
                query = query.Where(a => a.AlertType == alertType);

            var total = await query.CountAsync();

            var items = await query
                .OrderBy(a => a.Severity == "High" ? 0 : a.Severity == "Medium" ? 1 : 2)
                .ThenByDescending(a => a.ComputedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve alerts.", detail = ex.Message });
        }
    }
}
