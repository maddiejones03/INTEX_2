using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Intext2.Models;

[Table("home_visitations")]
public class HomeVisitation
{
    [Key]
    [Column("visitation_id")]
    public int VisitationId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("visit_date")]
    public DateOnly VisitDate { get; set; }

    [MaxLength(255)]
    [Column("social_worker")]
    public string? SocialWorker { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("visit_type")]
    public string VisitType { get; set; } = string.Empty;

    [Column("location_visited")]
    public string? LocationVisited { get; set; }

    [Column("family_members_present")]
    public string? FamilyMembersPresent { get; set; }

    [Column("purpose")]
    public string? Purpose { get; set; }

    [Column("observations")]
    public string? Observations { get; set; }

    [Required]
    [MaxLength(25)]
    [Column("family_cooperation_level")]
    public string FamilyCooperationLevel { get; set; } = "Cooperative";

    [Column("safety_concerns_noted")]
    public int? SafetyConcernsNoted { get; set; }

    [Column("follow_up_needed")]
    public int? FollowUpNeeded { get; set; }

    [Column("follow_up_notes")]
    public string? FollowUpNotes { get; set; }

    [MaxLength(25)]
    [Column("visit_outcome")]
    public string? VisitOutcome { get; set; }

    /// <summary>
    /// Derived in ML/data prep only; not a column on Azure SQL home_visitations (see schema_sqlserver.sql).
    /// </summary>
    [NotMapped]
    public int? CooperationNumeric { get; set; }

    /// <summary>
    /// Derived in ML/data prep only; not a column on Azure SQL home_visitations.
    /// </summary>
    [NotMapped]
    public double? OutcomeNumeric { get; set; }

    // Navigation (never bind from JSON on create/update — prevents EF from tracking a related graph)
    [ForeignKey(nameof(ResidentId))]
    [JsonIgnore]
    public Resident? Resident { get; set; }
}
