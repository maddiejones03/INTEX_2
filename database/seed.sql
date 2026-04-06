-- ============================================================
-- Kanlungan Foundation — Seed Data
-- Run AFTER schema.sql
-- Passwords are bcrypt hashes of the demo passwords shown
-- ============================================================

-- ============================================================
-- USERS
-- password for 'admin'  = 'admin123'  (bcrypt, cost 12)
-- password for 'staff'  = 'staff123'  (bcrypt, cost 12)
-- Replace these hashes with real bcrypt output before deploying
-- ============================================================

INSERT INTO users (username, password_hash, email, role, first_name, last_name) VALUES
('admin', '$2a$12$placeholder_hash_admin_replace_me_before_deploy', 'admin@kanlungan.org', 'admin', 'Maria',  'Santos'),
('staff', '$2a$12$placeholder_hash_staff_replace_me_before_deploy', 'staff@kanlungan.org', 'staff', 'Jose',   'Reyes');

-- ============================================================
-- SAFE HOUSES
-- ============================================================

INSERT INTO safe_houses (id, name, location, capacity, contact_person, contact_number, is_active) VALUES
(1, 'Tahanan ng Pag-asa', 'Quezon City', 30, 'Ana Dela Cruz', '+63 2 8123 4567', TRUE),
(2, 'Bahay Kalinga',       'Manila',      25, 'Pedro Lim',     '+63 2 8234 5678', TRUE),
(3, 'Kanlungan Center',    'Makati',      20, 'Rosa Garcia',   '+63 2 8345 6789', TRUE);

SELECT setval('safe_houses_id_seq', 3);

-- ============================================================
-- SOCIAL WORKERS
-- ============================================================

INSERT INTO social_workers (id, first_name, last_name, email, safe_house_id, is_active) VALUES
(1, 'Maria',  'Santos',    'msantos@kanlungan.org',   1, TRUE),
(2, 'Jose',   'Reyes',     'jreyes@kanlungan.org',    2, TRUE),
(3, 'Ana',    'Dela Cruz', 'adelacruz@kanlungan.org', 1, TRUE),
(4, 'Carlos', 'Mendoza',   'cmendoza@kanlungan.org',  3, TRUE);

SELECT setval('social_workers_id_seq', 4);

-- ============================================================
-- RESIDENTS
-- ============================================================

INSERT INTO residents (
    id, case_number, first_name, last_name, middle_name,
    date_of_birth, gender, address,
    safe_house_id, case_category, case_status,
    admission_date, referral_source, assigned_social_worker_id,
    nationality, religion, civil_status, education_level,
    is_4ps_beneficiary, is_solo_parent, is_indigenous_group, indigenous_group_name,
    is_informal_settler, has_disability, disability_type,
    reintegration_status, reintegration_date, exit_reason, notes
) VALUES

(1, 'KF-2024-001', 'Grace',  'Flores',   'Marie',
 '2010-03-15', 'Female', 'Tondo, Manila',
 1, 'Trafficked', 'Active',
 '2024-01-10', 'Philippine National Police', 1,
 'Filipino', 'Catholic', 'Single', 'Elementary',
 TRUE, FALSE, FALSE, NULL,
 TRUE, FALSE, NULL,
 'In Progress', NULL, NULL,
 'Showing positive progress in counseling sessions.'),

(2, 'KF-2024-002', 'Lena',   'Cruz',     NULL,
 '2008-07-22', 'Female', 'Pasay City',
 2, 'Sexual Abuse', 'Active',
 '2024-02-14', 'Department of Social Welfare and Development', 2,
 'Filipino', NULL, 'Single', 'High School',
 FALSE, FALSE, FALSE, NULL,
 FALSE, FALSE, NULL,
 'In Progress', NULL, NULL, NULL),

