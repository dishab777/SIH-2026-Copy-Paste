import { useState } from 'react';
import { useAdminRules, useDeleteRule, useSaveRule, useTestRule } from '@/services/hooks';
import { citationShort } from '@/config/policies';
import { NON_RELAXABLE_CATEGORIES, RELAXABLE_CATEGORIES, type RuleCondition } from '@/config/rules';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote, EmptyState } from '@/components/ui/Feedback';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Field, Input, Select, Textarea, DateInput } from '@/components/ui/Field';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { countOf, day } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';
import { platformNowIso } from '@/config/clock';

export default function AdminRules() {
  const query = useAdminRules();
  const test = useTestRule();
  const saveRule = useSaveRule();
  const deprecate = useDeleteRule();
  const pushToast = useUi((s) => s.pushToast);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conditions, setConditions] = useState<RuleCondition[] | null>(null);
  const [logic, setLogic] = useState<'all' | 'any'>('all');
  const [saving, setSaving] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(platformNowIso().slice(0, 10));

  return (
    <div>
      <PageHeader
        title="Eligibility rules"
        lead="The rule engine, as data. Build a rule, test it against real profiles before saving, and see which live challenges reference it."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InlineNote tone="verify" title="What may be relaxed">
          <p className="max-w-doc">
            {RELAXABLE_CATEGORIES.join(' and ')}, for a recognised startup, under {citationShort('GFR-2017-173')}.
          </p>
        </InlineNote>
        <InlineNote tone="neutral" title="What is never relaxed">
          <p className="max-w-doc">{NON_RELAXABLE_CATEGORIES.join(', ')}. Relief is on the paperwork, not on the bar.</p>
        </InlineNote>
      </div>

      <QueryState query={query} errorTitle="Unable to load the rules." loading={<PanelSkeleton lines={10} />}>
        {(payload) => {
          const selected = payload.data.rules.find((r) => r.rule.id === selectedId);
          const workingConditions = conditions ?? selected?.rule.conditions ?? [];

          return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
              <div>
                <LedgerTable
                  caption="Eligibility rules"
                  exportName="prayog-eligibility-rules"
                  rows={payload.data.rules}
                  rowKey={(r) => r.rule.id}
                  rowTone={(r) => (r.rule.status === 'deprecated' ? 'neutral' : r.rule.relief === 'relaxable' ? 'verify' : undefined)}
                  onRowOpen={(r) => {
                    setSelectedId(r.rule.id);
                    setConditions(structuredClone(r.rule.conditions) as RuleCondition[]);
                    setLogic(r.rule.logic);
                  }}
                  columns={[
                    {
                      key: 'rule',
                      header: 'Rule',
                      width: '34%',
                      sortValue: (r) => r.rule.id,
                      filterValue: (r) => `${r.rule.id} ${r.rule.label}`,
                      render: (r) => (
                        <span>
                          <span className="block text-body text-ink">{r.rule.label}</span>
                          <span className="block text-micro text-ink-soft tnum">
                            {r.rule.id} · version {r.rule.version}
                          </span>
                          <span className="mt-1 block max-w-[54ch] text-micro text-ink-soft">{r.rule.explanation}</span>
                        </span>
                      ),
                    },
                    {
                      key: 'relief',
                      header: 'Relief',
                      sortValue: (r) => r.rule.relief,
                      filterValue: (r) => r.rule.relief,
                      render: (r) => (
                        <Badge tone={r.rule.relief === 'relaxable' ? 'verify' : 'neutral'}>
                          {r.rule.relief === 'relaxable' ? 'May be relaxed' : 'Not relaxed'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'onFail',
                      header: 'On failure',
                      sortValue: (r) => r.rule.onFail,
                      render: (r) => <StatusBadge status={r.rule.onFail} />,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      sortValue: (r) => r.rule.status,
                      render: (r) => (
                        <span className="flex flex-col items-start gap-1">
                          <Badge tone={r.rule.status === 'active' ? 'verify' : 'seal'}>{r.rule.status}</Badge>
                          {r.usedByChallenges.length > 0 ? (
                            <span className="text-micro text-ink-soft tnum">
                              in {countOf(r.usedByChallenges.length, 'challenge')}
                            </span>
                          ) : null}
                        </span>
                      ),
                    },
                    {
                      key: 'effective',
                      header: 'Effective from',
                      align: 'right',
                      sortValue: (r) => r.rule.effectiveFrom,
                      render: (r) => day(r.rule.effectiveFrom),
                    },
                    {
                      key: 'citation',
                      header: 'Citation',
                      optional: true,
                      filterValue: (r) => r.rule.citation,
                      render: (r) => citationShort(r.rule.citation),
                    },
                  ]}
                />
              </div>

              <aside className="lg:sticky lg:top-20 lg:self-start">
                {!selected ? (
                  <EmptyState
                    title="Open a rule to edit or test it."
                    body="Rules are versioned. Editing one creates a new version with a change note and an effective date; nothing is silently rewritten."
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="sheet-flat">
                      <div className="border-b border-ink px-4 py-3">
                        <p className="text-micro text-ink-soft tnum">
                          {selected.rule.id} · version {selected.rule.version}
                        </p>
                        <h2 className="mt-0.5 text-h3 text-ink">{selected.rule.label}</h2>
                        <p className="mt-1 text-micro text-ink-soft">
                          {citationShort(selected.rule.citation)} · effective {day(selected.rule.effectiveFrom)}
                        </p>
                      </div>

                      {selected.rule.status === 'deprecated' ? (
                        <div className="px-4 py-3">
                          <InlineNote tone="seal" title="Deprecated">
                            {selected.rule.deprecatedNote}
                          </InlineNote>
                        </div>
                      ) : null}

                      {/* Visual condition builder. */}
                      <div className="px-4 py-4">
                        <div className="mb-3 flex items-center gap-3">
                          <span className="text-label text-ink">This rule passes when</span>
                          <Select
                            value={logic}
                            onChange={(e) => setLogic(e.target.value as 'all' | 'any')}
                            options={[
                              { value: 'all', label: 'all conditions hold' },
                              { value: 'any', label: 'any condition holds' },
                            ]}
                          />
                        </div>

                        <ul className="flex flex-col gap-3">
                          {workingConditions.map((cond, i) => (
                            <li key={i} className="border-l-2 border-l-rule bg-ledger px-3 py-2">
                              <div className="flex flex-col gap-2">
                                <Select
                                  aria-label="Field"
                                  value={cond.field}
                                  onChange={(e) =>
                                    setConditions((c) =>
                                      (c ?? workingConditions).map((x, j) =>
                                        j === i ? { ...x, field: e.target.value as RuleCondition['field'] } : x,
                                      ),
                                    )
                                  }
                                  options={payload.data.fields.map((f) => ({ value: f.value, label: f.label }))}
                                />
                                <div className="flex gap-2">
                                  <Select
                                    aria-label="Operator"
                                    value={cond.operator}
                                    onChange={(e) =>
                                      setConditions((c) =>
                                        (c ?? workingConditions).map((x, j) =>
                                          j === i ? { ...x, operator: e.target.value as RuleCondition['operator'] } : x,
                                        ),
                                      )
                                    }
                                    options={payload.data.operators.map((o) => ({ value: o.value, label: o.label }))}
                                  />
                                  <Input
                                    aria-label="Value"
                                    value={String(cond.value ?? '')}
                                    placeholder="value"
                                    onChange={(e) =>
                                      setConditions((c) =>
                                        (c ?? workingConditions).map((x, j) =>
                                          j === i ? { ...x, value: e.target.value } : x,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <Button
                                    size="sm"
                                    tone="quiet"
                                    onClick={() =>
                                      setConditions((c) => (c ?? workingConditions).filter((_, j) => j !== i))
                                    }
                                  >
                                    Remove this condition
                                  </Button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              setConditions((c) => [
                                ...(c ?? workingConditions),
                                { field: 'entity.turnoverCrore', operator: 'gte', value: 1 },
                              ])
                            }
                          >
                            Add a condition
                          </Button>
                          <Button
                            size="sm"
                            tone="primary"
                            loading={test.isPending}
                            loadingLabel="Testing"
                            onClick={() =>
                              test.mutate({ id: selected.rule.id, conditions: workingConditions, logic })
                            }
                          >
                            Test against seeded startups
                          </Button>
                        </div>
                      </div>
                    </div>

                    {test.data ? (
                      <div className="sheet-flat">
                        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink px-4 py-2">
                          <h3 className="text-label text-ink">Live test</h3>
                          <span className="text-micro text-ink-soft tnum">
                            {test.data.data.summary.pass} pass · {test.data.data.summary.fail} fail ·{' '}
                            {test.data.data.summary.review} review
                          </span>
                        </div>
                        <ul className="max-h-[320px] overflow-auto scroll-quiet">
                          {test.data.data.results.map((r) => (
                            <li key={r.startupId} className="ledger-row px-4 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="block text-body text-ink">{r.name}</span>
                                  <span className="block text-micro text-ink-soft">recognition: {r.dpiit}</span>
                                  {r.failedConditions.length > 0 ? (
                                    <span className="mt-0.5 block text-micro text-ink-soft">
                                      failed: {r.failedConditions.join('; ')}
                                    </span>
                                  ) : null}
                                </span>
                                <StatusBadge status={r.result} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {selected.usedByChallenges.length > 0 ? (
                      <InlineNote tone="hold" title={`In use by ${countOf(selected.usedByChallenges.length, 'challenge')}`}>
                        <p className="max-w-doc">
                          {selected.usedByChallenges.slice(0, 6).join(', ')}
                          {selected.usedByChallenges.length > 6 ? '…' : ''}. Changing this rule takes effect for cases
                          decided after the effective date. It cannot be deleted while any challenge references it.
                        </p>
                      </InlineNote>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button tone="primary" onClick={() => setSaving(true)}>
                        Save as a new version
                      </Button>
                      <Button
                        tone="destructive"
                        loading={deprecate.isPending}
                        loadingLabel="Deprecating"
                        onClick={() =>
                          deprecate.mutate(selected.rule.id, {
                            onSuccess: () => pushToast('hold', 'Rule deprecated. Existing challenges keep working.'),
                            onError: (err) => {
                              const api = err instanceof PrayogApiError ? err : null;
                              pushToast(
                                'seal',
                                api?.message ?? 'The rule was not deleted.',
                                api?.details.join(' '),
                              );
                            },
                          })
                        }
                      >
                        Deprecate this rule
                      </Button>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          );
        }}
      </QueryState>

      <Modal
        open={saving}
        onClose={() => setSaving(false)}
        title="Save a new version of this rule"
        description="Rules are versioned. The previous version stays on the record and keeps applying to cases already decided."
        footer={
          <>
            <Button onClick={() => setSaving(false)}>Cancel</Button>
            <Button
              tone="primary"
              loading={saveRule.isPending}
              loadingLabel="Saving"
              unavailableReason={
                !effectiveFrom
                  ? 'Set the date this takes effect.'
                  : changeNote.trim().length < 15
                    ? `Write ${15 - changeNote.trim().length} more characters explaining the change.`
                    : undefined
              }
              onClick={() =>
                selectedId &&
                saveRule.mutate(
                  { id: selectedId, changeNote, effectiveFrom, conditions: conditions ?? undefined, logic },
                  {
                    onSuccess: (res) => {
                      setSaving(false);
                      pushToast('verify', res.message ?? 'Rule saved.');
                    },
                    onError: (err) => {
                      const api = err instanceof PrayogApiError ? err : null;
                      pushToast('seal', api?.message ?? 'The rule was not saved.', api?.details.join(' '));
                    },
                  },
                )
              }
            >
              Save the new version
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Effective from" required hint="Cases decided before this date use the previous version.">
            {({ id }) => <DateInput id={id} value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />}
          </Field>
          <Field
            label="Change note"
            required
            hint="At least 15 characters. It travels with the version and is read by anyone auditing a screening decision."
            aside={`${changeNote.trim().length} / 15`}
          >
            {({ id }) => <Textarea id={id} rows={4} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />}
          </Field>
          <InlineNote tone="hold" title="Impact">
            Live challenges that reference this rule will be screened against the new version from the effective date.
            Applicants already screened keep their result, and the audit trail records which version was used.
          </InlineNote>
        </div>
      </Modal>
    </div>
  );
}
