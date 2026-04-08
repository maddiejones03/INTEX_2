using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("education_records")]
public class EducationRecord
{
    [Key]
    [Column("education_record_id")]
    public int EducationRecordId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("record_date")]
    public DateOnly RecordDate { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("education_level")]
    public string EducationLevel { get; set; } = string.Empty;

    [MaxLength(200)]
    [Column("school_name")]
    public string? SchoolName { get; set; }

    [MaxLength(20)]
    [Column("enrollment_status")]
    public string? EnrollmentStatus { get; set; }

    [Column("attendance_rate")]
    public decimal? AttendanceRate { get; set; }

    [Column("progress_percent")]
    public decimal? ProgressPercent { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("completion_status")]
    public string CompletionStatus { get; set; } = "NotStarted";

    [Column("notes")]
    public string? Notes { get; set; }

    // Navigation
    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
