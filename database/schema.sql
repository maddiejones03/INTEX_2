-- ============================================================
-- Kanlungan Foundation — PostgreSQL Schema
-- Target: Azure Database for PostgreSQL Flexible Server
-- ============================================================

-- Drop tables in reverse dependency order for clean re-runs
DROP TABLE IF EXISTS case_conference_participants CASCADE;
DROP TABLE IF EXISTS case_conferences              CASCADE;
DROP TABLE IF EXISTS home_visits                   CASCADE;
DROP TABLE IF EXISTS process_recording_interventions CASCADE;
DROP TABLE IF EXISTS process_recordings            CASCADE;
DROP TABLE IF EXISTS donations                     CASCADE;
DROP TABLE IF EXISTS donors                        CASCADE;
DROP TABLE IF EXISTS resident_sub_categories       CASCADE;
DROP TABLE IF EXISTS residents                     CASCADE;
DROP TABLE IF EXISTS social_workers                CASCADE;
DROP TABLE IF EXISTS safe_houses                   CASCADE;
DROP TABLE IF EXISTS users                         CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role                CASCADE;
DROP TYPE IF EXISTS case_category_enum       CASCADE;
DROP TYPE IF EXISTS case_status_enum         CASCADE;
DROP TYPE IF EXISTS reintegration_status_enum CASCADE;
DROP TYPE IF EXISTS gender_enum              CASCADE;
DROP TYPE IF EXISTS donor_type_enum          CASCADE;
DROP TYPE IF EXISTS donation_status_enum     CASCADE;
DROP TYPE IF EXISTS session_type_enum        CASCADE;
DROP TYPE IF EXISTS cooperation_level_enum   CASCADE;
DROP TYPE IF EXISTS visit_type_enum          CASCADE;

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'staff', 'viewer');

CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');

CREATE TYPE case_category_enum AS ENUM (
    'Trafficked',
    'Physical Abuse',
    'Sexual Abuse',
    'Neglect',
    'Psychological Abuse',
    'Economic Abuse',
    'Abandoned',
    'CICL'
);

CREATE TYPE case_status_enum AS ENUM (
    'Active',
    'Reintegrated',
    'Transferred',
    'Runaway',
    'Deceased',
    'Closed'
);

CREATE TYPE reintegration_status_enum AS ENUM (
    'In Progress',
    'Reintegrated - Family',
    'Reintegrated - Community',
    'Transferred to Partner Agency',
    'Independent Living',
    'Pending'
);

CREATE TYPE donor_type_enum AS ENUM (
    'Monetary',
    'In-Kind',
    'Volunteer',
    'Skills',
    'Social Media',
    'Corporate'
);

CREATE TYPE donation_status_enum AS ENUM ('Received', 'Pending', 'Processed');

CREATE TYPE session_type_enum AS ENUM ('Individual', 'Group');

CREATE TYPE cooperation_level_enum AS ENUM ('High', 'Moderate', 'Low', 'Uncooperative');

CREATE TYPE visit_type_enum AS ENUM (
    'Initial Assessment',
    'Routine Follow-Up',
    'Reintegration Assessment',
    'Post-Placement Monitoring',
    'Emergency'
);

-- ============================================================
-- USERS  (staff / admin portal accounts)
-- ============================================================

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,               -- bcrypt hash
    email         VARCHAR(255) NOT NULL UNIQUE,
    role          user_role    NOT NULL DEFAULT 'staff',
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SAFE HOUSES
-- ============================================================

