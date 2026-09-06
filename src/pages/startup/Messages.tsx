import { Link } from 'react-router-dom';
import { policyNumber } from '@/config/policies';
import { useApplications, useNotifications, useMarkRead } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { TableSkeleton, EmptyState, InlineNote } from '@/components/ui/Feedback';
import { FigureCard, MarkClock, MarkCleared, MarkHold } from '@/components/ledger/FigureCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SlaClock } from '@/components/domain/SlaClock';
import { countOf, day, dayTime, num } from '@/lib/format';
import type { Notification } from '@/types/models';

/* ------------------------------------------------------------------ marks */

function Glyph({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

const MARK = {
  bell: 'M12 3.2a5.6 5.6 0 0 0-5.6 5.6v3.5L4.8 15.6h14.4l-1.6-3.3V8.8A5.6 5.6 0 0 0 12 3.2ZM9.9 18.4a2.1 2.1 0 0 0 4.2 0',
  ask: 'M4 5.5h16v10H9.5L5 19.2V15.5H4z',
  answer: 'M20 5.5H4v10h10.5l4.5 3.7V15.5H20z',
  megaphone: 'M4 10v4h3l8 4V6l-8 4H4ZM18 9.5a4 4 0 0 1 0 5',
} as const;

/** A section head, so the page reads as three registers rather than three lists. */
function SectionHead({
  id,
  eyebrow,
  title,
  lead,
  count,
  glyph,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  count: number;
  glyph: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sheet border border-rule bg-gradient-to-br from-verify-wash to-hold-wash text-verify shadow-sheet"
        >
          <Glyph d={glyph} size={20} />
        </span>
        <div className="min-w-0">
          <p className="field-label flex items-center gap-2 !text-saffron-ink">
            <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
            {eyebrow}
          </p>
          <h2 id={id} className="mt-1 font-display text-h2 text-ink">
            {title}
          </h2>
          {lead ? <p className="mt-1 max-w-doc text-body text-ink-soft">{lead}</p> : null}
        </div>
      </div>
      <span className="shrink-0 rounded-pill border border-rule bg-ledger px-3 py-1 text-micro text-ink-soft tnum">
        {num(count)}
      </span>
    </div>
  );
}

/** One alert. The rail carries whether it is yours to act on. */
function AlertRow({ n, onOpen, waiting }: { n: Notification; onOpen: () => void; waiting: boolean }) {
  return (
    <li className="ledger-row">
      <Link
        to={n.href}
        onClick={onOpen}
        className={[
          'flex flex-wrap items-start justify-between gap-4 border-l-2 px-5 py-4 no-underline hover:bg-ledger',
          waiting ? 'border-l-hold bg-hold-wash' : 'border-l-transparent',
        ].join(' ')}
      >
        <div className="min-w-0 max-w-doc">
          <span className="flex flex-wrap items-center gap-2">
            {waiting ? <Badge tone="hold">Waiting on you</Badge> : <Badge tone="neutral">Information</Badge>}
            {!n.read ? (
              <span className="rounded-pill border border-saffron bg-saffron-veil px-2 py-0.5 text-micro text-saffron-ink">
                New
              </span>
            ) : null}
            {n.caseId ? <span className="type-register text-micro text-ink-soft">{n.caseId}</span> : null}
          </span>
          <p className="mt-2 text-body font-medium text-ink">{n.title}</p>
          <p className="mt-0.5 text-body text-ink-soft">{n.detail}</p>
          <p className="mt-1.5 text-micro text-ink-soft tnum">{dayTime(n.at)}</p>
        </div>
        {n.dueOn ? (
          <div className="shrink-0">
            <SlaClock
              startedOn={n.at}
              limitDays={Math.max(1, Math.round((new Date(n.dueOn).getTime() - new Date(n.at).getTime()) / 86_400_000))}
            />
          </div>
        ) : null}
      </Link>
    </li>
  );
}

export default function StartupMessages() {
  const notifications = useNotifications();
  const applications = useApplications();
  const markRead = useMarkRead();
  const clarificationWindow = policyNumber('sla.clarification.days');

  const alerts = notifications.data?.data ?? [];
  const waitingCount = alerts.filter((n) => n.waitingOnYou).length;
  const rows = applications.data?.data ?? [];
  const questions = rows.flatMap((r) => r.application.clarifications);
  const openQuestions = questions.filter((q) => !q.answer).length;

  return (
    <div>
      <PageHeader
        eyebrow="Your inbox"
        title="Clarifications and alerts"
        lead="Everything the programme has told you, split by whether it needs something from you. Clarification answers are published on the challenge page, so every applicant reads the same thing at the same time."
        servedAt={notifications.data?.servedAt}
        onRefresh={() => void notifications.refetch()}
        aside={
          <Button size="sm" onClick={() => markRead.mutate({ all: true })}>
            Mark everything read
          </Button>
        }
      />

      {/* What is in the inbox, before a single row is read. */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FigureCard
          label="Waiting on you"
          value={num(waitingCount)}
          detail={waitingCount === 0 ? 'nothing needs an action' : 'each one carries its own deadline'}
          tone={waitingCount > 0 ? 'hold' : 'verify'}
          mark={MarkHold}
        />
        <FigureCard
          label="For information"
          value={num(alerts.length - waitingCount)}
          detail="no action needed"
          mark={MarkCleared}
        />
        <FigureCard
          label="Questions awaiting an answer"
          value={num(openQuestions)}
          detail={`within a ${num(clarificationWindow)}-day window`}
          tone={openQuestions > 0 ? 'hold' : 'verify'}
          mark={MarkClock}
        />
        <FigureCard
          label="Answered"
          value={num(questions.length - openQuestions)}
          detail="published to every applicant"
          tone="verify"
          mark={MarkCleared}
        />
      </div>

      <div className="flex flex-col gap-12">
        <QueryState
          query={notifications}
          errorTitle="Unable to load your alerts."
          loading={<TableSkeleton rows={5} columns={3} />}
        >
          {(payload) => {
            const waiting = payload.data.filter((n) => n.waitingOnYou);
            const info = payload.data.filter((n) => !n.waitingOnYou);

            return (
              <>
                <section aria-labelledby="waiting-heading">
                  <SectionHead
                    id="waiting-heading"
                    eyebrow="Yours to act on"
                    title="Waiting on you"
                    lead="Sorted by how close each one is to its deadline, oldest first."
                    count={waiting.length}
                    glyph={MARK.bell}
                  />
                  {waiting.length === 0 ? (
                    <EmptyState
                      title="Nothing needs your attention."
                      body="Anything that needs an action from you appears here first, with the deadline in words."
                      action={{ label: 'Open your dashboard', to: '/s' }}
                    />
                  ) : (
                    <ul className="sheet-flat overflow-hidden">
                      {waiting.map((n) => (
                        <AlertRow key={n.id} n={n} waiting onOpen={() => markRead.mutate({ ids: [n.id] })} />
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="info-heading">
                  <SectionHead
                    id="info-heading"
                    eyebrow="Nothing to do"
                    title="For information"
                    count={info.length}
                    glyph={MARK.megaphone}
                  />
                  {info.length === 0 ? (
                    <EmptyState
                      title="Nothing to report."
                      body="Programme updates that do not need an action appear here."
                    />
                  ) : (
                    <ul className="sheet-flat overflow-hidden">
                      {info.map((n) => (
                        <AlertRow key={n.id} n={n} waiting={false} onOpen={() => markRead.mutate({ ids: [n.id] })} />
                      ))}
                    </ul>
                  )}
                </section>
              </>
            );
          }}
        </QueryState>

        <section aria-labelledby="clarifications-heading">
          <SectionHead
            id="clarifications-heading"
            eyebrow="On the record"
            title="Clarifications on your applications"
            lead={`Answered publicly on the challenge page within ${clarificationWindow} calendar days, so no applicant gets an answer the others do not have.`}
            count={questions.length}
            glyph={MARK.ask}
          />

          <QueryState
            query={applications}
            errorTitle="Unable to load your applications."
            loading={<TableSkeleton rows={3} columns={2} />}
            isEmpty={(d) => d.data.length === 0}
            empty={{
              title: 'You have no applications yet.',
              body: 'Clarifications appear here once you have applied to something.',
              action: { label: 'See your matches', to: '/s/matches' },
            }}
          >
            {(payload) => {
              const withQuestions = payload.data.filter((r) => r.application.clarifications.length > 0);
              if (withQuestions.length === 0) {
                return (
                  <InlineNote tone="neutral" title="You have not asked anything yet">
                    Questions go on the challenge page, and the department answers within the configured window. Every
                    answer is published to all applicants, including the ones who did not ask.
                  </InlineNote>
                );
              }

              return (
                <div className="flex flex-col gap-6">
                  {withQuestions.map((r) => (
                    <article key={r.application.id} className="sheet-flat overflow-hidden">
                      {/* Which case the exchange belongs to. */}
                      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule bg-ledger px-5 py-3">
                        <div className="min-w-0">
                          <p className="type-register text-micro text-ink-soft">{r.challenge.caseId}</p>
                          <p className="mt-0.5 font-display text-h3 text-ink">{r.challenge.title}</p>
                        </div>
                        <span className="shrink-0 text-micro text-ink-soft">
                          {countOf(r.application.clarifications.length, 'question')}
                        </span>
                      </header>

                      <ul className="flex flex-col gap-6 px-5 py-5">
                        {r.application.clarifications.map((q) => (
                          <li key={q.id}>
                            {/*
                              An exchange, drawn as one: your question on the
                              left in carbon, the department's answer set in
                              from the right in the ink it was written in. Two
                              stacked paragraphs did not read as a conversation,
                              and this page is a conversation.
                            */}
                            <div className="flex gap-3">
                              <span
                                aria-hidden
                                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-rule bg-sheet text-ink-soft"
                              >
                                <Glyph d={MARK.ask} size={15} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="field-label">You asked · {day(q.askedOn)}</p>
                                <p className="mt-1.5 rounded-sheet rounded-tl-none border border-rule bg-ledger px-4 py-3 font-doc text-doc text-ink">
                                  {q.question}
                                </p>
                              </div>
                            </div>

                            {q.answer ? (
                              <div className="mt-4 flex gap-3 md:pl-11">
                                <span
                                  aria-hidden
                                  className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-verify bg-verify-wash text-verify"
                                >
                                  <Glyph d={MARK.answer} size={15} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="field-label !text-verify">
                                    The department answered · {day(q.answeredOn)}
                                  </p>
                                  <p className="mt-1.5 rounded-sheet rounded-tl-none border border-verify bg-verify-wash px-4 py-3 font-doc text-doc text-ink">
                                    {q.answer}
                                  </p>
                                  <p className="mt-1.5 text-micro text-ink-soft">
                                    Published on the challenge page to every applicant.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 flex flex-wrap items-center gap-3 md:pl-11">
                                <Badge tone="hold">Awaiting an answer</Badge>
                                <SlaClock startedOn={q.askedOn} limitDays={clarificationWindow} showDetail />
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              );
            }}
          </QueryState>
        </section>
      </div>
    </div>
  );
}
