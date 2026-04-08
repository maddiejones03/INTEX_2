using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("donation_allocations")]
public class DonationAllocation
{
    [Key]
    [Column("allocation_id")]
    public int AllocationId { get; set; }

    [Column("donation_id")]
    public int DonationId { get; set; }

    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("program_area")]
    public string ProgramArea { get; set; } = string.Empty;

    [Column("amount_allocated")]
    public double AmountAllocated { get; set; }

    [Column("allocation_date")]
    public string? AllocationDate { get; set; }

    [Column("allocation_notes")]
    public string? AllocationNotes { get; set; }

    // Navigation
    [ForeignKey(nameof(DonationId))]
    public Donation? Donation { get; set; }

    [ForeignKey(nameof(SafehouseId))]
    public Safehouse? Safehouse { get; set; }
}
