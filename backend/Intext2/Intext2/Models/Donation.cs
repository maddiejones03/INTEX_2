using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("donations")]
public class Donation
{
    [Key]
    [Column("donation_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int DonationId { get; set; }

    [Column("supporter_id")]
    public int SupporterId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("donation_type")]
    public string DonationType { get; set; } = string.Empty;

    [Column("donation_date")]
    public DateOnly DonationDate { get; set; }

    [Column("is_recurring")]
    public int? IsRecurring { get; set; } = 0;

    [MaxLength(200)]
    [Column("campaign_name")]
    public string? CampaignName { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("channel_source")]
    public string ChannelSource { get; set; } = string.Empty;

    [MaxLength(10)]
    [Column("currency_code")]
    public string? CurrencyCode { get; set; }

    [Column("amount")]
    public double? Amount { get; set; }

    [Column("estimated_value")]
    public double? EstimatedValue { get; set; }

    [MaxLength(20)]
    [Column("impact_unit")]
    public string? ImpactUnit { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("referral_post_id")]
    public int? ReferralPostId { get; set; }

    // Navigation
    [ForeignKey(nameof(SupporterId))]
    public Supporter? Supporter { get; set; }

    [ForeignKey(nameof(ReferralPostId))]
    public SocialMediaPost? ReferralPost { get; set; }

    public ICollection<InKindDonationItem> InKindItems      { get; set; } = [];
    public ICollection<DonationAllocation> Allocations      { get; set; } = [];
}
