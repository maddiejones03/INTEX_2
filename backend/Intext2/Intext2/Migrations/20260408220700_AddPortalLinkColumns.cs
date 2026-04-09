using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intext2.Migrations;

/// <summary>
/// Adds donor ↔ supporter and resident ↔ case manager links only (no broad schema churn).
/// </summary>
public partial class AddPortalLinkColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF COL_LENGTH('dbo.AspNetUsers', 'supporter_id') IS NULL
                ALTER TABLE dbo.AspNetUsers ADD supporter_id INT NULL;
            IF COL_LENGTH('dbo.residents', 'case_manager_id') IS NULL
                ALTER TABLE dbo.residents ADD case_manager_id NVARCHAR(450) NULL;
            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_residents_case_manager_id' AND object_id = OBJECT_ID('dbo.residents'))
                CREATE INDEX IX_residents_case_manager_id ON dbo.residents (case_manager_id);
            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_AspNetUsers_supporter_id' AND object_id = OBJECT_ID('dbo.AspNetUsers'))
                CREATE INDEX IX_AspNetUsers_supporter_id ON dbo.AspNetUsers (supporter_id);
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AspNetUsers_supporters_supporter_id')
                ALTER TABLE dbo.AspNetUsers ADD CONSTRAINT FK_AspNetUsers_supporters_supporter_id
                    FOREIGN KEY (supporter_id) REFERENCES dbo.supporters (supporter_id) ON DELETE SET NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AspNetUsers_supporters_supporter_id')
                ALTER TABLE dbo.AspNetUsers DROP CONSTRAINT FK_AspNetUsers_supporters_supporter_id;
            IF EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_AspNetUsers_supporter_id' AND object_id = OBJECT_ID('dbo.AspNetUsers'))
                DROP INDEX IX_AspNetUsers_supporter_id ON dbo.AspNetUsers;
            IF EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_residents_case_manager_id' AND object_id = OBJECT_ID('dbo.residents'))
                DROP INDEX IX_residents_case_manager_id ON dbo.residents;
            IF COL_LENGTH('dbo.residents', 'case_manager_id') IS NOT NULL
                ALTER TABLE dbo.residents DROP COLUMN case_manager_id;
            IF COL_LENGTH('dbo.AspNetUsers', 'supporter_id') IS NOT NULL
                ALTER TABLE dbo.AspNetUsers DROP COLUMN supporter_id;
            """);
    }
}
