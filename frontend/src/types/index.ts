export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'staff' | 'viewer';
  firstName: string;
  lastName: string;
}

export interface Resident {
  id: number;
  caseNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  safeHouseId: number;
  safeHouseName: string;
  caseCategory: CaseCategory;
  caseSubCategory: string[];
  caseStatus: CaseStatus;
  admissionDate: string;
  referralSource: string;
  assignedSocialWorkerId: number;
  assignedSocialWorkerName: string;
  nationality: string;
  religion?: string;
  civilStatus: string;
  educationLevel: string;
  // Family socio-demographic
  is4PsBeneficiary: boolean;
  isSoloParent: boolean;
  isIndigenousGroup: boolean;
  isInformalSettler: boolean;
  indigenousGroupName?: string;
  // Disability
  hasDisability: boolean;
  disabilityType?: string;
  // Reintegration
  reintegrationStatus: ReintegrationStatus;
  reintegrationDate?: string;
  exitReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CaseCategory =
  | 'Trafficked'
  | 'Physical Abuse'
  | 'Sexual Abuse'
  | 'Neglect'
  | 'Psychological Abuse'
  | 'Economic Abuse'
  | 'Abandoned'
  | 'CICL';

export type CaseStatus =
  | 'Active'
  | 'Reintegrated'
  | 'Transferred'
  | 'Runaway'
  | 'Deceased'
  | 'Closed';

export type ReintegrationStatus =
  | 'In Progress'
  | 'Reintegrated - Family'
  | 'Reintegrated - Community'
  | 'Transferred to Partner Agency'
  | 'Independent Living'
  | 'Pending';

export interface SafeHouse {
  id: number;
  name: string;
  location: string;
  capacity: number;
  currentOccupancy: number;
  contactPerson: string;
  contactNumber: string;
  isActive: boolean;
}

export interface Donor {
  id: number;
  firstName: string;
  lastName: string;
  organizationName?: string;
  email: string;
  phone?: string;
  donorType: DonorType;
  status: 'Active' | 'Inactive';
  totalContributions: number;
  lastDonationDate?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export type DonorType =
  | 'Monetary'
  | 'In-Kind'
  | 'Volunteer'
  | 'Skills'
  | 'Social Media'
  | 'Corporate';

export interface Donation {
  id: number;
  donorId: number;
  donorName: string;
  type: DonorType;
  amount?: number;
  description?: string;
  date: string;
  safeHouseId?: number;
  safeHouseName?: string;
  programArea?: string;
  status: 'Received' | 'Pending' | 'Processed';
}

export interface ProcessRecording {
  id: number;
  residentId: number;
  residentName: string;
  sessionDate: string;
  socialWorkerId: number;
  socialWorkerName: string;
  sessionType: 'Individual' | 'Group';
  emotionalState: string;
  narrativeSummary: string;
  interventionsApplied: string[];
  followUpActions: string;
  nextSessionDate?: string;
  createdAt: string;
}

export interface HomeVisit {
  id: number;
  residentId: number;
  residentName: string;
  visitDate: string;
  socialWorkerId: number;
  socialWorkerName: string;
  visitType: VisitType;
  homeEnvironmentObservations: string;
  familyCooperationLevel: 'High' | 'Moderate' | 'Low' | 'Uncooperative';
  safetyConcerns: string;
  followUpActions: string;
  createdAt: string;
}

export type VisitType =
  | 'Initial Assessment'
  | 'Routine Follow-Up'
  | 'Reintegration Assessment'
  | 'Post-Placement Monitoring'
  | 'Emergency';

export interface CaseConference {
  id: number;
  residentId: number;
  residentName: string;
  conferenceDate: string;
  participants: string[];
  agenda: string;
  decisions: string;
  followUpActions: string;
  nextConferenceDate?: string;
  createdAt: string;
}

export interface SocialWorker {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  safeHouseId: number;
  safeHouseName: string;
  caseload: number;
  isActive: boolean;
}

export interface ImpactMetric {
  label: string;
  value: number | string;
  description: string;
  icon: string;
}

export interface DonationTrend {
  month: string;
  monetary: number;
  inKind: number;
  volunteer: number;
}

export interface OutcomeMetric {
  category: string;
  reintegrated: number;
  inProgress: number;
  transferred: number;
}
