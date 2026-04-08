using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace Intext2.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName  { get; set; } = string.Empty;
    public bool   IsActive  { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Links a donor login to the <see cref="Supporters"/> record for donation history.</summary>
    [Column("supporter_id")]
    public int? SupporterId { get; set; }

    [ForeignKey(nameof(SupporterId))]
    public Supporter? Supporter { get; set; }
}
