/** Money is always an integer number of centavos. Dates are YYYY-MM-DD calendar dates. */
export type Money = number;
export type CalendarDate = string;
export type DemoRole = 'officer' | 'reviewer';
export interface DemoActor { name: string; role: DemoRole }
export type EvidenceStatus = 'document-supported' | 'member-reported' | 'conflicting' | 'missing';
export interface EvidenceSource {
  id: string;
  title: string;
  kind: 'document' | 'statement' | 'worksheet';
  date: CalendarDate;
  excerpt: string;
}
export interface EvidenceFact {
  id: string;
  label: string;
  category: 'income' | 'expense' | 'obligation' | 'opening';
  value: Money | null;
  status: EvidenceStatus;
  sourceId: string | null;
  effectiveDate: CalendarDate;
  cashDate: CalendarDate;
  critical: boolean;
  alreadyDeducted: boolean;
  candidates?: { value: Money; sourceId: string; effectiveDate: CalendarDate }[];
}
export interface FactCorrectionInput {
  factId: string;
  value: Money | null;
  status: 'document-supported' | 'member-reported' | 'missing';
  sourceId: string | null;
  effectiveDate: CalendarDate;
  reason: string;
}
export interface Correction {
  id: string;
  factId: string;
  before: EvidenceFact;
  after: EvidenceFact;
  reason: string;
  actor: DemoActor;
  at: string;
}
export interface LoanOffer {
  id: string;
  label: string;
  principal: Money;
  netReceived: Money;
  /** Fee paid separately, never a fee already deducted from netReceived. */
  feesPaidSeparately: Money;
  termMonths: number;
  payments: { date: CalendarDate; amount: Money }[];
  available: boolean;
  policyNote: string;
}
export interface CashMovement { label: string; amount: Money; factId?: string; sourceId?: string }
export interface DailyBalance { date: CalendarDate; balance: Money; movements: CashMovement[] }
export interface PolicyCheck { policyId: string; label: string; passed: boolean; detail: string }
export interface ScenarioResult {
  offerId: string;
  monthlyRemaining: Money;
  lowestBalance: Money;
  closingBalance: Money;
  shortageDates: CalendarDate[];
  dailyBalances: DailyBalance[];
  totalRepayment: Money;
  financingCost: Money;
  policyChecks: PolicyCheck[];
}
export type AssessmentResult = {
  status: 'complete';
  caseVersion: number;
  calculationVersion: string;
  scenarios: ScenarioResult[];
  warnings: string[];
} | {
  status: 'incomplete';
  caseVersion: number;
  calculationVersion: string;
  issues: { factId: string; message: string }[];
};
export interface Recommendation { offerId: string; note: string; actor: DemoActor; at: string; caseVersion: number }
export type DecisionOutcome = 'approve' | 'decline' | 'return';
export interface DecisionInput {
  outcome: DecisionOutcome;
  offerId: string | null;
  rationale: string;
  departureReason: string;
  exceptions: { policyId: string; reason: string }[];
  reviewDate: CalendarDate;
  explanationReviewed: boolean;
}
export interface DecisionValidation { valid: boolean; errors: Record<string, string> }
export interface ExplanationDraft {
  origin: 'template';
  summary: string;
  sections: { title: string; body: string; sourceIds: string[] }[];
}
export interface ReviewAction {
  basis: string;
  actor: DemoActor;
  at: string;
  reason: string;
}
export interface SimulatedConcern { id: string; text: string; sourceIds: string[] }
export interface ConcernReview extends ReviewAction {
  concernId: string;
  outcome: 'confirm' | 'correct' | 'dismiss';
  correctedText: string;
}
export interface EscalationAction extends ReviewAction {
  kind: 'investigate' | 'clarification' | 'options' | 'respond' | 'resolve' | 'declined';
  decisionId?: string;
}
export interface EscalationNotice {
  id: string;
  basis: string;
  recipient: DemoActor;
  at: string;
  acknowledged?: { actor: DemoActor; at: string };
}
export interface ReviewState {
  evidenceRevision?: number;
  offerRevision?: number;
  aiConcerns: SimulatedConcern[];
  evidenceConfirmations: ReviewAction[];
  concernReviews: ConcernReview[];
  escalation?: {
    observations: { basis: string; offerId: string; at: string; checks: PolicyCheck[]; sourceIds: string[] }[];
    assignments: (ReviewAction & { reviewer: DemoActor })[];
    notices: EscalationNotice[];
    actions: EscalationAction[];
  };
}
export interface DecisionSnapshot {
  id: string;
  caseId: string;
  caseVersion: number;
  memberName: string;
  recordedAt: string;
  reviewer: DemoActor;
  input: DecisionInput;
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  facts: EvidenceFact[];
  sources: EvidenceSource[];
  offers: LoanOffer[];
  recommendation: Recommendation | null;
  assessment: AssessmentResult;
  explanation?: ExplanationDraft;
  review?: ReviewState;
}
export interface CaseRecord {
  id: string;
  member: { name: string; initials: string; occupation: string; memberSince: string };
  purpose: string;
  createdAt: string;
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  version: number;
  facts: EvidenceFact[];
  sources: EvidenceSource[];
  offers: LoanOffer[];
  corrections: Correction[];
  recommendation: Recommendation | null;
  decisions: DecisionSnapshot[];
  followUp: { reviewDate: CalendarDate; note: string; updatedAt: string } | null;
  review?: ReviewState;
}
export interface CaseRepository {
  list(): Promise<CaseRecord[]>;
  load(id: string): Promise<CaseRecord | undefined>;
  save(record: CaseRecord): Promise<void>;
  reset(): Promise<CaseRecord[]>;
}
