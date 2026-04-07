using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Intext2.Models;

namespace Intext2.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<Safehouse>              Safehouses              { get; set; }
    public DbSet<Partner>                Partners                { get; set; }
    public DbSet<PartnerAssignment>      PartnerAssignments      { get; set; }
    public DbSet<SocialMediaPost>        SocialMediaPosts        { get; set; }
    public DbSet<Supporter>              Supporters              { get; set; }
    public DbSet<Donation>               Donations               { get; set; }
    public DbSet<InKindDonationItem>     InKindDonationItems     { get; set; }
    public DbSet<DonationAllocation>     DonationAllocations     { get; set; }
    public DbSet<Resident>               Residents               { get; set; }
    public DbSet<ProcessRecording>       ProcessRecordings       { get; set; }
    public DbSet<HomeVisitation>         HomeVisitations         { get; set; }
    public DbSet<EducationRecord>        EducationRecords        { get; set; }
    public DbSet<HealthWellbeingRecord>  HealthWellbeingRecords  { get; set; }
    public DbSet<InterventionPlan>       InterventionPlans       { get; set; }
    public DbSet<IncidentReport>         IncidentReports         { get; set; }
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics { get; set; }
    public DbSet<PublicImpactSnapshot>   PublicImpactSnapshots   { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Unique index: safehouse_monthly_metrics (safehouse_id, month_start)
        builder.Entity<SafehouseMonthlyMetric>()
            .HasIndex(m => new { m.SafehouseId, m.MonthStart })
            .IsUnique();

        // Unique index: public_impact_snapshots (snapshot_date)
        builder.Entity<PublicImpactSnapshot>()
            .HasIndex(s => s.SnapshotDate)
            .IsUnique();

        // Unique index: residents (case_control_no)
        builder.Entity<Resident>()
            .HasIndex(r => r.CaseControlNo)
            .IsUnique();

        // Unique index: safehouses (safehouse_code)
        builder.Entity<Safehouse>()
            .HasIndex(s => s.SafehouseCode)
            .IsUnique();
    }
}
