import { http } from 'msw';
import { MATCH_WEIGHTS } from '@/config/rubrics';
import { gateSlaDays } from '@/config/gates';
import { policyNumber } from '@/config/policies';
import type { Startup, WaitingItem } from '@/types/models';
import { getDb } from '../store/db';
import { currentRole, currentUser } from '../store/session';
import { emptyIfScenario, fail, gate, notFound, ok, partialFailure, readBody } from './util';
import { mayRead } from './jurisdiction';

interface MatchReason {
  key: string;
  label: string;
  weightPercent: number;
  matched: boolean;
  detail: string;
}

function scoreMatch(startup: Startup, challengeCapabilities: string[], challengeState: string, budgetPaise: number, sector: string) {
  const reasons: MatchReason[] = MATCH_WEIGHTS.map((w) => {
    switch (w.key) {
      case 'technology': {
        const overlap = startup.capabilities.filter((c) => challengeCapabilities.includes(c));
        return {
          ...w,
          matched: overlap.length > 0,
          detail: overlap.length
            ? `Declares ${overlap.join(', ')}, which this challenge asks for`
            : 'None of the capabilities this challenge asks for are on the profile',
        };
      }
      case 'problem': {
        const matched = startup.industries.includes(sector);
        return {
          ...w,
          matched,
          detail: matched ? `Works in ${sector}` : `No recorded work in ${sector}`,
        };
      }
      case 'deployment': {
        const gov = startup.deployments.filter((d) => d.isGovernment);
        return {
          ...w,
          matched: gov.length > 0,
          detail: gov.length
            ? `${gov.length} prior government deployment${gov.length === 1 ? '' : 's'}, ${gov.filter((d) => d.validated).length} independently validated`
            : 'No prior government deployment on record',
        };
      }
      case 'geography': {
        const matched = startup.statesServed.includes(challengeState);
        return { ...w, matched, detail: matched ? `Serves ${challengeState}` : `Does not currently serve ${challengeState}` };
      }
      case 'eligibility': {
        const matched = startup.dpiit.status === 'recognised';
        return {
          ...w,
          matched,
          detail: matched
            ? 'Recognition is current, so turnover and experience relief applies'
            : startup.dpiit.status === 'expired'
              ? 'Recognition has expired — eligibility goes to review, not automatic failure'
              : 'Recognition is not verified',
        };
      }
      case 'maturity': {
        const matched = startup.deployments.length >= 2;
        return { ...w, matched, detail: matched ? 'Product is deployed and in service' : 'Limited deployment record' };
      }
      case 'budget': {
        const matched = budgetPaise >= 8 * 100_000 * 100;
        return { ...w, matched, detail: matched ? 'Pilot budget is within the usual range for this work' : 'Budget is tight for this scope' };
      }
      default: {
        const matched = startup.certifications.length > 0;
        return {
          ...w,
          matched,
          detail: matched ? `Holds ${startup.certifications.join(', ')}` : 'No security certification on the profile',
        };
      }
    }
  });
  const score = reasons.reduce((s, r) => s + (r.matched ? r.weightPercent : 0), 0);
  return { score, reasons };
}

