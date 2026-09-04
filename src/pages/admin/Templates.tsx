import { useState } from 'react';
import { useAdminTemplates } from '@/services/hooks';
import { citationShort } from '@/config/policies';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Nav';
import { Modal } from '@/components/ui/Overlay';
import { ClauseReader } from '@/components/domain/Legal';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { day, num } from '@/lib/format';
import type { ClauseDefinition, TemplateDefinition } from '@/config/templates';

export default function AdminTemplates() {
  const query = useAdminTemplates();
  const [tab, setTab] = useState('templates');
  const [openTemplate, setOpenTemplate] = useState<TemplateDefinition | null>(null);
  const [openClause, setOpenClause] = useState<ClauseDefinition | null>(null);

  return (
    <div>
      <PageHeader
        title="Templates and clauses"
        lead="The documents the programme runs on, and the clause library behind them. Legal text lives here in its authoritative form — it is never written into a screen and never machine-translated."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState query={query} errorTitle="Unable to load the library." loading={<PanelSkeleton lines={10} />}>
        {(payload) => (
          <Tabs
            items={[
              { id: 'templates', label: 'Templates', count: payload.data.templates.length },
              { id: 'clauses', label: 'Clauses', count: payload.data.clauses.length },
            ]}
            value={tab}
            onChange={setTab}
          >
            {tab === 'templates' ? (
              <LedgerTable
                caption="Template library"
                exportName="prayog-templates"
                rows={payload.data.templates}
                rowKey={(t) => t.id}
                onRowOpen={(t) => setOpenTemplate(t)}
                columns={[
                  {
                    key: 'template',
                    header: 'Template',
                    width: '30%',
                    sortValue: (t) => t.label,
                    filterValue: (t) => `${t.label} ${t.id}`,
                    render: (t) => (
                      <span>
                        <span className="block text-body text-ink">{t.label}</span>
                        <span className="block text-micro text-ink-soft tnum">{t.id}</span>
                        <span className="mt-1 block max-w-[54ch] text-micro text-ink-soft">{t.summary}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'version',
                    header: 'Version',
                    sortValue: (t) => t.version,
                    filterValue: (t) => t.version,
                    render: (t) => <Badge tone="neutral">{t.version}</Badge>,
                  },
                  {
                    key: 'effective',
                    header: 'Effective from',
                    align: 'right',
                    sortValue: (t) => t.effectiveFrom,
                    render: (t) => day(t.effectiveFrom),
                  },
                  {
                    key: 'updated',
                    header: 'Last updated',
                    align: 'right',
                    sortValue: (t) => t.updatedOn,
                    render: (t) => day(t.updatedOn),
                  },
                  {
                    key: 'owner',
                    header: 'Owner',
                    filterValue: (t) => t.owner,
                    render: (t) => t.owner,
                  },
                  {
                    key: 'usage',
                    header: 'Used by',
                    align: 'right',
                    sortValue: (t) => t.usageCount,
                    render: (t) => <span className="tnum">{num(t.usageCount)} cases</span>,
                  },
                  {
                    key: 'format',
                    header: 'Format',
                    optional: true,
                    filterValue: (t) => t.format,
                    render: (t) => t.format,
                  },
                ]}
              />
            ) : null}

            {tab === 'clauses' ? (
              <div className="flex flex-col gap-4">
                <InlineNote tone="neutral" title="Deviation levels">
                  A default clause needs no approval. A minor deviation is recorded on the contract. A material deviation
                  needs the approval level named against the clause, with written reasons.
                </InlineNote>

                <LedgerTable
                  caption="Clause library"
                  exportName="prayog-clauses"
                  rows={payload.data.clauses}
                  rowKey={(c) => c.id}
                  rowTone={(c) => (c.deviation === 'material' ? 'seal' : c.deviation === 'minor' ? 'hold' : undefined)}
                  onRowOpen={(c) => setOpenClause(c)}
                  columns={[
                    {
                      key: 'clause',
                      header: 'Clause',
                      width: '32%',
                      sortValue: (c) => c.number,
                      filterValue: (c) => `${c.number} ${c.title}`,
                      render: (c) => (
                        <span>
                          <span className="block text-body text-ink">
                            <span className="mr-2 text-ink-soft tnum">{c.number}</span>
                            {c.title}
                          </span>
                          <span className="block text-micro text-ink-soft tnum">{c.id}</span>
                        </span>
                      ),
                    },
                    {
                      key: 'position',
                      header: 'Plain-language position',
                      width: '34%',
                      filterValue: (c) => c.position,
                      render: (c) => <span className="text-body text-ink">{c.position}</span>,
                    },
                    {
                      key: 'deviation',
                      header: 'Deviation level',
                      sortValue: (c) => c.deviation,
                      filterValue: (c) => c.deviation,
                      render: (c) => (
                        <Badge tone={c.deviation === 'material' ? 'seal' : c.deviation === 'minor' ? 'hold' : 'verify'}>
                          {c.deviation}
                        </Badge>
                      ),
                    },
                    {
                      key: 'approval',
                      header: 'Approval level',
                      width: '20%',
                      filterValue: (c) => c.approvalLevel,
                      render: (c) => <span className="text-micro text-ink">{c.approvalLevel}</span>,
                    },
                    {
                      key: 'citation',
                      header: 'Citation',
                      optional: true,
                      filterValue: (c) => c.citation,
                      render: (c) => citationShort(c.citation),
                    },
                  ]}
                />
              </div>
            ) : null}
          </Tabs>
        )}
      </QueryState>

      <Modal
        open={Boolean(openTemplate)}
        onClose={() => setOpenTemplate(null)}
        title={openTemplate ? `${openTemplate.label} ${openTemplate.version}` : ''}
        description={openTemplate?.summary}
        width="lg"
        footer={<Button onClick={() => setOpenTemplate(null)}>Close</Button>}
      >
        {openTemplate ? (
          <div className="flex flex-col gap-6">
            <KeyValueSheet
              items={[
                { label: 'Owner', value: openTemplate.owner },
                { label: 'Effective from', value: day(openTemplate.effectiveFrom) },
                { label: 'Last updated', value: day(openTemplate.updatedOn) },
                { label: 'Format', value: openTemplate.format },
                { label: 'Used by', value: `${num(openTemplate.usageCount)} cases` },
              ]}
            />

            <div className="border-l-2 border-l-rule bg-ledger px-3 py-2">
              <p className="text-label text-ink">Change diff for this version</p>
              <p className="mt-1 max-w-doc text-body text-ink">{openTemplate.changeDiff}</p>
            </div>

            {openTemplate.previewSections.map((s) => (
              <section key={s.heading}>
                <h3 className="text-h3 text-ink">{s.heading}</h3>
                <p className="mt-1 max-w-doc font-doc text-doc text-ink">{s.body}</p>
              </section>
            ))}

            {openTemplate.clauses?.length ? (
              <section>
                <h3 className="mb-3 text-h3 text-ink">Clauses in this template</h3>
                <ClauseReader clauseIds={openTemplate.clauses} withIndex={false} />
              </section>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(openClause)}
        onClose={() => setOpenClause(null)}
        title={openClause ? `${openClause.number} ${openClause.title}` : ''}
        width="lg"
        footer={<Button onClick={() => setOpenClause(null)}>Close</Button>}
      >
        {openClause ? <ClauseReader clauseIds={[openClause.id]} withIndex={false} /> : null}
      </Modal>
    </div>
  );
}
