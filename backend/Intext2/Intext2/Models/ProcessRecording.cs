using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("process_recordings")]
public class ProcessRecording
{
    [Key]
    [Column("recording_id")]
    public int RecordingId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("session_date")]
    public DateOnly SessionDate { get; set; }

    [MaxLength(255)]
    [Column("social_worker")]
    public string? SocialWorker { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("session_type")]
    public string SessionType { get; set; } = "Individual";

    [Column("session_duration_minutes")]
    public int? SessionDurationMinutes { get; set; }

    [MaxLength(20)]
    [Column("emotional_state_observed")]
    public string? EmotionalStateObserved { get; set; }

    [MaxLength(20)]
    [Column("emotional_state_end")]
    public string? EmotionalStateEnd { get; set; }

    [Column("session_narrative")]
    public string? SessionNarrative { get; set; }

    [Column("interventions_applied")]
    public string? InterventionsApplied { get; set; }

    [Column("follow_up_actions")]
    public string? FollowUpActions { get; set; }

    [Column("progress_noted")]
    public int? ProgressNoted { get; set; } = 0;

    [Column("concerns_flagged")]
    public int? ConcernsFlagged { get; set; } = 0;

    [Column("referral_made")]
    public int? ReferralMade { get; set; } = 0;

    [Column("notes_restricted")]
    public string? NotesRestricted { get; set; }

    [Column("interventions_list")]
    public string? InterventionsList { get; set; }

    [Column("start_valence")]
    public string? StartValence { get; set; }

    [Column("end_valence")]
    public string? EndValence { get; set; }

    [Column("emotional_improvement")]
    public int? EmotionalImprovement { get; set; }

    // Navigation
    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
