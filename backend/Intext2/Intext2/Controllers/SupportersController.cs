using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/supporters")]
public class SupportersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public SupportersController(ApplicationDbContext db) => _db = db;

    // GET /api/supporters
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? supporterType,
        [FromQuery] string? status,
        [FromQuery] string? relationshipType,
        [FromQuery] string? search,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        try
        {
            if (page < 1)     page     = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _db.Supporters.AsQueryable();

            if (!string.IsNullOrWhiteSpace(supporterType))
                query = query.Where(s => s.SupporterType == supporterType);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status == status);

            if (!string.IsNullOrWhiteSpace(relationshipType))
                query = query.Where(s => s.RelationshipType == relationshipType);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(x =>
                    x.DisplayName.ToLower().Contains(s) ||
                    (x.Email            != null && x.Email.ToLower().Contains(s)) ||
                    (x.OrganizationName != null && x.OrganizationName.ToLower().Contains(s)));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(s => s.DisplayName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new
                {
                    s.SupporterId,
                    s.SupporterType,
                    s.DisplayName,
                    s.OrganizationName,
                    s.FirstName,
                    s.LastName,
                    s.RelationshipType,
                    s.Region,
                    s.Country,
                    s.Email,
                    s.Phone,
                    s.Status,
                    s.CreatedAt,
                    s.FirstDonationDate,
                    s.AcquisitionChannel,
                    OverallImpact = new
                    {
                        MonetaryTotal = s.Donations
                            .Where(d => d.DonationType == "Monetary" && d.Amount != null)
                            .Sum(d => (decimal?)d.Amount) ?? 0,

                        MonetaryCount = s.Donations
                            .Count(d => d.DonationType == "Monetary"),

                        InKindCount = s.Donations
                            .Count(d => d.DonationType == "InKind"),

                        TimeCount = s.Donations
                            .Count(d => d.DonationType == "Time"),

                        SkillsCount = s.Donations
                            .Count(d => d.DonationType == "Skills"),

                        SocialMediaCount = s.Donations
                            .Count(d => d.DonationType == "SocialMedia"),

                        TotalDonationCount = s.Donations.Count(),
                    }
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve supporters.", detail = ex.Message });
        }
    }

    // GET /api/supporters/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var supporter = await _db.Supporters
                .Include(s => s.Donations)
                .FirstOrDefaultAsync(s => s.SupporterId == id);

            if (supporter is null)
                return NotFound(new { message = $"Supporter {id} not found." });

            return Ok(supporter);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve supporter.", detail = ex.Message });
        }
    }

    // POST /api/supporters
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Supporter model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            model.SupporterId = 0;
            model.CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd");
            _db.Supporters.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.SupporterId }, model);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create supporter.", detail = ex.Message, inner = ex.InnerException?.Message, innerInner = ex.InnerException?.InnerException?.Message });
        }
    }

    // PUT /api/supporters/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Supporter model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var existing = await _db.Supporters.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Supporter {id} not found." });

            model.SupporterId = id;
            model.CreatedAt   = existing.CreatedAt;
            _db.Entry(existing).CurrentValues.SetValues(model);
            await _db.SaveChangesAsync();
            return Ok(existing);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update supporter.", detail = ex.Message });
        }
    }

    // DELETE /api/supporters/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmDto body)
    {
        if (!body.Confirmed)
            return BadRequest(new { message = "Deletion must be explicitly confirmed." });
        try
        {
            var existing = await _db.Supporters.FindAsync(id);
            if (existing is null)
                return NotFound(new { message = $"Supporter {id} not found." });

            _db.Supporters.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = $"Supporter {id} deleted." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to retrieve supporter.", detail = ex.Message, stack = ex.StackTrace, inner = ex.InnerException?.Message });
        }
    }
}
