import type {
  Resident,
  Donor,
  Donation,
  ProcessRecording,
  HomeVisit,
  CaseConference,
  SafeHouse,
  SocialWorker,
  DonationTrend,
  OutcomeMetric,
} from '../types';

export const mockSafeHouses: SafeHouse[] = [
  { id: 1, name: 'Tahanan ng Pag-asa', location: 'Quezon City', capacity: 30, currentOccupancy: 22, contactPerson: 'Ana Dela Cruz', contactNumber: '+63 2 8123 4567', isActive: true },
  { id: 2, name: 'Bahay Kalinga', location: 'Manila', capacity: 25, currentOccupancy: 19, contactPerson: 'Pedro Lim', contactNumber: '+63 2 8234 5678', isActive: true },
  { id: 3, name: 'Kanlungan Center', location: 'Makati', capacity: 20, currentOccupancy: 14, contactPerson: 'Rosa Garcia', contactNumber: '+63 2 8345 6789', isActive: true },
];

export const mockSocialWorkers: SocialWorker[] = [
  { id: 1, firstName: 'Maria', lastName: 'Santos', email: 'msantos@kanlungan.org', safeHouseId: 1, safeHouseName: 'Tahanan ng Pag-asa', caseload: 8, isActive: true },
  { id: 2, firstName: 'Jose', lastName: 'Reyes', email: 'jreyes@kanlungan.org', safeHouseId: 2, safeHouseName: 'Bahay Kalinga', caseload: 7, isActive: true },
  { id: 3, firstName: 'Ana', lastName: 'Dela Cruz', email: 'adelacruz@kanlungan.org', safeHouseId: 1, safeHouseName: 'Tahanan ng Pag-asa', caseload: 6, isActive: true },
  { id: 4, firstName: 'Carlos', lastName: 'Mendoza', email: 'cmendoza@kanlungan.org', safeHouseId: 3, safeHouseName: 'Kanlungan Center', caseload: 9, isActive: true },
];