CREATE TABLE safe_houses (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    location         VARCHAR(200) NOT NULL,
    capacity         INT          NOT NULL CHECK (capacity > 0),
    contact_person   VARCHAR(200),
    contact_number   VARCHAR(50),
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOCIAL WORKERS
-- ============================================================

CREATE TABLE social_workers (
    id             SERIAL PRIMARY KEY,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    safe_house_id  INT          REFERENCES safe_houses(id) ON DELETE SET NULL,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RESIDENTS
-- ============================================================

CREATE TABLE residents (
    id                      SERIAL PRIMARY KEY,
    case_number             VARCHAR(50)              NOT NULL UNIQUE,
    first_name              VARCHAR(100)             NOT NULL,
    last_name               VARCHAR(100)             NOT NULL,
    middle_name             VARCHAR(100),
    date_of_birth           DATE                     NOT NULL,
    gender                  gender_enum              NOT NULL,
    address                 TEXT,
    safe_house_id           INT                      NOT NULL REFERENCES safe_houses(id) ON DELETE RESTRICT,
    case_category           case_category_enum       NOT NULL,
    case_status             case_status_enum         NOT NULL DEFAULT 'Active',
    admission_date          DATE                     NOT NULL,
    referral_source         VARCHAR(255),
    assigned_social_worker_id INT                    REFERENCES social_workers(id) ON DELETE SET NULL,

    -- Demographics
    nationality             VARCHAR(100)             NOT NULL DEFAULT 'Filipino',
    religion                VARCHAR(100),
    civil_status            VARCHAR(50),
    education_level         VARCHAR(100),

    -- Family socio-demographic profile
    is_4ps_beneficiary      BOOLEAN                  NOT NULL DEFAULT FALSE,
    is_solo_parent          BOOLEAN                  NOT NULL DEFAULT FALSE,
    is_indigenous_group     BOOLEAN                  NOT NULL DEFAULT FALSE,
    indigenous_group_name   VARCHAR(200),
    is_informal_settler     BOOLEAN                  NOT NULL DEFAULT FALSE,

    -- Disability
    has_disability          BOOLEAN                  NOT NULL DEFAULT FALSE,
    disability_type         VARCHAR(200),

    -- Reintegration
    reintegration_status    reintegration_status_enum NOT NULL DEFAULT 'Pending',
    reintegration_date      DATE,
    exit_reason             TEXT,

    notes                   TEXT,
    created_at              TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

-- Age is always computed from date_of_birth — no stored column needed
-- Use: DATE_PART('year', AGE(date_of_birth)) in queries

-- ============================================================
-- RESIDENT SUB-CATEGORIES  (one-to-many)
-- ============================================================

CREATE TABLE resident_sub_categories (
    id           SERIAL PRIMARY KEY,
    resident_id  INT         NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    sub_category VARCHAR(200) NOT NULL,
    UNIQUE (resident_id, sub_category)
);

-- ============================================================
-- DONORS
-- ============================================================

CREATE TABLE donors (
    id                  SERIAL PRIMARY KEY,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    organization_name   VARCHAR(255),
    email               VARCHAR(255) NOT NULL UNIQUE,
    phone               VARCHAR(50),
    donor_type          donor_type_enum NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    address             TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DONATIONS
-- ============================================================

CREATE TABLE donations (
    id           SERIAL PRIMARY KEY,
    donor_id     INT                  NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
    type         donor_type_enum      NOT NULL,
    amount       NUMERIC(12, 2)       CHECK (amount >= 0),
    description  TEXT,
    date         DATE                 NOT NULL,
    safe_house_id INT                 REFERENCES safe_houses(id) ON DELETE SET NULL,
    program_area VARCHAR(200),
    status       donation_status_enum NOT NULL DEFAULT 'Received',
    created_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROCESS RECORDINGS  (counseling session notes)
-- ============================================================

CREATE TABLE process_recordings (
    id                  SERIAL PRIMARY KEY,
    resident_id         INT                 NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    social_worker_id    INT                 REFERENCES social_workers(id) ON DELETE SET NULL,
    session_date        DATE                NOT NULL,
    session_type        session_type_enum   NOT NULL DEFAULT 'Individual',
    emotional_state     VARCHAR(100)        NOT NULL,
    narrative_summary   TEXT                NOT NULL,
    follow_up_actions   TEXT,
    next_session_date   DATE,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROCESS RECORDING INTERVENTIONS  (one-to-many)
-- ============================================================

CREATE TABLE process_recording_interventions (
    id                    SERIAL PRIMARY KEY,
    process_recording_id  INT         NOT NULL REFERENCES process_recordings(id) ON DELETE CASCADE,
    intervention          VARCHAR(200) NOT NULL,
    UNIQUE (process_recording_id, intervention)
);

-- ============================================================
-- HOME VISITS
-- ============================================================

CREATE TABLE home_visits (
    id                            SERIAL PRIMARY KEY,
    resident_id                   INT                       NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    social_worker_id              INT                       REFERENCES social_workers(id) ON DELETE SET NULL,
    visit_date                    DATE                      NOT NULL,
    visit_type                    visit_type_enum           NOT NULL,
    home_environment_observations TEXT,
    family_cooperation_level      cooperation_level_enum    NOT NULL DEFAULT 'Moderate',
    safety_concerns               TEXT,
    follow_up_actions             TEXT,
    created_at                    TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CASE CONFERENCES
-- ============================================================

CREATE TABLE case_conferences (
    id                   SERIAL PRIMARY KEY,
    resident_id          INT         NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    conference_date      DATE        NOT NULL,
    agenda               TEXT,
    decisions            TEXT,
    follow_up_actions    TEXT,
    next_conference_date DATE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CASE CONFERENCE PARTICIPANTS  (one-to-many)
-- ============================================================

CREATE TABLE case_conference_participants (
    id                  SERIAL PRIMARY KEY,
    case_conference_id  INT         NOT NULL REFERENCES case_conferences(id) ON DELETE CASCADE,
    participant_name    VARCHAR(255) NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_residents_safe_house       ON residents(safe_house_id);
CREATE INDEX idx_residents_case_status      ON residents(case_status);
CREATE INDEX idx_residents_case_category    ON residents(case_category);
CREATE INDEX idx_residents_social_worker    ON residents(assigned_social_worker_id);
CREATE INDEX idx_residents_admission_date   ON residents(admission_date);

CREATE INDEX idx_donations_donor            ON donations(donor_id);
CREATE INDEX idx_donations_date             ON donations(date);
CREATE INDEX idx_donations_safe_house       ON donations(safe_house_id);

CREATE INDEX idx_process_recordings_resident    ON process_recordings(resident_id);
CREATE INDEX idx_process_recordings_session_date ON process_recordings(session_date);

CREATE INDEX idx_home_visits_resident       ON home_visits(resident_id);
CREATE INDEX idx_home_visits_date           ON home_visits(visit_date);

CREATE INDEX idx_case_conferences_resident  ON case_conferences(resident_id);

CREATE INDEX idx_social_workers_safe_house  ON social_workers(safe_house_id);

-- ============================================================
-- VIEWS
-- ============================================================

-- Computed donor totals (replaces stored total_contributions)
CREATE VIEW donor_totals AS
SELECT
    d.id AS donor_id,
    COALESCE(SUM(dn.amount), 0)            AS total_contributions,
    MAX(dn.date)                            AS last_donation_date
FROM donors d
LEFT JOIN donations dn ON dn.donor_id = d.id AND dn.status = 'Received'
GROUP BY d.id;

-- Current safe house occupancy (replaces stored current_occupancy)
CREATE VIEW safe_house_occupancy AS
SELECT
    sh.id              AS safe_house_id,
    sh.name,
    sh.capacity,
    COUNT(r.id)        AS current_occupancy,
    sh.capacity - COUNT(r.id) AS available_beds
FROM safe_houses sh
LEFT JOIN residents r
       ON r.safe_house_id = sh.id
      AND r.case_status = 'Active'
GROUP BY sh.id, sh.name, sh.capacity;

-- Social worker caseload (replaces stored caseload)
CREATE VIEW social_worker_caseload AS
SELECT
    sw.id   AS social_worker_id,
    sw.first_name,
    sw.last_name,
    sw.email,
    sw.safe_house_id,
    sw.is_active,
    COUNT(r.id) AS caseload
FROM social_workers sw
LEFT JOIN residents r
       ON r.assigned_social_worker_id = sw.id
      AND r.case_status = 'Active'
GROUP BY sw.id, sw.first_name, sw.last_name, sw.email, sw.safe_house_id, sw.is_active;
