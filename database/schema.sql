-- ============================================================
-- Kanlungan Foundation — PostgreSQL Schema (Corrected)
-- Target: Azure Database for PostgreSQL Flexible Server
-- Matches CSV data exactly
-- ============================================================

-- ============================================================
-- DROP (reverse dependency order)
-- ============================================================

DROP TABLE IF EXISTS public_impact_snapshots       CASCADE;
DROP TABLE IF EXISTS safehouse_monthly_metrics     CASCADE;
DROP TABLE IF EXISTS incident_reports              CASCADE;
DROP TABLE IF EXISTS intervention_plans            CASCADE;
DROP TABLE IF EXISTS health_wellbeing_records      CASCADE;
DROP TABLE IF EXISTS education_records             CASCADE;
DROP TABLE IF EXISTS home_visitations              CASCADE;
DROP TABLE IF EXISTS process_recordings            CASCADE;
DROP TABLE IF EXISTS donation_allocations          CASCADE;
DROP TABLE IF EXISTS in_kind_donation_items        CASCADE;
DROP TABLE IF EXISTS donations                     CASCADE;
DROP TABLE IF EXISTS social_media_posts            CASCADE;
DROP TABLE IF EXISTS supporters                    CASCADE;
DROP TABLE IF EXISTS residents                     CASCADE;
DROP TABLE IF EXISTS partner_assignments           CASCADE;
DROP TABLE IF EXISTS partners                      CASCADE;
DROP TABLE IF EXISTS safehouses                    CASCADE;
DROP TABLE IF EXISTS users                         CASCADE;

-- ============================================================
-- USERS (auth)
-- ============================================================

