IF OBJECT_ID('dbo.case_conferences', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.case_conferences (
        conference_id     INT IDENTITY(1,1) PRIMARY KEY,
        resident_id       INT NOT NULL REFERENCES dbo.residents(resident_id),
        conference_date   DATE NOT NULL,
        conference_type   NVARCHAR(30) NOT NULL
                          CONSTRAINT chk_case_conf_type CHECK (conference_type IN (
                              'Initial Assessment', 'Routine Follow-Up', 'Reintegration Review', 'Emergency', 'Case Closure'
                          )),
        facilitator       NVARCHAR(255),
        agenda            NVARCHAR(MAX),
        discussion_notes  NVARCHAR(MAX),
        action_items      NVARCHAR(MAX),
        status            NVARCHAR(20) NOT NULL DEFAULT 'Scheduled'
                          CONSTRAINT chk_case_conf_status CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
        created_at        DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );

    CREATE INDEX idx_case_conf_resident ON dbo.case_conferences(resident_id);
    CREATE INDEX idx_case_conf_date     ON dbo.case_conferences(conference_date);
END
