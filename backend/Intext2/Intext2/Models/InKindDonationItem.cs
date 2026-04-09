using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("in_kind_donation_items")]
public class InKindDonationItem
{
    [Key]
    [Column("item_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int ItemId { get; set; }

    [Column("donation_id")]
    public int DonationId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("item_name")]
    public string ItemName { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    [Column("item_category")]
    public string ItemCategory { get; set; } = string.Empty;

    [Column("quantity")]
    public int Quantity { get; set; }

    [MaxLength(20)]
    [Column("unit_of_measure")]
    public string? UnitOfMeasure { get; set; }

    [Column("estimated_unit_value")]
    public double? EstimatedUnitValue { get; set; }

    [MaxLength(100)]
    [Column("intended_use")]
    public string? IntendedUse { get; set; }

    [MaxLength(20)]
    [Column("received_condition")]
    public string? ReceivedCondition { get; set; }

    // Navigation
    [ForeignKey(nameof(DonationId))]
    public Donation? Donation { get; set; }
}
