using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("safehouse_monthly_metrics")]
public class SafehouseMonthlyMetric
{
    [Key]
    [Column("metric_id")]
    public int MetricId { get; set; }

    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("month_start")]
    public DateOnly MonthStart { get; set; }

    [Column("month_end")]
    public DateOnly MonthEnd { get; set; }

    [Column("active_residents")]
    public int ActiveResidents { get; set; } = 0;

    [Column("avg_education_progress")]
    public decimal? AvgEducationProgress { get; set; }

    [Column("avg_health_score")]
    public decimal? AvgHealthScore { get; set; }

    [Column("process_recording_count")]
    public int ProcessRecordingCount { get; set; } = 0;

    [Column("home_visitation_count")]
    public int HomeVisitationCount { get; set; } = 0;

    [Column("incident_count")]
    public int IncidentCount { get; set; } = 0;

    [Column("notes")]
    public string? Notes { get; set; }

    // Navigation
    [ForeignKey(nameof(SafehouseId))]
    public Safehouse? Safehouse { get; set; }
}
