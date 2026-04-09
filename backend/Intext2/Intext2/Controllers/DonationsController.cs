using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Intext2.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intext2.Controllers;

[ApiController]
[Route("api/donations")]
public class DonationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IEmailService _email;
    private readonly UserManager<ApplicationUser> _userManager;

    public DonationsController(
        ApplicationDbContext db,
        IEmailService email,
        UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _email = email;
        _userManager = userManager;
    }
    private const string SchemaMismatchMessage = "Database schema mismatch detected for donations data. Ensure Azure SQL column types match EF migrations.";

    private static bool IsSchemaTypeMismatch(Exception ex)
        => ex is InvalidCastException
           || ex.Message.Contains("Unable to cast object of type", StringComparison.OrdinalIgnoreCase);

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

            if (User.IsInRole(AuthRoles.CaseManager))
                return Forbid();

            var appUser = await _userManager.GetUserAsync(User);
            if (appUser is null)
                return Unauthorized();

            var query = _db.Donations.AsQueryable();

            if (User.IsInRole(AuthRoles.Donor))
            {
                if (appUser.SupporterId is null)
                {
                    return Ok(new
                    {
                        total = 0,
                        page,
                        pageSize,
                        items = Array.Empty<Donation>(),
                        message = "No supporter profile is linked to this account yet.",
                    });
                }

                query = query.Where(d => d.SupporterId == appUser.SupporterId);
            }
            else if (User.IsInRole(AuthRoles.Admin))
            {
                if (supporterId.HasValue)
                    query = query.Where(d => d.SupporterId == supporterId.Value);
            }
            else
            {
                return Forbid();
            }

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
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
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
            if (User.IsInRole(AuthRoles.CaseManager))
                return Forbid();

            var donation = await _db.Donations
                .Include(d => d.Supporter)
                .Include(d => d.InKindItems)
                .Include(d => d.Allocations)
                .FirstOrDefaultAsync(d => d.DonationId == id);

            if (donation is null)
                return NotFound(new { message = $"Donation {id} not found." });

            var appUser = await _userManager.GetUserAsync(User);
            if (appUser is null)
                return Unauthorized();

            if (User.IsInRole(AuthRoles.Donor))
            {
                if (appUser.SupporterId is null || donation.SupporterId != appUser.SupporterId)
                    return NotFound(new { message = $"Donation {id} not found." });
            }
            else if (!User.IsInRole(AuthRoles.Admin))
                return Forbid();

            return Ok(donation);
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to retrieve donation.", detail = ex.Message });
        }
    }

    // POST /api/donations/public  (unauthenticated — Time & InKind only)
    [HttpPost("public")]
    [AllowAnonymous]
    public async Task<IActionResult> CreatePublic([FromBody] PublicDonationDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (dto.DonationType == "Time" && (!dto.EstimatedHours.HasValue || dto.EstimatedHours <= 0))
            return BadRequest(new { message = "EstimatedHours is required for Time donations." });

        if (dto.DonationType == "InKind" && (dto.InKindItems is null || dto.InKindItems.Count == 0))
            return BadRequest(new { message = "At least one InKindItem is required for InKind donations." });

        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var supporter = await _db.Supporters.FirstOrDefaultAsync(s => s.Email == dto.DonorEmail);
            if (supporter is null)
            {
                var maxSupporterId = await _db.Supporters.AnyAsync()
                    ? await _db.Supporters.MaxAsync(s => s.SupporterId)
                    : 0;

                supporter = new Supporter
                {
                    SupporterId    = maxSupporterId + 1,
                    SupporterType  = "Individual",
                    DisplayName    = dto.DonorName,
                    FirstName      = dto.DonorName.Split(' ').FirstOrDefault(),
                    LastName       = dto.DonorName.Split(' ').Length > 1
                                     ? string.Join(' ', dto.DonorName.Split(' ').Skip(1))
                                     : null,
                    RelationshipType = "Donor",
                    Email            = dto.DonorEmail,
                    Status           = "Active",
                    CreatedAt        = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    FirstDonationDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    AcquisitionChannel = "Direct",
                };
                _db.Supporters.Add(supporter);
                await _db.SaveChangesAsync();
            }

            var maxDonationId = await _db.Donations.AnyAsync()
                ? await _db.Donations.MaxAsync(d => d.DonationId)
                : 0;

            var donation = new Donation
            {
                DonationId   = maxDonationId + 1,
                SupporterId  = supporter.SupporterId,
                DonationType = dto.DonationType,
                DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                IsRecurring  = false,
                ChannelSource = "Direct",
                Notes         = dto.Notes,
            };

            if (dto.DonationType == "Time")
            {
                donation.Amount      = dto.EstimatedHours;
                donation.ImpactUnit  = "hours";
            }

            _db.Donations.Add(donation);
            await _db.SaveChangesAsync();

            if (dto.DonationType == "InKind" && dto.InKindItems is not null)
            {
                var maxItemId = await _db.InKindDonationItems.AnyAsync()
                    ? await _db.InKindDonationItems.MaxAsync(i => i.ItemId)
                    : 0;

                foreach (var item in dto.InKindItems)
                {
                    maxItemId++;
                    _db.InKindDonationItems.Add(new InKindDonationItem
                    {
                        ItemId             = maxItemId,
                        DonationId         = donation.DonationId,
                        ItemName           = item.ItemName,
                        ItemCategory       = item.ItemCategory,
                        Quantity           = item.Quantity,
                        UnitOfMeasure      = item.UnitOfMeasure,
                        EstimatedUnitValue = item.EstimatedUnitValue,
                        IntendedUse        = item.IntendedUse,
                        ReceivedCondition  = item.ReceivedCondition,
                    });
                }
                await _db.SaveChangesAsync();
            }

            if (!string.IsNullOrWhiteSpace(dto.ProgramArea))
            {
                donation.Notes = string.IsNullOrWhiteSpace(donation.Notes)
                    ? $"Preferred program area: {dto.ProgramArea}"
                    : $"{donation.Notes} | Preferred program area: {dto.ProgramArea}";
                await _db.SaveChangesAsync();
            }

            await tx.CommitAsync();

            var emailDetails = dto.DonationType == "Time"
                ? $"Type: Volunteer Time<br/>Hours pledged: {dto.EstimatedHours}<br/>Program area: {dto.ProgramArea ?? "Any"}"
                : $"Type: In-Kind Goods<br/>Items: {dto.InKindItems?.Count ?? 0} item(s)";

            _ = _email.SendDonationConfirmationAsync(
                dto.DonorEmail, dto.DonorName, dto.DonationType, emailDetails);

            return CreatedAtAction(nameof(GetById), new { id = donation.DonationId }, new
            {
                donationId   = donation.DonationId,
                donationType = donation.DonationType,
                message      = "Thank you for your donation!",
            });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to submit donation.", detail = ex.Message });
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
            var maxId = await _db.Donations.AnyAsync()
                ? await _db.Donations.MaxAsync(d => d.DonationId)
                : 0;
            model.DonationId = maxId + 1;
            _db.Donations.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = model.DonationId }, model);
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
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
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
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
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new { message = "Failed to delete donation.", detail = ex.Message });
        }
    }
}
