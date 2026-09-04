import type { GateId, GateDecision, PreconditionResult } from '@/config/gates';
import type { Role } from '@/config/rbac';
import type { RuleOutcome } from '@/config/rules';

/** Frontend data contracts. Every mock response is typed against these. */

export type ISODate = string;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  /** Server clock at the moment of response. Drives every freshness stamp. */
  servedAt: ISODate;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
    reference?: string;
  };
  servedAt: ISODate;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  departmentId?: string;
  startupId?: string;
  designation: string;
  active: boolean;
  lastActiveAt: ISODate;
}

export interface Department {
  id: string;
  name: string;
  shortName: string;
  state: string;
  district: string;
  sector: string;
  nodalOfficerId: string;
  openChallenges: number;
  livePilots: number;
  committedPaise: number;
  releasedPaise: number;
}

export type DpiitStatus = 'recognised' | 'expired' | 'unverified' | 'not_a_startup';

export interface StartupDocument {
  id: string;
  startupId: string;
  type: string;
  fileName: string;
  validTo?: ISODate;
  verification: 'verified' | 'pending' | 'failed';
  uploadedOn: ISODate;
  scan: 'clean' | 'pending' | 'failed';
  sizeBytes: number;
  hash: string;
}

export interface StartupProduct {
  id: string;
  startupId: string;
  name: string;
  summary: string;
  trl: number;
  sectors: string[];
}

export interface Startup {
  id: string;
  legalName: string;
  tradeName: string;
  slug: string;
  cin: string;
  gstin: string;
  gstStatus: 'active' | 'suspended' | 'cancelled';
  udyam: string;
  entityType: 'private_limited' | 'llp' | 'partnership' | 'proprietorship';
  incorporationDate: ISODate;
  city: string;
  state: string;
  statesServed: string[];
  dpiit: {
    status: DpiitStatus;
    recognitionNumber?: string;
    validTo?: ISODate;
    lastCheckedAt: ISODate;
    verification: 'verified' | 'pending' | 'failed';
  };
  turnoverCrore: number;
  capabilities: string[];
  industries: string[];
  certifications: string[];
  deployments: {
    id: string;
    client: string;
    isGovernment: boolean;
    summary: string;
    year: number;
    validated: boolean;
  }[];
  teamSize: number;
  summary: string;
  profileCompleteness: number;
  bankAccountMasked: string;
}

export type ChallengeStatus = 'draft' | 'in_review' | 'open' | 'closing_soon' | 'closed' | 'awarded' | 'cancelled';

export interface ChallengeKpi {
  id: string;
  name: string;
  unit: string;
  baselineValue: number;
  targetValue: number;
  direction: 'decrease' | 'increase';
  minimumAcceptable: number;
  failureThreshold: number;
  method: string;
  sourceOfTruth: string;
  measurementPeriod: string;
  frequency: string;
}

export interface ChallengeMilestoneTemplate {
  id: string;
  index: number;
  name: string;
  requirement: string;
  acceptanceTest: string;
  evidenceRequired: string[];
  paymentPaise: number;
  dueDayOffset: number;
}

export interface ClarificationThread {
  id: string;
  challengeId: string;
  question: string;
  askedOn: ISODate;
  askedByMasked: string;
  answer?: string;
  answeredOn?: ISODate;
  answeredBy?: string;
}

export interface Challenge {
  id: string;
  caseId: string;
  slug: string;
  title: string;
  departmentId: string;
  ownerId: string;
  status: ChallengeStatus;
  currentGate: GateId;
  sector: string;
  state: string;
  district: string;
  capabilities: string[];
  problem: {
    whoAffected: string;
    whatHappensToday: string;
    frequency: string;
    costToday: string;
    currentLimitations: string;
  };
  baseline: {
    metric: string;
    currentValue: number;
    unit: string;
    method: string;
    sourceOfTruth: string;
    period: string;
  };
  outcome: {
    statement: string;
    targetMetric: string;
    direction: 'decrease' | 'increase';
    magnitude: number;
    unit: string;
    method: string;
    minimumAcceptable: number;
    failureThreshold: number;
  };
  departmentProvides: {
    data: string;
    dataTier: 'synthetic' | 'masked' | 'production';
    fields: string[];
    volume: string;
    accessMethod: string;
    systems: string[];
    siteAccess: string;
    users: string;
    staffTimeHoursPerWeek: number;
    willNotProvide: string[];
  };
  eligibility: {
    ruleIds: string[];
    relaxationsAvailable: boolean;
    relaxationNote: string;
  };
  pilot: {
    durationDays: number;
    budgetPaise: number;
    budgetHead: string;
    approvalAuthority: string;
    milestones: ChallengeMilestoneTemplate[];
  };
  legal: {
    templateId: string;
    ipPosition: 'startup_retains' | 'joint' | 'government_assigned';
    ipClauseIds: string[];
    dataClauseIds: string[];
    cyberLevel: 'basic' | 'standard' | 'elevated';
    legalPreClearance: boolean;
    legalPreClearanceNote?: string;
  };
  rubricId: string;
  kpis: ChallengeKpi[];
  timeline: {
    createdOn: ISODate;
    publishedOn?: ISODate;
    closesOn?: ISODate;
    awardedOn?: ISODate;
  };
  applicantCount: number;
  gateEnteredOn: ISODate;
  blocked?: { reason: string; since: ISODate };
  waiver?: { requestedOn: ISODate; authority: string; reason: string; status: 'requested' | 'granted' | 'refused' };
  languageFlags: SolutionLanguageFlag[];
  coAuthors: string[];
  changeLog: { at: ISODate; by: string; summary: string }[];
}

