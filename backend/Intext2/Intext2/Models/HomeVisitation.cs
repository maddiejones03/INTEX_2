using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
    public int? SafetyConcernsNoted { get; set; } = 0;

    [Column("follow_up_needed")]
    public int? FollowUpNeeded { get; set; } = 0;

    [Column("follow_up_notes")]
    public string? FollowUpNotes { get; set; }

    [MaxLength(25)]
    [Column("visit_outcome")]
    public string? VisitOutcome { get; set; }

    [Column("cooperation_numeric")]
    public int? CooperationNumeric { get; set; }

    [Column("outcome_numeric")]
    public double? OutcomeNumeric { get; set; }

    // Navigation
    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
