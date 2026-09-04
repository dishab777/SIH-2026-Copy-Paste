import { lazy, Suspense, useState } from 'react';
import { countOf, day, num, percent } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import type { Kpi } from '@/types/models';

/** Charts are loaded on demand so public routes stay under the JS budget. */
const Recharts = lazy(async () => {
  const mod = await import('recharts');
  return {
    default: function Chart({ kpi }: { kpi: Kpi }) {
      const { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip } = mod;
      const data = kpi.series.map((s) => ({ at: day(s.at), value: s.value, sample: s.sampleSize }));
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--rule)" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="at"
              tick={{ fill: 'var(--ink-soft)', fontSize: 11 }}
              stroke="var(--rule)"
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: 'var(--ink-soft)', fontSize: 11 }}
              stroke="var(--rule)"
              tickLine={false}
              width={48}
              label={{ value: kpi.unit, angle: -90, position: 'insideLeft', fill: 'var(--ink-soft)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                border: '1px solid var(--rule)',
                borderRadius: 3,
                fontSize: 13,
                color: 'var(--ink)',
                boxShadow: 'none',
              }}
              formatter={(v: number, _n, item) => [`${num(v, 1)} ${kpi.unit}`, `sample ${item.payload.sample}`]}
            />
            <ReferenceLine
              y={kpi.baseline}
              stroke="var(--ink-soft)"
              strokeDasharray="4 3"
              label={{ value: `Baseline ${kpi.baseline}`, fill: 'var(--ink-soft)', fontSize: 11, position: 'insideTopRight' }}
            />
            <ReferenceLine
              y={kpi.target}
              stroke="var(--verify)"
              label={{ value: `Target ${kpi.target}`, fill: 'var(--verify)', fontSize: 11, position: 'insideBottomRight' }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--ink)" strokeWidth={2} dot={{ r: 2, fill: 'var(--ink)' }} />
          </LineChart>
        </ResponsiveContainer>
      );
    },
  };
});

export function achievement(kpi: Kpi): number {
  const span = Math.abs(kpi.baseline - kpi.target) || 1;
  const gained = kpi.direction === 'decrease' ? kpi.baseline - kpi.current : kpi.current - kpi.baseline;
  return (gained / span) * 100;
}

export function kpiStatus(kpi: Kpi): 'Target achieved' | 'On track' | 'Behind target' {
  const a = achievement(kpi);
  if (a >= 100) return 'Target achieved';
  if (a >= 70) return 'On track';
  return 'Behind target';
}

export interface MeasurementChartProps {
  kpi: Kpi;
  method?: string;
  sampleNote?: string;
  confounders?: string[];
  /** Where this panel sits in the page outline. Pass 2 when it follows the h1 directly. */
  headingLevel?: 2 | 3;
}

