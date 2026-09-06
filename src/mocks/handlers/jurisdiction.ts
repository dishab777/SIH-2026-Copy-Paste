/**
 * The jurisdiction check, in front of every endpoint.
 *
 * This handler is registered first and matches all of /api. For each request it
 * works out which record is being asked for, who owns that record, and whether
 * the signed-in account has any standing over it. If it does not, the request
 * is refused here and no handler below ever runs.
 *
 * It is deliberately not a component, a route guard or a link filter. Those all
 * answer the question "should we show this control", and the answer to that
 * question is worth nothing the moment somebody arrives from a notification, a
 * bookmark, a pasted URL or a redirect after signing in. This answers the only
 * question that matters — should this account be given this record — in the one
 * place a request cannot go around.
 *
 * It only ever refuses. Handlers keep their own permission checks, because a
 * reader with standing over a case still may not do everything to it: reach
 * says whose file it is, `RBAC` says what you may do inside it.
 *
 * A REAL BACKEND MUST DO THIS TOO, in its own middleware, against the same
 * table in src/config/jurisdiction.ts. The client is written against exactly
 * this contract: a 403 carrying OUT_OF_JURISDICTION renders as a refusal that
 * names the boundary, and every screen already handles it.
 */
import { http } from 'msw';
import { REACH, type Reach } from '@/config/jurisdiction';
import { can, roleLabel, type Resource, type Role } from '@/config/rbac';
import type { Database } from '../store/types';
import { getDb } from '../store/db';
import { currentUser } from '../store/session';
import { fail, rememberLanguage } from './util';

/** Where the reader stands. Resolved once, from the server's own session. */
interface Standing {
  role: Role;
  reach: Reach;
  userId: string | null;
  departmentId: string | null;
  /** The state the reader's department sits in, for a state-wide reach. */
  state: string | null;
  startupId: string | null;
}

/**
 * The record being asked for, and who has a claim on it.
 *
 * `published` is the one thing that opens a record beyond its owners: a
 * challenge the programme has put out is meant to be read by the companies it
 * is asking to apply, which is the entire point of publishing it.
 */
interface Subject {
  /** How a refusal names the record. "challenge CH-2026-0143". */
  what: string;
  /** The department whose file it is. */
  departmentId?: string;
  /** The company whose record it is. */
  startupId?: string;
  /** People named on it, by user id. */
  assigned?: readonly string[];
  /** Open to any account, because the programme published it. */
  published?: boolean;
}

function standing(): Standing {
  const user = currentUser();
  const role: Role = user?.role ?? 'public';
  const db = getDb();
  const department = user?.departmentId ? db.departments.find((d) => d.id === user.departmentId) : undefined;
  return {
    role,
    reach: REACH[role],
    userId: user?.id ?? null,
    departmentId: user?.departmentId ?? null,
    state: department?.state ?? null,
    startupId: user?.startupId ?? null,
  };
}

/* ------------------------------------------------------------------ lookups */

const findChallenge = (db: Database, key: string) =>
  db.challenges.find((c) => c.id === key || c.caseId === key || c.slug === key);

const findPilot = (db: Database, key: string) => db.pilots.find((p) => p.id === key || p.caseId === key);

const findApplication = (db: Database, key: string) =>
  db.applications.find((a) => a.id === key || a.caseId === key);

/** A challenge is a department's working file until the day it is published. */
const isPublished = (status: string): boolean => status !== 'draft' && status !== 'in_review';

/**
 * The parts of a challenge that stay inside the department after publication.
 *
 * The document is published; who applied to it, what they scored and what the
 * department is about to decide are not, and that distinction is the whole
 * reason this file exists.
 */
const CHALLENGE_CASE_FILE = new Set(['applications', 'matches', 'clarifications', 'language-check', 'publish', 'close']);

/** Everyone an evaluator is entitled to see, by the assignment that named them. */
function evaluatorsOn(db: Database, applicationId: string): string[] {
  return [
    ...db.evaluations.filter((e) => e.applicationId === applicationId).map((e) => e.evaluatorId),
    ...db.coi.filter((c) => c.applicationId === applicationId).map((c) => c.evaluatorId),
  ];
}

/**
 * A pilot reaches its validator when its measurement window closes.
 *
 * Before that there is nothing independent to check, and the validator has no
 * business in the department's live pilot. After it, the pilot is theirs to
 * report on whether or not a draft report exists yet.
 */
