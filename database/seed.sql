-- ============================================================
-- Kanlungan Foundation — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- ============================================================
-- USERS
-- Replace password_hash values with real bcrypt (cost 12) hashes
-- before deploying. Demo: admin/admin123, staff/staff123
-- ============================================================

INSERT INTO users (username, password_hash, email, role, first_name, last_name) VALUES
('admin', '$2a$12$REPLACE_WITH_REAL_BCRYPT_HASH_ADMIN', 'admin@kanlungan.org', 'admin', 'Maria',  'Santos'),
('staff', '$2a$12$REPLACE_WITH_REAL_BCRYPT_HASH_STAFF', 'staff@kanlungan.org', 'staff', 'Jose',   'Reyes');

-- ============================================================
-- SAFEHOUSES
-- ============================================================

INSERT INTO safehouses (
    safehouse_id, safehouse_code, name, region, city, province, country,
    open_date, status, capacity_girls, capacity_staff, current_occupancy, notes
) VALUES
(1, 'SH-01', 'Tahanan ng Pag-asa', 'Luzon', 'Quezon City', 'Metro Manila', 'Philippines', '2008-06-01', 'Active', 30, 10, 22, NULL),
(2, 'SH-02', 'Bahay Kalinga',       'Luzon', 'Manila',      'Metro Manila', 'Philippines', '2011-03-15', 'Active', 25, 8,  19, NULL),
(3, 'SH-03', 'Kanlungan Center',    'Luzon', 'Makati',      'Metro Manila', 'Philippines', '2015-09-01', 'Active', 20, 7,  14, NULL);

SELECT setval('safehouses_safehouse_id_seq', 3);

-- ============================================================
-- PARTNERS
-- ============================================================

INSERT INTO partners (
    partner_id, partner_name, partner_type, role_type,
    contact_name, email, phone, region, status, start_date, end_date, notes
) VALUES
(1, 'Barangay Learning Center Network', 'Organization', 'Education',     'Dr. Elena Pascual',     'epascual@blcn.ph',      '+63 2 8111 2222', 'Luzon', 'Active', '2020-01-01', NULL, NULL),
(2, 'SafePath Logistics Inc.',          'Organization', 'Transport',     'Ramon Cruz',            'rcruz@safepath.ph',     '+63 2 8222 3333', 'Luzon', 'Active', '2019-06-01', NULL, NULL),
(3, 'Atty. Ramon Villanueva',           'Individual',   'Evaluation',    'Ramon Villanueva',      'rvill@legalaid.ph',     '+63 917 555 1234', 'Luzon', 'Active', '2021-03-01', NULL, 'Legal aid volunteer'),
(4, 'CleanBuild Maintenance Co.',       'Organization', 'Maintenance',   'Jerry Santos',          'jsantos@cleanbuild.ph', '+63 2 8333 4444', 'Luzon', 'Active', '2018-01-01', NULL, NULL);

SELECT setval('partners_partner_id_seq', 4);

-- ============================================================
-- PARTNER ASSIGNMENTS
-- ============================================================

INSERT INTO partner_assignments (
    partner_id, safehouse_id, program_area,
    assignment_start, assignment_end, responsibility_notes, is_primary, status
) VALUES
(1, 1, 'Education',   '2020-01-01', NULL, 'Delivers bridge and secondary education programs', TRUE,  'Active'),
(1, 2, 'Education',   '2020-06-01', NULL, 'Delivers bridge program for SH-02 residents',     FALSE, 'Active'),
(2, 1, 'Transport',   '2019-06-01', NULL, 'Medical and court transport for all residents',   TRUE,  'Active'),
(2, 2, 'Transport',   '2019-06-01', NULL, 'Transport services for SH-02',                   FALSE, 'Active'),
(3, NULL,'Education', '2021-03-01', NULL, 'Legal consultations, court prep, documentation', TRUE,  'Active'),
(4, 1, 'Maintenance', '2018-01-01', NULL, 'Monthly facility maintenance SH-01',              TRUE,  'Active'),
(4, 3, 'Maintenance', '2022-01-01', NULL, 'Quarterly maintenance SH-03',                    FALSE, 'Active');

