using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/safehouses")]
[Authorize(Roles = AuthRoles.Admin)]
public class SafehousesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public SafehousesController(ApplicationDbContext db) => _db = db;

    private static object ToJson(Safehouse s) => new
    {
        safehouseId      = s.SafehouseId,
        safehouseCode    = s.SafehouseCode,
        name             = s.Name,
        region           = s.Region,
        city             = s.City,
        province         = s.Province,
        country          = s.Country,
        openDate         = s.OpenDate,
        status           = s.Status,
        capacityGirls    = s.CapacityGirls,
        capacityStaff    = s.CapacityStaff,
        currentOccupancy = s.CurrentOccupancy,
        notes            = s.Notes,
    };

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _db.Safehouses
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .ToListAsync();
        return Ok(items.Select(ToJson));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await _db.Safehouses.AsNoTracking().FirstOrDefaultAsync(x => x.SafehouseId == id);
        if (s is null) return NotFound(new { message = $"Safe house {id} not found." });
        return Ok(ToJson(s));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SafehouseCreateDto dto)
    {
        var code = dto.SafehouseCode.Trim();
        if (await _db.Safehouses.AnyAsync(s => s.SafehouseCode == code))
            return Conflict(new { message = "Safe house code already exists." });

        var entity = new Safehouse
        {
            SafehouseCode    = code,
            Name             = dto.Name.Trim(),
            Region           = dto.Region.Trim(),
            City             = dto.City.Trim(),
            Province         = dto.Province.Trim(),
            Country          = string.IsNullOrWhiteSpace(dto.Country) ? "Philippines" : dto.Country.Trim(),
            Status           = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
            CapacityGirls    = dto.CapacityGirls,
            CapacityStaff    = dto.CapacityStaff,
            CurrentOccupancy = 0,
            Notes            = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
        };

        _db.Safehouses.Add(entity);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = "Could not create safe house.", detail = ex.Message });
        }

        return StatusCode(201, ToJson(entity));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SafehouseUpdateDto dto)
    {
        var entity = await _db.Safehouses.FirstOrDefaultAsync(s => s.SafehouseId == id);
        if (entity is null) return NotFound(new { message = $"Safe house {id} not found." });

        var code = dto.SafehouseCode.Trim();
        if (await _db.Safehouses.AnyAsync(s => s.SafehouseCode == code && s.SafehouseId != id))
            return Conflict(new { message = "Another safe house already uses this code." });

        entity.SafehouseCode    = code;
        entity.Name             = dto.Name.Trim();
        entity.Region           = dto.Region.Trim();
        entity.City             = dto.City.Trim();
        entity.Province         = dto.Province.Trim();
        entity.Country          = string.IsNullOrWhiteSpace(dto.Country) ? "Philippines" : dto.Country.Trim();
        entity.Status           = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim();
        entity.CapacityGirls    = dto.CapacityGirls;
        entity.CapacityStaff    = dto.CapacityStaff;
        entity.CurrentOccupancy = dto.CurrentOccupancy;
        entity.Notes            = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = "Could not update safe house.", detail = ex.Message });
        }

        return Ok(ToJson(entity));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed) return BadRequest(new { message = "Deletion must be confirmed." });

        var entity = await _db.Safehouses.FirstOrDefaultAsync(s => s.SafehouseId == id);
        if (entity is null) return NotFound(new { message = $"Safe house {id} not found." });

        var residentCount = await _db.Residents.CountAsync(r => r.SafehouseId == id);
        if (residentCount > 0)
            return Conflict(new { message = $"Cannot delete: {residentCount} resident(s) are assigned to this safe house." });

        _db.Safehouses.Remove(entity);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = "Could not delete safe house.", detail = ex.Message });
        }

        return Ok(new { message = "Safe house deleted." });
    }
}