export const mockResidents: Resident[] = [
  {
    id: 1, caseNumber: 'KF-2024-001', firstName: 'Grace', lastName: 'Flores', middleName: 'Marie',
    dateOfBirth: '2010-03-15', age: 14, gender: 'Female', address: 'Tondo, Manila',
    safeHouseId: 1, safeHouseName: 'Tahanan ng Pag-asa',
    caseCategory: 'Trafficked', caseSubCategory: ['Labor Trafficking'],
    caseStatus: 'Active', admissionDate: '2024-01-10',
    referralSource: 'Philippine National Police', assignedSocialWorkerId: 1, assignedSocialWorkerName: 'Maria Santos',
    nationality: 'Filipino', religion: 'Catholic', civilStatus: 'Single', educationLevel: 'Elementary',
    is4PsBeneficiary: true, isSoloParent: false, isIndigenousGroup: false, isInformalSettler: true,
    hasDisability: false, reintegrationStatus: 'In Progress',
    notes: 'Showing positive progress in counseling sessions.',
    createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-04-01T10:00:00Z',
  },
  {
    id: 2, caseNumber: 'KF-2024-002', firstName: 'Lena', lastName: 'Cruz',
    dateOfBirth: '2008-07-22', age: 16, gender: 'Female', address: 'Pasay City',
    safeHouseId: 2, safeHouseName: 'Bahay Kalinga',
    caseCategory: 'Sexual Abuse', caseSubCategory: ['Rape', 'Incest'],
    caseStatus: 'Active', admissionDate: '2024-02-14',
    referralSource: 'Department of Social Welfare and Development', assignedSocialWorkerId: 2, assignedSocialWorkerName: 'Jose Reyes',
    nationality: 'Filipino', civilStatus: 'Single', educationLevel: 'High School',
    is4PsBeneficiary: false, isSoloParent: false, isIndigenousGroup: false, isInformalSettler: false,
    hasDisability: false, reintegrationStatus: 'In Progress',
    createdAt: '2024-02-14T09:00:00Z', updatedAt: '2024-04-02T11:00:00Z',
  },
  {
    id: 3, caseNumber: 'KF-2024-003', firstName: 'Ramon', lastName: 'Bautista',
    dateOfBirth: '2012-11-05', age: 11, gender: 'Male', address: 'Caloocan City',
    safeHouseId: 3, safeHouseName: 'Kanlungan Center',
    caseCategory: 'Neglect', caseSubCategory: ['Physical Neglect', 'Educational Neglect'],
    caseStatus: 'Active', admissionDate: '2024-03-01',
    referralSource: 'Barangay Social Services', assignedSocialWorkerId: 4, assignedSocialWorkerName: 'Carlos Mendoza',
    nationality: 'Filipino', civilStatus: 'Single', educationLevel: 'Elementary',
    is4PsBeneficiary: true, isSoloParent: false, isIndigenousGroup: true, indigenousGroupName: 'Aeta',
    isInformalSettler: true, hasDisability: true, disabilityType: 'Mild Intellectual Disability',
    reintegrationStatus: 'Pending',
    createdAt: '2024-03-01T07:00:00Z', updatedAt: '2024-04-03T09:00:00Z',
  },
  {
    id: 4, caseNumber: 'KF-2023-045', firstName: 'Sofia', lastName: 'Ramos',
    dateOfBirth: '2007-05-18', age: 17, gender: 'Female', address: 'Marikina City',
    safeHouseId: 1, safeHouseName: 'Tahanan ng Pag-asa',
    caseCategory: 'Physical Abuse', caseSubCategory: ['Domestic Violence'],
    caseStatus: 'Reintegrated', admissionDate: '2023-06-15', reintegrationDate: '2024-01-20',
    referralSource: 'Hospital Referral', assignedSocialWorkerId: 3, assignedSocialWorkerName: 'Ana Dela Cruz',
    nationality: 'Filipino', civilStatus: 'Single', educationLevel: 'High School',
    is4PsBeneficiary: false, isSoloParent: false, isIndigenousGroup: false, isInformalSettler: false,
    hasDisability: false, reintegrationStatus: 'Reintegrated - Family',
    exitReason: 'Successfully reintegrated with extended family.',
    createdAt: '2023-06-15T10:00:00Z', updatedAt: '2024-01-20T14:00:00Z',
  },
  {
    id: 5, caseNumber: 'KF-2024-004', firstName: 'Miguel', lastName: 'Torres',
    dateOfBirth: '2009-09-30', age: 14, gender: 'Male', address: 'Valenzuela City',
    safeHouseId: 2, safeHouseName: 'Bahay Kalinga',
    caseCategory: 'CICL', caseSubCategory: ['Theft'],
    caseStatus: 'Active', admissionDate: '2024-03-20',
    referralSource: 'Regional Trial Court', assignedSocialWorkerId: 2, assignedSocialWorkerName: 'Jose Reyes',
    nationality: 'Filipino', civilStatus: 'Single', educationLevel: 'Elementary',
    is4PsBeneficiary: true, isSoloParent: false, isIndigenousGroup: false, isInformalSettler: true,
    hasDisability: false, reintegrationStatus: 'In Progress',
    createdAt: '2024-03-20T08:00:00Z', updatedAt: '2024-04-04T10:00:00Z',
  },
];

export const mockDonors: Donor[] = [
  { id: 1, firstName: 'Roberto', lastName: 'Tan', organizationName: 'Tan Family Foundation', email: 'rtan@tanfoundation.ph', phone: '+63 917 123 4567', donorType: 'Monetary', status: 'Active', totalContributions: 500000, lastDonationDate: '2024-03-15', createdAt: '2022-01-10T00:00:00Z' },
  { id: 2, firstName: 'Jennifer', lastName: 'Lim', email: 'jlim@gmail.com', phone: '+63 918 234 5678', donorType: 'In-Kind', status: 'Active', totalContributions: 75000, lastDonationDate: '2024-04-01', createdAt: '2023-03-22T00:00:00Z' },
  { id: 3, firstName: 'Antonio', lastName: 'Sy', organizationName: 'AC Sy Enterprises', email: 'asy@acsy.com', donorType: 'Corporate', status: 'Active', totalContributions: 1200000, lastDonationDate: '2024-02-28', createdAt: '2021-06-15T00:00:00Z' },
  { id: 4, firstName: 'Maria', lastName: 'Aquino', email: 'maquino@yahoo.com', donorType: 'Volunteer', status: 'Active', totalContributions: 30000, lastDonationDate: '2024-03-30', createdAt: '2022-09-01T00:00:00Z' },
  { id: 5, firstName: 'David', lastName: 'Go', organizationName: 'Go Group of Companies', email: 'dgo@gogroup.com', donorType: 'Monetary', status: 'Active', totalContributions: 800000, lastDonationDate: '2024-01-15', createdAt: '2020-11-20T00:00:00Z' },
  { id: 6, firstName: 'Claire', lastName: 'Reyes', email: 'creyes@outlook.com', donorType: 'Skills', status: 'Active', totalContributions: 45000, lastDonationDate: '2024-03-10', createdAt: '2023-01-05T00:00:00Z' },
  { id: 7, firstName: 'Michael', lastName: 'Yap', email: 'myap@gmail.com', donorType: 'Social Media', status: 'Inactive', totalContributions: 10000, lastDonationDate: '2023-12-01', createdAt: '2023-07-14T00:00:00Z' },
];

