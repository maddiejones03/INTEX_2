using System.ComponentModel.DataAnnotations;

namespace Intext2.Dtos;

public class SafehouseCreateDto
{
    [Required]
    [MaxLength(20)]
    public string SafehouseCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Region { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Province { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Country { get; set; } = "Philippines";

    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    public int? CapacityGirls { get; set; }
    public int? CapacityStaff { get; set; }
    public string? Notes { get; set; }
}

public class SafehouseUpdateDto
{
    [Required]
    [MaxLength(20)]
    public string SafehouseCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Region { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Province { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Country { get; set; } = "Philippines";

    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    public int? CapacityGirls { get; set; }
    public int? CapacityStaff { get; set; }
    public int CurrentOccupancy { get; set; }
    public string? Notes { get; set; }
}
