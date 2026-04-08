using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("partners")]
public class Partner
{
    [Key]
    [Column("partner_id")]
    public int PartnerId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("partner_name")]
    public string PartnerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("partner_type")]
    public string PartnerType { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("role_type")]
    public string RoleType { get; set; } = string.Empty;

    [MaxLength(200)]
    [Column("contact_name")]
    public string? ContactName { get; set; }

    [MaxLength(255)]
    [Column("email")]
    public string? Email { get; set; }

    [MaxLength(50)]
    [Column("phone")]
    public string? Phone { get; set; }

    [MaxLength(100)]
    [Column("region")]
    public string? Region { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Active";

    [Column("start_date")]
    public string? StartDate { get; set; }

    [Column("end_date")]
    public string? EndDate { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    // Navigation
    public ICollection<PartnerAssignment> Assignments { get; set; } = [];
    public ICollection<Donation>          Donations   { get; set; } = [];
}