export const mockDonations: Donation[] = [
  { id: 1, donorId: 1, donorName: 'Roberto Tan / Tan Family Foundation', type: 'Monetary', amount: 100000, description: 'Q1 2024 operational support', date: '2024-03-15', safeHouseId: 1, safeHouseName: 'Tahanan ng Pag-asa', programArea: 'General Operations', status: 'Received' },
  { id: 2, donorId: 3, donorName: 'Antonio Sy / AC Sy Enterprises', type: 'Monetary', amount: 250000, description: 'Education program funding', date: '2024-02-28', programArea: 'Education', status: 'Received' },
  { id: 3, donorId: 2, donorName: 'Jennifer Lim', type: 'In-Kind', amount: 25000, description: 'School supplies and uniforms (150 sets)', date: '2024-04-01', safeHouseId: 2, safeHouseName: 'Bahay Kalinga', programArea: 'Education', status: 'Received' },
  { id: 4, donorId: 5, donorName: 'David Go / Go Group', type: 'Monetary', amount: 200000, description: 'Medical care fund', date: '2024-01-15', programArea: 'Health', status: 'Received' },
  { id: 5, donorId: 4, donorName: 'Maria Aquino', type: 'Volunteer', description: '40 hours tutoring services', date: '2024-03-30', safeHouseId: 1, safeHouseName: 'Tahanan ng Pag-asa', programArea: 'Education', status: 'Received' },
  { id: 6, donorId: 6, donorName: 'Claire Reyes', type: 'Skills', amount: 15000, description: 'Legal consultation services (10 hours)', date: '2024-03-10', programArea: 'Legal Support', status: 'Received' },
];

export const mockProcessRecordings: ProcessRecording[] = [
  {
    id: 1, residentId: 1, residentName: 'Grace Flores', sessionDate: '2024-04-03',
    socialWorkerId: 1, socialWorkerName: 'Maria Santos', sessionType: 'Individual',
    emotionalState: 'Anxious but engaged',
    narrativeSummary: 'Grace participated actively in today\'s session. She shared feelings about her experience and expressed desire to return to school. Discussed coping mechanisms for dealing with flashbacks.',
    interventionsApplied: ['Trauma-Informed Care', 'Cognitive Behavioral Therapy', 'Psychoeducation'],
    followUpActions: 'Schedule art therapy session; coordinate with education coordinator for school enrollment.', nextSessionDate: '2024-04-10',
    createdAt: '2024-04-03T15:00:00Z',
  },
  {
    id: 2, residentId: 1, residentName: 'Grace Flores', sessionDate: '2024-03-27',
    socialWorkerId: 1, socialWorkerName: 'Maria Santos', sessionType: 'Individual',
    emotionalState: 'Withdrawn and quiet',
    narrativeSummary: 'Grace was initially resistant but gradually opened up. She discussed difficulties sleeping and recurring nightmares. Breathing exercises were introduced.',
    interventionsApplied: ['Relaxation Techniques', 'Narrative Therapy'],
    followUpActions: 'Monitor sleep patterns; consult with psychiatrist if symptoms persist.',
    createdAt: '2024-03-27T14:00:00Z',
  },
  {
    id: 3, residentId: 2, residentName: 'Lena Cruz', sessionDate: '2024-04-02',
    socialWorkerId: 2, socialWorkerName: 'Jose Reyes', sessionType: 'Individual',
    emotionalState: 'Stable, showing resilience',
    narrativeSummary: 'Lena discussed her plans for the future including returning to school and eventually becoming a nurse. Made good progress in processing trauma.',
    interventionsApplied: ['Solution-Focused Therapy', 'Strengths-Based Approach'],
    followUpActions: 'Facilitate contact with school counselor; prepare reintegration assessment.',
    createdAt: '2024-04-02T13:00:00Z',
  },
];

