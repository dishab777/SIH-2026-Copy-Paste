import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCoi, useDeclareCoi } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { SealStamp } from '@/components/domain/SealStamp';
import { dayTime } from '@/lib/format';
import { track } from '@/lib/analytics';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

/**
 * A blocking interstitial. There is no way past this screen except through a
 * declaration — no dismiss, no skip, no navigation shortcut to the proposal.
 */
export default function CoiDeclarationPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const query = useCoi(appId);
  const declare = useDeclareCoi(appId);
  const pushToast = useUi((s) => s.pushToast);

  const [choice, setChoice] = useState<'none' | 'conflict' | null>(null);
  const [nature, setNature] = useState('');

  return (
    <div className="mx-auto max-w-[760px]">
      <QueryState query={query} errorTitle="Unable to load this declaration." loading={<PanelSkeleton lines={8} />}>
        {(payload) => {
          const d = payload.data;
          const already = d.declaration?.declared;

          if (already) {
            return (
              <div>
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-doc">
                    <p className="text-micro text-ink-soft tnum">{d.applicationCaseId}</p>
                    <h1 className="mt-1 text-h1 text-ink">Your declaration is on record</h1>
                    <p className="mt-2 text-body text-ink-soft">
                      Recorded {dayTime(d.declaration?.declaredAt)}. A declaration cannot be withdrawn; if your
                      circumstances change, tell the programme management unit.
                    </p>
                  </div>
                  <SealStamp
                    tone={d.declaration?.hasConflict ? 'rejected' : 'cleared'}
                    date={d.declaration?.declaredAt}
                  />
                </div>

                {d.declaration?.hasConflict ? (
                  <InlineNote tone="seal" title="You are recused from this application">
                    <p className="max-w-doc">
                      You declared a conflict, so you cannot open this proposal or score it. The programme management
                      unit has been notified and will reassign it.
                    </p>
                    <div className="mt-4">
                      <Button onClick={() => navigate('/e')}>Back to your queue</Button>
                    </div>
                  </InlineNote>
                ) : (
                  <InlineNote tone="verify" title="You can open this proposal">
                    <p className="max-w-doc">
                      You declared no conflict. The applicant identity and the full proposal are now available to you.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Button tone="primary" onClick={() => navigate(`/e/score/${d.applicationId}`)}>
                        Open the proposal and score it
                      </Button>
                      <Button onClick={() => navigate('/e')}>Back to your queue</Button>
                    </div>
                  </InlineNote>
                )}
              </div>
            );
          }

          return (
            <div>
              <header className="mb-6 border-b border-ink pb-6">
                <p className="text-micro text-ink-soft tnum">{d.applicationCaseId}</p>
                <h1 className="mt-1 text-h1 text-ink">Declare conflicts before you open this proposal</h1>
                <p className="mt-3 max-w-doc text-body text-ink-soft">
                  You are being shown the applicant and its associations, and nothing else. The proposal itself stays
                  closed until this declaration is recorded. Declaring a conflict is not a failing — concealing one is.
                </p>
              </header>

              <div className="mb-6">
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
              </div>

              <section className="mb-6 sheet-flat">
                <h2 className="border-b border-ink px-4 py-2 text-label text-ink">
                  Relationships that count as a conflict
                </h2>
                <ul>
                  {d.applicant.relationships.map((r) => (
                    <li key={r} className="ledger-row flex gap-3 px-4 py-2">
                      <span aria-hidden className="text-ink-soft">
                        ·
                      </span>
                      <span className="text-body text-ink">{r}</span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-rule px-4 py-2 text-micro text-ink-soft">
                  If you are unsure whether something counts, declare it. The programme management unit decides, not
                  you.
                </p>
              </section>

              <fieldset className="mb-6 border-0 p-0">
                <legend className="mb-3 text-h3 text-ink">Your declaration</legend>
                <div className="flex flex-col gap-3">
                  <label
                    className={[
                      'flex cursor-pointer items-start gap-3 border-l-2 px-4 py-3',
                      choice === 'none' ? 'border-l-verify bg-verify-wash' : 'border-l-rule bg-ledger',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="coi"
                      checked={choice === 'none'}
                      onChange={() => setChoice('none')}
                      className="mt-1 h-4 w-4 accent-[color:var(--verify)]"
                    />
                    <span>
                      <span className="block text-body text-ink">I declare no conflict</span>
                      <span className="block text-micro text-ink-soft">
                        None of the relationships above applies to me in respect of this applicant.
                      </span>
                    </span>
                  </label>

                  <label
                    className={[
                      'flex cursor-pointer items-start gap-3 border-l-2 px-4 py-3',
                      choice === 'conflict' ? 'border-l-seal bg-seal-wash' : 'border-l-rule bg-ledger',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="coi"
                      checked={choice === 'conflict'}
                      onChange={() => setChoice('conflict')}
                      className="mt-1 h-4 w-4 accent-[color:var(--verify)]"
                    />
                    <span>
                      <span className="block text-body text-ink">I declare a conflict</span>
                      <span className="block text-micro text-ink-soft">
                        This recuses you from this application and notifies the programme management unit. It does not
                        affect your other assignments.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

              {choice === 'conflict' ? (
                <div className="mb-6">
                  <Field
                    label="The nature of the conflict"
                    required
                    hint="At least 15 characters. The programme management unit reads this and decides how to reassign."
                    aside={`${nature.trim().length} / 15`}
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

              <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
                <Button
                  tone={choice === 'conflict' ? 'destructive' : 'primary'}
                  unavailableReason={
                    choice === null
                      ? 'Choose whether you have a conflict first.'
                      : choice === 'conflict' && nature.trim().length < 15
                        ? `Describe the conflict in at least ${15 - nature.trim().length} more characters.`
                        : undefined
                  }
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
                          if (choice === 'conflict') {
                            track({ name: 'coi_conflict_declared', evaluatorId: 'self', applicationId: d.applicationId });
                          } else {
                            track({ name: 'coi_signed', evaluatorId: 'self', applicationId: d.applicationId });
                          }
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
                <Button onClick={() => navigate('/e')}>Back to the queue without declaring</Button>
                <Badge tone="hold">A declaration cannot be withdrawn</Badge>
              </div>
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
