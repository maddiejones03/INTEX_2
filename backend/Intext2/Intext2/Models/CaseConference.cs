using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("case_conferences")]
public class CaseConference
{
    [Key]
    [Column("conference_id")]
    public int ConferenceId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("conference_date")]
    public DateOnly ConferenceDate { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("conference_type")]
    public string ConferenceType { get; set; } = "Routine Follow-Up";

    [MaxLength(255)]
    [Column("facilitator")]
    public string? Facilitator { get; set; }

    [Column("agenda")]
    public string? Agenda { get; set; }

    [Column("discussion_notes")]
    public string? DiscussionNotes { get; set; }

    [Column("action_items")]
    public string? ActionItems { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Scheduled";

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
