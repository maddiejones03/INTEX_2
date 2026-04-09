using Intext2.Data;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Intext2.Controllers;

[ApiController]
[Route("api/donors")]
public class DonorRiskController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public DonorRiskController(ApplicationDbContext db) => _db = db;

    // GET /api/donors/risk-watchlist
    // Returns active donors ranked by priority_score (risk × lifetime value)
    // Excludes donors whose snooze_until is in the future
    [HttpGet("risk-watchlist")]
    [Authorize]
    public async Task<IActionResult> GetWatchlist(
        [FromQuery] int topN = 20)
    {
        try
        {
            var now = DateTime.UtcNow.ToString("o");

            var watchlist = await _db.DonorRiskScores
                .Where(d =>
                    d.SnoozeUntil == null ||
                    string.Compare(d.SnoozeUntil, now) <= 0)
                .OrderByDescending(d => d.PriorityScore)
                .Take(topN)
                .Select(d => new
                {
                    d.SupporterId,
                    d.DisplayName,
                    d.RiskTier,
                    d.RiskScore,
                    d.PriorityScore,
                    d.LifetimeValuePhp,
                    d.DaysSinceLastDonation,
                    d.GapRatio,
                    d.LastScoredAt,
                    d.SnoozeUntil,
                    Email = _db.Supporters
                        .Where(s => s.SupporterId == d.SupporterId)
                        .Select(s => s.Email)
                        .FirstOrDefault(),
                    // Parse the JSON string into a real array so React
                    // gets a proper array, not a raw string
                    RiskReasons = d.RiskReasonsJson != null
                        ? JsonSerializer.Deserialize<object[]>(d.RiskReasonsJson)
                        : Array.Empty<object>()
                })
                .ToListAsync();

            return Ok(new
            {
                total     = watchlist.Count,
                scoredAt  = watchlist.FirstOrDefault()?.LastScoredAt,
                watchlist
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve risk watchlist.", detail = ex.Message });
        }
    }

    // GET /api/donors/{id}/risk
    // Returns the full risk profile for a single donor
    [HttpGet("{id:int}/risk")]
    [Authorize]
    public async Task<IActionResult> GetDonorRisk(int id)
    {
        try
        {
            var record = await _db.DonorRiskScores
                .FirstOrDefaultAsync(d => d.SupporterId == id);

            if (record is null)
                return NotFound(new { message = $"No risk score found for supporter {id}." });

            return Ok(new
            {
                record.SupporterId,
                record.DisplayName,
                record.RiskTier,
                record.RiskScore,
                record.PriorityScore,
                record.LifetimeValuePhp,
                record.DaysSinceLastDonation,
                record.GapRatio,
                record.LastScoredAt,
                record.SnoozeUntil,
                RiskReasons = record.RiskReasonsJson != null
                    ? JsonSerializer.Deserialize<object[]>(record.RiskReasonsJson)
                    : Array.Empty<object>()
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve donor risk.", detail = ex.Message });
        }
    }

    // POST /api/donors/{id}/risk/snooze
    // Staff marks a donor as contacted — hides from watchlist for 45 days
    [HttpPost("{id:int}/risk/snooze")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Snooze(int id)
    {
        try
        {
            var record = await _db.DonorRiskScores
                .FirstOrDefaultAsync(d => d.SupporterId == id);

            if (record is null)
                return NotFound(new { message = $"No risk score found for supporter {id}." });

            record.SnoozeUntil = DateTime.UtcNow.AddDays(45).ToString("o");
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message    = $"Supporter {id} snoozed for 45 days.",
                snoozeUntil = record.SnoozeUntil
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to snooze donor.", detail = ex.Message });
        }
    }

    // DELETE /api/donors/{id}/risk/snooze
    // Staff manually un-snoozes a donor (adds them back to watchlist immediately)
    [HttpDelete("{id:int}/risk/snooze")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Unsnooze(int id)
    {
        try
        {
            var record = await _db.DonorRiskScores
                .FirstOrDefaultAsync(d => d.SupporterId == id);

            if (record is null)
                return NotFound(new { message = $"No risk score found for supporter {id}." });

            record.SnoozeUntil = null;
            await _db.SaveChangesAsync();

            return Ok(new { message = $"Supporter {id} removed from snooze." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to un-snooze donor.", detail = ex.Message });
        }
    }
}