export const mockHomeVisits: HomeVisit[] = [
  {
    id: 1, residentId: 4, residentName: 'Sofia Ramos', visitDate: '2024-03-25',
    socialWorkerId: 3, socialWorkerName: 'Ana Dela Cruz', visitType: 'Post-Placement Monitoring',
    homeEnvironmentObservations: 'Home is clean and safe. Sofia has her own room. Extended family is supportive and engaged.',
    familyCooperationLevel: 'High', safetyConcerns: 'None observed.',
    followUpActions: 'Continue monthly monitoring visits for 6 months. Coordinate school enrollment.', createdAt: '2024-03-25T16:00:00Z',
  },
  {
    id: 2, residentId: 1, residentName: 'Grace Flores', visitDate: '2024-02-10',
    socialWorkerId: 1, socialWorkerName: 'Maria Santos', visitType: 'Initial Assessment',
    homeEnvironmentObservations: 'Original home environment assessed. Poverty conditions noted. Parents absent; lived with neighbor.',
    familyCooperationLevel: 'Moderate', safetyConcerns: 'Economic vulnerability; inadequate supervision.',
    followUpActions: 'Connect family with DSWD livelihood program. Schedule follow-up in 60 days.', createdAt: '2024-02-10T10:00:00Z',
  },
];

export const mockCaseConferences: CaseConference[] = [
  {
    id: 1, residentId: 1, residentName: 'Grace Flores', conferenceDate: '2024-04-05',
    participants: ['Maria Santos (Social Worker)', 'Dr. Elena Pascual (Psychologist)', 'Atty. Ramon Villanueva (Legal Aid)', 'Sis. Caridad Reyes (House Mother)'],
    agenda: 'Progress review; school reintegration planning; legal case update',
    decisions: 'Approved school enrollment for SY 2024-2025. Continue bi-weekly counseling. Legal case proceeding to trial in June.',
    followUpActions: 'Process school documents; inform Grace of legal proceedings appropriately.', nextConferenceDate: '2024-07-05',
    createdAt: '2024-04-05T10:00:00Z',
  },
];

export const mockDonationTrends: DonationTrend[] = [
  { month: 'Jan', monetary: 420000, inKind: 85000, volunteer: 30000 },
  { month: 'Feb', monetary: 380000, inKind: 92000, volunteer: 25000 },
  { month: 'Mar', monetary: 510000, inKind: 110000, volunteer: 40000 },
  { month: 'Apr', monetary: 455000, inKind: 78000, volunteer: 35000 },
  { month: 'May', monetary: 490000, inKind: 95000, volunteer: 28000 },
  { month: 'Jun', monetary: 620000, inKind: 130000, volunteer: 50000 },
  { month: 'Jul', monetary: 580000, inKind: 105000, volunteer: 45000 },
  { month: 'Aug', monetary: 540000, inKind: 98000, volunteer: 38000 },
  { month: 'Sep', monetary: 470000, inKind: 88000, volunteer: 32000 },
  { month: 'Oct', monetary: 550000, inKind: 115000, volunteer: 42000 },
  { month: 'Nov', monetary: 680000, inKind: 145000, volunteer: 55000 },
  { month: 'Dec', monetary: 750000, inKind: 180000, volunteer: 60000 },
];

export const mockOutcomeMetrics: OutcomeMetric[] = [
  { category: 'Trafficked', reintegrated: 12, inProgress: 8, transferred: 3 },
  { category: 'Physical Abuse', reintegrated: 18, inProgress: 11, transferred: 2 },
  { category: 'Sexual Abuse', reintegrated: 9, inProgress: 14, transferred: 4 },
  { category: 'Neglect', reintegrated: 22, inProgress: 9, transferred: 1 },
  { category: 'CICL', reintegrated: 7, inProgress: 6, transferred: 5 },
];
