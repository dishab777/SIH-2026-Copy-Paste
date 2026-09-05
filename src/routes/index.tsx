import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicShell } from './shells/PublicShell';
import { StartupShell } from './shells/StartupShell';
import { DepartmentShell } from './shells/DepartmentShell';
import { EvaluatorShell } from './shells/EvaluatorShell';
import { ValidatorShell } from './shells/ValidatorShell';
import { AdminShell } from './shells/AdminShell';

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
const Login = lazy(() => import('@/pages/public/Login'));
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicShell />,
    errorElement: <ServerError />,
    children: [
      { index: true, element: <DemandBoard /> },
      { path: 'challenges', element: <ChallengeList /> },
      { path: 'challenges/:slug', element: <ChallengeDetail /> },
      { path: 'results', element: <Results /> },
      { path: 'catalogue', element: <Catalogue /> },
      { path: 'catalogue/:solutionId', element: <CatalogueDetail /> },
      { path: 'templates', element: <Templates /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'transparency', element: <Transparency /> },
      { path: 'startups/:id', element: <StartupPublicProfile /> },
      { path: 'login', element: <Login /> },
      { path: 'register/startup', element: <RegisterStartup /> },
      { path: 'register/expert', element: <RegisterExpert /> },
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
      /*
       * The shared public pages, mounted here as well as on the public site.
       * An evaluator following "Published challenges" keeps the evaluator's own
       * navigation; the alternative — linking straight at the public route —
       * swapped their whole shell and left no way back.
       */
      { path: 'challenges', element: <ChallengeList /> },
      { path: 'challenges/:slug', element: <ChallengeDetail /> },
      { path: 'results', element: <Results /> },
      { path: 'catalogue', element: <Catalogue /> },
      { path: 'catalogue/:solutionId', element: <CatalogueDetail /> },
      { path: 'templates', element: <Templates /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'transparency', element: <Transparency /> },
      { path: 'startups/:id', element: <StartupPublicProfile /> },
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
      /*
       * The shared public pages, mounted here as well as on the public site.
       * An evaluator following "Published challenges" keeps the evaluator's own
       * navigation; the alternative — linking straight at the public route —
       * swapped their whole shell and left no way back.
       */
      /* No 'challenges' here: /d/challenges is the department's own pipeline. */
      { path: 'results', element: <Results /> },
      { path: 'catalogue', element: <Catalogue /> },
      { path: 'catalogue/:solutionId', element: <CatalogueDetail /> },
      { path: 'templates', element: <Templates /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'transparency', element: <Transparency /> },
      { path: 'startups/:id', element: <StartupPublicProfile /> },
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
      /*
       * The shared public pages, mounted here as well as on the public site.
       * An evaluator following "Published challenges" keeps the evaluator's own
       * navigation; the alternative — linking straight at the public route —
       * swapped their whole shell and left no way back.
       */
      { path: 'challenges', element: <ChallengeList /> },
      { path: 'challenges/:slug', element: <ChallengeDetail /> },
      { path: 'results', element: <Results /> },
      { path: 'catalogue', element: <Catalogue /> },
      { path: 'catalogue/:solutionId', element: <CatalogueDetail /> },
      { path: 'templates', element: <Templates /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'transparency', element: <Transparency /> },
      { path: 'startups/:id', element: <StartupPublicProfile /> },
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
      /*
       * The shared public pages, mounted here as well as on the public site.
       * An evaluator following "Published challenges" keeps the evaluator's own
       * navigation; the alternative — linking straight at the public route —
       * swapped their whole shell and left no way back.
       */
      { path: 'challenges', element: <ChallengeList /> },
      { path: 'challenges/:slug', element: <ChallengeDetail /> },
      { path: 'results', element: <Results /> },
      { path: 'catalogue', element: <Catalogue /> },
      { path: 'catalogue/:solutionId', element: <CatalogueDetail /> },
      { path: 'templates', element: <Templates /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'transparency', element: <Transparency /> },
      { path: 'startups/:id', element: <StartupPublicProfile /> },
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
      /*
       * The shared public pages, mounted here as well as on the public site.
       * An evaluator following "Published challenges" keeps the evaluator's own
       * navigation; the alternative — linking straight at the public route —
       * swapped their whole shell and left no way back.
       */
      /* No 'templates' here: /a/templates is the editable register. */
      { path: 'challenges', element: <ChallengeList /> },
      { path: 'challenges/:slug', element: <ChallengeDetail /> },
      { path: 'results', element: <Results /> },
      { path: 'catalogue', element: <Catalogue /> },
      { path: 'catalogue/:solutionId', element: <CatalogueDetail /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'transparency', element: <Transparency /> },
      { path: 'startups/:id', element: <StartupPublicProfile /> },
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
