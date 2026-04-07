using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/processrecordings")]
public class ProcessRecordingsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public ProcessRecordingsController(ApplicationDbContext db) => _db = db;

    // GET /api/processrecordings
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    residentId,
        [FromQuery] string? sessionType,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        try
        {
            if (page < 1)     page     = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _db.ProcessRecordings.AsQueryable();

            if (residentId.HasValue)
                query = query.Where(p => p.ResidentId == residentId.Value);

            if (!string.IsNullOrWhiteSpace(sessionType))
                query = query.Where(p => p.SessionType == sessionType);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.SessionDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve process recordings.", detail = ex.Message });
        }
    }

    // GET /api/processrecordings/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var record = await _db.ProcessRecordings
                .Include(p => p.Resident)
                .FirstOrDefaultAsync(p => p.RecordingId == id);

            if (record is null)
                return NotFound(new { message = $"Process recording {id} not found." });

            return Ok(record);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve process recording.", detail = ex.Message });
        }
    }

    // POST /api/processrecordings
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] ProcessRecording model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            model.RecordingId = 0;
            _db.ProcessRecordings.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.RecordingId }, model);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create process recording.", detail = ex.Message });
        }
    }

    // PUT /api/processrecordings/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] ProcessRecording model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var existing = await _db.ProcessRecordings.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Process recording {id} not found." });

            model.RecordingId = id;
            _db.Entry(existing).CurrentValues.SetValues(model);
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update process recording.", detail = ex.Message });
        }
    }

    // DELETE /api/processrecordings/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed)
            return BadRequest(new { message = "Deletion must be explicitly confirmed." });
        try
        {
            var existing = await _db.ProcessRecordings.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Process recording {id} not found." });

            _db.ProcessRecordings.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Process recording {id} deleted." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to delete process recording.", detail = ex.Message });
        }
    }
}
