using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("donor_risk_scores")]
public class DonorRiskScore
{
    [Key]
    [Column("supporter_id")]
    public int SupporterId { get; set; }

    [Column("display_name")]
    public string? DisplayName { get; set; }

    [Column("risk_score")]
    public double RiskScore { get; set; }

    [Column("risk_tier")]
    public string? RiskTier { get; set; }

    [Column("priority_score")]
    public double PriorityScore { get; set; }

    [Column("lifetime_value_php")]
    public double LifetimeValuePhp { get; set; }

    [Column("days_since_last_donation")]
    public double DaysSinceLastDonation { get; set; }

    [Column("gap_ratio")]
    public double GapRatio { get; set; }

    [Column("risk_reasons_json")]
    public string? RiskReasonsJson { get; set; }

    [Column("last_scored_at")]
    public string? LastScoredAt { get; set; }

    [Column("snooze_until")]
    public string? SnoozeUntil { get; set; }
}