using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/residents")]
public class ResidentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public ResidentsController(ApplicationDbContext db) => _db = db;
    private const string SchemaMismatchMessage = "Database schema mismatch detected for residents data. Ensure Azure SQL column types match EF migrations.";

    private static string NormalizeSex(string? sex)
    {
        if (string.IsNullOrWhiteSpace(sex)) return "F";
        var value = sex.Trim().ToLowerInvariant();
        return value switch
        {
            "female" or "f" => "F",
            "male" or "m" => "M",
            _ => "O"
        };
    }

    private static bool IsSchemaTypeMismatch(Exception ex)
        => ex is InvalidCastException
           || ex.Message.Contains("Unable to cast object of type", StringComparison.OrdinalIgnoreCase);

    // GET /api/residents
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    safehouseId,
        [FromQuery] string? caseStatus,
        [FromQuery] string? caseCategory,
        [FromQuery] string? currentRiskLevel,
        [FromQuery] string? search,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        try
        {
            if (page < 1)     page     = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _db.Residents.AsQueryable();

            if (safehouseId.HasValue)
                query = query.Where(r => r.SafehouseId == safehouseId.Value);

            if (!string.IsNullOrWhiteSpace(caseStatus))
                query = query.Where(r => r.CaseStatus == caseStatus);

            if (!string.IsNullOrWhiteSpace(caseCategory))
                query = query.Where(r => r.CaseCategory == caseCategory);

            if (!string.IsNullOrWhiteSpace(currentRiskLevel))
                query = query.Where(r => r.CurrentRiskLevel == currentRiskLevel);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(r =>
                    r.CaseControlNo.ToLower().Contains(s) ||
                    (r.AssignedSocialWorker != null && r.AssignedSocialWorker.ToLower().Contains(s)) ||
                    (r.InternalCode        != null && r.InternalCode.ToLower().Contains(s)));
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(r => r.DateOfAdmission)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    r.ResidentId,
                    r.CaseControlNo,
                    r.InternalCode,
                    r.SafehouseId,
                    r.CaseStatus,
                    r.Sex,
                    r.DateOfBirth,
                    r.CaseCategory,
                    r.CurrentRiskLevel,
                    r.InitialRiskLevel,
                    r.DateOfAdmission,
                    r.ReintegrationStatus,
                    r.AssignedSocialWorker,
                    r.CreatedAt,
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to retrieve residents.", detail = ex.Message });
        }
    }

    // GET /api/residents/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var resident = await _db.Residents
                .Include(r => r.Safehouse)
                .FirstOrDefaultAsync(r => r.ResidentId == id);

            if (resident is null)
                return NotFound(new { message = $"Resident {id} not found." });

            return Ok(resident);
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to retrieve resident.", detail = ex.Message });
        }
    }

    // POST /api/residents
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Resident model)
    {
        model.Sex = NormalizeSex(model.Sex);
        if (model.DateOfAdmission == default)
            model.DateOfAdmission = DateOnly.FromDateTime(DateTime.UtcNow);
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            model.ResidentId = 0;
            model.CreatedAt  = DateTime.UtcNow;
            _db.Residents.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.ResidentId }, model);
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to create resident.", detail = ex.Message });
        }
    }

    // PUT /api/residents/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Resident model)
    {
        model.Sex = NormalizeSex(model.Sex);
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var existing = await _db.Residents.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Resident {id} not found." });

            // Preserve immutable fields
            model.ResidentId = id;
            model.CreatedAt  = existing.CreatedAt;
            if (model.DateOfAdmission == default)
                model.DateOfAdmission = existing.DateOfAdmission;
            _db.Entry(existing).CurrentValues.SetValues(model);
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to update resident.", detail = ex.Message });
        }
    }

    // DELETE /api/residents/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed)
            return BadRequest(new { message = "Deletion must be explicitly confirmed." });
        try
        {
            var existing = await _db.Residents.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Resident {id} not found." });

            _db.Residents.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Resident {id} deleted." });
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to delete resident.", detail = ex.Message });
        }
    }
}
