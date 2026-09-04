import { useState } from 'react';
import { useTaxonomy } from '@/services/hooks';
import { gateSlaDays } from '@/config/gates';
import { citationShort } from '@/config/policies';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { BarLedger } from '@/components/charts/MeasurementChart';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Nav';
import { countOf, num } from '@/lib/format';

export default function AdminTaxonomy() {
  const query = useTaxonomy();
  const [tab, setTab] = useState('sectors');

  return (
    <div>
      <PageHeader
        title="Taxonomy"
        lead="The vocabulary the whole product shares: sectors, capabilities, geography, data tiers, procurement pathways, gates and stages. Change a term here and every screen that uses it changes with it."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState query={query} errorTitle="Unable to load the taxonomy." loading={<PanelSkeleton lines={10} />}>
        {(payload) => {
          const d = payload.data;
          return (
            <Tabs
              items={[
                { id: 'sectors', label: 'Sectors', count: d.sectors.length },
                { id: 'capabilities', label: 'Capabilities', count: d.capabilities.length },
                { id: 'geography', label: 'Geography', count: d.states.length },
                { id: 'tiers', label: 'Data tiers', count: d.dataTiers.length },
                { id: 'pathways', label: 'Pathways', count: d.pathways.length },
                { id: 'gates', label: 'Gates and stages', count: d.gates.length },
              ]}
              value={tab}
              onChange={setTab}
            >
              {tab === 'sectors' ? (
                <BarLedger
                  headingLevel={2}
                  title="Challenges by sector"
                  rows={d.sectors.map((s) => ({ label: s.name, value: s.challenges }))}
                />
              ) : null}

              {tab === 'capabilities' ? (
                <div className="flex flex-col gap-4">
                  <InlineNote tone="neutral" title="Capabilities drive matching, not eligibility">
                    A capability on a challenge is used to recommend startups and to explain a match. It never restricts
                    who may apply — that is what the eligibility rules are for.
                  </InlineNote>
                  <div className="sheet-flat">
                    <div className="field-label grid grid-cols-[1fr_auto_auto] gap-4 border-b-2 border-b-ink px-4 py-2">
                      <span>Capability</span>
                      <span className="text-right">Challenges</span>
                      <span className="text-right">Startups</span>
                    </div>
                    <ul>
                      {d.capabilities
                        .slice()
                        .sort((a, b) => b.startups - a.startups)
                        .map((c) => (
                          <li key={c.name} className="ledger-row grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2">
                            <span className="text-body text-ink">{c.name}</span>
                            <span className="text-right text-data text-ink tnum">{num(c.challenges)}</span>
                            <span className="text-right text-data text-ink tnum">{num(c.startups)}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {tab === 'geography' ? (
                <ul className="sheet-flat">
                  {d.states.map((s) => (
                    <li key={s.name} className="ledger-row px-4 py-3">
                      <p className="text-body text-ink">{s.name}</p>
                      <p className="mt-1 text-micro text-ink-soft">
                        {countOf(s.districts.length, 'district')} with a case on the programme: {s.districts.join(', ')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}

              {tab === 'tiers' ? (
                <div className="flex flex-col gap-4">
                  <InlineNote tone="hold" title="A tier is a decision, not a setting">
                    Each tier names who approves it, for what purpose, for how long and what is logged. Production access
                    always needs a joint approval with written reasons.
                  </InlineNote>
                  {d.dataTiers.map((t) => (
                    <KeyValueSheet
                      key={t.id}
                      title={`${t.label} tier`}
                      items={[
                        { label: 'Purpose', value: t.purpose },
                        { label: 'Approved by', value: t.approval },
                        { label: 'Duration', value: t.duration },
                        { label: 'Logging', value: t.logging },
                        {
                          label: 'Conditions',
                          value: (
                            <ul className="list-disc pl-5">
                              {t.conditions.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          ),
                        },
                        { label: 'Citation', value: citationShort(t.citation) },
                      ]}
                    />
                  ))}
                </div>
              ) : null}

              {tab === 'pathways' ? (
                <ul className="sheet-flat">
                  {d.pathways.map((p) => (
                    <li key={p.id} className="ledger-row px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 max-w-doc">
                          <p className="text-body text-ink">{p.label}</p>
                          <p className="mt-1 text-body text-ink-soft">{p.summary}</p>
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <p className="text-micro text-ink-soft">Suits when</p>
                              <ul className="mt-1 list-disc pl-5 text-micro text-ink">
                                {p.suitsWhen.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-micro text-ink-soft">Poor fit when</p>
                              <ul className="mt-1 list-disc pl-5 text-micro text-ink">
                                {p.poorFitWhen.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge tone="neutral">{citationShort(p.citation)}</Badge>
                          <p className="mt-2 text-micro text-ink-soft">{p.authority}</p>
                          <p className="text-micro text-ink-soft tnum">
                            {p.indicativeWeeks[0]}–{p.indicativeWeeks[1]} weeks
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {tab === 'gates' ? (
                <div className="flex flex-col gap-6">
                  <section>
                    <h2 className="mb-3 text-h2 text-ink">Gates</h2>
                    <ul className="sheet-flat">
                      {d.gates.map((g) => (
                        <li key={g.id} className="ledger-row px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 max-w-doc">
                              <p className="text-data text-ink">
                                {g.id} · {g.name}
                              </p>
                              <p className="mt-1 font-doc text-doc text-ink">{g.decides}</p>
                              <ul className="mt-2 list-disc pl-5 text-micro text-ink-soft">
                                {g.preconditions.map((p) => (
                                  <li key={p.key}>
                                    {p.label} — {citationShort(p.citation)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="shrink-0 text-right">
                              <Badge tone="neutral">{g.ownerRole.replace(/_/g, ' ')}</Badge>
                              <p className="mt-2 text-micro text-ink-soft tnum">
                                {gateSlaDays(g.id)} working days
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h2 className="mb-3 text-h2 text-ink">Stages</h2>
                    <ol className="sheet-flat">
                      {d.stages.map((s) => (
                        <li key={s.id} className="ledger-row flex gap-4 px-4 py-2">
                          <span aria-hidden className="w-8 text-data text-ink-soft tnum">
                            {s.id}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-body text-ink">{s.title}</span>
                            <span className="block text-micro text-ink-soft">{s.actor}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              ) : null}
            </Tabs>
          );
        }}
      </QueryState>
    </div>
  );
}
