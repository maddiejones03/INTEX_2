using System.Data;
using System.Data.Common;
using System.Text;
using Intext2.Data;
using Intext2.Dtos;
using Intext2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
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

    private static string DeepestExceptionMessage(Exception ex)
    {
        for (var cur = ex; cur != null; cur = cur.InnerException!)
        {
            if (cur is SqlException sx)
                return string.IsNullOrWhiteSpace(sx.Message) ? ex.Message : sx.Message;
        }

        var parts = new List<string>();
        for (var cur = ex; cur != null; cur = cur.InnerException!)
        {
            var m = cur.Message;
            if (string.IsNullOrWhiteSpace(m)) continue;
            if (m.Contains("See the inner exception", StringComparison.OrdinalIgnoreCase)) continue;
            parts.Add(m);
        }

        return parts.Count > 0 ? string.Join(" — ", parts) : ex.Message;
    }

    private static readonly HashSet<string> AllowedVisitTypes = new(StringComparer.Ordinal)
    {
        "Initial Assessment",
        "Routine Follow-Up",
        "Reintegration Assessment",
        "Post-Placement Monitoring",
        "Emergency",
    };

    private static readonly HashSet<string> AllowedCooperationLevels = new(StringComparer.Ordinal)
    {
        "Highly Cooperative",
        "Cooperative",
        "Neutral",
        "Uncooperative",
    };

    private static string? NullIfWhiteSpace(string? s)
        => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private const string HomeVisitationSelectColumns = """
        SELECT
            ISNULL(visitation_id, 0) AS VisitationId,
            ISNULL(resident_id, 0) AS ResidentId,
            TRY_CONVERT(datetime2, visit_date) AS VisitDate,
            social_worker AS SocialWorker,
            COALESCE(visit_type, N'Routine Follow-Up') AS VisitType,
            location_visited AS LocationVisited,
            family_members_present AS FamilyMembersPresent,
            purpose AS Purpose,
            observations AS Observations,
            COALESCE(family_cooperation_level, N'Cooperative') AS FamilyCooperationLevel,
            CASE WHEN safety_concerns_noted IS NULL THEN 0 ELSE CAST(safety_concerns_noted AS INT) END AS SafetyConcernsNoted,
            CASE WHEN follow_up_needed IS NULL THEN 0 ELSE CAST(follow_up_needed AS INT) END AS FollowUpNeeded,
            follow_up_notes AS FollowUpNotes,
            visit_outcome AS VisitOutcome
        """;

    private static void AppendWhereClause(StringBuilder where, int? residentId, string? visitType)
    {
        if (residentId.HasValue)
            where.Append(" AND resident_id = @rid");
        if (!string.IsNullOrWhiteSpace(visitType))
            where.Append(" AND visit_type = @vtype");
    }

    private static void BindWhereParameters(DbCommand cmd, int? residentId, string? visitType)
    {
        if (residentId.HasValue)
            cmd.Parameters.Add(new SqlParameter("@rid", SqlDbType.Int) { Value = residentId.Value });
        if (!string.IsNullOrWhiteSpace(visitType))
            cmd.Parameters.Add(new SqlParameter("@vtype", SqlDbType.NVarChar, 30) { Value = visitType.Trim() });
    }

    private static HomeVisitationListRowDto ReadRow(DbDataReader r)
    {
        return new HomeVisitationListRowDto
        {
            VisitationId = GetInt32Strict(r, "VisitationId"),
            ResidentId = GetInt32Strict(r, "ResidentId"),
            VisitDate = GetDateTimeNullable(r, "VisitDate"),
            SocialWorker = GetStringNullable(r, "SocialWorker"),
            VisitType = GetStringNullable(r, "VisitType") ?? "Routine Follow-Up",
            LocationVisited = GetStringNullable(r, "LocationVisited"),
            FamilyMembersPresent = GetStringNullable(r, "FamilyMembersPresent"),
            Purpose = GetStringNullable(r, "Purpose"),
            Observations = GetStringNullable(r, "Observations"),
            FamilyCooperationLevel = GetStringNullable(r, "FamilyCooperationLevel") ?? "Cooperative",
            SafetyConcernsNoted = GetInt32Loose(r, "SafetyConcernsNoted"),
            FollowUpNeeded = GetInt32Loose(r, "FollowUpNeeded"),
            FollowUpNotes = GetStringNullable(r, "FollowUpNotes"),
            VisitOutcome = GetStringNullable(r, "VisitOutcome"),
        };
    }

    private static int GetInt32Strict(DbDataReader r, string name)
    {
        var ord = r.GetOrdinal(name);
        if (r.IsDBNull(ord)) return 0;
        return Convert.ToInt32(r.GetValue(ord));
    }

    private static int GetInt32Loose(DbDataReader r, string name)
    {
        var ord = r.GetOrdinal(name);
        if (r.IsDBNull(ord)) return 0;
        var v = r.GetValue(ord);
        if (v is bool b) return b ? 1 : 0;
        return Convert.ToInt32(v);
    }

    private static DateTime? GetDateTimeNullable(DbDataReader r, string name)
    {
        var ord = r.GetOrdinal(name);
        if (r.IsDBNull(ord)) return null;
        var v = r.GetValue(ord);
        if (v is DateTime dt) return dt;
        if (v is string s && DateTime.TryParse(s, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.RoundtripKind, out var parsed))
            return parsed;
        return null;
    }

    private static string? GetStringNullable(DbDataReader r, string name)
    {
        var ord = r.GetOrdinal(name);
        if (r.IsDBNull(ord)) return null;
        return Convert.ToString(r.GetValue(ord));
    }

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

            var where = new StringBuilder("WHERE 1=1");
            AppendWhereClause(where, residentId, visitType);

            await _db.Database.OpenConnectionAsync(HttpContext.RequestAborted);
            try
            {
                var conn = _db.Database.GetDbConnection();

                int total;
                await using (var countCmd = conn.CreateCommand())
                {
                    countCmd.CommandText = $"SELECT COUNT(*) FROM home_visitations {where}";
                    BindWhereParameters(countCmd, residentId, visitType);
                    var scalar = await countCmd.ExecuteScalarAsync(HttpContext.RequestAborted);
                    total = Convert.ToInt32(scalar);
                }

                var skip = (page - 1) * pageSize;
                await using var listCmd = conn.CreateCommand();
                listCmd.CommandText = $"""
                    {HomeVisitationSelectColumns}
                    FROM home_visitations
                    {where}
                    ORDER BY TRY_CONVERT(datetime2, visit_date) DESC, visitation_id DESC
                    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
                    """;
                BindWhereParameters(listCmd, residentId, visitType);
                listCmd.Parameters.Add(new SqlParameter("@skip", SqlDbType.Int) { Value = skip });
                listCmd.Parameters.Add(new SqlParameter("@take", SqlDbType.Int) { Value = pageSize });

                var items = new List<HomeVisitationListRowDto>();
                await using var reader = await listCmd.ExecuteReaderAsync(HttpContext.RequestAborted);
                while (await reader.ReadAsync(HttpContext.RequestAborted))
                    items.Add(ReadRow(reader));

                return Ok(new { total, page, pageSize, items });
            }
            finally
            {
                await _db.Database.CloseConnectionAsync();
            }
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
            await _db.Database.OpenConnectionAsync(HttpContext.RequestAborted);
            try
            {
                var conn = _db.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = $"""
                    {HomeVisitationSelectColumns}
                    FROM home_visitations
                    WHERE visitation_id = @id
                    """;
                cmd.Parameters.Add(new SqlParameter("@id", SqlDbType.Int) { Value = id });

                await using var reader = await cmd.ExecuteReaderAsync(HttpContext.RequestAborted);
                if (!await reader.ReadAsync(HttpContext.RequestAborted))
                    return NotFound(new { message = $"Home visitation {id} not found." });

                return Ok(ReadRow(reader));
            }
            finally
            {
                await _db.Database.CloseConnectionAsync();
            }
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
    public async Task<IActionResult> Create([FromBody] HomeVisitationCreateDto dto)
    {
        if (dto.ResidentId <= 0)
            return BadRequest(new { message = "A valid resident is required." });
        if (string.IsNullOrWhiteSpace(dto.Observations))
            return BadRequest(new { message = "Observations are required." });
        if (string.IsNullOrWhiteSpace(dto.VisitType))
            return BadRequest(new { message = "Visit type is required." });
        if (string.IsNullOrWhiteSpace(dto.FamilyCooperationLevel))
            return BadRequest(new { message = "Family cooperation level is required." });

        var visitType = dto.VisitType.Trim();
        var coop      = dto.FamilyCooperationLevel.Trim();
        if (!AllowedVisitTypes.Contains(visitType))
            return BadRequest(new { message = "Visit type is not allowed for this database.", detail = visitType });
        if (!AllowedCooperationLevels.Contains(coop))
            return BadRequest(new { message = "Family cooperation level is not allowed for this database.", detail = coop });

        var visitOutcome = NullIfWhiteSpace(dto.VisitOutcome);
        if (visitOutcome is not null)
        {
            const StringComparison o = StringComparison.Ordinal;
            if (!visitOutcome.Equals("Favorable", o)
                && !visitOutcome.Equals("Needs Improvement", o)
                && !visitOutcome.Equals("Unfavorable", o)
                && !visitOutcome.Equals("Inconclusive", o))
                return BadRequest(new { message = "Visit outcome is not allowed for this database.", detail = visitOutcome });
        }

        var residentExists = await _db.Residents.AnyAsync(r => r.ResidentId == dto.ResidentId, HttpContext.RequestAborted);
        if (!residentExists)
            return BadRequest(new { message = "No resident exists with the given id.", detail = dto.ResidentId.ToString() });

        try
        {
            await _db.Database.OpenConnectionAsync(HttpContext.RequestAborted);
            try
            {
                var conn = _db.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = """
                    INSERT INTO home_visitations (
                        resident_id, visit_date, social_worker, visit_type,
                        location_visited, family_members_present, purpose, observations,
                        family_cooperation_level, safety_concerns_noted, follow_up_needed,
                        follow_up_notes, visit_outcome
                    ) VALUES (
                        @resident_id, @visit_date, @social_worker, @visit_type,
                        @location_visited, @family_members_present, @purpose, @observations,
                        @family_cooperation_level, @safety_concerns_noted, @follow_up_needed,
                        @follow_up_notes, @visit_outcome
                    );
                    SELECT CAST(SCOPE_IDENTITY() AS int);
                    """;

                static object DbStr(string? s) => string.IsNullOrWhiteSpace(s) ? DBNull.Value : s.Trim();

                cmd.Parameters.Add(new SqlParameter("@resident_id", SqlDbType.Int) { Value = dto.ResidentId });
                cmd.Parameters.Add(new SqlParameter("@visit_date", SqlDbType.Date)
                {
                    Value = dto.VisitDate.ToDateTime(TimeOnly.MinValue),
                });
                cmd.Parameters.Add(new SqlParameter("@social_worker", SqlDbType.NVarChar, 255) { Value = DbStr(dto.SocialWorker) });
                cmd.Parameters.Add(new SqlParameter("@visit_type", SqlDbType.NVarChar, 30) { Value = visitType });
                cmd.Parameters.Add(new SqlParameter("@location_visited", SqlDbType.NVarChar, -1) { Value = DbStr(dto.LocationVisited) });
                cmd.Parameters.Add(new SqlParameter("@family_members_present", SqlDbType.NVarChar, -1) { Value = DbStr(dto.FamilyMembersPresent) });
                cmd.Parameters.Add(new SqlParameter("@purpose", SqlDbType.NVarChar, -1) { Value = DbStr(dto.Purpose) });
                cmd.Parameters.Add(new SqlParameter("@observations", SqlDbType.NVarChar, -1) { Value = dto.Observations.Trim() });
                cmd.Parameters.Add(new SqlParameter("@family_cooperation_level", SqlDbType.NVarChar, 25) { Value = coop });
                cmd.Parameters.Add(new SqlParameter("@safety_concerns_noted", SqlDbType.Bit) { Value = dto.SafetyConcernsNoted });
                cmd.Parameters.Add(new SqlParameter("@follow_up_needed", SqlDbType.Bit) { Value = dto.FollowUpNeeded });
                cmd.Parameters.Add(new SqlParameter("@follow_up_notes", SqlDbType.NVarChar, -1) { Value = DbStr(dto.FollowUpNotes) });
                cmd.Parameters.Add(new SqlParameter("@visit_outcome", SqlDbType.NVarChar, 25)
                {
                    Value = visitOutcome is null ? DBNull.Value : visitOutcome,
                });

                var scalar = await cmd.ExecuteScalarAsync(HttpContext.RequestAborted);
                var newId  = Convert.ToInt32(scalar);

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = newId },
                    new { visitationId = newId, residentId = dto.ResidentId, visitDate = dto.VisitDate, visitType });
            }
            finally
            {
                await _db.Database.CloseConnectionAsync();
            }
        }
        catch (DbException ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new
            {
                message = "Failed to create home visitation.",
                detail  = DeepestExceptionMessage(ex),
            });
        }
        catch (Exception ex)
        {
            if (IsSchemaTypeMismatch(ex))
                return StatusCode(500, new { message = SchemaMismatchMessage });
            return StatusCode(500, new
            {
                message = "Failed to create home visitation.",
                detail  = DeepestExceptionMessage(ex),
            });
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