export interface SolutionLanguageFlag {
  id: string;
  section: string;
  fieldPath: string;
  matchedText: string;
  kind: 'vendor_name' | 'technology_prescription' | 'solution_specific';
  why: string;
  suggestion: string;
  status: 'open' | 'accepted' | 'edited' | 'dismissed';
  dismissReason?: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'screening'
  | 'eligible'
  | 'ineligible'
  | 'needs_review'
  | 'shortlisted'
  | 'under_evaluation'
  | 'awarded'
  | 'not_selected'
  | 'withdrawn';

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  type: string;
  fileName: string;
  uploadedOn: ISODate;
  scan: 'clean' | 'pending' | 'failed';
  hash: string;
  sizeBytes: number;
}

export interface EligibilityResult {
  ruleId: string;
  ruleVersion: number;
  result: RuleOutcome;
  evidence: string;
  citation: string;
  evaluatedAt: ISODate;
  relaxationApplied?: boolean;
  override?: {
    result: RuleOutcome;
    justification: string;
    by: string;
    at: ISODate;
  };
  changedSince?: { what: string; at: ISODate };
}

export interface Application {
  id: string;
  caseId: string;
  challengeId: string;
  startupId: string;
  status: ApplicationStatus;
  submittedAt?: ISODate;
  lastSavedAt: ISODate;
  currentStep: number;
  referenceNumber?: string;
  solution: {
    problemUnderstanding: string;
    approach: string;
    existingSolution: string;
    proposedDevelopment: string;
    trl: number;
  };
  pilotPlan: {
    durationDays: number;
    milestones: { name: string; deliverable: string; acceptanceTest: string; dayOffset: number }[];
    dependencies: string[];
  };
  commercials: {
    milestoneCostsPaise: number[];
    totalPaise: number;
    costBasis: string;
    overBudgetJustification?: string;
  };
  dataSecurity: {
    dataRequested: string[];
    tier: 'synthetic' | 'masked' | 'production';
    processingLocation: string;
    subProcessors: string[];
    certifications: string[];
  };
  declarations: {
    conflict: boolean;
    conflictDetail?: string;
    debarred: boolean;
    blacklisted: boolean;
    startupDeclaration: boolean;
    signatureName?: string;
    signedAt?: ISODate;
  };
  eligibility: EligibilityResult[];
  eligibilitySummary: 'auto_pass' | 'auto_fail' | 'needs_review' | 'not_run';
  documents: ApplicationDocument[];
  scores?: ApplicationScoreSummary;
  clarifications: { id: string; question: string; askedOn: ISODate; answer?: string; answeredOn?: ISODate }[];
  timeline: { at: ISODate; label: string; actor: string }[];
}

export interface ApplicationScoreSummary {
  weightedMean: number;
  evaluatorCount: number;
  released: boolean;
  rank?: number;
  outlierFlagged: boolean;
}

export interface CoiDeclaration {
  id: string;
  evaluatorId: string;
  applicationId: string;
  declared: boolean;
  hasConflict: boolean;
  natureOfConflict?: string;
  declaredAt?: ISODate;
}

export interface EvaluationScore {
  criterionId: string;
  score: number;
  rationale: string;
  evidenceReference: string;
}

export interface Evaluation {
  id: string;
  applicationId: string;
  evaluatorId: string;
  rubricId: string;
  status: 'not_started' | 'in_progress' | 'submitted';
  scores: EvaluationScore[];
  weightedTotal?: number;
  submittedAt?: ISODate;
  lastCriterionId?: string;
  released: boolean;
  outlier?: { deviation: number; rationaleRequested: boolean; rationale?: string };
}

