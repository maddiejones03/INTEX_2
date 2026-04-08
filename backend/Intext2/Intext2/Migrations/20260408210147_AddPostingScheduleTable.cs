using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intext2.Migrations
{
    /// <inheritdoc />
    public partial class AddPostingScheduleTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "donor_risk_scores",
                columns: table => new
                {
                    supporter_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    display_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    risk_score = table.Column<double>(type: "float", nullable: false),
                    risk_tier = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    priority_score = table.Column<double>(type: "float", nullable: false),
                    lifetime_value_php = table.Column<double>(type: "float", nullable: false),
                    days_since_last_donation = table.Column<double>(type: "float", nullable: false),
                    gap_ratio = table.Column<double>(type: "float", nullable: false),
                    risk_reasons_json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    last_scored_at = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    snooze_until = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donor_risk_scores", x => x.supporter_id);
                });

            migrationBuilder.CreateTable(
                name: "posting_schedule",
                columns: table => new
                {
                    schedule_date = table.Column<DateOnly>(type: "date", nullable: false),
                    platform = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    day_of_week = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    post_hour = table.Column<int>(type: "int", nullable: true),
                    post_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    media_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    sentiment_tone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    has_call_to_action = table.Column<bool>(type: "bit", nullable: true),
                    call_to_action_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_boosted = table.Column<bool>(type: "bit", nullable: true),
                    features_resident_story = table.Column<bool>(type: "bit", nullable: true),
                    p_any_referral = table.Column<double>(type: "float", nullable: true),
                    predicted_referrals = table.Column<double>(type: "float", nullable: true),
                    computed_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_posting_schedule", x => x.schedule_date);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "donor_risk_scores");

            migrationBuilder.DropTable(
                name: "posting_schedule");
        }
    }
}
