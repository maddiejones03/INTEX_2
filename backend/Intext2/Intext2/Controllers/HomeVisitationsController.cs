using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/homevisitations")]
public class HomeVisitationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public HomeVisitationsController(ApplicationDbContext db) => _db = db;
    private const string SchemaMismatchMessage = "Database schema mismatch detected for home visitations data. Ensure Azure SQL column types match EF migrations.";

    private static bool IsSchemaTypeMismatch(Exception ex)
        => ex is InvalidCastException
           || ex.Message.Contains("Unable to cast object of type", StringComparison.OrdinalIgnoreCase);

    // GET /api/homevisitations
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    residentId,
        [FromQuery] string? visitType,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        try
        {
            if (page < 1)     page     = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _db.HomeVisitations.AsQueryable();

            if (residentId.HasValue)
                query = query.Where(v => v.ResidentId == residentId.Value);

            if (!string.IsNullOrWhiteSpace(visitType))
                query = query.Where(v => v.VisitType == visitType);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(v => v.VisitDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to retrieve home visitations.", detail = ex.Message });
        }
    }

    // GET /api/homevisitations/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var visit = await _db.HomeVisitations
                .Include(v => v.Resident)
                .FirstOrDefaultAsync(v => v.VisitationId == id);

            if (visit is null)
                return NotFound(new { message = $"Home visitation {id} not found." });

            return Ok(visit);
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to retrieve home visitation.", detail = ex.Message });
        }
    }

    // POST /api/homevisitations
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] HomeVisitation model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            model.VisitationId = 0;
            _db.HomeVisitations.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.VisitationId }, model);
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to create home visitation.", detail = ex.Message });
        }
    }

    // PUT /api/homevisitations/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] HomeVisitation model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var existing = await _db.HomeVisitations.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Home visitation {id} not found." });

            model.VisitationId = id;
            _db.Entry(existing).CurrentValues.SetValues(model);
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to update home visitation.", detail = ex.Message });
        }
    }

    // DELETE /api/homevisitations/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed)
            return BadRequest(new { message = "Deletion must be explicitly confirmed." });
        try
        {
            var existing = await _db.HomeVisitations.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Home visitation {id} not found." });

            _db.HomeVisitations.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Home visitation {id} deleted." });
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to delete home visitation.", detail = ex.Message });
        }
    }
}
