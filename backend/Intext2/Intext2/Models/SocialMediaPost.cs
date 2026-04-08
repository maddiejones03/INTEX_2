using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("social_media_posts")]
public class SocialMediaPost
{
    [Key]
    [Column("post_id")]
    public int PostId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("platform")]
    public string Platform { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("platform_post_id")]
    public string? PlatformPostId { get; set; }

    [Column("post_url")]
    public string? PostUrl { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [MaxLength(10)]
    [Column("day_of_week")]
    public string? DayOfWeek { get; set; }

    [Column("post_hour")]
    public short? PostHour { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("post_type")]
    public string PostType { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("media_type")]
    public string MediaType { get; set; } = string.Empty;

    [Column("caption")]
    public string? Caption { get; set; }

    [Column("hashtags")]
    public string? Hashtags { get; set; }

    [Column("num_hashtags")]
    public int NumHashtags { get; set; } = 0;

    [Column("mentions_count")]
    public int MentionsCount { get; set; } = 0;

    [Column("has_call_to_action")]
    public bool HasCallToAction { get; set; } = false;

    [MaxLength(20)]
    [Column("call_to_action_type")]
    public string? CallToActionType { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("content_topic")]
    public string ContentTopic { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("sentiment_tone")]
    public string SentimentTone { get; set; } = string.Empty;

    [Column("caption_length")]
    public int CaptionLength { get; set; } = 0;

    [Column("features_resident_story")]
    public bool FeaturesResidentStory { get; set; } = false;

    [MaxLength(200)]
    [Column("campaign_name")]
    public string? CampaignName { get; set; }

    [Column("is_boosted")]
    public bool IsBoosted { get; set; } = false;

    [Column("boost_budget_php")]
    public decimal? BoostBudgetPhp { get; set; }

    [Column("impressions")]
    public int Impressions { get; set; } = 0;

    [Column("reach")]
    public int Reach { get; set; } = 0;

    [Column("likes")]
    public int Likes { get; set; } = 0;

    [Column("comments")]
    public int Comments { get; set; } = 0;

    [Column("shares")]
    public int Shares { get; set; } = 0;

    [Column("saves")]
    public int Saves { get; set; } = 0;

    [Column("click_throughs")]
    public int ClickThroughs { get; set; } = 0;

    [Column("video_views")]
    public int? VideoViews { get; set; }

    [Column("engagement_rate")]
    public decimal EngagementRate { get; set; } = 0;

    [Column("profile_visits")]
    public int ProfileVisits { get; set; } = 0;

    [Column("donation_referrals")]
    public int DonationReferrals { get; set; } = 0;

    [Column("estimated_donation_value_php")]
    public decimal EstimatedDonationValuePhp { get; set; } = 0;

    [Column("follower_count_at_post")]
    public int? FollowerCountAtPost { get; set; }

    [Column("watch_time_seconds")]
    public decimal? WatchTimeSeconds { get; set; }

    [Column("avg_view_duration_seconds")]
    public decimal? AvgViewDurationSeconds { get; set; }

    [Column("subscriber_count_at_post")]
    public int? SubscriberCountAtPost { get; set; }

    [Column("forwards")]
    public decimal? Forwards { get; set; }

    // Navigation
    public ICollection<Donation> Donations { get; set; } = [];
}
