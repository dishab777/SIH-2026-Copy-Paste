import { Link } from 'react-router-dom';
import { policyNumber } from '@/config/policies';
import { useApplications, useNotifications, useMarkRead } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { TableSkeleton, EmptyState, InlineNote } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SlaClock } from '@/components/domain/SlaClock';
import { day, dayTime } from '@/lib/format';

export default function StartupMessages() {
  const notifications = useNotifications();
  const applications = useApplications();
  const markRead = useMarkRead();
  const clarificationWindow = policyNumber('sla.clarification.days');

  return (
    <div>
      <PageHeader
        title="Clarifications and alerts"
        lead="Everything the programme has told you, split by whether it needs something from you. Clarification answers are published on the challenge page so every applicant reads the same thing."
        servedAt={notifications.data?.servedAt}
        onRefresh={() => void notifications.refetch()}
        aside={
          <Button size="sm" onClick={() => markRead.mutate({ all: true })}>
            Mark everything read
          </Button>
        }
      />

      <div className="flex flex-col gap-8">
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
                  <h2 id="waiting-heading" className="mb-3 text-h2 text-ink">
                    Waiting on you
                  </h2>
                  {waiting.length === 0 ? (
                    <EmptyState
                      title="Nothing needs your attention."
                      body="Anything that needs an action from you appears here first, with the deadline in words."
                      action={{ label: 'Open your dashboard', to: '/s' }}
                    />
                  ) : (
                    <ul className="sheet-flat">
                      {waiting.map((n) => (
                        <li key={n.id} className="ledger-row">
                          <Link
                            to={n.href}
                            onClick={() => markRead.mutate({ ids: [n.id] })}
                            className="flex flex-wrap items-start justify-between gap-4 border-l-2 border-l-hold bg-hold-wash px-4 py-3 no-underline hover:bg-ledger"
                          >
                            <div className="min-w-0 max-w-doc">
                              <div className="flex items-center gap-2">
                                <Badge tone="hold">Waiting on you</Badge>
                                {!n.read ? <span className="text-micro text-ink-soft">new</span> : null}
                                {n.caseId ? <span className="type-register text-micro text-ink-soft">{n.caseId}</span> : null}
                              </div>
                              <p className="mt-1 text-body text-ink">{n.title}</p>
                              <p className="mt-0.5 text-body text-ink-soft">{n.detail}</p>
                              <p className="mt-1 text-micro text-ink-soft tnum">{dayTime(n.at)}</p>
                            </div>
                            {n.dueOn ? (
                              <div className="shrink-0">
                                <SlaClock
                                  startedOn={n.at}
                                  limitDays={Math.max(
                                    1,
                                    Math.round((new Date(n.dueOn).getTime() - new Date(n.at).getTime()) / 86_400_000),
                                  )}
                                />
                              </div>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="info-heading">
                  <h2 id="info-heading" className="mb-3 text-h2 text-ink">
                    For information
                  </h2>
                  {info.length === 0 ? (
                    <EmptyState title="Nothing to report." body="Programme updates that do not need an action appear here." />
                  ) : (
                    <ul className="sheet-flat">
                      {info.map((n) => (
                        <li key={n.id} className="ledger-row">
                          <Link
                            to={n.href}
                            onClick={() => markRead.mutate({ ids: [n.id] })}
                            className="flex flex-wrap items-start justify-between gap-4 px-4 py-3 no-underline hover:bg-ledger"
                          >
                            <div className="min-w-0 max-w-doc">
                              <div className="flex items-center gap-2">
                                <Badge tone="neutral">Information</Badge>
                                {!n.read ? <span className="text-micro text-ink-soft">new</span> : null}
                                {n.caseId ? <span className="type-register text-micro text-ink-soft">{n.caseId}</span> : null}
                              </div>
                              <p className="mt-1 text-body text-ink">{n.title}</p>
                              <p className="mt-0.5 text-body text-ink-soft">{n.detail}</p>
                              <p className="mt-1 text-micro text-ink-soft tnum">{dayTime(n.at)}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            );
          }}
        </QueryState>

        <section aria-labelledby="clarifications-heading">
          <h2 id="clarifications-heading" className="mb-1 text-h2 text-ink">
            Clarifications on your applications
          </h2>
          <p className="mb-3 max-w-doc text-body text-ink-soft">
            Questions are answered publicly on the challenge page, within {clarificationWindow} calendar days, so no
            applicant gets an answer the others do not have.
          </p>

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
                    answer is published to all applicants.
                  </InlineNote>
                );
              }
              return (
                <ul className="sheet-flat">
                  {withQuestions.map((r) =>
                    r.application.clarifications.map((q) => (
                      <li key={q.id} className="ledger-row px-4 py-4">
                        <p className="text-micro text-ink-soft tnum">
                          {r.challenge.caseId} · {r.challenge.title}
                        </p>
                        <p className="mt-1 font-doc text-doc text-ink">{q.question}</p>
                        <p className="mt-0.5 text-micro text-ink-soft">Asked {day(q.askedOn)}</p>
                        {q.answer ? (
                          <>
                            <p className="mt-3 border-l-2 border-l-verify bg-verify-wash px-3 py-2 font-doc text-doc text-ink">
                              {q.answer}
                            </p>
                            <p className="mt-1 text-micro text-ink-soft">Answered {day(q.answeredOn)}</p>
                          </>
                        ) : (
                          <div className="mt-2 flex items-center gap-3">
                            <Badge tone="hold">Awaiting an answer</Badge>
                            <SlaClock startedOn={q.askedOn} limitDays={clarificationWindow} showDetail />
                          </div>
                        )}
                      </li>
                    )),
                  )}
                </ul>
              );
            }}
          </QueryState>
        </section>
      </div>
    </div>
  );
}
