using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("public_impact_snapshots")]
public class PublicImpactSnapshot
{
    [Key]
    [Column("snapshot_id")]
    public int SnapshotId { get; set; }

    [Column("snapshot_date")]
    public string? SnapshotDate { get; set; }

    [MaxLength(500)]
    [Column("headline")]
    public string? Headline { get; set; }

    [Column("summary_text")]
    public string? SummaryText { get; set; }

    [Column("metric_payload_json")]
    public string? MetricPayloadJson { get; set; }

    [Column("is_published")]
    public bool IsPublished { get; set; } = false;

    [Column("published_at")]
    public string? PublishedAt { get; set; }
}
