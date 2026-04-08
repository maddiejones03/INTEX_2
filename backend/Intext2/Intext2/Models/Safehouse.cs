using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("safehouses")]
public class Safehouse
{
    [Key]
    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("safehouse_code")]
    public string SafehouseCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("region")]
    public string Region { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("city")]
    public string City { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("province")]
    public string Province { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("country")]
    public string Country { get; set; } = "Philippines";

    [Column("open_date")]
    public string? OpenDate { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Active";

    [Column("capacity_girls")]
    public int? CapacityGirls { get; set; }

    [Column("capacity_staff")]
    public int? CapacityStaff { get; set; }

    [Column("current_occupancy")]
    public int CurrentOccupancy { get; set; } = 0;

    [Column("notes")]
    public string? Notes { get; set; }

    // Navigation
    public ICollection<Resident>              Residents              { get; set; } = [];
    public ICollection<PartnerAssignment>     PartnerAssignments     { get; set; } = [];
    public ICollection<DonationAllocation>    DonationAllocations    { get; set; } = [];
    public ICollection<IncidentReport>        IncidentReports        { get; set; } = [];
    public ICollection<SafehouseMonthlyMetric> MonthlyMetrics        { get; set; } = [];
}