function validatorsOn(db: Database, pilotId: string, status: string): string[] {
  const named = db.validations.filter((v) => v.pilotId === pilotId).map((v) => v.validatorId);
  const atGateFive = status === 'awaiting_validation' || status === 'validated' || status === 'not_validated';
  return atGateFive ? [...named, ...db.users.filter((u) => u.role === 'validator').map((u) => u.id)] : named;
}

/**
 * Which record this path is about.
 *
 * Returning null means "this path names no particular record" — a list, a
 * dashboard, a search — and those endpoints filter by the reader themselves.
 * Adding a path here is how a new record-scoped endpoint gets covered.
 */
function subjectOf(url: URL): Subject | null {
  const db = getDb();
  const [resource, key, sub] = url.pathname.replace(/^\/api\//, '').split('/');
  if (!key) return null;

  switch (resource) {
    case 'challenges': {
      const c = findChallenge(db, key);
      if (!c) return null;
      /*
       * Either a sub-resource that is plainly the file, or the reader saying so:
       * the department workspace asks for ?view=case-file, the public challenge
       * page does not, and the same URL therefore answers them differently.
       */
      const caseFile = Boolean(sub && CHALLENGE_CASE_FILE.has(sub)) || url.searchParams.get('view') === 'case-file';
      const panel = db.panels.find((p) => p.challengeId === c.id);
      return {
        what: `challenge ${c.caseId}`,
        departmentId: c.departmentId,
        // The evaluation panel is the one case-file page an evaluator sits on.
        assigned: sub === 'evaluation' && panel ? [panel.chairEvaluatorId, ...panel.evaluatorIds] : undefined,
        published: !caseFile && isPublished(c.status),
      };
    }

    case 'applications': {
      const a = findApplication(db, key);
      if (!a) return null;
      const c = db.challenges.find((x) => x.id === a.challengeId);
      return {
        what: `application ${a.caseId}`,
        departmentId: c?.departmentId,
        startupId: a.startupId,
        assigned: evaluatorsOn(db, a.id),
      };
    }

    case 'coi': {
      const a = findApplication(db, key);
      if (!a) return null;
      const c = db.challenges.find((x) => x.id === a.challengeId);
      return {
        what: `the conflict declaration on ${a.caseId}`,
        departmentId: c?.departmentId,
        // A declaration is made by the evaluator who was offered the case, so it
        // has to be reachable before any evaluation record exists.
        assigned: [...evaluatorsOn(db, a.id), ...db.users.filter((u) => u.role === 'evaluator').map((u) => u.id)],
      };
    }

    case 'evaluations': {
      const e = db.evaluations.find((x) => x.id === key);
      if (!e) return null;
      const a = db.applications.find((x) => x.id === e.applicationId);
      const c = a ? db.challenges.find((x) => x.id === a.challengeId) : undefined;
      return { what: 'that score sheet', departmentId: c?.departmentId, assigned: [e.evaluatorId] };
    }

    case 'panels': {
      const p = db.panels.find((x) => x.id === key);
      if (!p) return null;
      const c = db.challenges.find((x) => x.id === p.challengeId);
      return {
        what: 'that evaluation panel',
        departmentId: c?.departmentId,
        assigned: [p.chairEvaluatorId, ...p.evaluatorIds],
      };
    }

    case 'pilots':
    case 'procurement':
    case 'scale': {
      const p = findPilot(db, key);
      if (!p) return null;
      return {
        what: `pilot ${p.caseId}`,
        departmentId: p.departmentId,
        startupId: p.startupId,
        assigned: validatorsOn(db, p.id, p.status),
      };
    }

    case 'validation': {
      const v = db.validations.find((x) => x.id === key);
      if (!v) return null;
      const p = db.pilots.find((x) => x.id === v.pilotId);
      return {
        what: `validation report ${v.caseId}`,
        departmentId: p?.departmentId,
        assigned: [v.validatorId],
      };
    }

    case 'milestones': {
      const m = db.milestones.find((x) => x.id === key);
      const p = m ? db.pilots.find((x) => x.id === m.pilotId) : undefined;
      if (!p) return null;
      return {
        what: `milestone ${m?.caseId ?? key}`,
        departmentId: p.departmentId,
        startupId: p.startupId,
      };
    }

    case 'risks':
    case 'incidents':
    case 'change-requests': {
      const record =
        db.risks.find((x) => x.id === key) ??
        db.incidents.find((x) => x.id === key) ??
        db.changeRequests.find((x) => x.id === key);
      const p = record ? db.pilots.find((x) => x.id === record.pilotId) : undefined;
      if (!p) return null;
      return { what: `that record on ${p.caseId}`, departmentId: p.departmentId, startupId: p.startupId };
    }

    case 'contracts': {
      const c = db.contracts.find((x) => x.id === key || x.caseId === key);
      if (!c) return null;
      const p = db.pilots.find((x) => x.id === c.pilotId);
      return { what: `contract ${c.caseId}`, departmentId: p?.departmentId, startupId: c.startupId };
    }

    case 'payments': {
      const claim = db.claims.find((x) => x.id === key || x.caseId === key);
      if (!claim) return null;
      return { what: `claim ${claim.caseId}`, departmentId: claim.departmentId, startupId: claim.startupId };
    }

    case 'gates': {
      const g = db.gates.find((x) => x.id === key);
      if (!g) return null;
      const owner =
        g.entityType === 'challenge'
          ? db.challenges.find((x) => x.id === g.entityId)?.departmentId
          : db.pilots.find((x) => x.id === g.entityId)?.departmentId;
      return { what: `the ${g.gate} decision on ${g.caseId}`, departmentId: owner };
    }

    /*
     * A company's own record. Every department screens applicants from every
     * state, and an evaluator scores them, so this is open to any account —
     * but not to the open web, and not to another company.
     */
    case 'startups': {
      const s = db.startups.find((x) => x.id === key);
      if (!s) return null;
      return { what: `${s.tradeName}’s company record`, startupId: s.id, published: true };
    }

    /* /api/reports/audit-pack/:caseId — the whole file on one case, exported. */
    case 'reports': {
      if (key !== 'audit-pack' || !sub) return null;
      const c = findChallenge(db, sub);
      if (c) return { what: `the audit pack for ${c.caseId}`, departmentId: c.departmentId };
      const p = findPilot(db, sub);
      if (p) return { what: `the audit pack for ${p.caseId}`, departmentId: p.departmentId, startupId: p.startupId };
      return null;
    }

    default:
      return null;
  }
}

/**
 * Endpoints that are not about one record, and are still not for everyone.
 *
 * A register is as disclosing as a file: /api/admin/users is the posting list
 * for every department in the programme, and /api/gates is every decision
 * anyone has taken. Each one is matched to the resource it discloses and put
 * through the same published RBAC matrix that /a/users renders, rather than
 * carrying a second opinion about who may read it.
 */
const ENDPOINT_RESOURCE: readonly { test: RegExp; resource: Resource; what: string }[] = [
  { test: /^\/api\/admin\/users/, resource: 'user', what: 'The posting register' },
  { test: /^\/api\/admin\/integrations/, resource: 'config', what: 'Integration health' },
  { test: /^\/api\/audit/, resource: 'audit', what: 'The audit trail' },
  { test: /^\/api\/reports/, resource: 'audit', what: 'Departmental reporting' },
  { test: /^\/api\/gates/, resource: 'gate', what: 'Gate decisions' },
  { test: /^\/api\/procurement/, resource: 'procurement', what: 'Procurement cases' },
  { test: /^\/api\/payments/, resource: 'payment', what: 'The payment ledger' },
];

/**
 * Does this reader have standing over this record?
 *
 * `publication` is the whole subtlety. A published challenge is meant to be
 * read by the companies being asked to apply, so for the document itself
 * publication counts. It does not follow that the file behind the document is
 * open — who applied, what the panel scored, what the department decided and
 * when. Callers that are handing over the case file rather than the notice pass
 * 'case file only', and publication stops being an answer.
 */
function holds(who: Standing, subject: Subject, publication: 'publication counts' | 'case file only'): boolean {
  if (who.reach === 'programme') return true;
  if (who.role === 'public') return false;
  if (subject.assigned?.includes(who.userId ?? '')) return true;
  if (subject.startupId && subject.startupId === who.startupId) return true;

  if (subject.departmentId) {
    if (who.reach === 'department' && subject.departmentId === who.departmentId) return true;
    if (who.reach === 'state') {
      const owner = getDb().departments.find((d) => d.id === subject.departmentId);
      if (owner && owner.state === who.state) return true;
    }
  }

  return publication === 'publication counts' && Boolean(subject.published);
}

/** The refusal, or null when the reader has standing. */
function refuse(url: URL): Response | null {
  const pathname = url.pathname;
  const who = standing();

  // The unit that configures the programme audits all of it. That is the role.
  if (who.reach === 'programme') return null;

  const endpoint = ENDPOINT_RESOURCE.find((e) => e.test.test(pathname));
  if (endpoint && !can(who.role, 'view', endpoint.resource)) {
    return fail(403, 'OUT_OF_JURISDICTION', `${endpoint.what} is not open to your role.`, [
      who.role === 'public'
        ? 'You are not signed in. The demand board and how-it-works are open to anyone; this is not.'
        : `A ${roleLabel(who.role).toLowerCase()} has no standing over this register.`,
      'The published permission matrix is at /a/users. This refusal is the matrix being applied, not a second rule.',
    ]);
  }

  const subject = subjectOf(url);
  if (!subject) return null;

  const db = getDb();

  // Signed out, only the open web is available, and none of this is on it.
  if (who.role === 'public') {
    return fail(
      403,
      'OUT_OF_JURISDICTION',
      `You are not signed in, so ${subject.what} is not open to you.`,
      [
        'The demand board and how-it-works are open to anyone. Everything else is published to the programme, which means an account.',
      ],
    );
  }

  if (holds(who, subject, 'publication counts')) return null;

  const owner = subject.departmentId ? db.departments.find((d) => d.id === subject.departmentId) : undefined;
  const mine = who.departmentId ? db.departments.find((d) => d.id === who.departmentId) : undefined;

  const details: string[] = [];
  if (owner) {
    details.push(`${subject.what.replace(/^./, (m) => m.toUpperCase())} belongs to ${owner.shortName} — ${owner.district}, ${owner.state}.`);
  }
  if (mine) {
    details.push(`You are posted to ${mine.shortName} — ${mine.district}, ${mine.state}. Your access covers that department's cases.`);
  } else if (who.reach === 'assigned') {
    details.push('Your access covers the cases assigned to you by name. Independence is the point of the role.');
  } else if (who.reach === 'own') {
    details.push('Your access covers your own company’s applications, pilots, contracts and payments.');
  }
  details.push('The link was refused by the API, not hidden by the page. However you reached it, the answer is the same.');

  return fail(403, 'OUT_OF_JURISDICTION', `${subject.what.replace(/^./, (m) => m.toUpperCase())} is outside your jurisdiction.`, details);
}

/**
 * The same question, asked of a record about to appear in a list.
 *
 * A list is a set of links, and a link to a case the reader cannot open is
 * worse than no link: it tells them the case exists, what it is called and
 * which district it is in. Search was doing exactly that across all eight
 * departments. This runs the one policy above rather than restating it, so the
 * two can never disagree.
 */
export function mayRead(kind: 'challenges' | 'pilots' | 'applications' | 'startups', id: string): boolean {
  return refuse(new URL(`/api/${kind}/${id}`, 'http://prayog.local')) === null;
}

/**
 * Does this reader work on this case, rather than merely being entitled to read
 * the notice the programme published about it?
 *
 * The audit trail, the gate ladder and the departmental reports are the case
 * file, not the notice. Publishing a challenge does not publish who applied to
 * it or what the department decided, so those lists filter on this.
 */
export function worksOn(kind: 'challenges' | 'pilots' | 'applications', id: string): boolean {
  const subject = subjectOf(new URL(`/api/${kind}/${id}`, 'http://prayog.local'));
  return subject ? holds(standing(), subject, 'case file only') : false;
}

/**
 * Keep only the rows this reader has standing over.
 *
 * `claim` says whose row it is. Rows nobody owns — a programme-wide
 * configuration event, say — are for the unit that owns the programme.
 */
export function inReach<T>(items: T[], claim: (item: T) => { departmentId?: string; startupId?: string }): T[] {
  const who = standing();
  if (who.reach === 'programme') return items;
  if (who.role === 'public') return [];
  return items.filter((item) => holds(who, { what: '', ...claim(item) }, 'case file only'));
}

export const jurisdictionHandlers = [
  /*
   * Returning nothing hands the request on to the handler that actually serves
   * it. Only a refusal short-circuits, so this can be read as: nothing changes
   * except that some requests stop here.
   */
  http.all('/api/*', ({ request }) => {
    /*
     * The one handler every request passes through, so it is where the
     * language the client asked for is recorded. Returning nothing falls
     * through to the real handler, exactly as the jurisdiction check does.
     */
    rememberLanguage(request.headers.get('Accept-Language'));
    return refuse(new URL(request.url)) ?? undefined;
  }),
];
