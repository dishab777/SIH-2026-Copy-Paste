import { Link, useParams } from 'react-router-dom';
import { useStartupProfile } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PanelSkeleton } from '@/components/ui/Feedback';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Nav';
import { day, num } from '@/lib/format';

export default function StartupPublicProfile() {
  const { id } = useParams();
  const query = useStartupProfile(id);

  return (
    <QueryState query={query} errorTitle="Unable to load this company." loading={<PanelSkeleton lines={8} />}>
      {(payload) => {
        const { startup: s, publicRecord } = payload.data;
        return (
          <div>
            <div className="mb-4">
              <Breadcrumb items={[{ label: 'Demand board', to: '/' }, { label: s.tradeName }]} />
            </div>

            <header className="mb-8 border-b border-ink pb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-doc">
                  <h1 className="text-h1 text-ink">{s.tradeName}</h1>
                  <p className="mt-1 text-body text-ink-soft">{s.legalName}</p>
                  <p className="mt-3 max-w-doc text-body text-ink">{s.summary}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge
                    status={s.dpiit.status}
                    label={
                      s.dpiit.status === 'recognised'
                        ? 'Recognised startup'
                        : s.dpiit.status === 'expired'
                          ? 'Recognition expired'
                          : s.dpiit.status === 'unverified'
                            ? 'Recognition unverified'
                            : 'Not a recognised startup'
                    }
                  />
                  <span className="text-micro text-ink-soft">
                    {s.city}, {s.state}
                  </span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <section>
                <h2 className="mb-3 text-h2 text-ink">Capabilities</h2>
                <ul className="flex flex-wrap gap-2">
                  {s.capabilities.map((c) => (
                    <li key={c}>
                      <Badge tone="neutral">{c}</Badge>
                    </li>
                  ))}
                </ul>
                {s.certifications.length ? (
                  <>
                    <h3 className="mb-2 mt-6 text-h3 text-ink">Certifications</h3>
                    <ul className="flex flex-wrap gap-2">
                      {s.certifications.map((c) => (
                        <li key={c}>
                          <Badge tone="verify">{c}</Badge>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <div className="mt-6">
                  <KeyValueSheet
                    title="Public entity details"
                    items={[
                      { label: 'Entity type', value: s.entityType.replace(/_/g, ' ') },
                      { label: 'Incorporated', value: day(s.incorporationDate) },
                      { label: 'Team size', value: <span className="tnum">{num(s.teamSize)}</span> },
                      { label: 'States served', value: s.statesServed.join(', ') },
                    ]}
                    footnote="Registration numbers, financial statements and bank details are not published. They are visible to a screening officer inside a case, and every access is logged."
                  />
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-h2 text-ink">Verified government deployment record</h2>
                {publicRecord.length === 0 ? (
                  <p className="text-body text-ink-soft">
                    No independently validated government deployment yet. Self-declared deployments are visible to a
                    screening officer but are not published here.
                  </p>
                ) : (
                  <ul className="sheet-flat">
                    {publicRecord.map(({ pilot, department, validation }) => (
                      <li key={pilot.id} className="ledger-row px-4 py-3">
                        <p className="text-body text-ink">{pilot.title}</p>
                        <p className="mt-0.5 text-micro text-ink-soft tnum">
                          {pilot.caseId} · {department.shortName}
                        </p>
                        {validation ? (
                          <>
                            <p className="mt-2 text-body text-ink">{validation.publishedSummary}</p>
                            <p className="mt-1 text-micro text-ink-soft">
                              Independently validated {day(validation.signedAt)}
                            </p>
                          </>
                        ) : null}
                        <Link
                          to="/results"
                          className="mt-2 inline-block text-micro text-ink-soft underline underline-offset-2 hover:text-ink"
                        >
                          See this on the results page
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="mb-2 mt-6 text-h3 text-ink">Declared deployments</h3>
                <ul className="sheet-flat">
                  {s.deployments.map((d) => (
                    <li key={d.id} className="ledger-row flex items-start justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block text-body text-ink">{d.client}</span>
                        <span className="block text-micro text-ink-soft">{d.summary}</span>
                        <span className="block text-micro text-ink-soft tnum">{d.year}</span>
                      </span>
                      <span className="shrink-0">
                        {d.validated ? <Badge tone="verify">Independently validated</Badge> : <Badge tone="neutral">Self-declared</Badge>}
                      </span>
                    </li>
                  ))}
                  {s.deployments.length === 0 ? (
                    <li className="px-4 py-3 text-body text-ink-soft">No deployments declared.</li>
                  ) : null}
                </ul>
              </section>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