-- ============================================================
-- SOCIAL MEDIA POSTS (sample — enough to support FK from donations)
-- ============================================================

INSERT INTO social_media_posts (
    post_id, platform, platform_post_id, post_url, created_at, day_of_week, post_hour,
    post_type, media_type, caption, hashtags, num_hashtags, mentions_count,
    has_call_to_action, call_to_action_type, content_topic, sentiment_tone,
    caption_length, features_resident_story, campaign_name, is_boosted, boost_budget_php,
    impressions, reach, likes, comments, shares, saves, click_throughs,
    video_views, engagement_rate, profile_visits, donation_referrals,
    estimated_donation_value_php, follower_count_at_post
) VALUES
(1, 'Facebook', 'fb_100001', 'https://facebook.com/kanlungan/posts/100001',
 '2024-03-10 09:00:00+08', 'Sunday', 9,
 'FundraisingAppeal', 'Photo',
 'Every peso you give puts a roof over a child''s head and hope in her heart. Donate now. #EndTrafficking #HopeForGirls #KanlunganFoundation',
 '#EndTrafficking,#HopeForGirls,#KanlunganFoundation', 3, 0,
 TRUE, 'DonateNow', 'DonorImpact', 'Hopeful',
 140, FALSE, 'Year-End Hope', TRUE, 2500.00,
 18400, 14200, 832, 94, 218, 176, 312,
 NULL, 0.0804, 540, 4, 28500.00, 12800),

(2, 'Instagram', 'ig_200001', 'https://instagram.com/p/200001',
 '2024-04-01 17:30:00+08', 'Monday', 17,
 'ImpactStory', 'Carousel',
 'She arrived at our shelter frightened and alone. Today, she''s top of her class. Your support made this possible. #HopeForGirls #SafehouseLife',
 '#HopeForGirls,#SafehouseLife', 2, 0,
 TRUE, 'LearnMore', 'SafehouseLife', 'Emotional',
 185, TRUE, NULL, FALSE, NULL,
 9600, 7800, 1240, 88, 143, 321, 98,
 NULL, 0.1886, 220, 2, 12000.00, 9400);

SELECT setval('social_media_posts_post_id_seq', 2);

-- ============================================================
-- SUPPORTERS
-- ============================================================

INSERT INTO supporters (
    supporter_id, supporter_type, display_name, organization_name,
    first_name, last_name, relationship_type, region, country,
    email, phone, status, first_donation_date, acquisition_channel
) VALUES
(1, 'MonetaryDonor',       'Roberto Tan / Tan Family Foundation', 'Tan Family Foundation', 'Roberto', 'Tan',    'Local',               'Luzon',   'Philippines', 'rtan@tanfoundation.ph',  '+63 917 123 4567', 'Active',   '2022-01-15', 'Event'),
(2, 'InKindDonor',         'Jennifer Lim',                        NULL,                    'Jennifer','Lim',    'Local',               'Luzon',   'Philippines', 'jlim@gmail.com',         '+63 918 234 5678', 'Active',   '2023-03-22', 'WordOfMouth'),
(3, 'MonetaryDonor',       'AC Sy Enterprises',                   'AC Sy Enterprises',     'Antonio', 'Sy',     'Local',               'Luzon',   'Philippines', 'asy@acsy.com',           NULL,               'Active',   '2021-06-15', 'PartnerReferral'),
(4, 'Volunteer',           'Maria Aquino',                        NULL,                    'Maria',   'Aquino', 'Local',               'Luzon',   'Philippines', 'maquino@yahoo.com',      NULL,               'Active',   '2022-09-01', 'Church'),
(5, 'MonetaryDonor',       'David Go / Go Group',                 'Go Group of Companies', 'David',   'Go',     'Local',               'Luzon',   'Philippines', 'dgo@gogroup.com',        NULL,               'Active',   '2020-11-20', 'Website'),
(6, 'SkillsContributor',   'Claire Reyes',                        NULL,                    'Claire',  'Reyes',  'Local',               'Luzon',   'Philippines', 'creyes@outlook.com',     NULL,               'Active',   '2023-01-05', 'SocialMedia'),
(7, 'SocialMediaAdvocate', 'Michael Yap',                         NULL,                    'Michael', 'Yap',    'Local',               'Luzon',   'Philippines', 'myap@gmail.com',         NULL,               'Inactive', '2023-07-14', 'SocialMedia'),
(8, 'PartnerOrganization', 'Ayala Foundation',                    'Ayala Foundation',      NULL,      NULL,     'PartnerOrganization', 'Luzon',   'Philippines', 'grants@ayalafoundation.org', NULL,            'Active',   '2019-01-01', 'PartnerReferral');