(3, 'KF-2024-003', 'Ramon',  'Bautista',  NULL,
 '2012-11-05', 'Male', 'Caloocan City',
 3, 'Neglect', 'Active',
 '2024-03-01', 'Barangay Social Services', 4,
 'Filipino', NULL, 'Single', 'Elementary',
 TRUE, FALSE, TRUE, 'Aeta',
 TRUE, TRUE, 'Mild Intellectual Disability',
 'Pending', NULL, NULL, NULL),

(4, 'KF-2023-045', 'Sofia',  'Ramos',    NULL,
 '2007-05-18', 'Female', 'Marikina City',
 1, 'Physical Abuse', 'Reintegrated',
 '2023-06-15', 'Hospital Referral', 3,
 'Filipino', NULL, 'Single', 'High School',
 FALSE, FALSE, FALSE, NULL,
 FALSE, FALSE, NULL,
 'Reintegrated - Family', '2024-01-20', 'Successfully reintegrated with extended family.', NULL),

(5, 'KF-2024-004', 'Miguel', 'Torres',   NULL,
 '2009-09-30', 'Male', 'Valenzuela City',
 2, 'CICL', 'Active',
 '2024-03-20', 'Regional Trial Court', 2,
 'Filipino', NULL, 'Single', 'Elementary',
 TRUE, FALSE, FALSE, NULL,
 TRUE, FALSE, NULL,
 'In Progress', NULL, NULL, NULL);

SELECT setval('residents_id_seq', 5);

-- ============================================================
-- RESIDENT SUB-CATEGORIES
-- ============================================================

INSERT INTO resident_sub_categories (resident_id, sub_category) VALUES
(1, 'Labor Trafficking'),
(2, 'Rape'),
(2, 'Incest'),
(3, 'Physical Neglect'),
(3, 'Educational Neglect'),
(4, 'Domestic Violence'),
(5, 'Theft');

-- ============================================================
-- DONORS
-- ============================================================

INSERT INTO donors (id, first_name, last_name, organization_name, email, phone, donor_type, status, address, notes) VALUES
(1, 'Roberto', 'Tan',    'Tan Family Foundation',  'rtan@tanfoundation.ph',  '+63 917 123 4567', 'Monetary',      'Active', NULL, NULL),
(2, 'Jennifer','Lim',    NULL,                      'jlim@gmail.com',         '+63 918 234 5678', 'In-Kind',       'Active', NULL, NULL),
(3, 'Antonio', 'Sy',     'AC Sy Enterprises',       'asy@acsy.com',           NULL,               'Corporate',     'Active', NULL, NULL),
(4, 'Maria',   'Aquino', NULL,                      'maquino@yahoo.com',      NULL,               'Volunteer',     'Active', NULL, NULL),
(5, 'David',   'Go',     'Go Group of Companies',   'dgo@gogroup.com',        NULL,               'Monetary',      'Active', NULL, NULL),
(6, 'Claire',  'Reyes',  NULL,                      'creyes@outlook.com',     NULL,               'Skills',        'Active', NULL, NULL),
(7, 'Michael', 'Yap',    NULL,                      'myap@gmail.com',         NULL,               'Social Media',  'Inactive', NULL, NULL);

SELECT setval('donors_id_seq', 7);

-- ============================================================
-- DONATIONS
-- ============================================================

INSERT INTO donations (id, donor_id, type, amount, description, date, safe_house_id, program_area, status) VALUES
(1, 1, 'Monetary',  100000.00, 'Q1 2024 operational support',              '2024-03-15', 1,    'General Operations', 'Received'),
(2, 3, 'Monetary',  250000.00, 'Education program funding',                '2024-02-28', NULL, 'Education',          'Received'),
(3, 2, 'In-Kind',    25000.00, 'School supplies and uniforms (150 sets)',  '2024-04-01', 2,    'Education',          'Received'),
(4, 5, 'Monetary',  200000.00, 'Medical care fund',                        '2024-01-15', NULL, 'Health',             'Received'),
(5, 4, 'Volunteer',     NULL,  '40 hours tutoring services',               '2024-03-30', 1,    'Education',          'Received'),
(6, 6, 'Skills',     15000.00, 'Legal consultation services (10 hours)',   '2024-03-10', NULL, 'Legal Support',      'Received');

