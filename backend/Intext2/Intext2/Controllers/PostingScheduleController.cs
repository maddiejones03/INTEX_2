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
    // Returns the next 7 days of recommended post configurations, ordered by date
    [HttpGet]
    public async Task<IActionResult> GetSchedule()
    {
        try
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var items = await _db.PostingSchedules
                .Where(p => p.ScheduleDate >= today)
                .OrderBy(p => p.ScheduleDate)
                .Take(7)
                .ToListAsync();

            return Ok(items);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve posting schedule.", detail = ex.Message });
        }
    }

    // GET /api/postingschedule/today
    // Returns today's recommended post configuration
    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        try
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var item = await _db.PostingSchedules
                .FirstOrDefaultAsync(p => p.ScheduleDate == today);

            if (item is null)
                return NotFound(new { message = "No posting recommendation available for today." });

            return Ok(item);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve today's schedule.", detail = ex.Message });
        }
    }
}
