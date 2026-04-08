using System.ComponentModel.DataAnnotations;

namespace Intext2.Dtos;

public class SignInRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    /// <summary>One of: Admin, CaseManager, Donor (Identity role names).</summary>
    [Required]
    [MaxLength(32)]
    public string Portal { get; set; } = string.Empty;
}
