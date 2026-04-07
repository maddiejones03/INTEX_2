using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intext2.Migrations
{
    /// <inheritdoc />
    public partial class AddEarlyWarningTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "resident_early_warning",
                columns: table => new
                {
                    resident_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    trend_direction = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    cooperation_slope_3m = table.Column<double>(type: "float", nullable: true),
                    cooperation_slope_all = table.Column<double>(type: "float", nullable: true),
                    current_cooperation_score = table.Column<double>(type: "float", nullable: true),
                    total_visits = table.Column<int>(type: "int", nullable: true),
                    pct_favorable_outcomes = table.Column<double>(type: "float", nullable: true),
                    pct_safety_concerns = table.Column<double>(type: "float", nullable: true),
                    risk_regression_probability = table.Column<double>(type: "float", nullable: true),
                    risk_category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    top_risk_factor_1 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    top_risk_factor_2 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    top_risk_factor_3 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    model_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    computed_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_resident_early_warning", x => x.resident_id);
                });

            migrationBuilder.CreateTable(
                name: "risk_alerts",
                columns: table => new
                {
                    alert_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    alert_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    severity = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    detail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    current_risk_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    computed_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_risk_alerts", x => x.alert_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "resident_early_warning");

            migrationBuilder.DropTable(
                name: "risk_alerts");
        }
    }
}
