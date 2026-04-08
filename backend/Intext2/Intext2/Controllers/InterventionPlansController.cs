using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/interventionplans")]
public class InterventionPlansController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public InterventionPlansController(ApplicationDbContext db) => _db = db;

    // GET /api/interventionplans
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    residentId,
        [FromQuery] string? status,
        [FromQuery] string? planCategory,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        try
        {
            if (page < 1)     page     = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _db.InterventionPlans.AsQueryable();

            if (residentId.HasValue)
                query = query.Where(p => p.ResidentId == residentId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(p => p.Status == status);

            if (!string.IsNullOrWhiteSpace(planCategory))
                query = query.Where(p => p.PlanCategory == planCategory);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve intervention plans.", detail = ex.Message });
        }
    }

    // GET /api/interventionplans/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var plan = await _db.InterventionPlans
                .Include(p => p.Resident)
                .FirstOrDefaultAsync(p => p.PlanId == id);

            if (plan is null)
                return NotFound(new { message = $"Intervention plan {id} not found." });

            return Ok(plan);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve intervention plan.", detail = ex.Message });
        }
    }

    // POST /api/interventionplans
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] InterventionPlan model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var stamp       = DateTime.UtcNow;
            model.PlanId    = 0;
            model.CreatedAt = stamp;
            model.UpdatedAt = stamp;
            _db.InterventionPlans.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.PlanId }, model);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create intervention plan.", detail = ex.Message });
        }
    }

    // PUT /api/interventionplans/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] InterventionPlan model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var existing = await _db.InterventionPlans.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Intervention plan {id} not found." });

            model.PlanId    = id;
            model.CreatedAt = existing.CreatedAt;
            model.UpdatedAt = DateTime.UtcNow;
            _db.Entry(existing).CurrentValues.SetValues(model);
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update intervention plan.", detail = ex.Message });
        }
    }

    // DELETE /api/interventionplans/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed)
            return BadRequest(new { message = "Deletion must be explicitly confirmed." });
        try
        {
            var existing = await _db.InterventionPlans.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Intervention plan {id} not found." });

            _db.InterventionPlans.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Intervention plan {id} deleted." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to delete intervention plan.", detail = ex.Message });
        }
    }
}