SELECT setval('donations_id_seq', 6);

-- ============================================================
-- PROCESS RECORDINGS
-- ============================================================

INSERT INTO process_recordings (
    id, resident_id, social_worker_id,
    session_date, session_type, emotional_state,
    narrative_summary, follow_up_actions, next_session_date
) VALUES

(1, 1, 1,
 '2024-04-03', 'Individual', 'Anxious but engaged',
 'Grace participated actively in today''s session. She shared feelings about her experience and expressed desire to return to school. Discussed coping mechanisms for dealing with flashbacks.',
 'Schedule art therapy session; coordinate with education coordinator for school enrollment.',
 '2024-04-10'),

(2, 1, 1,
 '2024-03-27', 'Individual', 'Withdrawn and quiet',
 'Grace was initially resistant but gradually opened up. She discussed difficulties sleeping and recurring nightmares. Breathing exercises were introduced.',
 'Monitor sleep patterns; consult with psychiatrist if symptoms persist.',
 NULL),

(3, 2, 2,
 '2024-04-02', 'Individual', 'Stable, showing resilience',
 'Lena discussed her plans for the future including returning to school and eventually becoming a nurse. Made good progress in processing trauma.',
 'Facilitate contact with school counselor; prepare reintegration assessment.',
 NULL);

SELECT setval('process_recordings_id_seq', 3);

-- ============================================================
-- PROCESS RECORDING INTERVENTIONS
-- ============================================================

INSERT INTO process_recording_interventions (process_recording_id, intervention) VALUES
(1, 'Trauma-Informed Care'),
(1, 'Cognitive Behavioral Therapy'),
(1, 'Psychoeducation'),
(2, 'Relaxation Techniques'),
(2, 'Narrative Therapy'),
(3, 'Solution-Focused Therapy'),
(3, 'Strengths-Based Approach');

-- ============================================================
-- HOME VISITS
-- ============================================================

INSERT INTO home_visits (
    id, resident_id, social_worker_id,
    visit_date, visit_type,
    home_environment_observations,
    family_cooperation_level, safety_concerns, follow_up_actions
) VALUES

(1, 4, 3,
 '2024-03-25', 'Post-Placement Monitoring',
 'Home is clean and safe. Sofia has her own room. Extended family is supportive and engaged.',
 'High', 'None observed.',
 'Continue monthly monitoring visits for 6 months. Coordinate school enrollment.'),

(2, 1, 1,
 '2024-02-10', 'Initial Assessment',
 'Original home environment assessed. Poverty conditions noted. Parents absent; lived with neighbor.',
 'Moderate', 'Economic vulnerability; inadequate supervision.',
 'Connect family with DSWD livelihood program. Schedule follow-up in 60 days.');

SELECT setval('home_visits_id_seq', 2);

-- ============================================================
-- CASE CONFERENCES
-- ============================================================

INSERT INTO case_conferences (
    id, resident_id,
    conference_date, agenda, decisions,
    follow_up_actions, next_conference_date
) VALUES

(1, 1,
 '2024-04-05',
 'Progress review; school reintegration planning; legal case update',
 'Approved school enrollment for SY 2024-2025. Continue bi-weekly counseling. Legal case proceeding to trial in June.',
 'Process school documents; inform Grace of legal proceedings appropriately.',
 '2024-07-05');

SELECT setval('case_conferences_id_seq', 1);

-- ============================================================
-- CASE CONFERENCE PARTICIPANTS
-- ============================================================

INSERT INTO case_conference_participants (case_conference_id, participant_name) VALUES
(1, 'Maria Santos (Social Worker)'),
(1, 'Dr. Elena Pascual (Psychologist)'),
(1, 'Atty. Ramon Villanueva (Legal Aid)'),
(1, 'Sis. Caridad Reyes (House Mother)');
