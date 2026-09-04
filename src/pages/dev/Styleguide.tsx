import { useState } from 'react';
import { CONFIG_PARAMETERS } from '@/config/policies';
import { RUBRICS } from '@/config/rubrics';
import { DATA_TIERS } from '@/config/templates';
import { PageHeader } from '@/components/layout/Shell';
import { Button, IconButton, LinkButton, Spinner } from '@/components/ui/Button';
import {
  Checkbox,
  Combobox,
  DateInput,
  DateRangePicker,
  Field,
  FileDrop,
  Input,
  MoneyInput,
  MultiSelectTags,
  NumberInput,
  RadioGroup,
  Select,
  Slider,
  Switch,
  Textarea,
} from '@/components/ui/Field';
import { Badge, StatusBadge, statusTone } from '@/components/ui/Badge';
import { Modal, Popover, Sheet, Tooltip } from '@/components/ui/Overlay';
import { Accordion, Breadcrumb, Pagination, Tabs } from '@/components/ui/Nav';
import {
  EmptyState,
  ErrorState,
  InlineNote,
  PanelSkeleton,
  ProgressRing,
  Skeleton,
  StatSkeleton,
  TableSkeleton,
} from '@/components/ui/Feedback';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { ComparisonMatrix, DataRow, KeyValueSheet, StatLedger } from '@/components/ledger/Ledger';
import { FileCover } from '@/components/domain/FileCover';
import { GateLadder, GateSummary } from '@/components/domain/GateLadder';
import { SealStamp, Watermark } from '@/components/domain/SealStamp';
import { PaymentAgeingBar, SlaClock } from '@/components/domain/SlaClock';
import { EvidenceVault, MilestoneTimeline } from '@/components/domain/Milestones';
import { AuditTrail, IncidentLog, RiskRegister } from '@/components/domain/RiskIncident';
import { EligibilityChecklist, RelaxationNotice } from '@/components/domain/Eligibility';
import { ClauseReader, DataTierBadge, DataTierSelector, IpPositionCard } from '@/components/domain/Legal';
import { RubricScorer } from '@/components/domain/RubricScorer';
import { MeasurementChart, BarLedger } from '@/components/charts/MeasurementChart';
import { ApprovalBar, PermissionGate } from '@/components/patterns/ApprovalBar';
import { EvidenceDock } from '@/components/domain/EvidenceDock';
import { money } from '@/lib/format';
import type { Evidence, GateRecord, Incident, Milestone, Risk } from '@/types/models';

const NOW = new Date('2026-09-03T10:42:00+05:30');
const iso = (daysAgo: number): string => new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-b border-rule py-8 last:border-b-0">
      <h2 className="text-h2 text-ink">{title}</h2>
      {note ? <p className="mt-1 max-w-doc text-body text-ink-soft">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-rule py-3 last:border-b-0">
      <span className="w-[140px] shrink-0 text-label text-ink-soft">{label}</span>
      <span className="flex flex-wrap items-center gap-3">{children}</span>
    </div>
  );
}