/** Every chart carries a data-table alternative, on the same screen. */
export function MeasurementChart({ kpi, method, sampleNote, confounders, headingLevel = 3 }: MeasurementChartProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const a = achievement(kpi);

  return (
    <section className="sheet-flat">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink px-4 py-3">
        <div>
          <Heading className="text-h3 text-ink">{kpi.name}</Heading>
          <p className="mt-0.5 text-micro text-ink-soft">
            Measured {kpi.frequency.toLowerCase()} · {countOf(kpi.series.length, 'reading')}
          </p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Chart or table">
          <Button size="sm" tone={view === 'chart' ? 'primary' : 'secondary'} onClick={() => setView('chart')}>
            Chart
          </Button>
          <Button size="sm" tone={view === 'table' ? 'primary' : 'secondary'} onClick={() => setView('table')}>
            Data table
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 border-b border-rule md:grid-cols-4">
        {[
          { label: 'Baseline', value: `${num(kpi.baseline, 1)} ${kpi.unit}` },
          { label: 'Target', value: `${num(kpi.target, 1)} ${kpi.unit}` },
          { label: 'Current', value: `${num(kpi.current, 1)} ${kpi.unit}` },
          { label: 'Achievement', value: percent(a) },
        ].map((cell, i) => (
          <div key={cell.label} className={['px-4 py-3', i < 3 ? 'border-r border-rule' : ''].join(' ')}>
            <dt className="text-micro text-ink-soft">{cell.label}</dt>
            <dd className="mt-0.5 text-data text-ink tnum">{cell.value}</dd>
          </div>
        ))}
      </dl>

      <div className="px-4 py-4">
        {view === 'chart' ? (
          <Suspense fallback={<Skeleton className="h-[260px]" />}>
            <Recharts kpi={kpi} />
          </Suspense>
        ) : (
          <table className="w-full border-collapse text-data">
            <caption className="sr-only">Readings for {kpi.name}</caption>
            <thead>
              <tr className="rule-close">
                <th scope="col" className="border-b border-rule px-2 py-2 text-left text-label text-ink-soft">
                  Reading date
                </th>
                <th scope="col" className="border-b border-rule px-2 py-2 text-right text-label text-ink-soft">
                  Value ({kpi.unit})
                </th>
                <th scope="col" className="border-b border-rule px-2 py-2 text-right text-label text-ink-soft">
                  Sample size
                </th>
              </tr>
            </thead>
            <tbody>
              {kpi.series.map((s) => (
                <tr key={s.at} className="ledger-row">
                  <td className="px-2 py-2 text-ink">{day(s.at)}</td>
                  <td className="px-2 py-2 text-right text-ink tnum">{num(s.value, 1)}</td>
                  <td className="px-2 py-2 text-right text-ink tnum">{num(s.sampleSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-rule px-4 py-3">
        <p className="text-label text-ink-soft">Measurement method</p>
        <p className="mt-1 max-w-doc text-body text-ink">{method ?? kpi.method}</p>
        {sampleNote ? <p className="mt-2 text-micro text-ink-soft">{sampleNote}</p> : null}
        {confounders?.length ? (
          <>
            <p className="mt-3 text-label text-ink-soft">Confounders considered</p>
            <ul className="mt-1 list-disc pl-5 text-body text-ink">
              {confounders.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

/** Simple ruled bar chart with a table alternative, for programme analytics. */
export function BarLedger({
  title,
  rows,
  unit,
  max,
  headingLevel = 3,
}: {
  title: string;
  rows: { label: string; value: number; detail?: string }[];
  unit?: string;
  max?: number;
  /** Where this panel sits in the page outline. Pass 2 when it follows the h1 directly. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const [view, setView] = useState<'bars' | 'table'>('bars');
  const ceiling = max ?? Math.max(1, ...rows.map((r) => r.value));

  return (
    <section className="sheet-flat">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2">
        <Heading className="field-label !text-ink">{title}</Heading>
        <button
          type="button"
          onClick={() => setView((v) => (v === 'bars' ? 'table' : 'bars'))}
          className="text-micro text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          {view === 'bars' ? 'Show as a data table' : 'Show as bars'}
        </button>
      </div>
      {view === 'bars' ? (
        <ul>
          {rows.map((r) => (
            <li key={r.label} className="ledger-row px-4 py-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-body text-ink">{r.label}</span>
                <span className="text-data text-ink tnum">
                  {num(r.value, r.value % 1 === 0 ? 0 : 1)}
                  {unit ? ` ${unit}` : ''}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full bg-ledger">
                <div className="h-full bg-ink" style={{ width: `${(r.value / ceiling) * 100}%` }} />
              </div>
              {r.detail ? <p className="mt-1 text-micro text-ink-soft">{r.detail}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <table className="w-full border-collapse text-data">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-rule px-4 py-2 text-left text-label text-ink-soft">
                Item
              </th>
              <th scope="col" className="border-b border-rule px-4 py-2 text-right text-label text-ink-soft">
                Value{unit ? ` (${unit})` : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="ledger-row">
                <td className="px-4 py-2 text-ink">{r.label}</td>
                <td className="px-4 py-2 text-right text-ink tnum">{num(r.value, r.value % 1 === 0 ? 0 : 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
