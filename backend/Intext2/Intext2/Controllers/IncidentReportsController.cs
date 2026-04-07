using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/incidentreports")]
public class IncidentReportsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public IncidentReportsController(ApplicationDbContext db) => _db = db;

    // GET /api/incidentreports
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    residentId,
        [FromQuery] string? severity,
        [FromQuery] string? incidentType,
        [FromQuery] bool?   resolved,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        try
        {
            if (page < 1)     page     = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _db.IncidentReports.AsQueryable();

            if (residentId.HasValue)
                query = query.Where(i => i.ResidentId == residentId.Value);

            if (!string.IsNullOrWhiteSpace(severity))
                query = query.Where(i => i.Severity == severity);

            if (!string.IsNullOrWhiteSpace(incidentType))
                query = query.Where(i => i.IncidentType == incidentType);

            if (resolved.HasValue)
                query = query.Where(i => i.Resolved == resolved.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(i => i.IncidentDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve incident reports.", detail = ex.Message });
        }
    }

    // GET /api/incidentreports/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var report = await _db.IncidentReports
                .Include(i => i.Resident)
                .Include(i => i.Safehouse)
                .FirstOrDefaultAsync(i => i.IncidentId == id);

            if (report is null)
                return NotFound(new { message = $"Incident report {id} not found." });

            return Ok(report);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve incident report.", detail = ex.Message });
        }
    }

    // POST /api/incidentreports
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] IncidentReport model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            model.IncidentId = 0;
            _db.IncidentReports.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.IncidentId }, model);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create incident report.", detail = ex.Message });
        }
    }

    // PUT /api/incidentreports/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] IncidentReport model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var existing = await _db.IncidentReports.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Incident report {id} not found." });

            model.IncidentId = id;
            _db.Entry(existing).CurrentValues.SetValues(model);
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update incident report.", detail = ex.Message });
        }
    }

    // DELETE /api/incidentreports/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed)
            return BadRequest(new { message = "Deletion must be explicitly confirmed." });
        try
        {
            var existing = await _db.IncidentReports.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Incident report {id} not found." });

            _db.IncidentReports.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Incident report {id} deleted." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to delete incident report.", detail = ex.Message });
        }
    }
}