CREATE TABLE users (
    id            SERIAL       PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    role          VARCHAR(20)  NOT NULL DEFAULT 'staff'
                               CHECK (role IN ('admin', 'staff', 'viewer')),
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SAFEHOUSES
-- ============================================================

CREATE TABLE safehouses (
    safehouse_id      SERIAL       PRIMARY KEY,
    safehouse_code    VARCHAR(20)  NOT NULL UNIQUE,
    name              VARCHAR(200) NOT NULL,
    region            VARCHAR(100) NOT NULL,
    city              VARCHAR(100) NOT NULL,
    province          VARCHAR(100) NOT NULL,
    country           VARCHAR(100) NOT NULL DEFAULT 'Philippines',
    open_date         DATE,
    status            VARCHAR(20)  NOT NULL DEFAULT 'Active',
    capacity_girls    INT,
    capacity_staff    INT,
    current_occupancy INT          NOT NULL DEFAULT 0,
    notes             TEXT
);

-- ============================================================
-- PARTNERS
-- ============================================================

CREATE TABLE partners (
    partner_id   SERIAL       PRIMARY KEY,
    partner_name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(20)  NOT NULL
                              CHECK (partner_type IN ('Organization', 'Individual')),
    role_type    VARCHAR(50)  NOT NULL
                              CHECK (role_type IN (
                                  'Education', 'Evaluation', 'SafehouseOps',
                                  'FindSafehouse', 'Logistics', 'Transport', 'Maintenance'
                              )),
    contact_name VARCHAR(200),
    email        VARCHAR(255),
    phone        VARCHAR(50),
    region       VARCHAR(100),
    status       VARCHAR(20)  NOT NULL DEFAULT 'Active'
                              CHECK (status IN ('Active', 'Inactive')),
    start_date   DATE,
    end_date     DATE,
    notes        TEXT
);

-- ============================================================
-- PARTNER ASSIGNMENTS
-- ============================================================

CREATE TABLE partner_assignments (
    assignment_id        SERIAL      PRIMARY KEY,
    partner_id           INT         NOT NULL REFERENCES partners(partner_id) ON DELETE RESTRICT,
    safehouse_id         INT         REFERENCES safehouses(safehouse_id) ON DELETE SET NULL,
    program_area         VARCHAR(50) NOT NULL
                                     CHECK (program_area IN (
                                         'Education', 'Wellbeing', 'Operations',
                                         'Transport', 'Maintenance'
                                     )),
    assignment_start     DATE        NOT NULL,
    assignment_end       DATE,
    responsibility_notes TEXT,
    is_primary           BOOLEAN     NOT NULL DEFAULT FALSE,
    status               VARCHAR(20) NOT NULL DEFAULT 'Active'
                                     CHECK (status IN ('Active', 'Ended'))
);

-- ============================================================
-- SOCIAL MEDIA POSTS
-- ============================================================

CREATE TABLE social_media_posts (
    post_id                      SERIAL        PRIMARY KEY,
    platform                     VARCHAR(20)   NOT NULL
                                               CHECK (platform IN (
                                                   'Facebook', 'Instagram', 'Twitter',
                                                   'TikTok', 'LinkedIn', 'YouTube', 'WhatsApp'
                                               )),
    platform_post_id             VARCHAR(100),
    post_url                     TEXT,
    created_at                   TIMESTAMPTZ,
    day_of_week                  VARCHAR(10),
    post_hour                    SMALLINT,
    post_type                    VARCHAR(30)   NOT NULL
                                               CHECK (post_type IN (
                                                   'ImpactStory', 'Campaign', 'EventPromotion',
                                                   'ThankYou', 'EducationalContent', 'FundraisingAppeal'
                                               )),
    media_type                   VARCHAR(20)   NOT NULL
                                               CHECK (media_type IN (
                                                   'Photo', 'Video', 'Carousel', 'Text', 'Reel'
                                               )),
    caption                      TEXT,
    hashtags                     TEXT,
    num_hashtags                 INT           NOT NULL DEFAULT 0,
    mentions_count               INT           NOT NULL DEFAULT 0,
    has_call_to_action           BOOLEAN       NOT NULL DEFAULT FALSE,
    call_to_action_type          VARCHAR(20),
    content_topic                VARCHAR(30)   NOT NULL
                                               CHECK (content_topic IN (
                                                   'Education', 'Health', 'Reintegration', 'DonorImpact',
                                                   'SafehouseLife', 'EventRecap', 'CampaignLaunch',
                                                   'Gratitude', 'AwarenessRaising'
                                               )),
    sentiment_tone               VARCHAR(20)   NOT NULL
                                               CHECK (sentiment_tone IN (
                                                   'Hopeful', 'Urgent', 'Celebratory',
                                                   'Informative', 'Grateful', 'Emotional'
                                               )),
    caption_length               INT           NOT NULL DEFAULT 0,
    features_resident_story      BOOLEAN       NOT NULL DEFAULT FALSE,
    campaign_name                VARCHAR(200),
    is_boosted                   BOOLEAN       NOT NULL DEFAULT FALSE,
    boost_budget_php             NUMERIC(10,2),
    impressions                  INT           NOT NULL DEFAULT 0,
    reach                        INT           NOT NULL DEFAULT 0,
    likes                        INT           NOT NULL DEFAULT 0,
    comments                     INT           NOT NULL DEFAULT 0,
    shares                       INT           NOT NULL DEFAULT 0,
    saves                        INT           NOT NULL DEFAULT 0,
    click_throughs               INT           NOT NULL DEFAULT 0,
    video_views                  INT,
    engagement_rate              NUMERIC(8,4)  NOT NULL DEFAULT 0,
    profile_visits               INT           NOT NULL DEFAULT 0,
    donation_referrals           INT           NOT NULL DEFAULT 0,
    estimated_donation_value_php NUMERIC(12,2) NOT NULL DEFAULT 0,
    follower_count_at_post       INT,
    watch_time_seconds           NUMERIC(10,2),
    avg_view_duration_seconds    NUMERIC(10,2),
    subscriber_count_at_post     INT,
    forwards                     NUMERIC(10,2)
);

-- ============================================================
-- SUPPORTERS
-- ============================================================

CREATE TABLE supporters (
    supporter_id        SERIAL       PRIMARY KEY,
    supporter_type      VARCHAR(30)  NOT NULL
                                     CHECK (supporter_type IN (
                                         'MonetaryDonor', 'InKindDonor', 'Volunteer',
                                         'SkillsContributor', 'SocialMediaAdvocate', 'PartnerOrganization'
                                     )),
    display_name        VARCHAR(255) NOT NULL,
    organization_name   VARCHAR(255),
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    relationship_type   VARCHAR(30)  NOT NULL
                                     CHECK (relationship_type IN (
                                         'Local', 'International', 'PartnerOrganization'
                                     )),
    region              VARCHAR(100),
    country             VARCHAR(100),
    email               VARCHAR(255),
    phone               VARCHAR(50),
    status              VARCHAR(20)  NOT NULL DEFAULT 'Active'
                                     CHECK (status IN ('Active', 'Inactive')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    first_donation_date DATE,
    acquisition_channel VARCHAR(30)
                                     CHECK (acquisition_channel IN (
                                         'Website', 'SocialMedia', 'Event',
                                         'WordOfMouth', 'PartnerReferral', 'Church'
                                     ))
);

-- ============================================================
-- DONATIONS
-- ============================================================

CREATE TABLE donations (
    donation_id      SERIAL        PRIMARY KEY,
    supporter_id     INT           NOT NULL REFERENCES supporters(supporter_id) ON DELETE RESTRICT,
    donation_type    VARCHAR(20)   NOT NULL
                                   CHECK (donation_type IN (
                                       'Monetary', 'InKind', 'Time', 'Skills', 'SocialMedia'
                                   )),
    donation_date    DATE          NOT NULL,
    is_recurring     BOOLEAN       NOT NULL DEFAULT FALSE,
    campaign_name    VARCHAR(200),
    channel_source   VARCHAR(20)   NOT NULL
                                   CHECK (channel_source IN (
                                       'Campaign', 'Event', 'Direct', 'SocialMedia', 'PartnerReferral'
                                   )),
    currency_code    VARCHAR(10),
    amount           NUMERIC(12,2),
    estimated_value  NUMERIC(12,2),
    impact_unit      VARCHAR(20),
    notes            TEXT,
    referral_post_id INT           REFERENCES social_media_posts(post_id) ON DELETE SET NULL
);

-- ============================================================
-- IN-KIND DONATION ITEMS
-- ============================================================

CREATE TABLE in_kind_donation_items (
    item_id               SERIAL        PRIMARY KEY,
    donation_id           INT           NOT NULL REFERENCES donations(donation_id) ON DELETE CASCADE,
    item_name             VARCHAR(255)  NOT NULL,
    item_category         VARCHAR(30)   NOT NULL,
    quantity              INT           NOT NULL,
    unit_of_measure       VARCHAR(20),
    estimated_unit_value  NUMERIC(10,2),
    intended_use          VARCHAR(100),
    received_condition    VARCHAR(20)
);

-- ============================================================
-- DONATION ALLOCATIONS
-- ============================================================

CREATE TABLE donation_allocations (
    allocation_id    SERIAL        PRIMARY KEY,
    donation_id      INT           NOT NULL REFERENCES donations(donation_id) ON DELETE CASCADE,
    safehouse_id     INT           NOT NULL REFERENCES safehouses(safehouse_id) ON DELETE RESTRICT,
    program_area     VARCHAR(30)   NOT NULL,
    amount_allocated NUMERIC(12,2) NOT NULL,
    allocation_date  DATE          NOT NULL,
    allocation_notes TEXT
);

-- ============================================================
-- RESIDENTS
-- ============================================================

CREATE TABLE residents (
    resident_id               SERIAL       PRIMARY KEY,
    case_control_no           VARCHAR(50)  NOT NULL UNIQUE,
    internal_code             VARCHAR(50),
    safehouse_id              INT          NOT NULL REFERENCES safehouses(safehouse_id) ON DELETE RESTRICT,
    case_status               VARCHAR(20)  NOT NULL DEFAULT 'Active'
                                           CHECK (case_status IN ('Active', 'Closed', 'Transferred')),
    sex                       VARCHAR(1)   NOT NULL DEFAULT 'F',
    date_of_birth             DATE         NOT NULL,
    birth_status              VARCHAR(20),
    place_of_birth            VARCHAR(200),
    religion                  VARCHAR(100),
    case_category             VARCHAR(20)  NOT NULL
                                           CHECK (case_category IN (
                                               'Abandoned', 'Foundling', 'Surrendered', 'Neglected'
                                           )),
    sub_cat_orphaned          BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_trafficked        BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_child_labor       BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_physical_abuse    BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_sexual_abuse      BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_osaec             BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_cicl              BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_at_risk           BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_street_child      BOOLEAN      NOT NULL DEFAULT FALSE,
    sub_cat_child_with_hiv    BOOLEAN      NOT NULL DEFAULT FALSE,
    is_pwd                    BOOLEAN      NOT NULL DEFAULT FALSE,
    pwd_type                  VARCHAR(200),
    has_special_needs         BOOLEAN      NOT NULL DEFAULT FALSE,
    special_needs_diagnosis   VARCHAR(200),
    family_is_4ps             BOOLEAN      NOT NULL DEFAULT FALSE,
    family_solo_parent        BOOLEAN      NOT NULL DEFAULT FALSE,
    family_indigenous         BOOLEAN      NOT NULL DEFAULT FALSE,
    family_parent_pwd         BOOLEAN      NOT NULL DEFAULT FALSE,
    family_informal_settler   BOOLEAN      NOT NULL DEFAULT FALSE,
    date_of_admission         DATE         NOT NULL,
    age_upon_admission        VARCHAR(50),
    present_age               VARCHAR(50),
    length_of_stay            VARCHAR(50),
    referral_source           VARCHAR(50),
    referring_agency_person   VARCHAR(255),
    date_colb_registered      DATE,
    date_colb_obtained        DATE,
    assigned_social_worker    VARCHAR(255),
    initial_case_assessment   VARCHAR(255),
    date_case_study_prepared  DATE,
    reintegration_type        VARCHAR(50),
    reintegration_status      VARCHAR(20)
                                           CHECK (reintegration_status IN (
                                               'Not Started', 'In Progress', 'Completed', 'On Hold'
                                           )),
    initial_risk_level        VARCHAR(10)  NOT NULL DEFAULT 'Medium'
                                           CHECK (initial_risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    current_risk_level        VARCHAR(10)  NOT NULL DEFAULT 'Medium'
                                           CHECK (current_risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    date_enrolled             DATE,
    date_closed               DATE,
    created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    notes_restricted          TEXT
);

-- ============================================================
-- PROCESS RECORDINGS
-- ============================================================

CREATE TABLE process_recordings (
    recording_id             SERIAL      PRIMARY KEY,
    resident_id              INT         NOT NULL REFERENCES residents(resident_id) ON DELETE CASCADE,
    session_date             DATE        NOT NULL,
    social_worker            VARCHAR(255),
    session_type             VARCHAR(20) NOT NULL DEFAULT 'Individual'
                                         CHECK (session_type IN ('Individual', 'Group')),
    session_duration_minutes INT,
    emotional_state_observed VARCHAR(20),
    emotional_state_end      VARCHAR(20),
    session_narrative        TEXT,
    interventions_applied    TEXT,
    follow_up_actions        TEXT,
    progress_noted           BOOLEAN     NOT NULL DEFAULT FALSE,
    concerns_flagged         BOOLEAN     NOT NULL DEFAULT FALSE,
    referral_made            BOOLEAN     NOT NULL DEFAULT FALSE,
    notes_restricted         TEXT
);

-- ============================================================
-- HOME VISITATIONS
-- ============================================================

CREATE TABLE home_visitations (
    visitation_id            SERIAL      PRIMARY KEY,
    resident_id              INT         NOT NULL REFERENCES residents(resident_id) ON DELETE CASCADE,
    visit_date               DATE        NOT NULL,
    social_worker            VARCHAR(255),
    visit_type               VARCHAR(30) NOT NULL
                                         CHECK (visit_type IN (
                                             'Initial Assessment', 'Routine Follow-Up',
                                             'Reintegration Assessment', 'Post-Placement Monitoring',
                                             'Emergency'
                                         )),
    location_visited         TEXT,
    family_members_present   TEXT,
    purpose                  TEXT,
    observations             TEXT,
    family_cooperation_level VARCHAR(25) NOT NULL DEFAULT 'Cooperative'
                                         CHECK (family_cooperation_level IN (
                                             'Highly Cooperative', 'Cooperative',
                                             'Neutral', 'Uncooperative'
                                         )),
    safety_concerns_noted    BOOLEAN     NOT NULL DEFAULT FALSE,
    follow_up_needed         BOOLEAN     NOT NULL DEFAULT FALSE,
    follow_up_notes          TEXT,
    visit_outcome            VARCHAR(25)
                                         CHECK (visit_outcome IN (
                                             'Favorable', 'Needs Improvement',
                                             'Unfavorable', 'Inconclusive'
                                         ))
);

-- ============================================================
-- EDUCATION RECORDS (matches CSV exactly)
-- ============================================================

CREATE TABLE education_records (
    education_record_id SERIAL        PRIMARY KEY,
    resident_id         INT           NOT NULL REFERENCES residents(resident_id) ON DELETE CASCADE,
    record_date         DATE          NOT NULL,
    education_level     VARCHAR(20)   NOT NULL
                                      CHECK (education_level IN (
                                          'Primary', 'Secondary', 'Vocational', 'CollegePrep'
                                      )),
    school_name         VARCHAR(200),
    enrollment_status   VARCHAR(20),
    attendance_rate     NUMERIC(4,3)  CHECK (attendance_rate BETWEEN 0 AND 1),
    progress_percent    NUMERIC(5,2)  CHECK (progress_percent BETWEEN 0 AND 100),
    completion_status   VARCHAR(20)   NOT NULL DEFAULT 'NotStarted'
                                      CHECK (completion_status IN (
                                          'NotStarted', 'InProgress', 'Completed'
                                      )),
    notes               TEXT
);

-- ============================================================
-- HEALTH & WELLBEING RECORDS (matches CSV exactly)
-- ============================================================

CREATE TABLE health_wellbeing_records (
    health_record_id           SERIAL        PRIMARY KEY,
    resident_id                INT           NOT NULL REFERENCES residents(resident_id) ON DELETE CASCADE,
    record_date                DATE          NOT NULL,
    general_health_score       NUMERIC(4,2),
    nutrition_score            NUMERIC(4,2),
    sleep_quality_score        NUMERIC(4,2),
    energy_level_score         NUMERIC(4,2),
    height_cm                  NUMERIC(5,2),
    weight_kg                  NUMERIC(5,2),
    bmi                        NUMERIC(4,2),
    medical_checkup_done       BOOLEAN       NOT NULL DEFAULT FALSE,
    dental_checkup_done        BOOLEAN       NOT NULL DEFAULT FALSE,
    psychological_checkup_done BOOLEAN       NOT NULL DEFAULT FALSE,
    notes                      TEXT
);

-- ============================================================
-- INTERVENTION PLANS
-- ============================================================

CREATE TABLE intervention_plans (
    plan_id              SERIAL      PRIMARY KEY,
    resident_id          INT         NOT NULL REFERENCES residents(resident_id) ON DELETE CASCADE,
    plan_category        VARCHAR(20) NOT NULL
                                     CHECK (plan_category IN (
                                         'Safety', 'Psychosocial', 'Education',
                                         'Physical Health', 'Legal', 'Reintegration'
                                     )),
    plan_description     TEXT        NOT NULL,
    services_provided    TEXT,
    target_value         NUMERIC(10,2),
    target_date          DATE,
    status               VARCHAR(20) NOT NULL DEFAULT 'Open'
                                     CHECK (status IN (
                                         'Open', 'In Progress', 'Achieved', 'On Hold', 'Closed'
                                     )),
    case_conference_date DATE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INCIDENT REPORTS
-- ============================================================

CREATE TABLE incident_reports (
    incident_id        SERIAL      PRIMARY KEY,
    resident_id        INT         NOT NULL REFERENCES residents(resident_id) ON DELETE CASCADE,
    safehouse_id       INT         NOT NULL REFERENCES safehouses(safehouse_id) ON DELETE RESTRICT,
    incident_date      DATE        NOT NULL,
    incident_type      VARCHAR(25) NOT NULL
                                   CHECK (incident_type IN (
                                       'Behavioral', 'Medical', 'Security', 'RunawayAttempt',
                                       'SelfHarm', 'ConflictWithPeer', 'PropertyDamage'
                                   )),
    severity           VARCHAR(10) NOT NULL
                                   CHECK (severity IN ('Low', 'Medium', 'High')),
    description        TEXT,
    response_taken     TEXT,
    resolved           BOOLEAN     NOT NULL DEFAULT FALSE,
    resolution_date    DATE,
    reported_by        VARCHAR(255),
    follow_up_required BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ============================================================
-- SAFEHOUSE MONTHLY METRICS
-- ============================================================

CREATE TABLE safehouse_monthly_metrics (
    metric_id               SERIAL        PRIMARY KEY,
    safehouse_id            INT           NOT NULL REFERENCES safehouses(safehouse_id) ON DELETE CASCADE,
    month_start             DATE          NOT NULL,
    month_end               DATE          NOT NULL,
    active_residents        INT           NOT NULL DEFAULT 0,
    avg_education_progress  NUMERIC(5,2),
    avg_health_score        NUMERIC(3,1),
    process_recording_count INT           NOT NULL DEFAULT 0,
    home_visitation_count   INT           NOT NULL DEFAULT 0,
    incident_count          INT           NOT NULL DEFAULT 0,
    notes                   TEXT,
    UNIQUE (safehouse_id, month_start)
);

-- ============================================================
-- PUBLIC IMPACT SNAPSHOTS
-- ============================================================

CREATE TABLE public_impact_snapshots (
    snapshot_id         SERIAL      PRIMARY KEY,
    snapshot_date       DATE        NOT NULL UNIQUE,
    headline            VARCHAR(500),
    summary_text        TEXT,
    metric_payload_json TEXT,
    is_published        BOOLEAN     NOT NULL DEFAULT FALSE,
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
