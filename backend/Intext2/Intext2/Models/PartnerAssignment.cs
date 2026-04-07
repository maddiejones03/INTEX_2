using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("partner_assignments")]
public class PartnerAssignment
{
    [Key]
    [Column("assignment_id")]
    public int AssignmentId { get; set; }

    [Column("partner_id")]
    public int PartnerId { get; set; }

    [Column("safehouse_id")]
    public int? SafehouseId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("program_area")]
    public string ProgramArea { get; set; } = string.Empty;

    [Column("assignment_start")]
    public DateOnly AssignmentStart { get; set; }

    [Column("assignment_end")]
    public DateOnly? AssignmentEnd { get; set; }

    [Column("responsibility_notes")]
    public string? ResponsibilityNotes { get; set; }

    [Column("is_primary")]
    public bool IsPrimary { get; set; } = false;

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Active";

    // Navigation
    [ForeignKey(nameof(PartnerId))]
    public Partner? Partner { get; set; }

    [ForeignKey(nameof(SafehouseId))]
    public Safehouse? Safehouse { get; set; }
}
