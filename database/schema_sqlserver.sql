-- ============================================================
-- Kanlungan Foundation — SQL Server Schema
-- Target: Azure SQL Database
-- Converted from PostgreSQL
-- ============================================================

-- ============================================================
-- DROP (reverse dependency order)
-- ============================================================

IF OBJECT_ID('public_impact_snapshots', 'U') IS NOT NULL DROP TABLE public_impact_snapshots;
IF OBJECT_ID('safehouse_monthly_metrics', 'U') IS NOT NULL DROP TABLE safehouse_monthly_metrics;
IF OBJECT_ID('incident_reports', 'U') IS NOT NULL DROP TABLE incident_reports;
IF OBJECT_ID('case_conferences', 'U') IS NOT NULL DROP TABLE case_conferences;
IF OBJECT_ID('intervention_plans', 'U') IS NOT NULL DROP TABLE intervention_plans;
IF OBJECT_ID('health_wellbeing_records', 'U') IS NOT NULL DROP TABLE health_wellbeing_records;
IF OBJECT_ID('education_records', 'U') IS NOT NULL DROP TABLE education_records;
IF OBJECT_ID('home_visitations', 'U') IS NOT NULL DROP TABLE home_visitations;
IF OBJECT_ID('process_recordings', 'U') IS NOT NULL DROP TABLE process_recordings;
IF OBJECT_ID('donation_allocations', 'U') IS NOT NULL DROP TABLE donation_allocations;
IF OBJECT_ID('in_kind_donation_items', 'U') IS NOT NULL DROP TABLE in_kind_donation_items;
IF OBJECT_ID('donations', 'U') IS NOT NULL DROP TABLE donations;
IF OBJECT_ID('social_media_posts', 'U') IS NOT NULL DROP TABLE social_media_posts;
IF OBJECT_ID('supporters', 'U') IS NOT NULL DROP TABLE supporters;
IF OBJECT_ID('residents', 'U') IS NOT NULL DROP TABLE residents;
IF OBJECT_ID('partner_assignments', 'U') IS NOT NULL DROP TABLE partner_assignments;
IF OBJECT_ID('partners', 'U') IS NOT NULL DROP TABLE partners;
IF OBJECT_ID('safehouses', 'U') IS NOT NULL DROP TABLE safehouses;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;

-- ============================================================
-- USERS (auth)
-- ============================================================

