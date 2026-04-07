using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/donations")]
public class DonationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public DonationsController(ApplicationDbContext db) => _db = db;

    // GET /api/donations
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?        supporterId,
        [FromQuery] string?     donationType,
        [FromQuery] string?     campaignName,
        [FromQuery] DateOnly?   dateFrom,
        [FromQuery] DateOnly?   dateTo,
        [FromQuery] int         page     = 1,
        [FromQuery] int         pageSize = 20)
    {
        try
        {
            if (page < 1)     page     = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _db.Donations.AsQueryable();

            if (supporterId.HasValue)
                query = query.Where(d => d.SupporterId == supporterId.Value);

            if (!string.IsNullOrWhiteSpace(donationType))
                query = query.Where(d => d.DonationType == donationType);

            if (!string.IsNullOrWhiteSpace(campaignName))
                query = query.Where(d => d.CampaignName != null &&
                                         d.CampaignName.ToLower().Contains(campaignName.ToLower()));

            if (dateFrom.HasValue)
                query = query.Where(d => d.DonationDate >= dateFrom.Value);

            if (dateTo.HasValue)
                query = query.Where(d => d.DonationDate <= dateTo.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(d => d.DonationDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(d => d.Supporter)
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve donations.", detail = ex.Message });
        }
    }

    // GET /api/donations/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var donation = await _db.Donations
                .Include(d => d.Supporter)
                .Include(d => d.InKindItems)
                .Include(d => d.Allocations)
                .FirstOrDefaultAsync(d => d.DonationId == id);

            if (donation is null)
                return NotFound(new { message = $"Donation {id} not found." });

            return Ok(donation);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve donation.", detail = ex.Message });
        }
    }

    // POST /api/donations
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Donation model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            model.DonationId = 0;
            _db.Donations.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.DonationId }, model);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create donation.", detail = ex.Message });
        }
    }

    // PUT /api/donations/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Donation model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var existing = await _db.Donations.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Donation {id} not found." });

            model.DonationId = id;
            _db.Entry(existing).CurrentValues.SetValues(model);
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update donation.", detail = ex.Message });
        }
    }

    // DELETE /api/donations/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed)
            return BadRequest(new { message = "Deletion must be explicitly confirmed." });
        try
        {
            var existing = await _db.Donations.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Donation {id} not found." });

            _db.Donations.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Donation {id} deleted." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to delete donation.", detail = ex.Message });
        }
    }
}
