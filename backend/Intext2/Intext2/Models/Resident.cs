using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intext2.Models;

[Table("residents")]
public class Resident
{
    [Key]
    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("case_control_no")]
    public string CaseControlNo { get; set; } = string.Empty;

    [MaxLength(50)]
    [Column("internal_code")]
    public string? InternalCode { get; set; }

    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("case_status")]
    public string CaseStatus { get; set; } = "Active";

    [Required]
    [MaxLength(1)]
    [Column("sex")]
    public string Sex { get; set; } = "F";

    [Column("date_of_birth")]
    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(20)]
    [Column("birth_status")]
    public string? BirthStatus { get; set; }

    [MaxLength(200)]
    [Column("place_of_birth")]
    public string? PlaceOfBirth { get; set; }

    [MaxLength(100)]
    [Column("religion")]
    public string? Religion { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("case_category")]
    public string CaseCategory { get; set; } = string.Empty;

    [Column("sub_cat_orphaned")]
    public bool? SubCatOrphaned { get; set; } = false;

    [Column("sub_cat_trafficked")]
    public bool? SubCatTrafficked { get; set; } = false;

    [Column("sub_cat_child_labor")]
    public bool? SubCatChildLabor { get; set; } = false;

    [Column("sub_cat_physical_abuse")]
    public bool? SubCatPhysicalAbuse { get; set; } = false;

    [Column("sub_cat_sexual_abuse")]
    public bool? SubCatSexualAbuse { get; set; } = false;

    [Column("sub_cat_osaec")]
    public bool? SubCatOsaec { get; set; } = false;

    [Column("sub_cat_cicl")]
    public bool? SubCatCicl { get; set; } = false;

    [Column("sub_cat_at_risk")]
    public bool? SubCatAtRisk { get; set; } = false;

    [Column("sub_cat_street_child")]
    public bool? SubCatStreetChild { get; set; } = false;

    [Column("sub_cat_child_with_hiv")]
    public bool? SubCatChildWithHiv { get; set; } = false;

    [Column("is_pwd")]
    public bool? IsPwd { get; set; } = false;

    [MaxLength(200)]
    [Column("pwd_type")]
    public string? PwdType { get; set; }

    [Column("has_special_needs")]
    public bool? HasSpecialNeeds { get; set; } = false;

    [MaxLength(200)]
    [Column("special_needs_diagnosis")]
    public string? SpecialNeedsDiagnosis { get; set; }

    [Column("family_is_4ps")]
    public bool? FamilyIs4ps { get; set; } = false;

    [Column("family_solo_parent")]
    public bool? FamilySoloParent { get; set; } = false;

    [Column("family_indigenous")]
    public bool? FamilyIndigenous { get; set; } = false;

    [Column("family_parent_pwd")]
    public bool? FamilyParentPwd { get; set; } = false;

    [Column("family_informal_settler")]
    public bool? FamilyInformalSettler { get; set; } = false;

    [Column("date_of_admission")]
    public DateOnly? DateOfAdmission { get; set; }

    [MaxLength(50)]
    [Column("age_upon_admission")]
    public string? AgeUponAdmission { get; set; }

    [MaxLength(50)]
    [Column("present_age")]
    public string? PresentAge { get; set; }

    [MaxLength(50)]
    [Column("length_of_stay")]
    public string? LengthOfStay { get; set; }

    [MaxLength(50)]
    [Column("referral_source")]
    public string? ReferralSource { get; set; }

    [MaxLength(255)]
    [Column("referring_agency_person")]
    public string? ReferringAgencyPerson { get; set; }

    [Column("date_colb_registered")]
    public DateOnly? DateColbRegistered { get; set; }

    [Column("date_colb_obtained")]
    public DateOnly? DateColbObtained { get; set; }

    [MaxLength(255)]
    [Column("assigned_social_worker")]
    public string? AssignedSocialWorker { get; set; }

    [MaxLength(255)]
    [Column("initial_case_assessment")]
    public string? InitialCaseAssessment { get; set; }

    [Column("date_case_study_prepared")]
    public DateOnly? DateCaseStudyPrepared { get; set; }

    [MaxLength(50)]
    [Column("reintegration_type")]
    public string? ReintegrationType { get; set; }

    [MaxLength(20)]
    [Column("reintegration_status")]
    public string? ReintegrationStatus { get; set; }

    [Required]
    [MaxLength(10)]
    [Column("initial_risk_level")]
    public string InitialRiskLevel { get; set; } = "Medium";

    [Required]
    [MaxLength(10)]
    [Column("current_risk_level")]
    public string CurrentRiskLevel { get; set; } = "Medium";

    [Column("date_enrolled")]
    public DateOnly? DateEnrolled { get; set; }

    [Column("date_closed")]
    public DateOnly? DateClosed { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("notes_restricted")]
    public string? NotesRestricted { get; set; }

    // Navigation
    [ForeignKey(nameof(SafehouseId))]
    public Safehouse? Safehouse { get; set; }

    public ICollection<ProcessRecording>      ProcessRecordings      { get; set; } = [];
    public ICollection<HomeVisitation>        HomeVisitations        { get; set; } = [];
    public ICollection<EducationRecord>       EducationRecords       { get; set; } = [];
    public ICollection<HealthWellbeingRecord> HealthWellbeingRecords { get; set; } = [];
    public ICollection<InterventionPlan>      InterventionPlans      { get; set; } = [];
    public ICollection<IncidentReport>        IncidentReports        { get; set; } = [];
}
