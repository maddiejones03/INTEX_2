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
                name: "posting_schedule");
        }
    }
}
