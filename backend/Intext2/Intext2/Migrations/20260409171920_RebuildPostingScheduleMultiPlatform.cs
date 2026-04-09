using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intext2.Migrations
{
    /// <inheritdoc />
    public partial class RebuildPostingScheduleMultiPlatform : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_posting_schedule",
                table: "posting_schedule");

            migrationBuilder.AddColumn<int>(
                name: "schedule_id",
                table: "posting_schedule",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "slot",
                table: "posting_schedule",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_posting_schedule",
                table: "posting_schedule",
                column: "schedule_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_posting_schedule",
                table: "posting_schedule");

            migrationBuilder.DropColumn(
                name: "schedule_id",
                table: "posting_schedule");

            migrationBuilder.DropColumn(
                name: "slot",
                table: "posting_schedule");

            migrationBuilder.AddPrimaryKey(
                name: "PK_posting_schedule",
                table: "posting_schedule",
                column: "schedule_date");
        }
    }
}
