namespace Intext2.Dtos;

public class DonorDonationDto
{
    public double Amount { get; set; }
    public string? CampaignName { get; set; }
    public bool IsRecurring { get; set; } = false;
    public string? Notes { get; set; }
    public string? Email { get; set; }
}
