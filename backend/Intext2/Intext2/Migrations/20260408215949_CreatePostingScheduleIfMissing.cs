using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intext2.Migrations
{
    /// <inheritdoc />
    public partial class CreatePostingScheduleIfMissing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_NAME = 'posting_schedule'
                )
                BEGIN
                    CREATE TABLE [posting_schedule] (
                        schedule_date            DATE          NOT NULL PRIMARY KEY,
                        platform                 NVARCHAR(50)  NULL,
                        day_of_week              NVARCHAR(20)  NULL,
                        post_hour                INT           NULL,
                        post_type                NVARCHAR(50)  NULL,
                        media_type               NVARCHAR(50)  NULL,
                        sentiment_tone           NVARCHAR(50)  NULL,
                        has_call_to_action       BIT           NULL,
                        call_to_action_type      NVARCHAR(50)  NULL,
                        is_boosted               BIT           NULL,
                        features_resident_story  BIT           NULL,
                        p_any_referral           FLOAT         NULL,
                        predicted_referrals      FLOAT         NULL,
                        computed_at              DATETIME2     NULL
                    )
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS [posting_schedule]");
        }
    }
}
