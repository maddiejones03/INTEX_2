using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("supporters")]
public class Supporter
{
    [Key]
    [Column("supporter_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SupporterId { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("supporter_type")]
    public string SupporterType { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("display_name")]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("organization_name")]
    public string? OrganizationName { get; set; }

    [MaxLength(100)]
    [Column("first_name")]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    [Column("last_name")]
    public string? LastName { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("relationship_type")]
    public string RelationshipType { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("region")]
    public string? Region { get; set; }

    [MaxLength(100)]
    [Column("country")]
    public string? Country { get; set; }

    [MaxLength(255)]
    [Column("email")]
    public string? Email { get; set; }

    [MaxLength(50)]
    [Column("phone")]
    public string? Phone { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Active";

    [Column("created_at")]
    public DateOnly? CreatedAt { get; set; }

    [Column("first_donation_date")]
    public DateOnly? FirstDonationDate { get; set; }

    [MaxLength(30)]
    [Column("acquisition_channel")]
    public string? AcquisitionChannel { get; set; }

    // Navigation
    public ICollection<Donation> Donations { get; set; } = [];
}