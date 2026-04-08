using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("risk_alerts")]
public class RiskAlert
{
    [Key]
    [Column("alert_id")]
    public int AlertId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("alert_type")]
    public string? AlertType { get; set; }

    [Column("severity")]
    public string? Severity { get; set; }

    [Column("detail")]
    public string? Detail { get; set; }

    [Column("current_risk_level")]
    public string? CurrentRiskLevel { get; set; }

    [Column("computed_at")]
    public string? ComputedAt { get; set; }
}
