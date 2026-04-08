-- Optional manual script (same as EF migration AddPortalLinkColumns) if you prefer SQL over dotnet ef database update.
-- Azure SQL / SQL Server

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
