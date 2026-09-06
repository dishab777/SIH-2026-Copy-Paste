import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { PublicShell } from './shells/PublicShell';
import { AuthShell } from './shells/AuthShell';
import { StartupShell } from './shells/StartupShell';
import { DepartmentShell } from './shells/DepartmentShell';
import { EvaluatorShell } from './shells/EvaluatorShell';
import { ValidatorShell } from './shells/ValidatorShell';
import { AdminShell } from './shells/AdminShell';
import { RequireAccount } from '@/components/layout/RequireAccount';

/* Route-level code splitting keeps the public bundle small. */
const DemandBoard = lazy(() => import('@/pages/public/DemandBoard'));
const ChallengeList = lazy(() => import('@/pages/public/ChallengeList'));
const ChallengeDetail = lazy(() => import('@/pages/public/ChallengeDetail'));
const Results = lazy(() => import('@/pages/public/Results'));
const Catalogue = lazy(() => import('@/pages/public/Catalogue'));
const CatalogueDetail = lazy(() => import('@/pages/public/CatalogueDetail'));
const Templates = lazy(() => import('@/pages/public/Templates'));
const HowItWorks = lazy(() => import('@/pages/public/HowItWorks'));
const Transparency = lazy(() => import('@/pages/public/Transparency'));
const StartupPublicProfile = lazy(() => import('@/pages/public/StartupPublicProfile'));
const Legal = lazy(() => import('@/pages/public/Legal'));
const Login = lazy(() => import('@/pages/public/Login'));
const Register = lazy(() => import('@/pages/public/Register'));
const RegisterStartup = lazy(() => import('@/pages/public/RegisterStartup'));
const RegisterExpert = lazy(() => import('@/pages/public/RegisterExpert'));

const StartupDashboard = lazy(() => import('@/pages/startup/Dashboard'));
const StartupProfile = lazy(() => import('@/pages/startup/Profile'));
const StartupMatches = lazy(() => import('@/pages/startup/Matches'));
const StartupApplications = lazy(() => import('@/pages/startup/Applications'));
const StartupApplicationDetail = lazy(() => import('@/pages/startup/ApplicationDetail'));
const ApplicationWizard = lazy(() => import('@/pages/startup/ApplicationWizard'));
const StartupPilots = lazy(() => import('@/pages/startup/Pilots'));
const StartupPilotWorkspace = lazy(() => import('@/pages/startup/PilotWorkspace'));
const ContractReader = lazy(() => import('@/pages/startup/ContractReader'));
const StartupPayments = lazy(() => import('@/pages/startup/Payments'));
const StartupMessages = lazy(() => import('@/pages/startup/Messages'));

const DepartmentDashboard = lazy(() => import('@/pages/department/Dashboard'));
const ChallengePipeline = lazy(() => import('@/pages/department/ChallengePipeline'));
const ChallengeStudio = lazy(() => import('@/pages/department/ChallengeStudio'));
const ChallengeWorkspace = lazy(() => import('@/pages/department/ChallengeWorkspace'));
const Screening = lazy(() => import('@/pages/department/Screening'));
const ApplicantDossier = lazy(() => import('@/pages/department/ApplicantDossier'));
const EvaluationPanelPage = lazy(() => import('@/pages/department/EvaluationPanel'));
const DepartmentPilots = lazy(() => import('@/pages/department/Pilots'));
const PilotSteering = lazy(() => import('@/pages/department/PilotSteering'));
const PilotMeasurement = lazy(() => import('@/pages/department/PilotMeasurement'));
const GateDecision = lazy(() => import('@/pages/department/GateDecision'));
const DepartmentPayments = lazy(() => import('@/pages/department/Payments'));
const ScaleUp = lazy(() => import('@/pages/department/ScaleUp'));
const Reports = lazy(() => import('@/pages/department/Reports'));

const EvaluatorQueue = lazy(() => import('@/pages/evaluator/Queue'));
const CoiDeclarationPage = lazy(() => import('@/pages/evaluator/CoiDeclaration'));
const ScoreWorkspace = lazy(() => import('@/pages/evaluator/ScoreWorkspace'));
const PanelSession = lazy(() => import('@/pages/evaluator/PanelSession'));

const ValidatorQueue = lazy(() => import('@/pages/validator/Queue'));
const ValidatorWorkspace = lazy(() => import('@/pages/validator/Workspace'));
const AuditViewer = lazy(() => import('@/pages/validator/AuditViewer'));

const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminTaxonomy = lazy(() => import('@/pages/admin/Taxonomy'));
const AdminTemplates = lazy(() => import('@/pages/admin/Templates'));
const AdminRules = lazy(() => import('@/pages/admin/Rules'));
const AdminRubrics = lazy(() => import('@/pages/admin/Rubrics'));
const AdminConfig = lazy(() => import('@/pages/admin/Config'));
const AdminIntegrations = lazy(() => import('@/pages/admin/Integrations'));
const AdminAudit = lazy(() => import('@/pages/admin/Audit'));

