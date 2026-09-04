import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GATES, gateSlaDays } from '@/config/gates';
import { citationShort } from '@/config/policies';
import { policyNumber } from '@/config/policies';
import { TEMPLATES } from '@/config/templates';
import { useAnswerClarification, useChallenge, useSession } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { CaseWorkspace } from '@/components/layout/CaseWorkspace';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { FileCover } from '@/components/domain/FileCover';
import { ChallengeDocument } from '@/components/domain/ChallengeDocument';
import { ChallengeDocumentNav } from '@/components/domain/ChallengeDocumentNav';
import { ChallengeSectionProvider } from '@/components/domain/ChallengeSectionContext';
import { SealStamp } from '@/components/domain/SealStamp';
import { SlaClock } from '@/components/domain/SlaClock';
import { Tabs, Breadcrumb } from '@/components/ui/Nav';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { countOf, day, dayTime, daysBetween, money, shortHash } from '@/lib/format';
import { useUi } from '@/store/ui';
import { PrayogApiError } from '@/services/api';

const TABS = [
  { id: 'framing', label: 'Framing' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'clarifications', label: 'Clarifications' },
  { id: 'documents', label: 'Documents' },
  { id: 'timeline', label: 'Timeline' },
];

export default function ChallengeWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useChallenge(id);
  const answer = useAnswerClarification();
  const session = useSession();
  const pushToast = useUi((s) => s.pushToast);
  const [tab, setTab] = useState('framing');
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const clarificationWindow = policyNumber('sla.clarification.days');

  return (
    <QueryState query={query} errorTitle="Unable to load this challenge." loading={<PanelSkeleton lines={10} />}>
      {(payload) => {
        const { challenge: c, department, owner, clarifications, gates, pilot } = payload.data;
        const openGate = gates.find((g) => g.status === 'open' || g.status === 'blocked');
        const unanswered = clarifications.filter((q) => !q.answer);
        const isPublic = ['open', 'closing_soon', 'closed', 'awarded'].includes(c.status);
        const agreement = TEMPLATES.find((t) => t.id === c.legal.templateId);

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb
                items={[
                  { label: 'Challenge pipeline', to: '/d/challenges' },
                  { label: c.caseId },
                ]}
              />
            </div>

            <CaseWorkspace
              gates={gates}
              currentGate={c.currentGate}
              ownerNames={{ [c.ownerId]: owner?.name ?? c.ownerId }}
              evidence={[]}
              audit={[]}
              next={
                openGate
                  ? [
                      {
                        id: openGate.id,
                        caseId: c.caseId,
                        title: c.title,
                        requiredAction: c.blocked
                          ? c.blocked.reason
                          : `Decide gate ${openGate.gate.slice(1)} — ${GATES.find((g) => g.id === openGate.gate)?.name}`,
                        ownerId: openGate.ownerId,
                        ownerName: owner?.name ?? '',
                        waitingSinceDays: daysBetween(c.gateEnteredOn),
                        slaDays: gateSlaDays(openGate.gate),
                        href: `/d/gates/${openGate.id}`,
                        entityType: 'challenge',
                        amountPaise: c.pilot.budgetPaise,
                      },
                    ]
                  : []
              }
              linked={[
                ...(pilot
                  ? [
                      {
                        caseId: pilot.caseId,
                        label: `Pilot — ${pilot.title}`,
                        to: `/d/pilots/${pilot.id}`,
                        detail: pilot.status.replace(/_/g, ' '),
                      },
                    ]
                  : []),
                ...(isPublic
                  ? [
                      {
                        caseId: c.caseId,
                        label: 'Public page as applicants see it',
                        to: `/challenges/${c.slug}`,
                        detail: 'Opens the published document',
                      },
                    ]
                  : []),
              ]}
            >
              <div className="flex flex-col gap-6">
                <FileCover
                  caseId={c.caseId}
                  title={c.title}
                  department={department?.shortName ?? ''}
                  owner={owner?.name ?? ''}
                  ownerInitials={owner?.initials}
                  gate={c.currentGate}
                  gateName={GATES.find((g) => g.id === c.currentGate)?.name}
                  amountPaise={c.pilot.budgetPaise}
                  sla={{ startedOn: c.gateEnteredOn, limitDays: gateSlaDays(c.currentGate) }}
                  status={<StatusBadge status={c.status} />}
                  actions={
                    openGate ? (
                      <LinkButton tone="primary" size="sm" to={`/d/gates/${openGate.id}`}>
                        Open gate {openGate.gate.slice(1)}
                      </LinkButton>
                    ) : undefined
                  }
                  extra={[{ label: 'Applicants', value: <span className="tnum">{c.applicantCount}</span> }]}
                />

                {c.blocked ? (
                  <InlineNote tone="seal" title={`This case is blocked at ${c.currentGate}`}>
                    <p className="max-w-doc">{c.blocked.reason}</p>
                    <p className="mt-1 text-micro text-ink-soft">Blocked since {day(c.blocked.since)}.</p>
                  </InlineNote>
                ) : null}

                {!isPublic ? (
                  <InlineNote tone="hold" title="Nothing here is public yet">
                    This challenge becomes visible on the demand board the moment gate 1 clears. Until then only this
                    department and the programme management unit can read it.
                  </InlineNote>
                ) : (
                  <InlineNote tone="verify" title="This challenge is public">
                    <p>
                      Applicants can read every section of it, including the evaluation rubric they will be scored
                      against. Answers to clarifications are published to everyone, not sent privately.
                    </p>
                    <p className="mt-2">
                      <Link to={`/challenges/${c.slug}`} className="underline underline-offset-2">
                        Open the page as an applicant sees it
                      </Link>
                    </p>
                  </InlineNote>
                )}

                <Tabs
                  items={TABS.map((t) =>
                    t.id === 'clarifications' && unanswered.length
                      ? { ...t, count: unanswered.length }
                      : t.id === 'applicants'
                        ? { ...t, count: c.applicantCount }
                        : t,
                  )}
                  value={tab}
                  onChange={setTab}
                >
                  {tab === 'framing' ? (
                    <ChallengeSectionProvider>
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[228px_minmax(0,1fr)]">
                        <ChallengeDocumentNav />
                        <div className="rounded-block border border-rule bg-sheet px-5 py-6 shadow-sheet md:px-6">
                          <ChallengeDocument challenge={c} department={department} clarifications={clarifications} />
                        </div>
                      </div>
                    </ChallengeSectionProvider>
                  ) : null}

                  {tab === 'approvals' ? (
                    <div className="flex flex-col gap-6">
                      <p className="max-w-doc text-body text-ink-soft">
                        Each gate names one owner. A gate that has cleared shows its written reason; a gate that is open
                        shows who is holding it and for how long against the configured window.
                      </p>
                      <ul className="sheet-flat">
                        {gates.map((g) => {
                          const def = GATES.find((x) => x.id === g.gate)!;
                          const overdue = g.dwellDays > gateSlaDays(g.gate);
                          return (
                            <li
                              key={g.id}
                              className={[
                                'ledger-row border-l-2 px-4 py-4',
                                g.status === 'blocked'
                                  ? 'border-l-seal bg-seal-wash'
                                  : g.status === 'open' && overdue
                                    ? 'border-l-seal bg-seal-wash'
                                    : g.status === 'open'
                                      ? 'border-l-hold bg-hold-wash'
                                      : 'border-l-transparent',
                              ].join(' ')}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 max-w-doc">
                                  <p className="text-data text-ink">
                                    {g.gate} · {def.name}
                                  </p>
                                  <p className="mt-0.5 text-micro text-ink-soft">
                                    Owner: {def.ownerRole.replace(/_/g, ' ')} · {citationShort('PRAYOG-SOP-4')}
                                  </p>
                                  {g.status === 'cleared' ? (
                                    <p className="mt-2 max-w-doc font-doc text-doc text-ink">{g.reason}</p>
                                  ) : g.status === 'future' ? (
                                    <p className="mt-2 text-body text-ink-soft">Not reached yet.</p>
                                  ) : (
                                    <p className="mt-2 text-body text-ink">
                                      Waiting on {def.ownerRole.replace(/_/g, ' ')} for {g.dwellDays} days.
                                    </p>
                                  )}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  {g.status === 'cleared' ? (
                                    <SealStamp tone="cleared" gate={g.gate} date={g.decidedOn} small />
                                  ) : g.status === 'rejected' ? (
                                    <SealStamp tone="rejected" gate={g.gate} date={g.decidedOn} small />
                                  ) : (
                                    <StatusBadge status={g.status} />
                                  )}
                                  {g.status === 'open' || g.status === 'blocked' ? (
                                    <>
                                      <SlaClock startedOn={g.enteredOn} limitDays={gateSlaDays(g.gate)} showDetail />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            pushToast(
                                              'verify',
                                              `Nudge sent to the ${def.ownerRole.replace(/_/g, ' ')}.`,
                                              'Recorded against the case so the delay is visible either way.',
                                            )
                                          }
                                        >
                                          Nudge the owner
                                        </Button>
                                        <Button size="sm" tone="primary" onClick={() => navigate(`/d/gates/${g.id}`)}>
                                          Open the gate
                                        </Button>
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {tab === 'applicants' ? (
                    <div>
                      {c.applicantCount === 0 ? (
                        <EmptyState
                          title="No applications yet."
                          body={
                            isPublic
                              ? 'Applications appear here as they are submitted. The screening ledger runs the eligibility rules automatically.'
                              : 'Applications can only arrive once gate 1 clears and the challenge is published.'
                          }
                          action={
                            isPublic
                              ? { label: 'Open the screening ledger', to: `/d/challenges/${c.id}/applications` }
                              : { label: 'Open the gate', to: openGate ? `/d/gates/${openGate.id}` : '/d/challenges' }
                          }
                        />
                      ) : (
                        <div className="flex flex-col gap-4">
                          <KeyValueSheet
                            title="Applicant pool"
                            items={[
                              { label: 'Applications received', value: <span className="tnum">{c.applicantCount}</span> },
                              {
                                label: 'Applications close',
                                value: c.timeline.closesOn ? day(c.timeline.closesOn) : 'Closed',
                              },
                              { label: 'Rubric in force', value: c.rubricId },
                              {
                                label: 'Rules in force',
                                value: `${countOf(c.eligibility.ruleIds.length, 'rule')}, versions frozen at publication`,
                              },
                            ]}
                          />
                          <div className="flex flex-wrap gap-3">
                            <LinkButton tone="primary" to={`/d/challenges/${c.id}/applications`}>
                              Open the screening ledger
                            </LinkButton>
                            <LinkButton to={`/d/challenges/${c.id}/evaluation`}>Open the evaluation panel</LinkButton>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {tab === 'clarifications' ? (
                    <div className="flex flex-col gap-4">
                      <p className="max-w-doc text-body text-ink-soft">
                        Answers are published to every applicant. The department has {clarificationWindow} calendar days
                        to answer, and the clock is visible to applicants.
                      </p>
                      {clarifications.length === 0 ? (
                        <EmptyState
                          title="No questions have been asked."
                          body="Questions appear here as applicants ask them, oldest first, with the answer window running."
                        />
                      ) : (
                        <ul className="sheet-flat">
                          {clarifications.map((q) => (
                            <li
                              key={q.id}
                              className={[
                                'ledger-row border-l-2 px-4 py-4',
                                q.answer ? 'border-l-transparent' : 'border-l-hold bg-hold-wash',
                              ].join(' ')}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 max-w-doc">
                                  <p className="font-doc text-doc text-ink">{q.question}</p>
                                  <p className="mt-1 text-micro text-ink-soft">
                                    Asked {day(q.askedOn)} · {q.askedByMasked}
                                  </p>
                                  {q.answer ? (
                                    <>
                                      <p className="mt-3 border-l-2 border-l-verify bg-verify-wash px-3 py-2 font-doc text-doc text-ink">
                                        {q.answer}
                                      </p>
                                      <p className="mt-1 text-micro text-ink-soft">
                                        Answered {day(q.answeredOn)} by {q.answeredBy}
                                      </p>
                                    </>
                                  ) : null}
                                </div>
                                <div className="shrink-0">
                                  {q.answer ? (
                                    <Badge tone="verify">Published</Badge>
                                  ) : (
                                    <div className="flex flex-col items-end gap-2">
                                      <SlaClock startedOn={q.askedOn} limitDays={clarificationWindow} showDetail />
                                      <Button
                                        size="sm"
                                        tone="primary"
                                        onClick={() => {
                                          setAnswering(q.id);
                                          setAnswerText('');
                                        }}
                                      >
                                        Answer publicly
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {answering === q.id ? (
                                <div className="mt-4 border-t border-rule pt-4">
                                  <Field
                                    label="Your answer"
                                    required
                                    hint="Published to every applicant, not sent privately. At least 10 characters."
                                    aside={`${answerText.trim().length} characters`}
                                  >
                                    {({ id, describedBy, invalid }) => (
                                      <Textarea
                                        id={id}
                                        aria-describedby={describedBy}
                                        invalid={invalid}
                                        rows={4}
                                        value={answerText}
                                        onChange={(e) => setAnswerText(e.target.value)}
                                      />
                                    )}
                                  </Field>
                                  <div className="mt-3 flex gap-3">
                                    <Button
                                      tone="primary"
                                      unavailableReason={
                                        answerText.trim().length < 10
                                          ? `Write ${10 - answerText.trim().length} more characters of answer.`
                                          : undefined
                                      }
                                      loading={answer.isPending}
                                      loadingLabel="Publishing"
                                      onClick={() =>
                                        answer.mutate(
                                          { challengeId: c.id, clarificationId: q.id, answer: answerText },
                                          {
                                            onSuccess: (res) => {
                                              setAnswering(null);
                                              pushToast('verify', res.message ?? 'Answer published.');
                                            },
                                            onError: (err) => {
                                              const api = err instanceof PrayogApiError ? err : null;
                                              pushToast(
                                                'seal',
                                                api?.message ?? 'The answer was not published.',
                                                'Your text is preserved.',
                                              );
                                            },
                                          },
                                        )
                                      }
                                    >
                                      Publish this answer
                                    </Button>
                                    <Button onClick={() => setAnswering(null)}>Cancel</Button>
                                  </div>
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}

                  {tab === 'documents' ? (
                    <div className="flex flex-col gap-4">
                      <p className="max-w-doc text-body text-ink-soft">
                        Documents attached to this challenge, at the version in force when it was published. Nothing here
                        has a permanent public URL; access is checked on every open and recorded in the audit trail.
                      </p>
                      <ul className="sheet-flat">
                        {[
                          agreement
                            ? {
                                name: `${agreement.label} ${agreement.version}`,
                                detail: `Effective ${day(agreement.effectiveFrom)} · owner ${agreement.owner}`,
                                access: 'Public with the challenge',
                              }
                            : null,
                          {
                            name: `Evaluation rubric ${c.rubricId}`,
                            detail: 'Published with the challenge and used unchanged afterwards',
                            access: 'Public with the challenge',
                          },
                          {
                            name: 'Data annexure (Schedule D)',
                            detail: `${c.departmentProvides.dataTier} tier · ${countOf(c.departmentProvides.fields.length, 'field')}`,
                            access: 'Released to the awarded startup only',
                          },
                          {
                            name: 'Cybersecurity annexure',
                            detail: `${c.legal.cyberLevel} level · ${citationShort('CERTIN-2022-DIR')}`,
                            access: 'Public with the challenge',
                          },
                          c.legal.legalPreClearanceNote
                            ? {
                                name: 'Legal pre-clearance note',
                                detail: c.legal.legalPreClearanceNote,
                                access: 'Department and programme management unit',
                              }
                            : null,
                        ]
                          .filter((x): x is { name: string; detail: string; access: string } => Boolean(x))
                          .map((doc) => (
                            <li key={doc.name} className="ledger-row px-4 py-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 max-w-doc">
                                  <p className="text-body text-ink">{doc.name}</p>
                                  <p className="mt-0.5 text-micro text-ink-soft">{doc.detail}</p>
                                  <p className="mt-0.5 text-micro text-ink-soft tnum">
                                    Checksum {shortHash(`${c.caseId}-${doc.name}`)}
                                  </p>
                                </div>
                                <Badge tone="neutral">{doc.access}</Badge>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}

                  {tab === 'timeline' ? (
                    <div className="flex flex-col gap-4">
                      <KeyValueSheet
                        title="Dates"
                        items={[
                          { label: 'Draft created', value: day(c.timeline.createdOn) },
                          { label: 'Published', value: c.timeline.publishedOn ? day(c.timeline.publishedOn) : 'Not yet' },
                          { label: 'Applications close', value: c.timeline.closesOn ? day(c.timeline.closesOn) : '—' },
                          { label: 'Awarded', value: c.timeline.awardedOn ? day(c.timeline.awardedOn) : 'Not yet' },
                          { label: 'Pilot budget', value: <span className="tnum">{money(c.pilot.budgetPaise)}</span> },
                        ]}
                      />
                      <section className="sheet-flat">
                        <h3 className="border-b border-ink px-4 py-2 text-label text-ink">
                          Change log visible to the authors
                        </h3>
                        <ol>
                          {c.changeLog.map((entry, i) => (
                            <li key={`${entry.at}-${i}`} className="ledger-row px-4 py-3">
                              <p className="text-micro text-ink-soft tnum">{dayTime(entry.at)}</p>
                              <p className="mt-0.5 text-body text-ink">{entry.summary}</p>
                              <p className="text-micro text-ink-soft">{entry.by}</p>
                            </li>
                          ))}
                          {c.coAuthors.length ? (
                            <li className="px-4 py-3 text-micro text-ink-soft">
                              Co-authors on this draft: {c.coAuthors.join(', ')}
                            </li>
                          ) : null}
                        </ol>
                      </section>
                      <p className="text-micro text-ink-soft">
                        Signed in as {session.data?.data.user?.name ?? 'an unknown user'}. Every change you make here is
                        attributed to you in the audit trail.
                      </p>
                    </div>
                  ) : null}
                </Tabs>
              </div>
            </CaseWorkspace>
          </div>
        );
      }}
    </QueryState>
  );
}
