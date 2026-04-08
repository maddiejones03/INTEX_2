using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("incident_reports")]
public class IncidentReport
{
    [Key]
    [Column("incident_id")]
    public int IncidentId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("incident_date")]
    public string? IncidentDate { get; set; }

    [Required]
    [MaxLength(25)]
    [Column("incident_type")]
    public string IncidentType { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    [Column("severity")]
    public string Severity { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("response_taken")]
    public string? ResponseTaken { get; set; }

    [Column("resolved")]
    public bool Resolved { get; set; } = false;

    [Column("resolution_date")]
    public string? ResolutionDate { get; set; }

    [MaxLength(255)]
    [Column("reported_by")]
    public string? ReportedBy { get; set; }

    [Column("follow_up_required")]
    public bool FollowUpRequired { get; set; } = false;

    // Navigation
    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }

    [ForeignKey(nameof(SafehouseId))]
    public Safehouse? Safehouse { get; set; }
}