const Styleguide = lazy(() => import('@/pages/dev/Styleguide'));
const Forbidden = lazy(() => import('@/pages/system/Forbidden'));
const NotFound = lazy(() => import('@/pages/system/NotFound'));
const ServerError = lazy(() => import('@/pages/system/ServerError'));
const Maintenance = lazy(() => import('@/pages/system/Maintenance'));

/**
 * The pages that belong to no single portal, mounted under all of them.
 *
 * An evaluator following "Published challenges" keeps the evaluator's own
 * navigation; the alternative — linking straight at the public route — swapped
 * their whole shell and left no way back. The policies behave the same way: a
 * department officer who opens the privacy policy from the footer should not
 * find themselves on the public site with their portal gone.
 *
 * `omit` is for the two places a portal's own route already owns the path.
 * `/d/challenges` is the department's pipeline, not the public register, and
 * `/a/templates` is the editable library, not the read-only one.
 */
function sharedRoutes(omit: readonly string[] = []): RouteObject[] {
  const routes: RouteObject[] = [
    { path: 'challenges', element: <ChallengeList /> },
    { path: 'challenges/:slug', element: <ChallengeDetail /> },
    { path: 'results', element: <Results /> },
    { path: 'catalogue', element: <Catalogue /> },
    { path: 'catalogue/:solutionId', element: <CatalogueDetail /> },
    { path: 'templates', element: <Templates /> },
    { path: 'how-it-works', element: <HowItWorks /> },
    { path: 'transparency', element: <Transparency /> },
    { path: 'startups/:id', element: <StartupPublicProfile /> },
    { path: 'legal/:document', element: <Legal /> },
  ];
  return routes.filter((r) => !omit.some((o) => r.path === o || r.path?.startsWith(`${o}/`)));
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicShell />,
    errorElement: <ServerError />,
    /*
     * The public site is the notice board: the demand board says what
     * departments need, how-it-works says how the programme works, and the
     * policies say what the programme is bound by. All three are open to
     * anyone, because a tender nobody can read is not a tender and a policy
     * nobody can read is not a policy.
     *
     * Everything else here is the document room — the challenge document with
     * its rubric and clauses, and every page that names an identifiable company
     * and what it was measured at. Those are published to the programme rather
     * than to the open web, and `RequireAccount` refuses them in the open
     * rather than bouncing you to /login and losing the page you wanted.
     *
     * The same components are mounted unguarded under /s, /d, /e, /v and /a,
     * because being in a portal already means being signed in.
     */
    children: [
      { index: true, element: <DemandBoard /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'legal/:document', element: <Legal /> },
      {
        path: 'challenges',
        element: (
          <RequireAccount
            what="The challenge register opens to registered users."
            why="The demand board publishes what every department needs. The register itself — filterable, exportable, with the document behind each entry — is for people taking part in the programme."
          >
            <ChallengeList />
          </RequireAccount>
        ),
      },
      {
        path: 'challenges/:slug',
        element: (
          <RequireAccount
            what="This challenge document opens to registered users."
            why="It carries the scoring rubric you would be marked against, the eligibility rules, the IP position and the pilot agreement. The demand board publishes the outcome, the budget and the closing date to anyone."
          >
            <ChallengeDetail />
          </RequireAccount>
        ),
      },
      {
        path: 'results',
        element: (
          <RequireAccount
            what="Pilot results open to registered users."
            why="Every result names the company that ran the pilot and what it was measured at. That is commercial performance data about an identifiable firm, so it is published to the programme rather than to the open web."
          >
            <Results />
          </RequireAccount>
        ),
      },
      {
        path: 'catalogue',
        element: (
          <RequireAccount
            what="The validated catalogue opens to registered users."
            why="It names suppliers whose pilots were independently validated, which makes it a live procurement record rather than a public notice."
          >
            <Catalogue />
          </RequireAccount>
        ),
      },
      {
        path: 'catalogue/:solutionId',
        element: (
          <RequireAccount
            what="This validated solution opens to registered users."
            why="It names the supplier, the department, the measured result and the validator who signed it off."
          >
            <CatalogueDetail />
          </RequireAccount>
        ),
      },
      {
        path: 'startups/:id',
        element: (
          <RequireAccount
            what="Company records open to registered users."
            why="A company's government deployment record is about an identifiable firm, and it is not published to the open web."
          >
            <StartupPublicProfile />
          </RequireAccount>
        ),
      },
      {
        path: 'templates',
        element: (
          <RequireAccount
            what="The template and clause library opens to registered users."
            why="These are the agreements the programme actually signs. They are shared with everyone taking part, at the version in force today."
          >
            <Templates />
          </RequireAccount>
        ),
      },
      {
        path: 'transparency',
        element: (
          <RequireAccount
            what="Programme performance opens to registered users."
            why="How long each department takes and how fast it pays is reported to everyone taking part in the programme."
          >
            <Transparency />
          </RequireAccount>
        ),
      },
    ],
  },
  {
    /*
     * Signing in is not a page on the public site, it is the door to the
     * building. It gets a bar with no navigation on it.
     *
     * A pathless layout route with absolute children, NOT a second route at
     * '/'. Two siblings claiming the same path is ambiguous, and the router
     * resolved /login against the public shell's subtree instead — which put
     * the whole site navigation back above the sign-in form, and rendered the
     * wrong page under it.
     */
    element: <AuthShell />,
    errorElement: <ServerError />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/register/startup', element: <RegisterStartup /> },
      { path: '/register/expert', element: <RegisterExpert /> },
    ],
  },
  {
    path: '/s',
    element: <StartupShell />,
    errorElement: <ServerError />,
    children: [
      { index: true, element: <StartupDashboard /> },
      { path: 'profile', element: <StartupProfile /> },
      { path: 'matches', element: <StartupMatches /> },
      { path: 'applications', element: <StartupApplications /> },
      { path: 'applications/:id', element: <StartupApplicationDetail /> },
      { path: 'applications/:id/edit/:step', element: <ApplicationWizard /> },
      { path: 'pilots', element: <StartupPilots /> },
      { path: 'pilots/:id', element: <StartupPilotWorkspace /> },
      { path: 'contracts/:id', element: <ContractReader /> },
      { path: 'payments', element: <StartupPayments /> },
      { path: 'messages', element: <StartupMessages /> },
      ...sharedRoutes(),
    ],
  },
  {
    path: '/d',
    element: <DepartmentShell />,
    errorElement: <ServerError />,
    children: [
      { index: true, element: <DepartmentDashboard /> },
      { path: 'challenges', element: <ChallengePipeline /> },
      { path: 'challenges/new/:step', element: <ChallengeStudio /> },
      { path: 'challenges/:id', element: <ChallengeWorkspace /> },
      { path: 'challenges/:id/applications', element: <Screening /> },
      { path: 'challenges/:id/applications/:appId', element: <ApplicantDossier /> },
      { path: 'challenges/:id/evaluation', element: <EvaluationPanelPage /> },
      { path: 'pilots', element: <DepartmentPilots /> },
      { path: 'pilots/:id', element: <PilotSteering /> },
      { path: 'pilots/:id/measurement', element: <PilotMeasurement /> },
      { path: 'gates/:gateId', element: <GateDecision /> },
      { path: 'payments', element: <DepartmentPayments /> },
      { path: 'scale/:pilotId', element: <ScaleUp /> },
      { path: 'reports', element: <Reports /> },
      /* The published notice, where the department reads what the public
         reads. It cannot live at /d/challenges/:id — that is the workspace. */
      { path: 'notices', element: <ChallengeList /> },
      { path: 'notices/:slug', element: <ChallengeDetail /> },
      ...sharedRoutes(['challenges']),
    ],
  },
  {
    path: '/e',
    element: <EvaluatorShell />,
    errorElement: <ServerError />,
    children: [
      { index: true, element: <EvaluatorQueue /> },
      { path: 'coi/:appId', element: <CoiDeclarationPage /> },
      { path: 'score/:appId', element: <ScoreWorkspace /> },
      { path: 'panel/:sessionId', element: <PanelSession /> },
      ...sharedRoutes(),
    ],
  },
  {
    path: '/v',
    element: <ValidatorShell />,
    errorElement: <ServerError />,
    children: [
      { index: true, element: <ValidatorQueue /> },
      { path: 'validate/:pilotId', element: <ValidatorWorkspace /> },
      { path: 'audit/:entityType/:id', element: <AuditViewer /> },
      ...sharedRoutes(),
    ],
  },
  {
    path: '/a',
    element: <AdminShell />,
    errorElement: <ServerError />,
    children: [
      { index: true, element: <Navigate to="/a/config" replace /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'taxonomy', element: <AdminTaxonomy /> },
      { path: 'templates', element: <AdminTemplates /> },
      { path: 'rules', element: <AdminRules /> },
      { path: 'rubrics', element: <AdminRubrics /> },
      { path: 'config', element: <AdminConfig /> },
      { path: 'integrations', element: <AdminIntegrations /> },
      { path: 'audit', element: <AdminAudit /> },
      /* The read-only library. /a/templates is the editable register. */
      { path: 'library', element: <Templates /> },
      ...sharedRoutes(['templates']),
    ],
  },
  {
    path: '/dev',
    element: <PublicShell />,
    children: [{ path: 'styleguide', element: <Styleguide /> }],
  },
  { path: '/403', element: <Forbidden /> },
  { path: '/404', element: <NotFound /> },
  { path: '/500', element: <ServerError /> },
  { path: '/maintenance', element: <Maintenance /> },
  { path: '*', element: <NotFound /> },
]);