const SAMPLE_GATES: GateRecord[] = [
  { id: 'g0', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', gate: 'G0', status: 'cleared', ownerId: 'u1', enteredOn: iso(185), decidedOn: iso(171), decision: 'clear', reason: 'Cleared.', preconditions: [], dwellDays: 14 },
  { id: 'g1', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', gate: 'G1', status: 'cleared', ownerId: 'u2', enteredOn: iso(171), decidedOn: iso(163), decision: 'clear', reason: 'Cleared.', preconditions: [], dwellDays: 8 },
  { id: 'g2', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', gate: 'G2', status: 'blocked', ownerId: 'u1', enteredOn: iso(40), preconditions: [], dwellDays: 34 },
  { id: 'g3', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', gate: 'G3', status: 'future', ownerId: 'u3', enteredOn: iso(0), preconditions: [], dwellDays: 0 },
  { id: 'g4', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', gate: 'G4', status: 'future', ownerId: 'u1', enteredOn: iso(0), preconditions: [], dwellDays: 0 },
  { id: 'g5', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', gate: 'G5', status: 'future', ownerId: 'u4', enteredOn: iso(0), preconditions: [], dwellDays: 0 },
  { id: 'g6', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', gate: 'G6', status: 'future', ownerId: 'u3', enteredOn: iso(0), preconditions: [], dwellDays: 0 },
];

const SAMPLE_MILESTONES: Milestone[] = [
  { id: 'm1', caseId: 'PL-2026-0031/M1', pilotId: 'p', index: 1, name: 'Deployment complete', requirement: '', acceptanceTest: 'Live readings from 95 percent of points for seven days.', evidenceRequired: ['Installation report'], paymentPaise: 52500000, dueOn: iso(60), status: 'paid', evidenceIds: [] },
  { id: 'm2', caseId: 'PL-2026-0031/M2', pilotId: 'p', index: 2, name: 'Measurement window one closed', requirement: '', acceptanceTest: 'Dataset with under 5 percent missing readings.', evidenceRequired: ['Measurement dataset'], paymentPaise: 52500000, dueOn: iso(30), status: 'approved', acceptanceFinding: 'met', evidenceIds: [] },
  { id: 'm3', caseId: 'PL-2026-0031/M3', pilotId: 'p', index: 3, name: 'Handover and training complete', requirement: '', acceptanceTest: 'Two staff complete the procedure unaided.', evidenceRequired: ['Handover note'], paymentPaise: 45000000, dueOn: iso(-5), status: 'under_review', evidenceIds: [] },
];

const SAMPLE_EVIDENCE: Evidence[] = [
  { id: 'e1', pilotId: 'p', milestoneId: 'm1', fileName: 'installation-report-aquasense.pdf', type: 'Installation report', sizeBytes: 2_400_000, uploadedBy: 'AquaSense', uploadedAt: iso(62), hash: 'a1b2c3d4e5f60718', scan: 'clean', verifiedBy: 'R. Bhat', verifiedAt: iso(57), verification: 'verified', version: 1, access: 'restricted' },
  { id: 'e2', pilotId: 'p', milestoneId: 'm3', fileName: 'handover-note.pdf', type: 'Handover note', sizeBytes: 840_000, uploadedBy: 'AquaSense', uploadedAt: iso(14), hash: '9f8e7d6c5b4a3928', scan: 'pending', verification: 'pending', version: 1, access: 'restricted' },
  { id: 'e3', pilotId: 'p', milestoneId: 'm2', fileName: 'measurement-dataset.csv', type: 'Measurement dataset', sizeBytes: 12_400_000, uploadedBy: 'AquaSense', uploadedAt: iso(36), hash: '1122334455667788', scan: 'failed', verification: 'failed', version: 2, access: 'restricted' },
];

const SAMPLE_RISKS: Risk[] = [
  { id: 'r1', pilotId: 'p', title: 'Monsoon restricts site access during the measurement window', category: 'delivery', probability: 4, impact: 4, mitigation: 'Window extended by three weeks under a change request.', ownerId: 'u1', status: 'mitigating', reviewedOn: iso(6) },
  { id: 'r2', pilotId: 'p', title: 'Field staff do not adopt the mobile workflow', category: 'adoption', probability: 2, impact: 3, mitigation: 'Two training rounds per depot; paper fallback for four weeks.', ownerId: 'u1', status: 'open', reviewedOn: iso(12) },
  { id: 'r3', pilotId: 'p', title: 'Sub-processor added without prior written approval', category: 'security', probability: 1, impact: 5, mitigation: 'Register reviewed fortnightly.', ownerId: 'u1', status: 'closed', reviewedOn: iso(30) },
];

const SAMPLE_INCIDENTS: Incident[] = [
  { id: 'i1', pilotId: 'p', title: 'Masked extract query returned more rows than the agreed field list permits', severity: 'medium', detectedAt: iso(61), ownerId: 'u1', resolutionDeadline: iso(54), status: 'resolved', resolution: 'Sandbox view narrowed at the database level.', resolvedAt: iso(58), evidenceIds: [] },
  { id: 'i2', pilotId: 'p', title: 'Sandbox credential shared outside the named engineering team', severity: 'high', detectedAt: iso(3), ownerId: 'u1', resolutionDeadline: iso(1), status: 'open', evidenceIds: [] },
];

const ALL_STATUSES = [
  'draft', 'in_review', 'open', 'closing_soon', 'closed', 'awarded', 'cancelled',
  'submitted', 'screening', 'eligible', 'ineligible', 'needs_review', 'shortlisted', 'under_evaluation', 'not_selected',
  'not_started', 'in_progress', 'under_review', 'approved', 'rejected', 'revision_required', 'paid',
  'contracting', 'executing', 'awaiting_validation', 'validated', 'not_validated', 'closed_after_pilot', 'scaled',
  'raised', 'in_approval', 'on_hold',
  'auto_pass', 'auto_fail', 'not_run', 'pass', 'fail', 'review',
  'cleared', 'blocked', 'future',
  'verified', 'pending', 'failed', 'clean',
  'validated_with_qualifications', 'met', 'partially_met', 'not_met',
  'recognised', 'expired', 'unverified', 'not_a_startup', 'active', 'suspended',
  'mock_healthy', 'mock_degraded', 'mock_down', 'not_configured',
  'mitigating', 'contained', 'resolved', 'low', 'medium', 'high',
];

export default function Styleguide() {
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState('one');
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [money1, setMoney1] = useState(1_500_000_00);
  const [combo, setCombo] = useState('');
  const [tags, setTags] = useState<string[]>(['IoT sensors']);
  const [radio, setRadio] = useState('a');
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(true);
  const [slider, setSlider] = useState(60);
  const [range, setRange] = useState({ from: '2026-06-01', to: '2026-09-01' });
  const [tier, setTier] = useState<'synthetic' | 'masked' | 'production'>('masked');

  const kpi = {
    id: 'k1',
    pilotId: 'p',
    name: 'Average leak detection time',
    unit: 'minutes',
    kind: 'time' as const,
    baseline: 180,
    target: 120,
    current: 113.4,
    direction: 'decrease' as const,
    method: 'Median of ward complaint register timestamps against crew closure timestamps.',
    frequency: 'Weekly',
    ownerId: 'u1',
    evidenceIds: [],
    series: Array.from({ length: 12 }, (_, i) => ({
      at: iso(84 - i * 7),
      value: Number((180 - (180 - 113.4) * ((i + 1) / 12)).toFixed(1)),
      sampleSize: 60 + i * 4,
    })),
  };

  return (
    <div>
      <PageHeader
        title="Style guide"
        lead="Every component in the PRAYOG system, in every state it supports. This page is the contract between the design system and the product — if something is not here, it does not exist."
      />

      <nav aria-label="Style guide sections" className="mb-8 flex flex-wrap gap-x-4 gap-y-1">
        {[
          ['tokens', 'Tokens'], ['type', 'Typography'], ['buttons', 'Buttons'], ['fields', 'Form controls'],
          ['status', 'Status'], ['overlays', 'Overlays'], ['nav', 'Navigation'], ['feedback', 'Feedback'],
          ['ledger', 'Ledger'], ['domain', 'Domain'], ['legal', 'Legal'], ['charts', 'Charts'], ['patterns', 'Patterns'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-micro text-ink-soft underline underline-offset-2 hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="tokens"
        title="Colour tokens"
        note="One palette, one hue family. The deep ground is --verify taken down to near-black, which is why a masthead and an approving officer's ink are the same green. There is no second set for public pages."
      >
        <ul className="sheet-flat">
          {[
            { name: '--ink', hex: '#1A1D1A', use: 'Typewriter carbon. Primary text, closing rules, totals', contrast: '16.7 : 1 on sheet' },
            { name: '--ink-soft', hex: '#5C6259', use: 'Pencil. Secondary text, labels, citations', contrast: '6.2 : 1 — text safe' },
            { name: '--ledger', hex: '#ECEADF', use: 'The file board a sheet is clipped to. Page ground', contrast: 'Background only' },
            { name: '--sheet', hex: '#FCFBF7', use: 'The noting sheet. Working surface', contrast: 'Background only' },
            { name: '--rule', hex: '#C9C4B4', use: 'The printed rule on a form. Hairlines, 1px, everywhere', contrast: '3.1 : 1 boundary' },
            { name: '--verify', hex: '#1F5C3D', use: 'Noting green — the ink an officer clears in. Primary action, focus ring', contrast: '7.7 : 1 — text safe' },
            { name: '--hold', hex: '#8A5A00', use: 'The pencil query in the margin. Held, waiting, near a limit', contrast: '5.8 : 1 — text safe' },
            { name: '--seal', hex: '#96201C', use: 'Seal wax. Refused, blocked, overdue. One major element per viewport', contrast: '8.1 : 1 — text safe' },
            { name: '--verify-wash', hex: '#E3ECE5', use: 'Row and panel wash', contrast: 'Ink text on top' },
            { name: '--hold-wash', hex: '#F5EEDA', use: 'Row and panel wash', contrast: 'Ink text on top' },
            { name: '--seal-wash', hex: '#F5E5E1', use: 'Row and panel wash', contrast: 'Ink text on top' },
            { name: '--deep', hex: '#08170F', use: 'The masthead ground. Top bar, every landing band, the footer', contrast: 'Background only' },
            { name: '--deep-2', hex: '#0E2418', use: 'A raised block on the deep ground', contrast: 'Background only' },
            { name: '--deep-ink', hex: '#F2F7F3', use: 'Text on deep', contrast: '17.2 : 1 on deep' },
            { name: '--deep-dim', hex: '#86A894', use: 'Secondary text on deep', contrast: '7.1 : 1 on deep' },
            { name: '--saffron', hex: '#FFB03A', use: 'Open, waiting, yours to act on. The only warm accent', contrast: '10.2 : 1 on deep' },
            { name: '--signal', hex: '#4EE39F', use: 'Cleared, measured, paid. The lit cut of --verify', contrast: '11.4 : 1 on deep' },
            { name: '--saffron-ink', hex: '#9A5B00', use: 'Saffron dark enough to be read as a label on a sheet', contrast: '5.3 : 1 on sheet' },
          ].map((t) => (
            <li key={t.name} className="ledger-row flex flex-wrap items-center gap-4 px-4 py-3">
              <span
                aria-hidden
                className="h-8 w-8 shrink-0 border border-rule"
                style={{ background: `var(${t.name})` }}
              />
              <span className="type-register min-w-0 flex-1 break-all text-data text-ink sm:w-[132px] sm:flex-none">{t.name}</span>
              <span className="type-register w-[80px] shrink-0 text-micro text-ink-soft">{t.hex}</span>
              <span className="min-w-0 basis-full text-body text-ink lg:flex-1 lg:basis-auto">{t.use}</span>
              <span className="basis-full text-micro text-ink-soft lg:basis-auto">{t.contrast}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <InlineNote tone="hold" title="The hold rule">
            Every status in this product is a wash, a 2px marker and the words together — never colour alone, never an
            icon alone. That is not a contrast workaround: all three inks clear AA for body text on the sheet. It is so
            that a status survives a monochrome print, a colour-blind reader and a photocopy, which is what happens to
            a government record.
          </InlineNote>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Control radius', value: '3px', style: { borderRadius: 3 } },
            { label: 'Sheet radius', value: '6px', style: { borderRadius: 6 } },
            { label: 'Ledger row radius', value: '0', style: { borderRadius: 0 } },
            { label: 'Elevation', value: '0 1px 0 rule', style: { boxShadow: '0 1px 0 var(--rule)' } },
          ].map((r) => (
            <div key={r.label} className="border border-rule bg-sheet px-4 py-6 text-center" style={r.style}>
              <p className="text-micro text-ink-soft">{r.label}</p>
              <p className="mt-1 text-data text-ink tnum">{r.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" title="Typography" note="Anek for the interface, Tiro for anything with legal or documentary force.">
        <div className="sheet-flat px-4 py-4">
          <p className="type-display text-ink">Display 44 / 48, Anek 600 at 87.5% width</p>
          {/* Specimens, not headings: the page keeps one h1 and a clean outline. */}
          <p className="mt-4 text-h1 text-ink">Heading one, 30 / 36</p>
          <p className="mt-2 text-h2 text-ink">Heading two, 24 / 30</p>
          <p className="mt-2 text-h3 text-ink">Heading three, 19 / 26</p>
          <p className="mt-4 max-w-doc text-body text-ink">
            Body, 15 / 24. The interface voice: sentence case, plain language, strong verbs, short sentences.
          </p>
          <p className="mt-4 max-w-doc font-doc text-doc text-ink">
            Document, 17 / 30 in Tiro, capped at 68 characters. Used for challenge text, clause text, evaluation
            minutes, validation reports and gate decision notes — anything a reader may later be asked to rely on.
          </p>
          <p className="mt-4 text-data text-ink tnum">Data 14 / 20 with tabular figures: 1,234,567 · ₹18,00,000 · 92 / 100</p>
          <p className="mt-2 text-label text-ink">Label 13 / 18</p>
          <p className="mt-1 text-micro text-ink-soft">Micro 11 / 16 — citations, timestamps, checksums, dwell times</p>
        </div>
      </Section>

      <Section id="buttons" title="Buttons" note="Every button names its consequence. None of them says Submit.">
        <div className="sheet-flat px-4 py-2">
          <Row label="Primary">
            <Button tone="primary">Clear gate 2</Button>
            <Button tone="primary" loading loadingLabel="Recording">Clear gate 2</Button>
            <Button tone="primary" disabled>Clear gate 2</Button>
            <Button tone="primary" size="sm">Small</Button>
          </Row>
          <Row label="Secondary">
            <Button>Return with observations</Button>
            <Button loading loadingLabel="Saving">Save draft</Button>
            <Button disabled>Unavailable</Button>
          </Row>
          <Row label="Quiet">
            <Button tone="quiet">Override with reasons</Button>
            <Button tone="quiet" disabled>Override with reasons</Button>
          </Row>
          <Row label="Destructive">
            <Button tone="destructive">Reject this case</Button>
            <Button tone="destructive" loading loadingLabel="Rejecting">Reject</Button>
            <Button tone="destructive" disabled>Reject</Button>
          </Row>
          <Row label="Link button"><LinkButton to="/dev/styleguide">Open the style guide</LinkButton></Row>
          <Row label="Icon button"><IconButton label="Close">×</IconButton><IconButton label="Close" disabled>×</IconButton></Row>
          <Row label="Spinner"><Spinner /><Spinner small /></Row>
        </div>
      </Section>

      <Section id="fields" title="Form controls" note="Every control has default, hover, focus-visible, disabled, read-only and error states. Required fields say the word required.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Text input" required hint="With a hint beneath the label.">
            {({ id }) => <Input id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type here" />}
          </Field>
          <Field label="Text input with an error" required error="Remove the vendor name to clear gate 1.">
            {({ id, invalid }) => <Input id={id} invalid={invalid} defaultValue="Oracle historian" />}
          </Field>
          <Field label="Read-only">{({ id }) => <Input id={id} readOnly value="CH-2026-0143" />}</Field>
          <Field label="Disabled">{({ id }) => <Input id={id} disabled value="Managed elsewhere" />}</Field>
          <Field label="Textarea" hint="Grows vertically.">
            {({ id }) => <Textarea id={id} rows={3} placeholder="Written reason" />}
          </Field>
          <Field label="Number">{({ id }) => <NumberInput id={id} defaultValue={90} />}</Field>
          <Field label="Money" hint="Held in paise; displayed with Indian grouping.">
            {({ id }) => <MoneyInput id={id} valuePaise={money1} onChangePaise={setMoney1} />}
          </Field>
          <Field label="Select">
            {({ id }) => (
              <Select id={id} placeholder="Choose one" options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]} />
            )}
          </Field>
          <Field label="Combobox" hint="Type to filter; arrow keys to move.">
            {({ id }) => (
              <Combobox
                id={id}
                value={combo}
                onChange={setCombo}
                placeholder="Search a department"
                options={[
                  { value: 'd1', label: 'Pune Municipal Corporation', detail: 'Water and sanitation' },
                  { value: 'd2', label: 'Directorate of Transport', detail: 'Urban transport' },
                ]}
              />
            )}
          </Field>
          <Field label="Multi-select tags">
            {() => <MultiSelectTags values={tags} onChange={setTags} options={['IoT sensors', 'Computer vision', 'GIS mapping']} placeholder="Add a capability" />}
          </Field>
          <Field label="Date">{({ id }) => <DateInput id={id} defaultValue="2026-09-03" />}</Field>
          <div><DateRangePicker from={range.from} to={range.to} onChange={setRange} /></div>
          <div>
            <RadioGroup
              legend="Radio group"
              name="sg-radio"
              required
              value={radio}
              onChange={setRadio}
              options={[
                { value: 'a', label: 'Clear the gate', detail: 'The case moves forward.' },
                { value: 'b', label: 'Return with observations', detail: 'Back to the owner.' },
                { value: 'c', label: 'Reject', detail: 'Closed at this gate.', disabled: true, disabledReason: 'One precondition is unmet.' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-4">
            <Checkbox checked={checked} onChange={setChecked} label="Checkbox" detail="With supporting detail." />
            <Checkbox checked={false} onChange={() => {}} label="Disabled checkbox" disabled />
            <Switch checked={switched} onChange={setSwitched} label="Switch" detail="On or off, stated in words." />
            <Slider label="Slider" min={0} max={100} value={slider} onChange={setSlider} format={(v) => `${v}%`} />
          </div>
          <div className="md:col-span-2">
            <FileDrop label="Drop evidence here, or choose files" hint="Files are scanned before anyone can open them." onFiles={() => {}} />
          </div>
        </div>
      </Section>

      <Section id="status" title="Status" note="Every status in the product, as a wash, a marker and the words together.">
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge tone="verify">Verify tone</Badge>
          <Badge tone="hold">Hold tone</Badge>
          <Badge tone="seal">Seal tone</Badge>
          <Badge tone="neutral">Neutral tone</Badge>
        </div>
        <p className="mt-4 text-micro text-ink-soft">
          Mapped tones: {Array.from(new Set(ALL_STATUSES.map(statusTone))).join(' · ')}.
        </p>
      </Section>

      <Section id="overlays" title="Overlays" note="Focus is trapped, Escape closes, and focus returns to the trigger.">
        <div className="sheet-flat px-4 py-2">
          <Row label="Modal"><Button onClick={() => setModal(true)}>Open a modal</Button></Row>
          <Row label="Sheet"><Button onClick={() => setSheet(true)}>Open a sheet</Button></Row>
          <Row label="Popover">
            <Popover
              label="Example"
              trigger={({ onClick, ref, ...aria }) => (
                <button ref={ref} onClick={onClick} {...aria} className="h-8 rounded-control border border-rule px-3 text-label">
                  Open a popover
                </button>
              )}
            >
              {(close) => (
                <div>
                  <p className="text-body text-ink">Popovers close on Escape and on an outside click.</p>
                  <div className="mt-3">
                    <Button size="sm" onClick={close}>Close</Button>
                  </div>
                </div>
              )}
            </Popover>
          </Row>
          <Row label="Tooltip">
            <Tooltip label="Tooltips are keyboard reachable and described by aria-describedby.">
              <span className="border-b border-dashed border-rule text-body text-ink">Hover or focus me</span>
            </Tooltip>
          </Row>
        </div>

        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title="Clear gate 1 on CH-2026-0143?"
          description="This is written to the permanent record and cannot be edited afterwards."
          footer={<><Button onClick={() => setModal(false)}>Go back</Button><Button tone="primary" onClick={() => setModal(false)}>Clear gate 1</Button></>}
        >
          <p className="text-body text-ink">Confirmation restates the consequence before anything happens.</p>
        </Modal>

        <Sheet open={sheet} onClose={() => setSheet(false)} title="Sheet" side="right">
          <p className="text-body text-ink">Right on desktop, bottom on mobile. The evidence dock uses this on small screens.</p>
        </Sheet>
      </Section>

      <Section id="nav" title="Navigation">
        <div className="flex flex-col gap-6">
          <Breadcrumb items={[{ label: 'Demand board', to: '/' }, { label: 'Challenges', to: '/challenges' }, { label: 'CH-2026-0143' }]} />
          <Tabs
            items={[{ id: 'one', label: 'Framing' }, { id: 'two', label: 'Approvals', count: 3 }, { id: 'three', label: 'Applicants', count: 14 }, { id: 'four', label: 'Disabled', disabled: true, disabledReason: 'Not until gate 1 clears.' }]}
            value={tab}
            onChange={setTab}
          >
            <p className="text-body text-ink">Panel content for the {tab} tab.</p>
          </Tabs>
          <Accordion
            items={[
              { id: 'a', title: 'An accordion section', content: <p className="text-body text-ink">Content.</p> },
              { id: 'b', title: 'Another', aside: <Badge tone="verify">Cleared</Badge>, content: <p className="text-body text-ink">More content.</p> },
            ]}
            defaultOpen={['a']}
          />
          <Pagination page={page} pageSize={10} total={137} onChange={setPage} />
        </div>
      </Section>

      <Section id="feedback" title="Feedback states" note="Loading is shaped like the content it replaces. Errors say what failed, what to do and carry a reference.">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div><p className="mb-2 text-label text-ink-soft">Table skeleton</p><TableSkeleton rows={3} columns={4} /></div>
            <div><p className="mb-2 text-label text-ink-soft">Panel skeleton</p><PanelSkeleton lines={3} /></div>
            <div><p className="mb-2 text-label text-ink-soft">Stat skeleton</p><StatSkeleton rows={3} /></div>
          </div>
          <div><p className="mb-2 text-label text-ink-soft">Bare skeleton</p><Skeleton className="h-4" width="60%" /></div>
          <ProgressRing value={81} label="KPI achievement" />
          <EmptyState
            title="No challenges yet."
            body="Start with the problem you would fix tomorrow if you could."
            action={{ label: 'Create a challenge', to: '/d/challenges/new/problem' }}
          />
          <ErrorState
            title="Unable to load pilot data."
            what="The service did not respond. Nothing you entered has been lost."
            details={['Measurement endpoint returned 500.']}
            reference="ERR-2026-8194"
            onRetry={() => {}}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InlineNote tone="verify" title="Verify note">Something has cleared.</InlineNote>
            <InlineNote tone="hold" title="Hold note">Something is waiting.</InlineNote>
            <InlineNote tone="seal" title="Seal note">Something is blocked.</InlineNote>
            <InlineNote tone="neutral" title="Neutral note">Something is worth knowing.</InlineNote>
          </div>
        </div>
      </Section>

      <Section id="ledger" title="Ledger components" note="Hairline rows, tabular figures, double-ruled totals. Never a grid of KPI cards.">
        <div className="flex min-w-0 flex-col gap-8">
          <LedgerTable
            caption="Example ledger table"
            rows={SAMPLE_MILESTONES}
            rowKey={(m) => m.id}
            rowTone={(m) => (m.status === 'under_review' ? 'hold' : m.status === 'paid' ? 'verify' : undefined)}
            onRowOpen={() => {}}
            savedViews={[{ id: 'v1', label: 'By payment', hiddenColumns: [], sortKey: 'payment', sortDirection: 'desc' }]}
            columns={[
              { key: 'name', header: 'Milestone', sortValue: (m) => m.name, filterValue: (m) => m.name, render: (m) => m.name },
              { key: 'test', header: 'Acceptance test', width: '40%', filterValue: (m) => m.acceptanceTest, render: (m) => <span className="text-body text-ink">{m.acceptanceTest}</span> },
              { key: 'payment', header: 'Payment', align: 'right', sortValue: (m) => m.paymentPaise, render: (m) => money(m.paymentPaise) },
              { key: 'status', header: 'Status', sortValue: (m) => m.status, render: (m) => <StatusBadge status={m.status} /> },
            ]}
            totalRow={<span className="flex items-baseline justify-between"><span className="text-body text-ink">Total</span><span className="text-data text-ink tnum">{money(150_000_000)}</span></span>}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatLedger
              title="StatLedger"
              rows={[
                { label: 'Open challenges', value: '68' },
                { label: 'Live pilots', value: '9' },
                { label: 'Milestone acceptance to payment, median', value: '11 days', detail: 'Against a 30-day limit' },
              ]}
              total={{ label: 'Committed to pilots', value: money(1_420_000_000) }}
            />
            <KeyValueSheet
              title="KeyValueSheet"
              items={[
                { label: 'Baseline', value: '180 minutes', citation: 'Ward complaint register' },
                { label: 'Target', value: '120 minutes' },
                { label: 'Data tier', value: <DataTierBadge tier="masked" />, hint: 'Approved by the department data custodian.' },
              ]}
              footnote="A footnote states where the figures came from."
            />
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">DataRow — what tables become below 768px</p>
            <ul className="sheet-flat">
              <DataRow
                primary="Pune Municipal Corporation"
                secondary="CH-2026-0143 · Water and sanitation"
                meta={[{ label: 'Budget', value: money(150_000_000) }, { label: 'Applicants', value: '14' }]}
                aside={<StatusBadge status="open" />}
                tone="verify"
                to="/challenges"
              />
              <DataRow primary="Blocked case" secondary="CH-2026-0134" tone="seal" aside={<StatusBadge status="blocked" />} />
            </ul>
          </div>

          <ComparisonMatrix
            rowHeader="Criterion"
            columns={[{ key: 'a', label: 'AquaSense' }, { key: 'b', label: 'Jal Nigrani' }]}
            rows={[
              { key: 'c1', label: 'Understanding of the problem', detail: '20% weight', cells: { a: <span className="tnum">5</span>, b: <span className="tnum">4</span> } },
              { key: 'c2', label: 'Technical approach', detail: '20% weight', cells: { a: <span className="tnum">4</span>, b: <span className="tnum">4</span> } },
            ]}
          />
        </div>
      </Section>

      <Section id="domain" title="Domain components" note="The parts of the system that know about gates, money and evidence.">
        <div className="flex flex-col gap-8">
          <FileCover
            caseId="CH-2026-0143"
            title="Smart water leakage detection"
            department="Pune Municipal Corporation"
            owner="R. Bhat"
            ownerInitials="RB"
            gate="G2"
            gateName="Shortlist candidates"
            amountPaise={150_000_000}
            sla={{ startedOn: iso(10), limitDays: 14 }}
            status={<StatusBadge status="open" />}
            actions={<Button size="sm" tone="primary">Open gate 2</Button>}
            headingLevel={2}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="min-w-0">
              <p className="mb-2 text-label text-ink-soft">GateLadder — the dwell rail</p>
              <GateLadder records={SAMPLE_GATES} currentGate="G2" ownerNames={{ u1: 'R. Bhat', u2: 'A. Deshmukh', u3: 'K. Iyer', u4: 'S. Nair' }} onSelect={() => {}} />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <div className="min-w-0">
                <p className="mb-2 text-label text-ink-soft">Horizontal strip, below 1024px</p>
                <GateLadder records={SAMPLE_GATES} currentGate="G2" orientation="horizontal" onSelect={() => {}} />
              </div>
              <div>
                <p className="mb-2 text-label text-ink-soft">Gate summary, below 768px</p>
                <GateSummary records={SAMPLE_GATES} currentGate="G2" onOpen={() => {}} />
              </div>
              <div>
                <p className="mb-2 text-label text-ink-soft">SealStamp — the one expressive animation</p>
                <div className="flex flex-wrap items-center gap-6 bg-sheet px-4 py-6">
                  <SealStamp tone="cleared" gate="G1" date={iso(163)} by="A.D." animate />
                  <SealStamp tone="rejected" gate="G3" date={iso(20)} by="K.I." />
                  <SealStamp tone="waived" gate="G6" date={iso(11)} />
                  <SealStamp tone="draft" small />
                </div>
              </div>
              <div>
                <p className="mb-2 text-label text-ink-soft">SLA clock — comfortable, due soon, overdue</p>
                <div className="flex flex-wrap items-center gap-6">
                  <SlaClock startedOn={iso(2)} limitDays={14} showDetail />
                  <SlaClock startedOn={iso(12)} limitDays={14} showDetail />
                  <SlaClock startedOn={iso(20)} limitDays={14} showDetail />
                </div>
              </div>
              <div>
                <p className="mb-2 text-label text-ink-soft">Payment ageing — within limit, at risk, overdue, paid</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <PaymentAgeingBar acceptedOn={iso(4)} limitDays={30} amountPaise={52_500_000} />
                  <PaymentAgeingBar acceptedOn={iso(25)} limitDays={30} amountPaise={52_500_000} />
                  <PaymentAgeingBar acceptedOn={iso(40)} limitDays={30} amountPaise={52_500_000} deductionPaise={2_100_000} />
                  <PaymentAgeingBar acceptedOn={iso(40)} limitDays={30} amountPaise={45_000_000} paidOn={iso(18)} reference="PFMS/DEP-01/2026/441029" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">MilestoneTimeline</p>
            <MilestoneTimeline milestones={SAMPLE_MILESTONES} />
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">EvidenceVault — clean, pending and failed scans</p>
            <EvidenceVault items={SAMPLE_EVIDENCE} />
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">RiskRegister</p>
            <RiskRegister risks={SAMPLE_RISKS} users={[]} />
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">IncidentLog</p>
            <IncidentLog incidents={SAMPLE_INCIDENTS} users={[]} />
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">AuditTrail</p>
            <AuditTrail
              items={[
                { id: 'a1', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', actorId: 'u1', actorName: 'R. Bhat', actorRole: 'department_officer', action: 'language_check.flag_accepted', summary: 'Solution language check flagged a vendor-specific instrument. The outcome-based rewrite was accepted.', before: 'Deploy acoustic correlator loggers', after: 'Cut the time between a leak starting and a crew standing over it', at: iso(178), hash: 'c3f1a90b77e2' },
                { id: 'a2', entityType: 'challenge', entityId: 'x', caseId: 'CH-2026-0143', actorId: 'u2', actorName: 'A. Deshmukh', actorRole: 'pmu', action: 'gate.decision', summary: 'Gate 1 cleared. No unresolved language flags; IP within default boundaries.', before: 'G1 open', after: 'G1 cleared', at: iso(163), hash: '77aa20d5cc10' },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">EvidenceDock — 340px, collapsible, bottom sheet on mobile</p>
            <div className="flex border border-rule bg-sheet">
              <div className="flex-1 px-4 py-6 text-body text-ink-soft">Working column</div>
              <EvidenceDock
                evidence={SAMPLE_EVIDENCE}
                audit={[]}
                next={[{ id: 'n1', caseId: 'CH-2026-0143', title: 'Smart water leakage detection', requiredAction: 'Decide gate 2', ownerId: 'u1', ownerName: 'R. Bhat', waitingSinceDays: 34, slaDays: 14, href: '/d', entityType: 'challenge' }]}
                linked={[{ caseId: 'PL-2026-0031', label: 'Pilot', to: '/d', detail: 'Executing' }]}
              />
            </div>
          </div>

          <div className="relative overflow-hidden border border-rule bg-sheet px-6 py-12">
            <Watermark lines={['Draft', 'Not for circulation']} />
            <p className="relative text-body text-ink">Watermark, used on the challenge review screen.</p>
          </div>
        </div>
      </Section>

      <Section id="legal" title="Legal and eligibility" note="Plain-language position first; the operative wording one click away.">
        <div className="flex flex-col gap-6">
          <RelaxationNotice />
          <IpPositionCard position="startup_retains" clauseIds={['CL-IP-01', 'CL-IP-02']} />
          <div>
            <p className="mb-2 text-label text-ink-soft">DataTierSelector</p>
            <DataTierSelector value={tier} onChange={setTier} />
          </div>
          <div className="flex flex-wrap gap-2">
            {DATA_TIERS.map((t) => (
              <DataTierBadge key={t.id} tier={t.id} />
            ))}
          </div>
          <div>
            <p className="mb-2 text-label text-ink-soft">ClauseReader, with a deviation highlighted</p>
            <ClauseReader
              clauseIds={['CL-IP-01', 'CL-PAY-01']}
              deviations={[{ clauseId: 'CL-PAY-01', level: 'minor', reason: 'A second hosting region inside India was added.', approvedBy: 'Department data custodian' }]}
            />
          </div>
          <div>
            <p className="mb-2 text-label text-ink-soft">EligibilityChecklist — pass, relief applied, review after a change</p>
            <EligibilityChecklist
              results={[
                { ruleId: 'R-ENT-01', ruleVersion: 3, result: 'pass', evidence: 'Verified against the profile record held on file.', citation: 'DPIIT-2019-127', evaluatedAt: iso(144) },
                { ruleId: 'R-FIN-01', ruleVersion: 2, result: 'pass', evidence: 'Relaxed under GFR 2017, Rule 173(i) on a live recognition.', citation: 'GFR-2017-173', evaluatedAt: iso(144), relaxationApplied: true },
                { ruleId: 'R-REC-01', ruleVersion: 4, result: 'review', evidence: 'Recognition expired after this application was submitted.', citation: 'DPIIT-2019-127', evaluatedAt: iso(144), changedSince: { what: 'DPIIT recognition moved from recognised to expired', at: iso(12) } },
                { ruleId: 'R-CON-01', ruleVersion: 1, result: 'fail', evidence: 'Declaration of debarment recorded in the application.', citation: 'PRAYOG-SOP-4', evaluatedAt: iso(144), override: { result: 'pass', justification: 'The debarment relates to a different entity with a similar name; the registrar has confirmed in writing.', by: 'M. Chauhan', at: iso(130) } },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section id="charts" title="Charts" note="Every chart carries a data-table alternative on the same screen.">
        <div className="flex flex-col gap-6">
          <MeasurementChart kpi={kpi} confounders={['Two uninstrumented control zones showed no comparable movement.', 'Seasonal demand seal 6 percent, which would push detection time up.']} />
          <BarLedger title="Median gate dwell, in days" unit="days" rows={[{ label: 'G0', value: 14 }, { label: 'G1', value: 8 }, { label: 'G2', value: 34, detail: 'Past its 14-day window by 20 days' }]} />
        </div>
      </Section>

      <Section id="patterns" title="Patterns" note="The shapes that carry decisions, wizards and permissions.">
        <div className="flex flex-col gap-8">
          <div>
            <p className="mb-2 text-label text-ink-soft">RubricScorer</p>
            <RubricScorer
              rubric={RUBRICS[0]!}
              scores={[]}
              rationaleMinChars={40}
              submitted={false}
              onSave={async () => {}}
              onSubmit={() => {}}
            />
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">PermissionGate — the control is shown, disabled, with the reason</p>
            <PermissionGate allowed={false} action="approve" resource="payment" viewNote="You can view this claim.">
              <Button tone="primary">Release the payment</Button>
            </PermissionGate>
          </div>

          <div>
            <p className="mb-2 text-label text-ink-soft">ApprovalBar — clear, and blocked</p>
            <div className="relative overflow-hidden border border-rule px-4">
              <ApprovalBar
                consequence="Clearing gate 1 publishes the challenge, opens the application window and notifies 14 matched startups."
                notifies={['Matched startups', 'Department nodal officer', 'Public demand board']}
              >
                <Button tone="primary">Clear gate 1</Button>
              </ApprovalBar>
            </div>
            <div className="relative mt-4 overflow-hidden border border-rule px-4">
              <ApprovalBar
                consequence=""
                blocked={{
                  title: 'Gate 1 cannot clear.',
                  reasons: [
                    'Legal pre-clearance has been pending for 22 days.',
                    'The only route past an unmet precondition is a waiver from the Secretary, recorded separately.',
                  ],
                }}
              >
                <Button tone="destructive">Request a waiver</Button>
                <Button tone="primary" disabled>Clear gate 1</Button>
              </ApprovalBar>
            </div>
          </div>
        </div>
      </Section>

      <Section id="config" title="Configuration coverage" note="Proof that the numbers in this style guide, and everywhere else, come from configuration.">
        <ul className="sheet-flat">
          {CONFIG_PARAMETERS.slice(0, 8).map((p) => (
            <li key={p.key} className="ledger-row flex flex-wrap items-baseline justify-between gap-4 px-4 py-2">
              <span className="text-body text-ink">{p.label}</span>
              <span className="text-data text-ink tnum">
                {String(p.value)} {p.unit ?? ''}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-micro text-ink-soft">
          {CONFIG_PARAMETERS.length} parameters in total. The full ledger is at /a/config.
        </p>
      </Section>
    </div>
  );
}
