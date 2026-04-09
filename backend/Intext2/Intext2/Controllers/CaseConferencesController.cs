using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/caseconferences")]
public class CaseConferencesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public CaseConferencesController(ApplicationDbContext db) => _db = db;

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? residentId,
        [FromQuery] bool? upcoming,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var query = _db.CaseConferences.AsQueryable();

            if (residentId.HasValue)
                query = query.Where(c => c.ResidentId == residentId.Value);

            if (upcoming.HasValue)
                query = upcoming.Value
                    ? query.Where(c => c.ConferenceDate >= today)
                    : query.Where(c => c.ConferenceDate < today);

            query = query.OrderBy(c => c.ConferenceDate);
            var total = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve case conferences.", detail = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        var conference = await _db.CaseConferences
            .Include(c => c.Resident)
            .FirstOrDefaultAsync(c => c.ConferenceId == id);

        if (conference is null)
            return NotFound(new { message = $"Case conference {id} not found." });

        return Ok(conference);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CaseConference model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            model.ConferenceId = 0;
            model.CreatedAt = DateTime.UtcNow;
            _db.CaseConferences.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.ConferenceId }, model);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create case conference.", detail = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CaseConference model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var existing = await _db.CaseConferences.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Case conference {id} not found." });

            model.ConferenceId = id;
            model.CreatedAt = existing.CreatedAt;
            _db.Entry(existing).CurrentValues.SetValues(model);
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update case conference.", detail = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed)
            return BadRequest(new { message = "Deletion must be explicitly confirmed." });
        try
        {
            var existing = await _db.CaseConferences.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Case conference {id} not found." });

            _db.CaseConferences.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Case conference {id} deleted." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to delete case conference.", detail = ex.Message });
        }
    }
}