SELECT setval('supporters_supporter_id_seq', 8);

-- ============================================================
-- DONATIONS
-- ============================================================

INSERT INTO donations (
    donation_id, supporter_id, donation_type, donation_date, channel_source,
    currency_code, amount, estimated_value, impact_unit,
    is_recurring, campaign_name, notes, created_by_partner_id, referral_post_id
) VALUES
(1, 1, 'Monetary',   '2024-03-15', 'Event',           'PHP', 100000.00, 100000.00, 'pesos',   FALSE, 'Year-End Hope',    'Q1 2024 operational support',              NULL, NULL),
(2, 3, 'Monetary',   '2024-02-28', 'Direct',          'PHP', 250000.00, 250000.00, 'pesos',   FALSE, NULL,               'Education program funding',                NULL, NULL),
(3, 2, 'InKind',     '2024-04-01', 'Direct',          NULL,  NULL,       25000.00, 'items',   FALSE, 'Back to School',   '150 school supply sets',                   NULL, NULL),
(4, 5, 'Monetary',   '2024-01-15', 'Campaign',        'PHP', 200000.00, 200000.00, 'pesos',   TRUE,  NULL,               'Medical care fund — recurring quarterly',  NULL, NULL),
(5, 4, 'Time',       '2024-03-30', 'Direct',          NULL,  NULL,         8000.00, 'hours',  FALSE, NULL,               '40 hours tutoring services @ ₱200/hr',     NULL, NULL),
(6, 6, 'Skills',     '2024-03-10', 'Direct',          NULL,  NULL,        15000.00, 'hours',  FALSE, NULL,               'Legal consultation — 10 hours',             NULL, NULL),
(7, 7, 'SocialMedia','2024-02-14', 'SocialMedia',     NULL,  NULL,         5000.00, 'campaigns', FALSE, 'Year-End Hope', 'Awareness campaign posts — Feb 2024',      NULL, 1),
(8, 1, 'Monetary',   '2024-01-10', 'Campaign',        'PHP',  50000.00,  50000.00, 'pesos',   FALSE, 'Year-End Hope',   'Year-end campaign contribution',            NULL, 1);

SELECT setval('donations_donation_id_seq', 8);

-- ============================================================
-- IN-KIND DONATION ITEMS  (for donation_id = 3)
-- ============================================================

INSERT INTO in_kind_donation_items (
    donation_id, item_name, item_category, quantity,
    unit_of_measure, estimated_unit_value, intended_use, received_condition
) VALUES
(3, 'School notebook (5-subject)',  'SchoolMaterials', 150, 'pcs',  80.00, 'Education', 'New'),
(3, 'Ballpen set (3-pack)',         'Supplies',        150, 'packs', 45.00, 'Education', 'New'),
(3, 'School uniform set',           'Clothing',        150, 'sets', 120.00, 'Education', 'New');

-- ============================================================
-- DONATION ALLOCATIONS
-- ============================================================