export const portalHandlers = [
  http.get('/api/dashboard/department', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    if (!user?.departmentId) return fail(403, 'FORBIDDEN', 'Only a departmental account can open this dashboard.');
    const deptId = user.departmentId;
    const now = db.now();

    const challenges = db.challenges.filter((c) => c.departmentId === deptId);
    const pilots = db.pilots.filter((p) => p.departmentId === deptId);
    const claims = db.claims.filter((c) => c.departmentId === deptId);

    const waiting: WaitingItem[] = [];
    challenges.forEach((c) => {
      const g = db.gates.find((x) => x.entityId === c.id && (x.status === 'open' || x.status === 'blocked'));
      if (!g) return;
      const days = Math.floor((now.getTime() - new Date(c.gateEnteredOn).getTime()) / 86_400_000);
      waiting.push({
        id: g.id,
        caseId: c.caseId,
        title: c.title,
        requiredAction: c.blocked ? `Unblock ${g.gate}: ${c.blocked.reason}` : `Decide ${g.gate} — ${c.title}`,
        ownerId: g.ownerId,
        ownerName: db.users.find((u) => u.id === g.ownerId)?.name ?? 'Unassigned',
        waitingSinceDays: days,
        slaDays: gateSlaDays(g.gate),
        href: `/d/gates/${g.id}`,
        entityType: 'challenge',
        amountPaise: c.pilot.budgetPaise,
      });
    });
    pilots.forEach((p) => {
      const submitted = db.milestones.filter(
        (m) => m.pilotId === p.id && (m.status === 'submitted' || m.status === 'under_review'),
      );
      submitted.forEach((m) => {
        const days = Math.floor((now.getTime() - new Date(m.submittedOn ?? p.startedOn).getTime()) / 86_400_000);
        waiting.push({
          id: m.id,
          caseId: p.caseId,
          title: `${p.title} — milestone ${m.index}`,
          requiredAction: 'Record a met, partially met or not met finding on the submitted evidence',
          ownerId: p.departmentId,
          ownerName: db.users.find((u) => u.departmentId === p.departmentId && u.role === 'department_officer')?.name ?? '',
          waitingSinceDays: days,
          slaDays: policyNumber('sla.milestone.review.days'),
          href: `/d/pilots/${p.id}`,
          entityType: 'pilot',
          amountPaise: m.paymentPaise,
        });
      });
      const g = db.gates.find((x) => x.entityId === p.id && (x.status === 'open' || x.status === 'blocked'));
      if (g) {
        const days = Math.floor((now.getTime() - new Date(p.gateEnteredOn).getTime()) / 86_400_000);
        waiting.push({
          id: g.id,
          caseId: p.caseId,
          title: p.title,
          requiredAction: p.blocked ? `Unblock ${g.gate}: ${p.blocked.reason}` : `Decide ${g.gate} — ${p.title}`,
          ownerId: g.ownerId,
          ownerName: db.users.find((u) => u.id === g.ownerId)?.name ?? '',
          waitingSinceDays: days,
          slaDays: gateSlaDays(g.gate),
          href: `/d/gates/${g.id}`,
          entityType: 'pilot',
          amountPaise: p.budgetPaise,
        });
      }
    });
    waiting.sort((a, b) => b.waitingSinceDays / b.slaDays - a.waitingSinceDays / a.slaDays);

    const limitDays = policyNumber('payment.milestone.limit.days');
    const paymentRisk = claims
      .filter((c) => c.status !== 'paid')
      .map((c) => {
        const elapsed = Math.floor((now.getTime() - new Date(c.acceptedOn).getTime()) / 86_400_000);
        return {
          claim: c,
          startup: db.startups.find((s) => s.id === c.startupId)!,
          daysElapsed: elapsed,
          daysRemaining: limitDays - elapsed,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const gateDwell = (['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'] as const).map((g) => {
      const open = db.gates.filter(
        (x) =>
          x.gate === g &&
          (x.status === 'open' || x.status === 'blocked') &&
          (challenges.some((c) => c.id === x.entityId) || pilots.some((p) => p.id === x.entityId)),
      );
      return {
        gate: g,
        openCases: open.length,
        blockedCases: open.filter((x) => x.status === 'blocked').length,
        medianDwellDays: open.length
          ? Math.round(open.reduce((s, x) => s + x.dwellDays, 0) / open.length)
          : 0,
        slaDays: gateSlaDays(g),
      };
    });

    return ok({
      department: db.departments.find((d) => d.id === deptId)!,
      waiting: emptyIfScenario(waiting).slice(0, 12),
      gateDwell,
      portfolio: {
        openChallenges: challenges.filter((c) => ['open', 'closing_soon', 'in_review', 'draft'].includes(c.status)).length,
        livePilots: pilots.filter((p) => p.status === 'executing').length,
        committedPaise: pilots.reduce((s, p) => s + p.budgetPaise, 0),
        releasedPaise: claims.filter((c) => c.status === 'paid').reduce((s, c) => s + c.netPaise, 0),
        gateDistribution: gateDwell.map((g) => ({ gate: g.gate, count: g.openCases })),
      },
      paymentRisk: emptyIfScenario(paymentRisk).slice(0, 8),
      limitDays,
    });
  }),

  http.get('/api/dashboard/startup', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    if (!user?.startupId) return fail(403, 'FORBIDDEN', 'Only a startup account can open this dashboard.');
    const startup = db.startups.find((s) => s.id === user.startupId)!;
    const now = db.now();
    const limitDays = policyNumber('payment.milestone.limit.days');

    const applications = db.applications.filter((a) => a.startupId === startup.id);
    const pilots = db.pilots.filter((p) => p.startupId === startup.id);
    const claims = db.claims.filter((c) => c.startupId === startup.id);
    const contracts = db.contracts.filter((c) => c.startupId === startup.id);

    const waitingOnYou: WaitingItem[] = [];
    pilots.forEach((p) => {
      db.milestones
        .filter((m) => m.pilotId === p.id && ['in_progress', 'not_started', 'revision_required'].includes(m.status))
        .forEach((m) => {
          waitingOnYou.push({
            id: m.id,
            caseId: p.caseId,
            title: `${p.title} — milestone ${m.index}`,
            requiredAction:
              m.status === 'revision_required'
                ? `Revise and resubmit: ${m.reviewNote ?? 'see the department finding'}`
                : `Submit evidence: ${m.evidenceRequired.join(', ')}`,
            ownerId: user.id,
            ownerName: startup.tradeName,
            waitingSinceDays: Math.max(0, Math.floor((now.getTime() - new Date(p.startedOn).getTime()) / 86_400_000)),
            slaDays: Math.max(1, Math.floor((new Date(m.dueOn).getTime() - now.getTime()) / 86_400_000)),
            href: `/s/pilots/${p.id}`,
            entityType: 'pilot',
            amountPaise: m.paymentPaise,
          });
        });
    });
    contracts
      .filter((c) => c.status === 'awaiting_signature')
      .forEach((c) => {
        waitingOnYou.push({
          id: c.id,
          caseId: c.caseId,
          title: 'Pilot agreement awaiting your signature',
          requiredAction: 'Read the clauses, then sign in two steps',
          ownerId: user.id,
          ownerName: startup.tradeName,
          waitingSinceDays: 2,
          slaDays: 7,
          href: `/s/contracts/${c.id}`,
          entityType: 'pilot',
        });
      });
    db.startupDocuments
      .filter((d) => d.startupId === startup.id && d.validTo && new Date(d.validTo) < new Date(now.getTime() + 30 * 86_400_000))
      .forEach((d) => {
        waitingOnYou.push({
          id: d.id,
          caseId: startup.id,
          title: `${d.type} expires soon`,
          requiredAction: 'Upload a current copy so eligibility does not go to review',
          ownerId: user.id,
          ownerName: startup.tradeName,
          waitingSinceDays: 0,
          slaDays: Math.max(1, Math.floor((new Date(d.validTo!).getTime() - now.getTime()) / 86_400_000)),
          href: '/s/profile',
          entityType: 'application',
        });
      });

    const waitingOnThem = [
      ...applications
        .filter((a) => ['submitted', 'screening', 'eligible', 'shortlisted', 'under_evaluation'].includes(a.status))
        .map((a) => ({
          id: a.id,
          caseId: a.caseId,
          title: db.challenges.find((c) => c.id === a.challengeId)?.title ?? a.caseId,
          status: a.status.replace(/_/g, ' '),
          detail: 'With the department. You will be told the outcome and the reasons either way.',
          href: `/s/applications/${a.id}`,
        })),
      ...claims
        .filter((c) => c.status !== 'paid')
        .map((c) => ({
          id: c.id,
          caseId: c.caseId,
          title: `Milestone payment — ${db.milestones.find((m) => m.id === c.milestoneId)?.name ?? ''}`,
          status: c.status.replace(/_/g, ' '),
          detail: c.holdReason ?? c.approvalStep,
          href: '/s/payments',
        })),
      ...db.validations
        .filter((v) => pilots.some((p) => p.id === v.pilotId) && v.status !== 'signed')
        .map((v) => ({
          id: v.id,
          caseId: v.caseId,
          title: 'Independent validation in progress',
          status: 'with the validator',
          detail: 'The validator re-derives your claim from the raw records.',
          href: `/s/pilots/${v.pilotId}`,
        })),
    ];

    const openChallenges = db.challenges.filter((c) => ['open', 'closing_soon'].includes(c.status));
    const applied = new Set(applications.map((a) => a.challengeId));
    const recommendations = openChallenges
      .filter((c) => !applied.has(c.id))
      .map((c) => {
        const { score, reasons } = scoreMatch(startup, c.capabilities, c.state, c.pilot.budgetPaise, c.sector);
        return { challenge: c, score, reasons, department: db.departments.find((d) => d.id === c.departmentId)! };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const outstanding = claims.filter((c) => c.status !== 'paid');
    const ages = outstanding.map((c) => Math.floor((now.getTime() - new Date(c.acceptedOn).getTime()) / 86_400_000));

    return ok({
      startup,
      waitingOnYou: emptyIfScenario(waitingOnYou),
      waitingOnThem: emptyIfScenario(waitingOnThem),
      recommendations: emptyIfScenario(recommendations),
      money: {
        outstandingPaise: outstanding.reduce((s, c) => s + c.netPaise, 0),
        claimCount: outstanding.length,
        oldestDays: ages.length ? Math.max(...ages) : 0,
        limitDays,
        overdueCount: ages.filter((a) => a > limitDays).length,
      },
      profileCompleteness: startup.profileCompleteness,
      profileGaps: [
        startup.certifications.length === 0 ? 'No security certification on the profile' : null,
        startup.deployments.length < 2 ? 'Fewer than two deployments recorded' : null,
        startup.dpiit.status !== 'recognised' ? 'Startup recognition is not current' : null,
      ].filter((x): x is string => Boolean(x)),
    });
  }),

  http.get('/api/matches', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    if (!user?.startupId) return fail(403, 'FORBIDDEN', 'Only a startup account can see matches.');
    const startup = db.startups.find((s) => s.id === user.startupId)!;
    const applied = new Set(db.applications.filter((a) => a.startupId === startup.id).map((a) => a.challengeId));
    const scored = db.challenges
      .filter((c) => ['open', 'closing_soon'].includes(c.status) && !applied.has(c.id))
      .map((c) => {
        const { score, reasons } = scoreMatch(startup, c.capabilities, c.state, c.pilot.budgetPaise, c.sector);
        return { challenge: c, department: db.departments.find((d) => d.id === c.departmentId)!, score, reasons };
      })
      .sort((a, b) => b.score - a.score);

    return ok({
      weights: MATCH_WEIGHTS,
      fits: emptyIfScenario(scored.filter((s) => s.score >= 50)),
      nearMisses: emptyIfScenario(scored.filter((s) => s.score < 50 && s.score >= 20)),
    });
  }),

  http.get('/api/challenges/:id/matches', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const challenge = db.challenges.find((c) => c.id === params.id);
    if (!challenge) return notFound('That challenge');
    const scored = db.startups
      .map((s) => {
        const { score, reasons } = scoreMatch(s, challenge.capabilities, challenge.state, challenge.pilot.budgetPaise, challenge.sector);
        return { startup: s, score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    return ok({ weights: MATCH_WEIGHTS, items: scored });
  }),

  http.get('/api/startups/:id', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const startup = db.startups.find((s) => s.id === params.id || s.slug === params.id);
    if (!startup) return notFound('That startup');
    const pilots = db.pilots.filter((p) => p.startupId === startup.id);
    return ok({
      startup,
      documents: db.startupDocuments.filter((d) => d.startupId === startup.id),
      // Only validated public facts appear on a public profile.
      publicRecord: pilots
        .filter((p) => ['validated', 'scaled'].includes(p.status))
        .map((p) => ({
          pilot: p,
          department: db.departments.find((d) => d.id === p.departmentId)!,
          validation: db.validations.find((v) => v.pilotId === p.id) ?? null,
        })),
    });
  }),

  http.patch('/api/startups/:id', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    const startup = db.startups.find((s) => s.id === params.id);
    if (!startup) return notFound('That startup');
    if (user?.role === 'startup' && user.startupId !== startup.id) {
      return fail(403, 'FORBIDDEN', 'You can only edit your own profile.');
    }
    const body = await readBody<Partial<Startup>>(request);
    // Bank details are never editable from this frontend.
    delete (body as { bankAccountMasked?: string }).bankAccountMasked;
    Object.assign(startup, body);
    return ok(startup, 'Profile saved.');
  }),

  http.post('/api/startups/:id/recheck-dpiit', async ({ params }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const startup = db.startups.find((s) => s.id === params.id);
    if (!startup) return notFound('That startup');
    startup.dpiit.lastCheckedAt = db.now().toISOString();
    if (startup.dpiit.status === 'unverified') startup.dpiit.verification = 'verified';
    return ok(
      startup,
      'Checked against the recognition register. This build uses a mock provider — no live government API was called.',
    );
  }),

  http.get('/api/catalogue', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    return ok(
      emptyIfScenario(
        db.catalogue.map((c) => ({
          solution: c,
          startup: db.startups.find((s) => s.id === c.startupId)!,
          department: db.departments.find((d) => d.id === c.provedByDepartmentId)!,
        })),
      ),
    );
  }),

  http.get('/api/catalogue/:id', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const solution = db.catalogue.find((c) => c.id === params.id || c.slug === params.id);
    if (!solution) return notFound('That solution');
    return ok({
      solution,
      startup: db.startups.find((s) => s.id === solution.startupId)!,
      department: db.departments.find((d) => d.id === solution.provedByDepartmentId)!,
      pilot: db.pilots.find((p) => p.id === solution.pilotId)!,
      validation: db.validations.find((v) => v.pilotId === solution.pilotId) ?? null,
      replicationPackage: db.scaleUps.find((s) => s.id === solution.replicationPackageId) ?? null,
      challenge: db.challenges.find((c) => c.id === db.pilots.find((p) => p.id === solution.pilotId)?.challengeId) ?? null,
    });
  }),

  /*
   * Published results.
   *
   * A result joins a named company to a named validator to a verdict — including
   * "not reproduced" — and to the money. That is the most identifying payload on
   * the site, and the demand board fetches it too, to draw three counts.
   *
   * So the projection depends on who is asking. Signed out, the rows carry the
   * outcome and nothing that identifies anybody: enough for the landing page's
   * drawing, useless to anyone scraping it. The refusal happens here rather than
   * in the component, because a component that decides what to render has
   * already been sent the thing it decided not to show.
   */
  http.get('/api/results', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const anonymous = currentRole() === 'public';
    const finished = db.pilots.filter((p) =>
      ['validated', 'not_validated', 'closed_after_pilot', 'scaled'].includes(p.status),
    );
    return ok(
      emptyIfScenario(
        finished.map((p) => {
          const validation = db.validations.find((v) => v.pilotId === p.id) ?? null;
          const outcome = validation?.outcome ?? null;
          if (anonymous) return { id: p.id, outcome };

          const kpi = db.kpis.find((k) => k.pilotId === p.id);
          const procurementCase = db.procurement.find((x) => x.pilotId === p.id) ?? null;
          const gateRecord = db.gates.find((g) => g.entityId === p.id && g.gate === 'G6');
          return {
            id: p.id,
            pilot: p,
            challenge: db.challenges.find((c) => c.id === p.challengeId)!,
            department: db.departments.find((d) => d.id === p.departmentId)!,
            startup: db.startups.find((s) => s.id === p.startupId)!,
            claimed: kpi ? `${kpi.name}: ${kpi.baseline} → ${kpi.current} ${kpi.unit}` : '—',
            validated: validation?.publishedSummary ?? 'Validation in progress',
            outcome,
            validator: db.users.find((u) => u.id === validation?.validatorId)?.name ?? null,
            finalDecision: gateRecord?.decision ?? null,
            pathway: procurementCase?.pathwayId ?? null,
            reason: procurementCase?.pathwayJustification ?? null,
          };
        }),
      ),
    );
  }),

  http.get('/api/transparency', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const failure = partialFailure('the programme statistics');
    if (failure) return failure;
    const store = getDb();
    const now = store.now();
    const limitDays = policyNumber('payment.milestone.limit.days');

    // Transparency is an aggregate rather than a list, so the empty scenario
    // has to reach it through its sources: a programme that has run nothing
    // reports zeroes, not a blank screen.
    const db = {
      now: store.now,
      departments: emptyIfScenario(store.departments),
      challenges: emptyIfScenario(store.challenges),
      pilots: emptyIfScenario(store.pilots),
      startups: emptyIfScenario(store.startups),
      applications: emptyIfScenario(store.applications),
      claims: emptyIfScenario(store.claims),
      validations: emptyIfScenario(store.validations),
      gates: emptyIfScenario(store.gates),
      scaleUps: emptyIfScenario(store.scaleUps),
    };

    const published = db.challenges.filter((c) => c.timeline.publishedOn);
    const awarded = published.filter((c) => c.timeline.awardedOn);
    const pubToAward = awarded
      .map((c) => Math.round((new Date(c.timeline.awardedOn!).getTime() - new Date(c.timeline.publishedOn!).getTime()) / 86_400_000))
      .sort((a, b) => a - b);

    const paid = db.claims.filter((c) => c.status === 'paid' && c.paidOn);
    const acceptToPay = paid
      .map((c) => Math.round((new Date(c.paidOn!).getTime() - new Date(c.acceptedOn).getTime()) / 86_400_000))
      .sort((a, b) => a - b);

    const median = (arr: number[]): number => (arr.length ? arr[Math.floor(arr.length / 2)]! : 0);

    const outcomes = db.validations.filter((v) => v.status === 'signed');

    return ok({
      headline: {
        departments: db.departments.length,
        openProblems: db.challenges.filter((c) => ['open', 'closing_soon'].includes(c.status)).length,
        committedPaise: db.challenges
          .filter((c) => ['open', 'closing_soon', 'closed', 'awarded'].includes(c.status))
          .reduce((s, c) => s + c.pilot.budgetPaise, 0),
        activePilots: db.pilots.filter((p) => p.status === 'executing').length,
        startups: db.startups.length,
        districts: new Set(db.challenges.map((c) => c.district)).size,
        applications: db.applications.filter((a) => a.status !== 'draft').length,
      },
      medians: {
        publicationToAwardDays: median(pubToAward),
        acceptanceToPaymentDays: median(acceptToPay),
        paymentTimelinessPercent: paid.length
          ? Number(((acceptToPay.filter((d) => d <= limitDays).length / paid.length) * 100).toFixed(1))
          : 0,
        limitDays,
      },
      gateDwell: (['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'] as const).map((g) => {
        const cleared = db.gates.filter((x) => x.gate === g && x.status === 'cleared');
        return {
          gate: g,
          medianDwellDays: cleared.length ? median(cleared.map((c) => c.dwellDays).sort((a, b) => a - b)) : 0,
          slaDays: gateSlaDays(g),
          clearedCount: cleared.length,
        };
      }),
      funnel: [
        { stage: 'Applications received', count: db.applications.filter((a) => a.status !== 'draft').length },
        { stage: 'Eligible', count: db.applications.filter((a) => a.eligibilitySummary === 'auto_pass').length },
        {
          stage: 'Shortlisted',
          count: db.applications.filter((a) => ['shortlisted', 'awarded', 'not_selected'].includes(a.status)).length,
        },
        { stage: 'Awarded a pilot', count: db.pilots.length },
      ],
      pilotOutcomes: [
        { outcome: 'Validated', count: outcomes.filter((o) => o.outcome === 'validated').length },
        {
          outcome: 'Validated with qualifications',
          count: outcomes.filter((o) => o.outcome === 'validated_with_qualifications').length,
        },
        { outcome: 'Not validated', count: outcomes.filter((o) => o.outcome === 'not_validated').length },
        { outcome: 'Still running', count: db.pilots.filter((p) => p.status === 'executing').length },
      ],
      pilotsByDepartment: db.departments.map((d) => ({
        department: d.shortName,
        pilots: db.pilots.filter((p) => p.departmentId === d.id).length,
        committedPaise: db.pilots.filter((p) => p.departmentId === d.id).reduce((s, p) => s + p.budgetPaise, 0),
      })),
      scaleUpRate: {
        validated: outcomes.filter((o) => o.outcome !== 'not_validated').length,
        scaled: db.scaleUps.length,
      },
      servedFor: now.toISOString(),
    });
  }),

  http.get('/api/notifications', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const user = currentUser();
    if (!user) return ok([]);
    return ok(
      db.notifications
        .filter((n) => n.userId === user.id)
        .sort((a, b) => (a.at < b.at ? 1 : -1)),
    );
  }),

  http.post('/api/notifications/read', async ({ request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const body = await readBody<{ ids?: string[]; all?: boolean }>(request);
    const user = currentUser();
    db.notifications
      .filter((n) => n.userId === user?.id && (body.all || body.ids?.includes(n.id)))
      .forEach((n) => {
        n.read = true;
      });
    return ok({ updated: true });
  }),

  http.get('/api/search', async ({ request }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const q = (new URL(request.url).searchParams.get('q') ?? '').toLowerCase().trim();
    if (!q) return ok({ challenges: [], startups: [], pilots: [], applications: [] });
    const match = (s: string): boolean => s.toLowerCase().includes(q);
    /*
     * Search is a list of links, and a link to a case the reader cannot open is
     * worse than no link: it tells them the case exists, what it is called and
     * which district it is in. Every result goes through the same jurisdiction
     * check the case itself would.
     */
    return ok({
      challenges: db.challenges
        .filter((c) => match(c.title) || match(c.caseId) || match(c.sector))
        .filter((c) => mayRead('challenges', c.id))
        .slice(0, 6)
        .map((c) => ({ id: c.id, slug: c.slug, caseId: c.caseId, title: c.title, subtitle: c.sector, gate: c.currentGate })),
      startups: db.startups
        .filter((s) => match(s.tradeName) || match(s.legalName) || s.capabilities.some(match))
        .filter((s) => mayRead('startups', s.id))
        .slice(0, 6)
        .map((s) => ({ id: s.id, slug: s.slug, title: s.tradeName, subtitle: s.capabilities.slice(0, 2).join(', ') })),
      pilots: db.pilots
        .filter((p) => match(p.title) || match(p.caseId))
        .filter((p) => mayRead('pilots', p.id))
        .slice(0, 6)
        .map((p) => ({ id: p.id, caseId: p.caseId, title: p.title, subtitle: p.status.replace(/_/g, ' '), gate: p.currentGate })),
      applications: db.applications
        .filter((a) => match(a.caseId))
        .filter((a) => mayRead('applications', a.id))
        .slice(0, 4)
        .map((a) => ({ id: a.id, caseId: a.caseId, title: a.caseId, subtitle: a.status.replace(/_/g, ' ') })),
    });
  }),

  http.get('/api/contracts/:id', async ({ params }) => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    const contract = db.contracts.find((c) => c.id === params.id || c.pilotId === params.id);
    if (!contract) return notFound('That contract');
    const user = currentUser();
    if (user?.role === 'startup' && contract.startupId !== user.startupId) {
      return fail(403, 'FORBIDDEN', 'You can only open your own contract.');
    }
    const pilot = db.pilots.find((p) => p.id === contract.pilotId)!;
    return ok({
      contract,
      pilot,
      milestones: db.milestones.filter((m) => m.pilotId === pilot.id),
      startup: db.startups.find((s) => s.id === contract.startupId)!,
      department: db.departments.find((d) => d.id === pilot.departmentId)!,
    });
  }),

  http.post('/api/contracts/:id/sign', async ({ params, request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const db = getDb();
    const contract = db.contracts.find((c) => c.id === params.id);
    if (!contract) return notFound('That contract');
    if (contract.status === 'signed') return fail(409, 'ALREADY_SIGNED', 'This contract has already been signed.');
    const body = await readBody<{ name: string; designation: string; confirmed: boolean }>(request);
    if (!body.confirmed || !body.name || !body.designation) {
      return fail(422, 'VALIDATION_FAILED', 'Signature could not be recorded.', [
        'Confirm the two-step declaration and give the signatory name and designation.',
      ]);
    }
    const now = db.now();
    contract.status = 'signed';
    contract.signedOn = now.toISOString();
    contract.signature = {
      name: body.name,
      designation: body.designation,
      method: 'Aadhaar eSign (mock provider — not a legally executed signature in this build)',
      at: now.toISOString(),
      hash: `${contract.id}-${now.getTime().toString(16)}`,
    };
    return ok(contract, 'Signed. The signature record is attached to the contract.');
  }),
];
