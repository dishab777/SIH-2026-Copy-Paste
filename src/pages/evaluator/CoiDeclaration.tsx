import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCoi, useDeclareCoi, useEvaluatorQueue } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Nav';
import { Field, Textarea } from '@/components/ui/Field';
import { SealStamp } from '@/components/domain/SealStamp';
import { day, dayTime } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

const NATURE_MIN = 15;

/* ------------------------------------------------------------------ marks
 * Drawn here rather than imported, so every stroke on this screen sits on the
 * one line weight the product uses.
 */
function Glyph({ d, size = 18 }: { d: string; size?: number }) {
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

const SEALED = 'M7 10V8a5 5 0 0 1 10 0v2M5 10h14v10H5zM12 14v3';
const TICK = 'm5 13 4 4 10-10';
const HAND = 'M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8ZM12 8v5M12 16.2v.1';

/**
 * The conflict declaration. A blocking interstitial: there is no way past it
 * except through a declaration — no dismiss, no skip, no shortcut to the
 * proposal.
 *
 * It used to be a bare `h1` on the page ground with two flat radio strips and a
 * row of three same-weight buttons under a hairline, which is the one screen in
 * the evaluator portal that did not look like the rest of the product. A
 * blocking screen has to be the *most* legible thing in a portal, not the
 * least: it is the point at which somebody is being asked to put their name to
 * a statement.
 *
 * So it takes the masthead every other screen takes, and splits: what you are
 * being shown on the left, what you are being asked on the right, with the
 * proposal named at the top so the declaration is attached to a case rather
 * than floating free of one.
 */
export default function CoiDeclarationPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const query = useCoi(appId);
  const declare = useDeclareCoi(appId);
  /* The queue knows which challenge this is and how many declarations are
     still outstanding. The declaration record itself does not, and "you are on
     the first of eleven" is the difference between a form and a queue. */
  const queue = useEvaluatorQueue();
  const pushToast = useUi((s) => s.pushToast);

  const [choice, setChoice] = useState<'none' | 'conflict' | null>(null);
  const [nature, setNature] = useState('');

  const entry = queue.data?.data.find((i) => i.applicationId === appId);
  const outstanding = queue.data?.data.filter((i) => !i.coiDeclared) ?? [];
  const position = outstanding.findIndex((i) => i.applicationId === appId);

  return (
    <QueryState query={query} errorTitle="Unable to load this declaration." loading={<PanelSkeleton lines={8} />}>
      {(payload) => {
        const d = payload.data;
        const already = d.declaration?.declared;

        /* -------------------------------------------------------- on record */
        if (already) {
          const conflicted = d.declaration?.hasConflict;
          return (
            <div>
              <PageHeader
                eyebrow="Conflict of interest"
                title={conflicted ? 'You are recused from this application' : 'Your declaration is on record'}
                lead={`Recorded ${dayTime(d.declaration?.declaredAt)}. A declaration cannot be withdrawn; if your circumstances change, tell the programme management unit.`}
                breadcrumb={
                  <Breadcrumb
                    tone="deep"
                    items={[{ label: 'Assignment queue', to: '/e' }, { label: d.applicationCaseId }]}
                  />
                }
                aside={<SealStamp tone={conflicted ? 'rejected' : 'cleared'} date={d.declaration?.declaredAt} />}
              />

              <div className="mx-auto max-w-[760px]">
                {conflicted ? (
                  <InlineNote tone="seal" title="This proposal stays closed to you">
                    <p className="max-w-doc">
                      You declared a conflict, so you cannot open this proposal or score it. The programme management
                      unit has been notified and will reassign it. Your other assignments are unaffected.
                    </p>
                    <div className="mt-4">
                      <Button tone="primary" onClick={() => navigate('/e')}>
                        Back to your queue
                      </Button>
                    </div>
                  </InlineNote>
                ) : (
                  <InlineNote tone="verify" title="You can open this proposal">
                    <p className="max-w-doc">
                      You declared no conflict. The applicant identity and the full proposal are now available to you.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button tone="primary" onClick={() => navigate(`/e/score/${d.applicationId}`)}>
                        Open the proposal and score it
                      </Button>
                      <Button onClick={() => navigate('/e')}>Back to your queue</Button>
                    </div>
                  </InlineNote>
                )}
              </div>
            </div>
          );
        }

        /* --------------------------------------------------- not yet declared */
        const short = choice === 'conflict' ? Math.max(0, NATURE_MIN - nature.trim().length) : 0;
        const unavailableReason =
          choice === null
            ? 'Choose whether you have a conflict first.'
            : short > 0
              ? `Describe the conflict in at least ${short} more characters.`
              : undefined;

        return (
          <div>
            <PageHeader
              eyebrow="Conflict of interest"
              title="Declare before you open this proposal"
              lead="You are being shown the applicant and its associations, and nothing else. The proposal itself stays closed until this declaration is recorded."
              breadcrumb={
                <Breadcrumb
                  tone="deep"
                  items={[{ label: 'Assignment queue', to: '/e' }, { label: d.applicationCaseId }]}
                />
              }
              aside={
                position >= 0 ? (
                  <span className="rounded-pill border border-deep-rule bg-deep-2 px-4 py-1.5 text-micro text-deep-ink tnum">
                    Declaration {position + 1} of {outstanding.length} outstanding
                  </span>
                ) : null
              }
            />

            {/* The case this declaration belongs to. Without it the screen is a
                form about a company, with no sign of which competition it is for. */}
            {entry ? (
              <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-block border border-rule border-l-2 border-l-saffron bg-ledger px-5 py-4">
                <span className="min-w-0">
                  <span className="field-label block">Assigned on</span>
                  <span className="mt-0.5 block text-body text-ink">{entry.challengeTitle}</span>
                </span>
                <span className="type-register text-micro text-ink-soft tnum">{entry.challengeCaseId}</span>
                {entry.deadline ? (
                  <span className="ml-auto text-micro text-ink-soft tnum">Panel session {day(entry.deadline)}</span>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
              {/* ---------------------------------------- what you are shown */}
              <div className="flex min-w-0 flex-col gap-6">
                <KeyValueSheet
                  headingLevel={2}
                  title="Who has applied"
                  items={[
                    { label: 'Legal name', value: d.applicant.legalName },
                    { label: 'Trading name', value: d.applicant.tradeName },
                    { label: 'State', value: d.applicant.state },
                    { label: 'Directors', value: d.applicant.directors.join(', ') },
                    { label: 'Investors on record', value: d.applicant.investors.join(', ') },
                  ]}
                  footnote="If any of these names is unfamiliar but the organisation is not, that is still worth declaring."
                />

                <section className="sheet-flat overflow-hidden rounded-block">
                  <header className="flex items-center gap-3 border-b border-ink bg-ledger px-4 py-3">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sheet border border-rule bg-sheet text-ink-soft"
                    >
                      <Glyph d={HAND} />
                    </span>
                    <h2 className="text-label text-ink">Relationships that count as a conflict</h2>
                  </header>
                  <ul>
                    {d.applicant.relationships.map((r) => (
                      <li key={r} className="ledger-row flex gap-3 px-4 py-3">
                        <span aria-hidden className="mt-1 shrink-0 text-ink-soft">
                          <Glyph d="M6 12h12" size={12} />
                        </span>
                        <span className="text-body text-ink">{r}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="border-t border-rule bg-ledger px-4 py-3 text-micro text-ink-soft">
                    If you are unsure whether something counts, declare it. The programme management unit decides, not
                    you.
                  </p>
                </section>
              </div>

              {/* ------------------------------------- what you are asked for */}
              <section
                aria-labelledby="declaration-heading"
                className="rounded-block border border-ink bg-sheet shadow-lift lg:sticky lg:top-20"
              >
                <header className="relative overflow-hidden rounded-t-block border-b border-ink bg-deep px-5 py-4">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-saffron" />
                  <p className="field-label flex items-center gap-2 !text-saffron">
                    <span aria-hidden className="inline-block h-px w-6 bg-saffron" />
                    Signed by you, on the record
                  </p>
                  <h2 id="declaration-heading" className="mt-1.5 font-display text-h3 text-deep-ink">
                    Your declaration
                  </h2>
                  <p className="mt-1.5 text-micro text-deep-dim">
                    Declaring a conflict is not a failing — concealing one is.
                  </p>
                </header>

                <fieldset className="border-0 px-5 py-5">
                  <legend className="sr-only">Do you have a conflict on this application?</legend>
                  <div className="flex flex-col gap-3">
                    {(
                      [
                        {
                          id: 'none' as const,
                          title: 'I declare no conflict',
                          body: 'None of the relationships listed applies to me in respect of this applicant.',
                          glyph: TICK,
                          lit: 'border-verify bg-verify-wash text-verify',
                        },
                        {
                          id: 'conflict' as const,
                          title: 'I declare a conflict',
                          body: 'This recuses you from this application and notifies the programme management unit. Your other assignments are unaffected.',
                          glyph: SEALED,
                          lit: 'border-seal bg-seal-wash text-seal',
                        },
                      ] as const
                    ).map((o) => {
                      const on = choice === o.id;
                      return (
                        <label
                          key={o.id}
                          className={[
                            'swift flex cursor-pointer items-start gap-3 rounded-sheet border px-4 py-3',
                            on ? `${o.lit} shadow-sheet` : 'border-rule bg-ledger hover:border-ink-soft',
                          ].join(' ')}
                        >
                          <input
                            type="radio"
                            name="coi"
                            checked={on}
                            onChange={() => setChoice(o.id)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className={[
                              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                              on ? 'border-current bg-sheet' : 'border-rule bg-sheet text-transparent',
                            ].join(' ')}
                          >
                            <Glyph d={o.glyph} size={13} />
                          </span>
                          <span className="min-w-0">
                            <span className={['block text-body', on ? 'font-semibold' : 'text-ink'].join(' ')}>
                              {o.title}
                            </span>
                            <span className="mt-0.5 block text-micro text-ink-soft">{o.body}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {choice === 'conflict' ? (
                    <div className="mt-5">
                      <Field
                        label="The nature of the conflict"
                        required
                        hint="The programme management unit reads this and decides how to reassign."
                        aside={`${nature.trim().length} / ${NATURE_MIN}`}
                      >
                        {({ id, describedBy, invalid }) => (
                          <Textarea
                            id={id}
                            aria-describedby={describedBy}
                            invalid={invalid}
                            rows={4}
                            value={nature}
                            onChange={(e) => setNature(e.target.value)}
                          />
                        )}
                      </Field>
                    </div>
                  ) : null}
                </fieldset>

                {/* The act. One control carries it; the way out is beside it,
                    quiet, and named for what it actually does. */}
                <footer className="rounded-b-block border-t border-ink bg-ledger px-5 py-5">
                  {unavailableReason ? (
                    <p className="mb-3 flex items-start gap-2 rounded-control border-l-2 border-l-hold bg-hold-wash px-3 py-2 text-micro text-ink">
                      <span aria-hidden className="mt-0.5 shrink-0 text-hold">
                        <Glyph d={HAND} size={13} />
                      </span>
                      {unavailableReason}
                    </p>
                  ) : null}

                  <Button
                    block
                    tone={choice === 'conflict' ? 'destructive' : 'primary'}
                    unavailableReason={unavailableReason}
                    loading={declare.isPending}
                    loadingLabel="Recording"
                    onClick={() =>
                      declare.mutate(
                        {
                          hasConflict: choice === 'conflict',
                          natureOfConflict: choice === 'conflict' ? nature : undefined,
                        },
                        {
                          onSuccess: (res) => {
                            track(
                              choice === 'conflict'
                                ? { name: 'coi_conflict_declared', evaluatorId: 'self', applicationId: d.applicationId }
                                : { name: 'coi_signed', evaluatorId: 'self', applicationId: d.applicationId },
                            );
                            pushToast('verify', res.message ?? 'Declaration recorded.');
                          },
                          onError: (err) => {
                            const api = err instanceof PrayogApiError ? err : null;
                            pushToast(
                              'seal',
                              api?.message ?? 'The declaration was not recorded.',
                              'Nothing was opened. Your text is preserved.',
                            );
                          },
                        },
                      )
                    }
                  >
                    {choice === 'conflict' ? 'Declare a conflict and recuse myself' : 'Declare no conflict'}
                  </Button>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                    <Badge tone="hold">A declaration cannot be withdrawn</Badge>
                    <button
                      type="button"
                      onClick={() => navigate('/e')}
                      className="swift text-label text-ink-soft underline underline-offset-2 hover:text-ink"
                    >
                      Leave without declaring
                    </button>
                  </div>
                </footer>
              </section>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