INSERT INTO donation_allocations (
    donation_id, safehouse_id, program_area, amount_allocated, allocation_date, allocation_notes
) VALUES
(1, 1, 'Operations',  60000.00, '2024-03-16', 'SH-01 Q1 operational budget'),
(1, 2, 'Operations',  40000.00, '2024-03-16', 'SH-02 Q1 operational budget'),
(2, 1, 'Education',  125000.00, '2024-03-01', 'Education program — SH-01'),
(2, 2, 'Education',   75000.00, '2024-03-01', 'Education program — SH-02'),
(2, 3, 'Education',   50000.00, '2024-03-01', 'Education program — SH-03'),
(3, 2, 'Education',   25000.00, '2024-04-02', 'School supplies for SH-02 residents'),
(4, 1, 'Wellbeing',  200000.00, '2024-01-16', 'Medical care fund — all residents SH-01');

-- ============================================================
-- RESIDENTS
-- ============================================================

INSERT INTO residents (
    resident_id, case_control_no, internal_code, safehouse_id, case_status,
    sex, date_of_birth, birth_status, place_of_birth, religion,
    case_category,
    sub_cat_orphaned, sub_cat_trafficked, sub_cat_child_labor,
    sub_cat_physical_abuse, sub_cat_sexual_abuse, sub_cat_osaec,
    sub_cat_cicl, sub_cat_at_risk, sub_cat_street_child, sub_cat_child_with_hiv,
    is_pwd, pwd_type, has_special_needs, special_needs_diagnosis,
    family_is_4ps, family_solo_parent, family_indigenous, family_parent_pwd, family_informal_settler,
    date_of_admission, age_upon_admission, referral_source, referring_agency_person,
    assigned_social_worker, initial_case_assessment,
    reintegration_type, reintegration_status,
    initial_risk_level, current_risk_level,
    date_enrolled, date_closed, notes_restricted
) VALUES

-- Resident 1: C0073 - trafficked child
('C0073', 'INT-001', 1, 'Active',
 'F', '2010-03-15', 'Non-Marital', 'Manila', 'Catholic',
 'Neglected',
 FALSE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
 FALSE, NULL, FALSE, NULL,
 TRUE, FALSE, FALSE, FALSE, TRUE,
 '2024-01-10', '13 Years 10 months', 'Police', 'PNP-WCPD Station 1',
 'Maria Santos', 'For Reunification',
 'Family Reunification', 'In Progress',
 'High', 'Medium',
 '2024-01-10', NULL, NULL),

-- Resident 2: C0074 - sexual abuse victim
('C0074', 'INT-002', 2, 'Active',
 'F', '2008-07-22', 'Marital', 'Pasay City', NULL,
 'Neglected',
 FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE,
 FALSE, NULL, FALSE, NULL,
 FALSE, FALSE, FALSE, FALSE, FALSE,
 '2024-02-14', '15 Years 6 months', 'Government Agency', 'DSWD-NCR',
 'Jose Reyes', 'For Reunification',
 'Family Reunification', 'In Progress',
 'High', 'Medium',
 '2024-02-14', NULL, NULL),

-- Resident 3: C0075 - neglected, indigenous, PWD
('C0075', 'INT-003', 3, 'Active',
 'F', '2012-11-05', 'Non-Marital', 'Caloocan City', NULL,
 'Neglected',
 FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE,
 TRUE, 'Mild Intellectual Disability', TRUE, 'Mild Intellectual Disability',
 TRUE, FALSE, TRUE, FALSE, TRUE,
 '2024-03-01', '11 Years 3 months', 'Government Agency', 'Barangay Social Services',
 'Carlos Mendoza', 'For Foster Care',
 'Foster Care', 'Not Started',
 'High', 'High',
 '2024-03-01', NULL, NULL),

