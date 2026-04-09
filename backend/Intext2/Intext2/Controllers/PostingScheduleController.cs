using Intext2.Data;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/postingschedule")]
[Authorize]
public class PostingScheduleController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public PostingScheduleController(ApplicationDbContext db) => _db = db;

    // GET /api/postingschedule
    // Returns all posts for the next 7 days, ordered by date → platform → slot
    [HttpGet]
    public async Task<IActionResult> GetSchedule()
    {
        try
        {
            var today   = DateOnly.FromDateTime(DateTime.UtcNow);
            var endDate = today.AddDays(7);
            var items   = await _db.PostingSchedules
                .Where(p => p.ScheduleDate >= today && p.ScheduleDate < endDate)
                .OrderBy(p => p.ScheduleDate)
                .ThenBy(p => p.Platform)
                .ThenBy(p => p.Slot)
                .ToListAsync();

            return Ok(items);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve posting schedule.", detail = ex.Message });
        }
    }

    // GET /api/postingschedule/boost-okr
    // Returns actual donation totals attributed to boosted posts vs boost budget spent
    [HttpGet("boost-okr")]
    public async Task<IActionResult> GetBoostOkr()
    {
        try
        {
            var boostedPostIds = await _db.SocialMediaPosts
                .Where(p => p.IsBoosted == true)
                .Select(p => (int?)p.PostId)
                .ToListAsync();

            var totalBudget = await _db.SocialMediaPosts
                .Where(p => p.IsBoosted == true)
                .SumAsync(p => (double?)(p.BoostBudgetPhp ?? 0) ?? 0);

            var totalDonations = await _db.Donations
                .Where(d => d.ReferralPostId != null && boostedPostIds.Contains(d.ReferralPostId))
                .SumAsync(d => d.Amount ?? 0);

            var roi = totalBudget > 0 ? (double?)totalDonations / totalBudget : null;

            return Ok(new
            {
                totalBoostBudgetPhp   = totalBudget,
                totalDonationsPhp     = totalDonations,
                roi,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve boost OKR.", detail = ex.Message });
        }
    }

    // GET /api/postingschedule/today
    // Returns all recommended posts for today, ordered by platform → slot
    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        try
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var items = await _db.PostingSchedules
                .Where(p => p.ScheduleDate == today)
                .OrderBy(p => p.Platform)
                .ThenBy(p => p.Slot)
                .ToListAsync();

            if (!items.Any())
                return NotFound(new { message = "No posting recommendations available for today." });

            return Ok(items);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve today's schedule.", detail = ex.Message });
        }
    }
}
