using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("posting_schedule")]
public class PostingSchedule
{
    [Key]
    [Column("schedule_date")]
    public string? ScheduleDate { get; set; }

    [Column("platform")]
    public string? Platform { get; set; }

    [Column("day_of_week")]
    public string? DayOfWeek { get; set; }

    [Column("post_hour")]
    public int? PostHour { get; set; }

    [Column("post_type")]
    public string? PostType { get; set; }

    [Column("media_type")]
    public string? MediaType { get; set; }

    [Column("sentiment_tone")]
    public string? SentimentTone { get; set; }

    [Column("has_call_to_action")]
    public bool? HasCallToAction { get; set; }

    [Column("call_to_action_type")]
    public string? CallToActionType { get; set; }

    [Column("is_boosted")]
    public bool? IsBoosted { get; set; }

    [Column("features_resident_story")]
    public bool? FeaturesResidentStory { get; set; }

    [Column("p_any_referral")]
    public double? PAnyReferral { get; set; }

    [Column("predicted_referrals")]
    public double? PredictedReferrals { get; set; }

    [Column("computed_at")]
    public string? ComputedAt { get; set; }
}
