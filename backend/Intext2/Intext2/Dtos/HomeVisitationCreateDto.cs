namespace Intext2.Dtos;

/// <summary>
/// POST body for creating a row in home_visitations (scalar fields only — avoids binding navigation graph).
/// </summary>
public sealed class HomeVisitationCreateDto
{
    public int ResidentId { get; set; }
    public DateOnly VisitDate { get; set; }
    public string? SocialWorker { get; set; }
    public string VisitType { get; set; } = string.Empty;
    public string? LocationVisited { get; set; }
    public string? FamilyMembersPresent { get; set; }
    public string? Purpose { get; set; }
    public string? Observations { get; set; }
    public string FamilyCooperationLevel { get; set; } = "Cooperative";
    public bool SafetyConcernsNoted { get; set; }
    public bool FollowUpNeeded { get; set; }
    public string? FollowUpNotes { get; set; }
    public string? VisitOutcome { get; set; }
}