export interface EvaluationPanel {
  id: string;
  challengeId: string;
  chairEvaluatorId: string;
  evaluatorIds: string[];
  rubricId: string;
  sessionDate?: ISODate;
  minutes?: string;
  minutesRecordedAt?: ISODate;
  resultsReleased: boolean;
  slots?: { applicationId: string; startsAt: ISODate; minutes: number }[];
  consensus?: { applicationId: string; score: number; varianceNote: string; recordedBy: string; at: ISODate }[];
}

export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'revision_required'
  | 'paid';

export interface Milestone {
  id: string;
  caseId: string;
  pilotId: string;
  index: number;
  name: string;
  requirement: string;
  acceptanceTest: string;
  evidenceRequired: string[];
  paymentPaise: number;
  dueOn: ISODate;
  status: MilestoneStatus;
  submittedOn?: ISODate;
  acceptedOn?: ISODate;
  rejectedOn?: ISODate;
  reviewNote?: string;
  acceptanceFinding?: 'met' | 'partially_met' | 'not_met';
  evidenceIds: string[];
}

export interface Evidence {
  id: string;
  pilotId: string;
  milestoneId?: string;
  kpiId?: string;
  fileName: string;
  type: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: ISODate;
  hash: string;
  scan: 'clean' | 'pending' | 'failed';
  verifiedBy?: string;
  verifiedAt?: ISODate;
  verification: 'verified' | 'pending' | 'failed';
  version: number;
  access: 'restricted' | 'department' | 'validator' | 'public';
}

export interface Kpi {
  id: string;
  pilotId: string;
  name: string;
  unit: string;
  kind: 'numeric' | 'percentage' | 'boolean' | 'time' | 'cost';
  baseline: number;
  target: number;
  current: number;
  direction: 'decrease' | 'increase';
  method: string;
  frequency: string;
  ownerId: string;
  evidenceIds: string[];
  series: { at: ISODate; value: number; sampleSize: number }[];
}

export interface Risk {
  id: string;
  pilotId: string;
  title: string;
  category: 'delivery' | 'data' | 'security' | 'adoption' | 'legal' | 'financial';
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  mitigation: string;
  ownerId: string;
  status: 'open' | 'mitigating' | 'closed';
  reviewedOn: ISODate;
}

export interface Incident {
  id: string;
  pilotId: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: ISODate;
  ownerId: string;
  resolutionDeadline: ISODate;
  status: 'open' | 'contained' | 'resolved';
  resolution?: string;
  resolvedAt?: ISODate;
  evidenceIds: string[];
}

export interface ChangeRequest {
  id: string;
  pilotId: string;
  title: string;
  reason: string;
  raisedBy: string;
  raisedOn: ISODate;
  impact: { moneyPaise: number; days: number; scope: string };
  status: 'requested' | 'approved' | 'refused';
  decidedBy?: string;
  decidedOn?: ISODate;
  decisionNote?: string;
}

export type PilotStatus =
  | 'contracting'
  | 'executing'
  | 'awaiting_validation'
  | 'validated'
  | 'not_validated'
  | 'closed_after_pilot'
  | 'scaled';

export interface Pilot {
  id: string;
  caseId: string;
  challengeId: string;
  applicationId: string;
  startupId: string;
  departmentId: string;
  title: string;
  status: PilotStatus;
  currentGate: GateId;
  gateEnteredOn: ISODate;
  startedOn: ISODate;
  endsOn: ISODate;
  durationDays: number;
  budgetPaise: number;
  spentPaise: number;
  scope: string;
  successCriteria: string[];
  contacts: { name: string; role: string; email: string }[];
  contractId: string;
  sandbox: {
    environment: string;
    dataTier: 'synthetic' | 'masked' | 'production';
    credentialExpiry: ISODate;
    egressRules: string[];
    accessLog: { at: ISODate; actor: string; action: string }[];
  };
  blocked?: { reason: string; since: ISODate };
}

export interface Contract {
  id: string;
  caseId: string;
  pilotId: string;
  startupId: string;
  templateId: string;
  templateVersion: string;
  clauseIds: string[];
  deviations: { clauseId: string; level: 'minor' | 'material'; reason: string; approvedBy: string }[];
  status: 'draft' | 'awaiting_signature' | 'signed';
  generatedOn: ISODate;
  signedOn?: ISODate;
  signature?: { name: string; designation: string; method: string; at: ISODate; hash: string };
  totalPaise: number;
}

export type ClaimStatus = 'raised' | 'in_approval' | 'approved' | 'on_hold' | 'paid' | 'rejected';