-- Resident 4: C0051 - physical abuse, closed/reintegrated
('C0051', 'INT-004', 1, 'Closed',
 'F', '2007-05-18', 'Marital', 'Marikina City', 'Catholic',
 'Neglected',
 FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
 FALSE, NULL, FALSE, NULL,
 FALSE, FALSE, FALSE, FALSE, FALSE,
 '2023-06-15', '16 Years 0 months', 'Police', 'PNP Women''s Desk Marikina',
 'Ana Dela Cruz', 'For Reunification',
 'Family Reunification', 'Completed',
 'Medium', 'Low',
 '2023-06-15', '2024-01-20', NULL),

-- Resident 5: C0076 - CICL
('C0076', 'INT-005', 2, 'Active',
 'F', '2009-09-30', 'Non-Marital', 'Valenzuela City', NULL,
 'Neglected',
 FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, FALSE, FALSE,
 FALSE, NULL, FALSE, NULL,
 TRUE, FALSE, FALSE, FALSE, TRUE,
 '2024-03-20', '14 Years 5 months', 'Court Order', 'RTC Branch 75 Valenzuela',
 'Jose Reyes', 'For Community-Based Intervention',
 NULL, 'Not Started',
 'Medium', 'Medium',
 '2024-03-20', NULL, NULL);

SELECT setval('residents_resident_id_seq', 5);

-- ============================================================
-- PROCESS RECORDINGS
-- ============================================================

INSERT INTO process_recordings (
    recording_id, resident_id, session_date, social_worker,
    session_type, session_duration_minutes,
    emotional_state_observed, emotional_state_end,
    session_narrative, interventions_applied, follow_up_actions,
    progress_noted, concerns_flagged, referral_made
) VALUES

(1, 1, '2024-04-03', 'Maria Santos',
 'Individual', 50,
 'Anxious', 'Hopeful',
 'Grace participated actively in today''s session. She shared feelings about her experience and expressed desire to return to school. Discussed coping mechanisms for dealing with flashbacks.',
 'Trauma-Informed Care, Cognitive Behavioral Therapy, Psychoeducation',
 'Schedule art therapy session; coordinate with education coordinator for school enrollment.',
 TRUE, FALSE, FALSE),

(2, 1, '2024-03-27', 'Maria Santos',
 'Individual', 45,
 'Withdrawn', 'Calm',
 'Grace was initially resistant but gradually opened up. She discussed difficulties sleeping and recurring nightmares. Breathing exercises were introduced.',
 'Relaxation Techniques, Narrative Therapy',
 'Monitor sleep patterns; consult with psychiatrist if symptoms persist.',
 FALSE, TRUE, TRUE),

(3, 2, '2024-04-02', 'Jose Reyes',
 'Individual', 60,
 'Calm', 'Hopeful',
 'Lena discussed her plans for the future including returning to school and eventually becoming a nurse. Made good progress in processing trauma.',
 'Solution-Focused Therapy, Strengths-Based Approach',
 'Facilitate contact with school counselor; prepare reintegration assessment.',
 TRUE, FALSE, FALSE),

(4, 3, '2024-04-04', 'Carlos Mendoza',
 'Individual', 40,
 'Anxious', 'Calm',
 'Ramon engaged well despite initial resistance. Focus was on building trust and establishing safety. Basic psychoeducation introduced.',
 'Trauma-Informed Care, Psychoeducation',
 'Continue weekly sessions; coordinate with special education teacher.',
 FALSE, FALSE, FALSE);

SELECT setval('process_recordings_recording_id_seq', 4);

-- ============================================================
-- HOME VISITATIONS
-- ============================================================

INSERT INTO home_visitations (
    visitation_id, resident_id, visit_date, social_worker,
    visit_type, location_visited, family_members_present, purpose,
    observations, family_cooperation_level,
    safety_concerns_noted, follow_up_needed, follow_up_notes, visit_outcome
) VALUES

