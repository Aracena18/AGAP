import type { SchemaName } from './schemas.js';

export interface Operation {
  id: string; method: 'GET' | 'POST' | 'PATCH'; path: string; response: SchemaName;
  request?: SchemaName; owner: 'Robert' | 'Aaron' | 'Benedict' | 'Earl'; implemented: boolean;
  versioned?: boolean; idempotent?: boolean; public?: boolean;
}
export const operations = [
  { id: 'getSession', method: 'GET', path: '/session', response: 'Session', owner: 'Robert', implemented: true },
  { id: 'getCapabilities', method: 'GET', path: '/capabilities', response: 'Capabilities', owner: 'Robert', implemented: true, public: true },
  { id: 'listStaff', method: 'GET', path: '/staff', response: 'StaffPage', owner: 'Robert', implemented: true },
  { id: 'revokeStaff', method: 'POST', path: '/staff/{id}/revocations', request: 'StaffRevoke', response: 'Staff', owner: 'Robert', implemented: true, versioned: true, idempotent: true },
  { id: 'listMembers', method: 'GET', path: '/members', response: 'MemberPage', owner: 'Robert', implemented: true },
  { id: 'createMember', method: 'POST', path: '/members', request: 'MemberCreate', response: 'Member', owner: 'Robert', implemented: true, idempotent: true },
  { id: 'getMember', method: 'GET', path: '/members/{id}', response: 'Member', owner: 'Robert', implemented: true },
  { id: 'updateMember', method: 'PATCH', path: '/members/{id}', request: 'MemberUpdate', response: 'Member', owner: 'Robert', implemented: true, versioned: true, idempotent: true },
  { id: 'listApplications', method: 'GET', path: '/applications', response: 'ApplicationPage', owner: 'Robert', implemented: true },
  { id: 'createApplication', method: 'POST', path: '/applications', request: 'ApplicationCreate', response: 'Application', owner: 'Robert', implemented: true, idempotent: true },
  { id: 'getApplication', method: 'GET', path: '/applications/{id}', response: 'Application', owner: 'Robert', implemented: true },
  { id: 'updateApplication', method: 'PATCH', path: '/applications/{id}', request: 'ApplicationUpdate', response: 'Application', owner: 'Robert', implemented: true, versioned: true, idempotent: true },
  { id: 'assignApplication', method: 'POST', path: '/applications/{id}/assignments', request: 'AssignmentCreate', response: 'Application', owner: 'Robert', implemented: true, versioned: true, idempotent: true },
  { id: 'correctEvidence', method: 'POST', path: '/applications/{id}/corrections', request: 'EvidenceCorrection', response: 'CommandReceipt', owner: 'Aaron', implemented: false, versioned: true, idempotent: true },
  { id: 'recordVerification', method: 'POST', path: '/applications/{id}/verifications', request: 'Verification', response: 'CommandReceipt', owner: 'Aaron', implemented: false, versioned: true, idempotent: true },
  { id: 'createAssessment', method: 'POST', path: '/applications/{id}/assessments', request: 'AssessmentCreate', response: 'Assessment', owner: 'Aaron', implemented: false, versioned: true, idempotent: true },
  { id: 'recommendOffer', method: 'POST', path: '/applications/{id}/recommendations', request: 'RecommendationCreate', response: 'CommandReceipt', owner: 'Benedict', implemented: false, versioned: true, idempotent: true },
  { id: 'recordDecision', method: 'POST', path: '/applications/{id}/decisions', request: 'DecisionCreate', response: 'Decision', owner: 'Benedict', implemented: false, versioned: true, idempotent: true },
  { id: 'recordAcceptance', method: 'POST', path: '/applications/{id}/acceptances', request: 'AcceptanceCreate', response: 'CommandReceipt', owner: 'Benedict', implemented: false, versioned: true, idempotent: true },
  { id: 'prepareDisbursement', method: 'POST', path: '/disbursements', request: 'FinancialCommandCreate', response: 'FinancialCommand', owner: 'Benedict', implemented: false, idempotent: true },
  { id: 'recordPayment', method: 'POST', path: '/payments', request: 'FinancialCommandCreate', response: 'FinancialCommand', owner: 'Benedict', implemented: false, idempotent: true },
  { id: 'getLoanPosition', method: 'GET', path: '/loans/{id}/position', response: 'LoanPosition', owner: 'Benedict', implemented: false },
  { id: 'recordHealthReview', method: 'POST', path: '/health-reviews', request: 'HealthReviewCreate', response: 'HealthReview', owner: 'Earl', implemented: false, idempotent: true },
] satisfies Operation[];