export interface PaymentClaim {
  id: string;
  caseId: string;
  pilotId: string;
  milestoneId: string;
  startupId: string;
  departmentId: string;
  amountPaise: number;
  deductionPaise: number;
  deductionReason?: string;
  netPaise: number;
  acceptedOn: ISODate;
  invoiceNumber: string;
  invoiceOn: ISODate;
  status: ClaimStatus;
  approvalStep: string;
  holdReason?: string;
  heldBy?: string;
  paidOn?: ISODate;
  paymentReference?: string;
  exception?: string;
}

export interface ValidationFinding {
  criterion: string;
  claimed: string;
  observed: string;
  finding: 'met' | 'partially_met' | 'not_met';
  note: string;
}

export interface ValidationReport {
  id: string;
  caseId: string;
  pilotId: string;
  validatorId: string;
  status: 'not_started' | 'in_progress' | 'signed';
  outcome?: 'validated' | 'validated_with_qualifications' | 'not_validated';
  findings: ValidationFinding[];
  rederivation: { records: string; reproduced: boolean; note: string };
  securityAudit: { done: boolean; findingsOpen: number; note: string };
  dataAttestation: { signed: boolean; note: string };
  qualifications?: string;
  signedAt?: ISODate;
  hash?: string;
  publishedSummary?: string;
}

export interface ReadinessComponent {
  key: string;
  label: string;
  weightPercent: number;
  rawScore: number;
  weighted: number;
  basis: string;
  evidence: string;
}

export interface ProcurementCase {
  id: string;
  caseId: string;
  pilotId: string;
  readiness: { total: number; components: ReadinessComponent[]; computedAt: ISODate };
  pathwayId?: string;
  pathwayJustification?: string;
  reasonsAgainst?: string;
  vfm?: { pilotCostPaise: number; alternativeCostPaise: number; savingPercent: number; note: string };
  decidedBy?: string;
  decidedOn?: ISODate;
  packageGeneratedOn?: ISODate;
  status: 'assessing' | 'decided' | 'package_ready';
}

export interface ScaleUpCase {
  id: string;
  caseId: string;
  procurementCaseId: string;
  pilotId: string;
  districts: string[];
  projectedValuePaise: number;
  replicationPackage: {
    generatedOn: ISODate;
    contents: string[];
    hash: string;
  };
  catalogueSolutionId?: string;
  status: 'planned' | 'in_progress' | 'complete';
}

export interface CatalogueSolution {
  id: string;
  slug: string;
  name: string;
  startupId: string;
  provedByDepartmentId: string;
  pilotId: string;
  validatedMetrics: { name: string; baseline: string; result: string; target: string }[];
  validatorName: string;
  validatedOn: ISODate;
  attestations: string[];
  adoptionPathway: string;
  replicationPackageId: string;
  adoptedByDepartmentIds: string[];
  summary: string;
  sector: string;
}

export interface GateRecord {
  id: string;
  entityType: 'challenge' | 'pilot';
  entityId: string;
  caseId: string;
  gate: GateId;
  status: 'cleared' | 'open' | 'blocked' | 'future' | 'rejected';
  ownerId: string;
  enteredOn: ISODate;
  decidedOn?: ISODate;
  decision?: GateDecision;
  reason?: string;
  preconditions: { key: string; result: PreconditionResult; note: string; evidenceIds: string[] }[];
  waiver?: { requestedBy: string; authority: string; reason: string; status: 'requested' | 'granted' | 'refused'; at: ISODate };
  dwellDays: number;
}

export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  caseId: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  summary: string;
  before?: string;
  after?: string;
  at: ISODate;
  hash: string;
}

export type NotificationKind =
  | 'challenge_published'
  | 'application_received'
  | 'evaluation_assigned'
  | 'coi_required'
  | 'evaluation_due'
  | 'pilot_approved'
  | 'milestone_due'
  | 'milestone_submitted'
  | 'milestone_rejected'
  | 'payment_approved'
  | 'payment_delayed'
  | 'validation_requested'
  | 'validation_completed'
  | 'scale_decision_required'
  | 'clarification_asked'
  | 'document_expiring';

export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  waitingOnYou: boolean;
  title: string;
  detail: string;
  href: string;
  at: ISODate;
  read: boolean;
  caseId?: string;
  dueOn?: ISODate;
}

export interface IntegrationHealth {
  id: string;
  name: string;
  purpose: string;
  status: 'mock_healthy' | 'mock_degraded' | 'mock_down' | 'not_configured';
  lastSyncAt?: ISODate;
  failureCount: number;
  pendingVerification: number;
  note: string;
}

export interface WaitingItem {
  id: string;
  caseId: string;
  title: string;
  requiredAction: string;
  ownerId: string;
  ownerName: string;
  waitingSinceDays: number;
  slaDays: number;
  href: string;
  entityType: 'challenge' | 'pilot' | 'application' | 'payment' | 'validation';
  amountPaise?: number;
}
