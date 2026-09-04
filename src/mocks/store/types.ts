import type {
  Application,
  AuditEvent,
  CatalogueSolution,
  ChangeRequest,
  ClarificationThread,
  Challenge,
  CoiDeclaration,
  Contract,
  Department,
  Evaluation,
  EvaluationPanel,
  Evidence,
  GateRecord,
  Incident,
  IntegrationHealth,
  Kpi,
  Milestone,
  Notification,
  PaymentClaim,
  Pilot,
  ProcurementCase,
  Risk,
  ScaleUpCase,
  Startup,
  StartupDocument,
  User,
  ValidationReport,
} from '@/types/models';

/** In-memory database. No browser storage is used anywhere in PRAYOG. */
export interface Database {
  now: () => Date;
  users: User[];
  departments: Department[];
  startups: Startup[];
  startupDocuments: StartupDocument[];
  challenges: Challenge[];
  clarifications: ClarificationThread[];
  applications: Application[];
  panels: EvaluationPanel[];
  coi: CoiDeclaration[];
  evaluations: Evaluation[];
  pilots: Pilot[];
  contracts: Contract[];
  milestones: Milestone[];
  kpis: Kpi[];
  evidence: Evidence[];
  risks: Risk[];
  incidents: Incident[];
  changeRequests: ChangeRequest[];
  claims: PaymentClaim[];
  validations: ValidationReport[];
  procurement: ProcurementCase[];
  scaleUps: ScaleUpCase[];
  catalogue: CatalogueSolution[];
  gates: GateRecord[];
  audit: AuditEvent[];
  notifications: Notification[];
  integrations: IntegrationHealth[];
}
