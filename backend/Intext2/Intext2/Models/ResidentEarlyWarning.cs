using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("resident_early_warning")]
public class ResidentEarlyWarning
{
    [Key]
    [Column("resident_id")]
    public int ResidentId { get; set; }

    // Cooperation trajectory fields
    [Column("trend_direction")]
    public string? TrendDirection { get; set; }

    [Column("cooperation_slope_3m")]
    public double? CooperationSlope3m { get; set; }

    [Column("cooperation_slope_all")]
    public double? CooperationSlopeAll { get; set; }

    [Column("current_cooperation_score")]
    public double? CurrentCooperationScore { get; set; }

    [Column("total_visits")]
    public int? TotalVisits { get; set; }

    [Column("pct_favorable_outcomes")]
    public double? PctFavorableOutcomes { get; set; }

    [Column("pct_safety_concerns")]
    public double? PctSafetyConcerns { get; set; }

    // ML model output fields
    [Column("risk_regression_probability")]
    public double? RiskRegressionProbability { get; set; }

    [Column("risk_category")]
    public string? RiskCategory { get; set; }

    [Column("top_risk_factor_1")]
    public string? TopRiskFactor1 { get; set; }

    [Column("top_risk_factor_2")]
    public string? TopRiskFactor2 { get; set; }

    [Column("top_risk_factor_3")]
    public string? TopRiskFactor3 { get; set; }

    [Column("model_name")]
    public string? ModelName { get; set; }

    [Column("computed_at")]
    public DateTime? ComputedAt { get; set; }
}
