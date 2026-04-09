namespace Intext2.Dtos;

/// <summary>
/// Row shape for raw SQL reads from home_visitations so NULL legacy data does not throw SqlNullValueException.
/// </summary>
public sealed class HomeVisitationListRowDto
{
    public int VisitationId { get; set; }
    public int ResidentId { get; set; }
    public DateTime? VisitDate { get; set; }
    public string? SocialWorker { get; set; }
    public string VisitType { get; set; } = "";
    public string? LocationVisited { get; set; }
    public string? FamilyMembersPresent { get; set; }
    public string? Purpose { get; set; }
    public string? Observations { get; set; }
    public string FamilyCooperationLevel { get; set; } = "";
    public int SafetyConcernsNoted { get; set; }
    public int FollowUpNeeded { get; set; }
    public string? FollowUpNotes { get; set; }
    public string? VisitOutcome { get; set; }
}
