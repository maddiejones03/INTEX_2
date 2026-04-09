using System.ComponentModel.DataAnnotations;

namespace Intext2.Dtos;

public class PublicDonationDto
{
    [Required]
    [MaxLength(100)]
    public string DonorName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string DonorEmail { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(Time|InKind)$", ErrorMessage = "DonationType must be 'Time' or 'InKind'.")]
    public string DonationType { get; set; } = string.Empty;

    public string? ProgramArea { get; set; }

    public double? EstimatedHours { get; set; }

    public string? Notes { get; set; }

    public List<InKindItemDto>? InKindItems { get; set; }
}

public class InKindItemDto
{
    [Required]
    [MaxLength(255)]
    public string ItemName { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string ItemCategory { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; } = 1;

    [MaxLength(20)]
    public string? UnitOfMeasure { get; set; }

    public double? EstimatedUnitValue { get; set; }

    [MaxLength(100)]
    public string? IntendedUse { get; set; }

    [MaxLength(20)]
    public string? ReceivedCondition { get; set; }
}
