import { useState } from 'react';
import { usePortalLink } from '@/lib/portal';
import { useTranslation } from 'react-i18next';
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
  { id: 'framing', labelKey: 'deptCases.workspace.tabs.framing' },
  { id: 'approvals', labelKey: 'deptCases.workspace.tabs.approvals' },
  { id: 'applicants', labelKey: 'deptCases.workspace.tabs.applicants' },
  { id: 'clarifications', labelKey: 'deptCases.workspace.tabs.clarifications' },
  { id: 'documents', labelKey: 'deptCases.workspace.tabs.documents' },
  { id: 'timeline', labelKey: 'deptCases.workspace.tabs.timeline' },
];

export default function ChallengeWorkspace() {
  const link = usePortalLink();
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useChallenge(id, 'case-file');
  const answer = useAnswerClarification();
  const session = useSession();
  const pushToast = useUi((s) => s.pushToast);
  const [tab, setTab] = useState('framing');
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const clarificationWindow = policyNumber('sla.clarification.days');

  return (
    <QueryState
      query={query}
      errorTitle={t('deptCases.workspace.errorTitle')}
      loading={<PanelSkeleton lines={10} />}
    >
      {(payload) => {
        const { challenge: c, department, owner, clarifications, gates, pilot } = payload.data;
        const openGate = gates.find((g) => g.status === 'open' || g.status === 'blocked');
        const unanswered = clarifications.filter((q) => !q.answer);
        const isPublic = ['open', 'closing_soon', 'closed', 'awarded'].includes(c.status);
        const agreement = TEMPLATES.find((tpl) => tpl.id === c.legal.templateId);

        return (
          <div>
            <div className="mb-4">
              <Breadcrumb
                items={[
                  { label: t('deptCases.breadcrumb.pipeline'), to: '/d/challenges' },
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
                          : t('deptCases.workspace.decideGate', {
                              number: openGate.gate.slice(1),
                              gate: GATES.find((g) => g.id === openGate.gate)?.name,
                            }),
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
                        label: t('deptCases.workspace.linkedPilot', { title: pilot.title }),
                        to: `/d/pilots/${pilot.id}`,
                        detail: pilot.status.replace(/_/g, ' '),
                      },
                    ]
                  : []),
                ...(isPublic
                  ? [
                      {
                        caseId: c.caseId,
                        label: t('deptCases.workspace.linkedPublicLabel'),
                        to: `/challenges/${c.slug}`,
                        detail: t('deptCases.workspace.linkedPublicDetail'),
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
                        {t('deptCases.workspace.openGate', { number: openGate.gate.slice(1) })}
                      </LinkButton>
                    ) : undefined
                  }
                  extra={[
                    {
                      label: t('deptCases.workspace.applicants'),
                      value: <span className="tnum">{c.applicantCount}</span>,
                    },
                  ]}
                />

                {c.blocked ? (
                  <InlineNote tone="seal" title={t('deptCases.workspace.blockedTitle', { gate: c.currentGate })}>
                    <p className="max-w-doc">{c.blocked.reason}</p>
                    <p className="mt-1 text-micro text-ink-soft">
                      {t('deptCases.workspace.blockedSince', { date: day(c.blocked.since) })}
                    </p>
                  </InlineNote>
                ) : null}

                {!isPublic ? (
                  <InlineNote tone="hold" title={t('deptCases.workspace.notPublicTitle')}>
                    {t('deptCases.workspace.notPublicBody')}
                  </InlineNote>
                ) : (
                  <InlineNote tone="verify" title={t('deptCases.workspace.publicTitle')}>
                    <p>{t('deptCases.workspace.publicBody')}</p>
                    <p className="mt-2">
                      <Link to={link(`/challenges/${c.slug}`)} className="underline underline-offset-2">
                        {t('deptCases.workspace.publicLink')}
                      </Link>
                    </p>
                  </InlineNote>
                )}

                <Tabs
                  items={TABS.map((item) => {
                    const entry = { id: item.id, label: t(item.labelKey) };
                    return item.id === 'clarifications' && unanswered.length
                      ? { ...entry, count: unanswered.length }
                      : item.id === 'applicants'
                        ? { ...entry, count: c.applicantCount }
                        : entry;
                  })}
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
                        {t('deptCases.workspace.approvals.lead')}
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
                                    {t('deptCases.workspace.approvals.owner', {
                                      role: def.ownerRole.replace(/_/g, ' '),
                                      citation: citationShort('PRAYOG-SOP-4'),
                                    })}
                                  </p>
                                  {g.status === 'cleared' ? (
                                    <p className="mt-2 max-w-doc font-doc text-doc text-ink">{g.reason}</p>
                                  ) : g.status === 'future' ? (
                                    <p className="mt-2 text-body text-ink-soft">
                                      {t('deptCases.workspace.approvals.notReached')}
                                    </p>
                                  ) : (
                                    <p className="mt-2 text-body text-ink">
                                      {t('deptCases.workspace.approvals.waiting', {
                                        role: def.ownerRole.replace(/_/g, ' '),
                                        count: g.dwellDays,
                                      })}
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
                                              t('deptCases.workspace.approvals.nudgeToast', {
                                                role: def.ownerRole.replace(/_/g, ' '),
                                              }),
                                              t('deptCases.workspace.approvals.nudgeToastDetail'),
                                            )
                                          }
                                        >
                                          {t('deptCases.workspace.approvals.nudge')}
                                        </Button>
                                        <Button size="sm" tone="primary" onClick={() => navigate(`/d/gates/${g.id}`)}>
                                          {t('deptCases.workspace.openTheGate')}
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
                          title={t('deptCases.workspace.applicantsEmptyTitle')}
                          body={
                            isPublic
                              ? t('deptCases.workspace.applicantsEmptyBodyPublic')
                              : t('deptCases.workspace.applicantsEmptyBodyDraft')
                          }
                          action={
                            isPublic
                              ? {
                                  label: t('deptCases.workspace.openScreening'),
                                  to: `/d/challenges/${c.id}/applications`,
                                }
                              : {
                                  label: t('deptCases.workspace.openTheGate'),
                                  to: openGate ? `/d/gates/${openGate.id}` : '/d/challenges',
                                }
                          }
                        />
                      ) : (
                        <div className="flex flex-col gap-4">
                          <KeyValueSheet
                            title={t('deptCases.workspace.pool.title')}
                            items={[
                              {
                                label: t('deptCases.workspace.pool.received'),
                                value: <span className="tnum">{c.applicantCount}</span>,
                              },
                              {
                                label: t('deptCases.workspace.pool.closes'),
                                value: c.timeline.closesOn ? day(c.timeline.closesOn) : t('deptCases.workspace.pool.closed'),
                              },
                              { label: t('deptCases.workspace.pool.rubric'), value: c.rubricId },
                              {
                                label: t('deptCases.workspace.pool.rules'),
                                value: t('deptCases.workspace.pool.rulesValue', {
                                  count: c.eligibility.ruleIds.length,
                                }),
                              },
                            ]}
                          />
                          <div className="flex flex-wrap gap-3">
                            <LinkButton tone="primary" to={`/d/challenges/${c.id}/applications`}>
                              {t('deptCases.workspace.openScreening')}
                            </LinkButton>
                            <LinkButton to={`/d/challenges/${c.id}/evaluation`}>
                              {t('deptCases.workspace.openEvaluation')}
                            </LinkButton>
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