(1, 4, '2024-03-25', 'Ana Dela Cruz',
 'Post-Placement Monitoring', 'Marikina City (family home)', 'Maternal aunt, two cousins',
 'Monthly post-reintegration monitoring visit',
 'Home is clean and safe. Sofia has her own room. Extended family is supportive and engaged. No signs of risk.',
 'Highly Cooperative',
 FALSE, TRUE, 'Continue monthly monitoring visits for 6 months. Coordinate school enrollment.', 'Favorable'),

(2, 1, '2024-02-10', 'Maria Santos',
 'Initial Assessment', 'Tondo, Manila (previous residence)', 'Neighbor (Ms. Reyes)',
 'Initial family and home environment assessment',
 'Poverty conditions noted. Parents absent; child had been living with a neighbor for 3 months. No utilities in original home.',
 'Cooperative',
 TRUE, TRUE, 'Connect family with DSWD livelihood program. Locate parents. Schedule follow-up in 60 days.', 'Needs Improvement');

SELECT setval('home_visitations_visitation_id_seq', 2);

-- ============================================================
-- EDUCATION RECORDS
-- ============================================================

INSERT INTO education_records (
    resident_id, record_date, program_name, course_name, education_level,
    attendance_status, attendance_rate, progress_percent, completion_status,
    gpa_like_score, notes
) VALUES
(1, '2024-04-01', 'Bridge Program',     'Math',         'Primary',   'Present', 0.900, 45.00, 'InProgress', 3.2, NULL),
(1, '2024-04-01', 'Bridge Program',     'English',      'Primary',   'Present', 0.900, 50.00, 'InProgress', 3.5, NULL),
(2, '2024-04-01', 'Secondary Support',  'Science',      'Secondary', 'Present', 0.950, 72.00, 'InProgress', 2.8, NULL),
(2, '2024-04-01', 'Secondary Support',  'Math',         'Secondary', 'Present', 0.950, 68.00, 'InProgress', 3.1, NULL),
(3, '2024-04-01', 'Literacy Boost',     'Life Skills',  'Primary',   'Late',    0.750, 30.00, 'InProgress', 3.8, 'Special education pacing — adjusted targets'),
(5, '2024-04-01', 'Bridge Program',     'Math',         'Primary',   'Present', 0.880, 38.00, 'InProgress', 3.4, NULL);

-- ============================================================
-- HEALTH & WELLBEING RECORDS
-- ============================================================

INSERT INTO health_wellbeing_records (
    resident_id, record_date,
    weight_kg, height_cm, bmi,
    nutrition_score, sleep_score, energy_score, general_health_score,
    medical_checkup_done, dental_checkup_done, psychological_checkup_done
) VALUES
(1, '2024-04-01', 42.5, 152.0, 18.4, 3.5, 2.8, 3.0, 3.2, TRUE,  FALSE, TRUE),
(2, '2024-04-01', 50.0, 158.0, 20.0, 4.0, 3.5, 3.8, 3.9, TRUE,  TRUE,  TRUE),
(3, '2024-04-01', 35.0, 140.0, 17.9, 3.2, 3.0, 3.2, 3.1, TRUE,  FALSE, TRUE),
(4, '2024-01-15', 52.0, 160.0, 20.3, 4.2, 4.0, 4.1, 4.2, TRUE,  TRUE,  FALSE),
(5, '2024-04-01', 44.0, 149.0, 19.8, 3.8, 3.2, 3.5, 3.6, FALSE, FALSE, TRUE);

-- ============================================================
-- INTERVENTION PLANS
-- ============================================================