CREATE TABLE users (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    username      NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    email         NVARCHAR(255) NOT NULL UNIQUE,
    role          NVARCHAR(20)  NOT NULL DEFAULT 'staff'
                                CONSTRAINT chk_users_role CHECK (role IN ('admin', 'staff', 'viewer')),
    first_name    NVARCHAR(100) NOT NULL,
    last_name     NVARCHAR(100) NOT NULL,
    is_active     BIT           NOT NULL DEFAULT 1,
    created_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================
-- SAFEHOUSES
-- ============================================================

CREATE TABLE safehouses (
    safehouse_id      INT IDENTITY(1,1) PRIMARY KEY,
    safehouse_code    NVARCHAR(20)  NOT NULL UNIQUE,
    name              NVARCHAR(200) NOT NULL,
    region            NVARCHAR(100) NOT NULL,
    city              NVARCHAR(100) NOT NULL,
    province          NVARCHAR(100) NOT NULL,
    country           NVARCHAR(100) NOT NULL DEFAULT 'Philippines',
    open_date         DATE,
    status            NVARCHAR(20)  NOT NULL DEFAULT 'Active',
    capacity_girls    INT,
    capacity_staff    INT,
    current_occupancy INT           NOT NULL DEFAULT 0,
    notes             NVARCHAR(MAX)
);

-- ============================================================
-- PARTNERS
-- ============================================================

CREATE TABLE partners (
    partner_id   INT IDENTITY(1,1) PRIMARY KEY,
    partner_name NVARCHAR(255) NOT NULL,
    partner_type NVARCHAR(20)  NOT NULL
                               CONSTRAINT chk_partners_type CHECK (partner_type IN ('Organization', 'Individual')),
    role_type    NVARCHAR(50)  NOT NULL
                               CONSTRAINT chk_partners_role CHECK (role_type IN (
                                   'Education', 'Evaluation', 'SafehouseOps',
                                   'FindSafehouse', 'Logistics', 'Transport', 'Maintenance'
                               )),
    contact_name NVARCHAR(200),
    email        NVARCHAR(255),
    phone        NVARCHAR(50),
    region       NVARCHAR(100),
    status       NVARCHAR(20)  NOT NULL DEFAULT 'Active'
                               CONSTRAINT chk_partners_status CHECK (status IN ('Active', 'Inactive')),
    start_date   DATE,
    end_date     DATE,
    notes        NVARCHAR(MAX)
);

-- ============================================================
-- PARTNER ASSIGNMENTS
-- ============================================================

CREATE TABLE partner_assignments (
    assignment_id        INT IDENTITY(1,1) PRIMARY KEY,
    partner_id           INT           NOT NULL REFERENCES partners(partner_id),
    safehouse_id         INT           REFERENCES safehouses(safehouse_id),
    program_area         NVARCHAR(50)  NOT NULL
                                       CONSTRAINT chk_assignments_area CHECK (program_area IN (
                                           'Education', 'Wellbeing', 'Operations',
                                           'Transport', 'Maintenance'
                                       )),
    assignment_start     DATE          NOT NULL,
    assignment_end       DATE,
    responsibility_notes NVARCHAR(MAX),
    is_primary           BIT           NOT NULL DEFAULT 0,
    status               NVARCHAR(20)  NOT NULL DEFAULT 'Active'
                                       CONSTRAINT chk_assignments_status CHECK (status IN ('Active', 'Ended'))
);

-- ============================================================
-- SOCIAL MEDIA POSTS
-- ============================================================

CREATE TABLE social_media_posts (
    post_id                      INT IDENTITY(1,1) PRIMARY KEY,
    platform                     NVARCHAR(20)   NOT NULL
                                                CONSTRAINT chk_posts_platform CHECK (platform IN (
                                                    'Facebook', 'Instagram', 'Twitter',
                                                    'TikTok', 'LinkedIn', 'YouTube', 'WhatsApp'
                                                )),
    platform_post_id             NVARCHAR(100),
    post_url                     NVARCHAR(MAX),
    created_at                   DATETIME2,
    day_of_week                  NVARCHAR(10),
    post_hour                    SMALLINT,
    post_type                    NVARCHAR(30)   NOT NULL
                                                CONSTRAINT chk_posts_type CHECK (post_type IN (
                                                    'ImpactStory', 'Campaign', 'EventPromotion',
                                                    'ThankYou', 'EducationalContent', 'FundraisingAppeal'
                                                )),
    media_type                   NVARCHAR(20)   NOT NULL
                                                CONSTRAINT chk_posts_media CHECK (media_type IN (
                                                    'Photo', 'Video', 'Carousel', 'Text', 'Reel'
                                                )),
    caption                      NVARCHAR(MAX),
    hashtags                     NVARCHAR(MAX),
    num_hashtags                 INT            NOT NULL DEFAULT 0,
    mentions_count               INT            NOT NULL DEFAULT 0,
    has_call_to_action           BIT            NOT NULL DEFAULT 0,
    call_to_action_type          NVARCHAR(20),
    content_topic                NVARCHAR(30)   NOT NULL
                                                CONSTRAINT chk_posts_topic CHECK (content_topic IN (
                                                    'Education', 'Health', 'Reintegration', 'DonorImpact',
                                                    'SafehouseLife', 'EventRecap', 'CampaignLaunch',
                                                    'Gratitude', 'AwarenessRaising'
                                                )),
    sentiment_tone               NVARCHAR(20)   NOT NULL
                                                CONSTRAINT chk_posts_tone CHECK (sentiment_tone IN (
                                                    'Hopeful', 'Urgent', 'Celebratory',
                                                    'Informative', 'Grateful', 'Emotional'
                                                )),
    caption_length               INT            NOT NULL DEFAULT 0,
    features_resident_story      BIT            NOT NULL DEFAULT 0,
    campaign_name                NVARCHAR(200),
    is_boosted                   BIT            NOT NULL DEFAULT 0,
    boost_budget_php             DECIMAL(10,2),
    impressions                  INT            NOT NULL DEFAULT 0,
    reach                        INT            NOT NULL DEFAULT 0,
    likes                        INT            NOT NULL DEFAULT 0,
    comments                     INT            NOT NULL DEFAULT 0,
    shares                       INT            NOT NULL DEFAULT 0,
    saves                        INT            NOT NULL DEFAULT 0,
    click_throughs               INT            NOT NULL DEFAULT 0,
    video_views                  INT,
    engagement_rate              DECIMAL(8,4)   NOT NULL DEFAULT 0,
    profile_visits               INT            NOT NULL DEFAULT 0,
    donation_referrals           INT            NOT NULL DEFAULT 0,
    estimated_donation_value_php DECIMAL(12,2)  NOT NULL DEFAULT 0,
    follower_count_at_post       INT,
    watch_time_seconds           DECIMAL(10,2),
    avg_view_duration_seconds    DECIMAL(10,2),
    subscriber_count_at_post     INT,
    forwards                     DECIMAL(10,2)
);

-- ============================================================
-- SUPPORTERS
-- ============================================================

CREATE TABLE supporters (
    supporter_id        INT IDENTITY(1,1) PRIMARY KEY,
    supporter_type      NVARCHAR(30)  NOT NULL
                                      CONSTRAINT chk_supporters_type CHECK (supporter_type IN (
                                          'MonetaryDonor', 'InKindDonor', 'Volunteer',
                                          'SkillsContributor', 'SocialMediaAdvocate', 'PartnerOrganization'
                                      )),
    display_name        NVARCHAR(255) NOT NULL,
    organization_name   NVARCHAR(255),
    first_name          NVARCHAR(100),
    last_name           NVARCHAR(100),
    relationship_type   NVARCHAR(30)  NOT NULL
                                      CONSTRAINT chk_supporters_rel CHECK (relationship_type IN (
                                          'Local', 'International', 'PartnerOrganization'
                                      )),
    region              NVARCHAR(100),
    country             NVARCHAR(100),
    email               NVARCHAR(255),
    phone               NVARCHAR(50),
    status              NVARCHAR(20)  NOT NULL DEFAULT 'Active'
                                      CONSTRAINT chk_supporters_status CHECK (status IN ('Active', 'Inactive')),
    created_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    first_donation_date DATE,
    acquisition_channel NVARCHAR(30)
                                      CONSTRAINT chk_supporters_channel CHECK (acquisition_channel IN (
                                          'Website', 'SocialMedia', 'Event',
                                          'WordOfMouth', 'PartnerReferral', 'Church'
                                      ))
);

-- ============================================================
-- DONATIONS
-- ============================================================

CREATE TABLE donations (
    donation_id      INT IDENTITY(1,1) PRIMARY KEY,
    supporter_id     INT           NOT NULL REFERENCES supporters(supporter_id),
    donation_type    NVARCHAR(20)  NOT NULL
                                   CONSTRAINT chk_donations_type CHECK (donation_type IN (
                                       'Monetary', 'InKind', 'Time', 'Skills', 'SocialMedia'
                                   )),
    donation_date    DATE          NOT NULL,
    is_recurring     BIT           NOT NULL DEFAULT 0,
    campaign_name    NVARCHAR(200),
    channel_source   NVARCHAR(20)  NOT NULL
                                   CONSTRAINT chk_donations_channel CHECK (channel_source IN (
                                       'Campaign', 'Event', 'Direct', 'SocialMedia', 'PartnerReferral'
                                   )),
    currency_code    NVARCHAR(10),
    amount           DECIMAL(12,2),
    estimated_value  DECIMAL(12,2),
    impact_unit      NVARCHAR(20),
    notes            NVARCHAR(MAX),
    referral_post_id INT           REFERENCES social_media_posts(post_id)
);

-- ============================================================
-- IN-KIND DONATION ITEMS
-- ============================================================

CREATE TABLE in_kind_donation_items (
    item_id               INT IDENTITY(1,1) PRIMARY KEY,
    donation_id           INT           NOT NULL REFERENCES donations(donation_id),
    item_name             NVARCHAR(255) NOT NULL,
    item_category         NVARCHAR(30)  NOT NULL,
    quantity              INT           NOT NULL,
    unit_of_measure       NVARCHAR(20),
    estimated_unit_value  DECIMAL(10,2),
    intended_use          NVARCHAR(100),
    received_condition    NVARCHAR(20)
);

-- ============================================================
-- DONATION ALLOCATIONS
-- ============================================================

CREATE TABLE donation_allocations (
    allocation_id    INT IDENTITY(1,1) PRIMARY KEY,
    donation_id      INT           NOT NULL REFERENCES donations(donation_id),
    safehouse_id     INT           NOT NULL REFERENCES safehouses(safehouse_id),
    program_area     NVARCHAR(30)  NOT NULL,
    amount_allocated DECIMAL(12,2) NOT NULL,
    allocation_date  DATE          NOT NULL,
    allocation_notes NVARCHAR(MAX)
);

-- ============================================================
-- RESIDENTS
-- ============================================================

CREATE TABLE residents (
    resident_id               INT IDENTITY(1,1) PRIMARY KEY,
    case_control_no           NVARCHAR(50)  NOT NULL UNIQUE,
    internal_code             NVARCHAR(50),
    safehouse_id              INT           NOT NULL REFERENCES safehouses(safehouse_id),
    case_status               NVARCHAR(20)  NOT NULL DEFAULT 'Active'
                                            CONSTRAINT chk_residents_status CHECK (case_status IN ('Active', 'Closed', 'Transferred')),
    sex                       NVARCHAR(1)   NOT NULL DEFAULT 'F',
    date_of_birth             DATE          NOT NULL,
    birth_status              NVARCHAR(20),
    place_of_birth            NVARCHAR(200),
    religion                  NVARCHAR(100),
    case_category             NVARCHAR(20)  NOT NULL
                                            CONSTRAINT chk_residents_category CHECK (case_category IN (
                                                'Abandoned', 'Foundling', 'Surrendered', 'Neglected'
                                            )),
    sub_cat_orphaned          BIT           NOT NULL DEFAULT 0,
    sub_cat_trafficked        BIT           NOT NULL DEFAULT 0,
    sub_cat_child_labor       BIT           NOT NULL DEFAULT 0,
    sub_cat_physical_abuse    BIT           NOT NULL DEFAULT 0,
    sub_cat_sexual_abuse      BIT           NOT NULL DEFAULT 0,
    sub_cat_osaec             BIT           NOT NULL DEFAULT 0,
    sub_cat_cicl              BIT           NOT NULL DEFAULT 0,
    sub_cat_at_risk           BIT           NOT NULL DEFAULT 0,
    sub_cat_street_child      BIT           NOT NULL DEFAULT 0,
    sub_cat_child_with_hiv    BIT           NOT NULL DEFAULT 0,
    is_pwd                    BIT           NOT NULL DEFAULT 0,
    pwd_type                  NVARCHAR(200),
    has_special_needs         BIT           NOT NULL DEFAULT 0,
    special_needs_diagnosis   NVARCHAR(200),
    family_is_4ps             BIT           NOT NULL DEFAULT 0,
    family_solo_parent        BIT           NOT NULL DEFAULT 0,
    family_indigenous         BIT           NOT NULL DEFAULT 0,
    family_parent_pwd         BIT           NOT NULL DEFAULT 0,
    family_informal_settler   BIT           NOT NULL DEFAULT 0,
    date_of_admission         DATE          NOT NULL,
    age_upon_admission        NVARCHAR(50),
    present_age               NVARCHAR(50),
    length_of_stay            NVARCHAR(50),
    referral_source           NVARCHAR(50),
    referring_agency_person   NVARCHAR(255),
    date_colb_registered      DATE,
    date_colb_obtained        DATE,
    assigned_social_worker    NVARCHAR(255),
    initial_case_assessment   NVARCHAR(255),
    date_case_study_prepared  DATE,
    reintegration_type        NVARCHAR(50),
    reintegration_status      NVARCHAR(20)
                                            CONSTRAINT chk_residents_reint CHECK (reintegration_status IN (
                                                'Not Started', 'In Progress', 'Completed', 'On Hold'
                                            )),
    initial_risk_level        NVARCHAR(10)  NOT NULL DEFAULT 'Medium'
                                            CONSTRAINT chk_residents_init_risk CHECK (initial_risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    current_risk_level        NVARCHAR(10)  NOT NULL DEFAULT 'Medium'
                                            CONSTRAINT chk_residents_curr_risk CHECK (current_risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    date_enrolled             DATE,
    date_closed               DATE,
    created_at                DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    notes_restricted          NVARCHAR(MAX)
);

-- ============================================================
-- PROCESS RECORDINGS
-- ============================================================

CREATE TABLE process_recordings (
    recording_id             INT IDENTITY(1,1) PRIMARY KEY,
    resident_id              INT           NOT NULL REFERENCES residents(resident_id),
    session_date             DATE          NOT NULL,
    social_worker            NVARCHAR(255),
    session_type             NVARCHAR(20)  NOT NULL DEFAULT 'Individual'
                                           CONSTRAINT chk_recordings_type CHECK (session_type IN ('Individual', 'Group')),
    session_duration_minutes INT,
    emotional_state_observed NVARCHAR(20),
    emotional_state_end      NVARCHAR(20),
    session_narrative        NVARCHAR(MAX),
    interventions_applied    NVARCHAR(MAX),
    follow_up_actions        NVARCHAR(MAX),
    progress_noted           BIT           NOT NULL DEFAULT 0,
    concerns_flagged         BIT           NOT NULL DEFAULT 0,
    referral_made            BIT           NOT NULL DEFAULT 0,
    notes_restricted         NVARCHAR(MAX)
);

-- ============================================================
-- HOME VISITATIONS
-- ============================================================

CREATE TABLE home_visitations (
    visitation_id            INT IDENTITY(1,1) PRIMARY KEY,
    resident_id              INT           NOT NULL REFERENCES residents(resident_id),
    visit_date               DATE          NOT NULL,
    social_worker            NVARCHAR(255),
    visit_type               NVARCHAR(30)  NOT NULL
                                           CONSTRAINT chk_visits_type CHECK (visit_type IN (
                                               'Initial Assessment', 'Routine Follow-Up',
                                               'Reintegration Assessment', 'Post-Placement Monitoring',
                                               'Emergency'
                                           )),
    location_visited         NVARCHAR(MAX),
    family_members_present   NVARCHAR(MAX),
    purpose                  NVARCHAR(MAX),
    observations             NVARCHAR(MAX),
    family_cooperation_level NVARCHAR(25)  NOT NULL DEFAULT 'Cooperative'
                                           CONSTRAINT chk_visits_coop CHECK (family_cooperation_level IN (
                                               'Highly Cooperative', 'Cooperative',
                                               'Neutral', 'Uncooperative'
                                           )),
    safety_concerns_noted    BIT           NOT NULL DEFAULT 0,
    follow_up_needed         BIT           NOT NULL DEFAULT 0,
    follow_up_notes          NVARCHAR(MAX),
    visit_outcome            NVARCHAR(25)
                                           CONSTRAINT chk_visits_outcome CHECK (visit_outcome IN (
                                               'Favorable', 'Needs Improvement',
                                               'Unfavorable', 'Inconclusive'
                                           ))
);

-- ============================================================
-- EDUCATION RECORDS
-- ============================================================

CREATE TABLE education_records (
    education_record_id INT IDENTITY(1,1) PRIMARY KEY,
    resident_id         INT           NOT NULL REFERENCES residents(resident_id),
    record_date         DATE          NOT NULL,
    education_level     NVARCHAR(20)  NOT NULL
                                      CONSTRAINT chk_edu_level CHECK (education_level IN (
                                          'Primary', 'Secondary', 'Vocational', 'CollegePrep'
                                      )),
    school_name         NVARCHAR(200),
    enrollment_status   NVARCHAR(20),
    attendance_rate     DECIMAL(4,3),
    progress_percent    DECIMAL(5,2),
    completion_status   NVARCHAR(20)  NOT NULL DEFAULT 'NotStarted'
                                      CONSTRAINT chk_edu_completion CHECK (completion_status IN (
                                          'NotStarted', 'InProgress', 'Completed'
                                      )),
    notes               NVARCHAR(MAX)
);

-- ============================================================
-- HEALTH & WELLBEING RECORDS
-- ============================================================

CREATE TABLE health_wellbeing_records (
    health_record_id           INT IDENTITY(1,1) PRIMARY KEY,
    resident_id                INT          NOT NULL REFERENCES residents(resident_id),
    record_date                DATE         NOT NULL,
    general_health_score       DECIMAL(4,2),
    nutrition_score            DECIMAL(4,2),
    sleep_quality_score        DECIMAL(4,2),
    energy_level_score         DECIMAL(4,2),
    height_cm                  DECIMAL(5,2),
    weight_kg                  DECIMAL(5,2),
    bmi                        DECIMAL(4,2),
    medical_checkup_done       BIT          NOT NULL DEFAULT 0,
    dental_checkup_done        BIT          NOT NULL DEFAULT 0,
    psychological_checkup_done BIT          NOT NULL DEFAULT 0,
    notes                      NVARCHAR(MAX)
);

-- ============================================================
-- INTERVENTION PLANS
-- ============================================================

CREATE TABLE intervention_plans (
    plan_id              INT IDENTITY(1,1) PRIMARY KEY,
    resident_id          INT           NOT NULL REFERENCES residents(resident_id),
    plan_category        NVARCHAR(20)  NOT NULL
                                       CONSTRAINT chk_plans_category CHECK (plan_category IN (
                                           'Safety', 'Psychosocial', 'Education',
                                           'Physical Health', 'Legal', 'Reintegration'
                                       )),
    plan_description     NVARCHAR(MAX) NOT NULL,
    services_provided    NVARCHAR(MAX),
    target_value         DECIMAL(10,2),
    target_date          DATE,
    status               NVARCHAR(20)  NOT NULL DEFAULT 'Open'
                                       CONSTRAINT chk_plans_status CHECK (status IN (
                                           'Open', 'In Progress', 'Achieved', 'On Hold', 'Closed'
                                       )),
    case_conference_date DATE,
    created_at           DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at           DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================
-- CASE CONFERENCES
-- ============================================================

CREATE TABLE case_conferences (
    conference_id     INT IDENTITY(1,1) PRIMARY KEY,
    resident_id       INT NOT NULL REFERENCES residents(resident_id),
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

CREATE INDEX idx_case_conf_resident ON case_conferences(resident_id);
CREATE INDEX idx_case_conf_date     ON case_conferences(conference_date);

-- ============================================================
-- INCIDENT REPORTS
-- ============================================================

CREATE TABLE incident_reports (
    incident_id        INT IDENTITY(1,1) PRIMARY KEY,
    resident_id        INT           NOT NULL REFERENCES residents(resident_id),
    safehouse_id       INT           NOT NULL REFERENCES safehouses(safehouse_id),
    incident_date      DATE          NOT NULL,
    incident_type      NVARCHAR(25)  NOT NULL
                                     CONSTRAINT chk_incidents_type CHECK (incident_type IN (
                                         'Behavioral', 'Medical', 'Security', 'RunawayAttempt',
                                         'SelfHarm', 'ConflictWithPeer', 'PropertyDamage'
                                     )),
    severity           NVARCHAR(10)  NOT NULL
                                     CONSTRAINT chk_incidents_severity CHECK (severity IN ('Low', 'Medium', 'High')),
    description        NVARCHAR(MAX),
    response_taken     NVARCHAR(MAX),
    resolved           BIT           NOT NULL DEFAULT 0,
    resolution_date    DATE,
    reported_by        NVARCHAR(255),
    follow_up_required BIT           NOT NULL DEFAULT 0
);

-- ============================================================
-- SAFEHOUSE MONTHLY METRICS
-- ============================================================

CREATE TABLE safehouse_monthly_metrics (
    metric_id               INT IDENTITY(1,1) PRIMARY KEY,
    safehouse_id            INT          NOT NULL REFERENCES safehouses(safehouse_id),
    month_start             DATE         NOT NULL,
    month_end               DATE         NOT NULL,
    active_residents        INT          NOT NULL DEFAULT 0,
    avg_education_progress  DECIMAL(5,2),
    avg_health_score        DECIMAL(3,1),
    process_recording_count INT          NOT NULL DEFAULT 0,
    home_visitation_count   INT          NOT NULL DEFAULT 0,
    incident_count          INT          NOT NULL DEFAULT 0,
    notes                   NVARCHAR(MAX),
    CONSTRAINT uq_metrics UNIQUE (safehouse_id, month_start)
);

-- ============================================================
-- PUBLIC IMPACT SNAPSHOTS
-- ============================================================

CREATE TABLE public_impact_snapshots (
    snapshot_id         INT IDENTITY(1,1) PRIMARY KEY,
    snapshot_date       DATE          NOT NULL UNIQUE,
    headline            NVARCHAR(500),
    summary_text        NVARCHAR(MAX),
    metric_payload_json NVARCHAR(MAX),
    is_published        BIT           NOT NULL DEFAULT 0,
    published_at        DATE
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_safehouses_status       ON safehouses(status);
CREATE INDEX idx_residents_safehouse     ON residents(safehouse_id);
CREATE INDEX idx_residents_case_status   ON residents(case_status);
CREATE INDEX idx_residents_case_category ON residents(case_category);
CREATE INDEX idx_residents_admission     ON residents(date_of_admission);
CREATE INDEX idx_residents_risk          ON residents(current_risk_level);
CREATE INDEX idx_donations_supporter     ON donations(supporter_id);
CREATE INDEX idx_donations_date          ON donations(donation_date);
CREATE INDEX idx_donations_type          ON donations(donation_type);
CREATE INDEX idx_allocations_donation    ON donation_allocations(donation_id);
CREATE INDEX idx_allocations_safehouse   ON donation_allocations(safehouse_id);
CREATE INDEX idx_proc_rec_resident       ON process_recordings(resident_id);
CREATE INDEX idx_proc_rec_date           ON process_recordings(session_date);
CREATE INDEX idx_visitations_resident    ON home_visitations(resident_id);
CREATE INDEX idx_visitations_date        ON home_visitations(visit_date);
CREATE INDEX idx_education_resident      ON education_records(resident_id);
CREATE INDEX idx_health_resident         ON health_wellbeing_records(resident_id);
CREATE INDEX idx_plans_resident          ON intervention_plans(resident_id);
CREATE INDEX idx_incidents_resident      ON incident_reports(resident_id);
CREATE INDEX idx_incidents_safehouse     ON incident_reports(safehouse_id);
CREATE INDEX idx_posts_platform          ON social_media_posts(platform);
CREATE INDEX idx_posts_created_at        ON social_media_posts(created_at);
CREATE INDEX idx_assignments_partner     ON partner_assignments(partner_id);
CREATE INDEX idx_metrics_safehouse       ON safehouse_monthly_metrics(safehouse_id);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW supporter_totals AS
SELECT
    s.supporter_id,
    s.display_name,
    COALESCE(SUM(d.amount), 0) AS total_monetary_php,
    COUNT(d.donation_id)        AS total_donation_count,
    MAX(d.donation_date)        AS last_donation_date
FROM supporters s
LEFT JOIN donations d ON d.supporter_id = s.supporter_id
GROUP BY s.supporter_id, s.display_name;

GO

CREATE VIEW live_safehouse_occupancy AS
SELECT
    sh.safehouse_id,
    sh.name,
    sh.capacity_girls,
    sh.current_occupancy                     AS stored_occupancy,
    COUNT(r.resident_id)                     AS computed_occupancy,
    sh.capacity_girls - COUNT(r.resident_id) AS available_beds
FROM safehouses sh
LEFT JOIN residents r
       ON r.safehouse_id = sh.safehouse_id
      AND r.case_status = 'Active'
GROUP BY sh.safehouse_id, sh.name, sh.capacity_girls, sh.current_occupancy;