INSERT INTO intervention_plans (
    resident_id, plan_category, plan_description, services_provided,
    target_value, target_date, status, case_conference_date
) VALUES
(1, 'Psychosocial',   'Individual trauma counseling — weekly sessions',              'Healing',       NULL, '2024-07-01', 'In Progress', '2024-04-05'),
(1, 'Education',      'Enrollment in Bridge Program and return to formal schooling', 'Teaching',      NULL, '2024-08-01', 'In Progress', '2024-04-05'),
(1, 'Reintegration',  'Family reunification — locate and assess parents',            'Caring',        NULL, '2024-10-01', 'Open',        '2024-04-05'),
(2, 'Psychosocial',   'Trauma-focused CBT — bi-weekly sessions',                    'Healing',       NULL, '2024-06-01', 'In Progress', NULL),
(2, 'Legal',          'Coordination with legal aid for case filing',                'Legal Services', NULL, '2024-05-01', 'In Progress', NULL),
(3, 'Education',      'Literacy boost program with special education support',       'Teaching',      NULL, '2024-12-01', 'In Progress', NULL),
(3, 'Physical Health','Nutritional rehabilitation — target BMI 18.5',               'Caring',       18.5, '2024-09-01', 'In Progress', NULL),
(5, 'Safety',         'Community-based intervention plan per court order',           'Caring',        NULL, '2024-09-01', 'Open',        NULL);

-- ============================================================
-- INCIDENT REPORTS
-- ============================================================

INSERT INTO incident_reports (
    resident_id, safehouse_id, incident_date, incident_type, severity,
    description, response_taken, resolved, resolution_date,
    reported_by, follow_up_required
) VALUES
(3, 3, '2024-03-15', 'Behavioral',       'Low',
 'Resident refused to attend class and became verbally aggressive toward house parent.',
 'De-escalation by house parent; social worker notified; one-on-one session conducted.',
 TRUE, '2024-03-16', 'Sis. Caridad Reyes', FALSE),

(1, 1, '2024-02-20', 'RunawayAttempt',   'High',
 'Resident found near facility perimeter after lights-out. Stated she wanted to find her family.',
 'Immediately returned to room; emergency session with social worker; family tracing expedited.',
 TRUE, '2024-02-21', 'Night Duty Staff', TRUE);

-- ============================================================
-- SAFEHOUSE MONTHLY METRICS
-- ============================================================

INSERT INTO safehouse_monthly_metrics (
    safehouse_id, month_start, month_end,
    active_residents, avg_education_progress, avg_health_score,
    process_recording_count, home_visitation_count, incident_count, notes
) VALUES
(1, '2024-03-01', '2024-03-31', 22, 52.50, 3.50, 18, 4, 1, NULL),
(2, '2024-03-01', '2024-03-31', 19, 61.00, 3.80, 14, 3, 0, NULL),
(3, '2024-03-01', '2024-03-31', 14, 38.00, 3.20, 10, 2, 1, NULL),
(1, '2024-04-01', '2024-04-30', 22, 47.50, 3.55, 20, 2, 0, 'April — school enrollment processing'),
(2, '2024-04-01', '2024-04-30', 19, 70.00, 3.85, 16, 1, 0, NULL),
(3, '2024-04-01', '2024-04-30', 14, 34.00, 3.15, 11, 1, 0, NULL);

-- ============================================================
-- PUBLIC IMPACT SNAPSHOTS
-- ============================================================

INSERT INTO public_impact_snapshots (
    snapshot_date, headline, summary_text, metric_payload_json, is_published, published_at
) VALUES
('2024-03-01',
 'March 2024: 55 Girls in Safe Care Across 3 Facilities',
 'This month, Kanlungan Foundation continued to serve 55 girls across our three safe houses in Metro Manila. Education program participation reached 82% and 4 girls completed reintegration plans.',
 '{"active_residents":55,"safehouses":3,"education_participation_rate":0.82,"reintegrations_this_month":4,"counseling_sessions":42,"home_visits":9,"donations_received_php":375000}'::jsonb,
 TRUE, '2024-04-02'),

('2024-04-01',
 'April 2024: New School Enrollments and Continued Healing',
 'April saw three new school enrollments and continued progress across all programs. A total of 47 counseling sessions were conducted this month.',
 '{"active_residents":55,"safehouses":3,"education_participation_rate":0.85,"reintegrations_this_month":0,"counseling_sessions":47,"home_visits":4,"donations_received_php":290000}'::jsonb,
 FALSE, NULL);
