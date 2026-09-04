import { useState } from 'react';
import { useRecheckDpiit, useSaveStartup, useSession, useStartupProfile } from '@/services/hooks';
import { CAPABILITIES, CERTIFICATIONS, SECTORS, STATES } from '@/mocks/fixtures/reference';
import { policyNumber, citationShort } from '@/config/policies';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { PanelSkeleton, InlineNote } from '@/components/ui/Feedback';
import { KeyValueSheet } from '@/components/ledger/Ledger';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Nav';
import { Field, MultiSelectTags, Textarea } from '@/components/ui/Field';
import { day, fileSize, num, shortHash, countOf } from '@/lib/format';
import { readClock } from '@/lib/sla';
import { useUi } from '@/store/ui';
import { PrayogApiError } from '@/services/api';
import { platformNow, platformNowIso } from '@/config/clock';

export default function StartupProfile() {
  const session = useSession();
  const startupId = session.data?.data.startup?.id;
  const query = useStartupProfile(startupId);
  const save = useSaveStartup(startupId);
  const recheck = useRecheckDpiit(startupId);
  const pushToast = useUi((s) => s.pushToast);

  const [tab, setTab] = useState('entity');
  const [capabilities, setCapabilities] = useState<string[] | null>(null);
  const [industries, setIndustries] = useState<string[] | null>(null);
  const [certifications, setCertifications] = useState<string[] | null>(null);
  const [statesServed, setStatesServed] = useState<string[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <div>
      <QueryState query={query} errorTitle="Unable to load your profile." loading={<PanelSkeleton lines={10} />}>
        {(payload) => {
          const { startup: s, documents } = payload.data;
          const expired = s.dpiit.status === 'expired';
          const pending = s.dpiit.verification === 'pending';
          const failedScans = documents.filter((d) => d.scan === 'failed');
          const expiring = documents.filter(
            (d) => d.validTo && new Date(d.validTo).getTime() - platformNow().getTime() < 60 * 86_400_000,
          );

          return (
            <>
              <PageHeader
                title="Company profile"
                lead="Screening runs against these verified facts, not against a fresh declaration on each application. Keeping them current is what keeps your eligibility automatic."
                servedAt={payload.servedAt}
                onRefresh={() => void query.refetch()}
                aside={<StatusBadge status={s.dpiit.status} />}
              />

              {expired ? (
                <div className="mb-6">
                  <InlineNote tone="seal" title="Your startup recognition has expired">
                    <p className="max-w-doc">
                      It expired on {day(s.dpiit.validTo)}. Prior turnover and prior experience relief no longer applies
                      automatically, and any application you have open will move to needs review rather than being
                      rejected. Renew the recognition and re-check it here.
                    </p>
                  </InlineNote>
                </div>
              ) : pending ? (
                <div className="mb-6">
                  <InlineNote tone="hold" title="Recognition is awaiting verification">
                    <p className="max-w-doc">
                      This is not an error. Verification against the recognition register normally completes within a
                      day, and until then relief is not applied automatically.
                    </p>
                  </InlineNote>
                </div>
              ) : null}

              {failedScans.length > 0 ? (
                <div className="mb-6">
                  <InlineNote tone="seal" title={`${countOf(failedScans.length, 'uploaded file has', 'uploaded files have')} failed a scan`}>
                    <p>
                      {failedScans.map((d) => d.type).join(', ')}. Replace the file — a failed scan blocks the document
                      from being read by anyone, including you.
                    </p>
                  </InlineNote>
                </div>
              ) : null}

              <Tabs
                items={[
                  { id: 'entity', label: 'Entity' },
                  { id: 'recognition', label: 'Recognition' },
                  { id: 'capabilities', label: 'Capabilities' },
                  { id: 'documents', label: 'Documents', count: documents.length },
                  { id: 'payment', label: 'Payment profile' },
                ]}
                value={tab}
                onChange={setTab}
              >
                {tab === 'entity' ? (
                  <KeyValueSheet
                    headingLevel={2}
                    title="Entity"
                    items={[
                      { label: 'Legal name', value: s.legalName },
                      { label: 'Trading name', value: s.tradeName },
                      { label: 'Corporate identification number', value: <span className="tnum">{s.cin}</span> },
                      {
                        label: 'GSTIN',
                        value: (
                          <span>
                            <span className="tnum">{s.gstin}</span>
                            <span className="ml-2">
                              <StatusBadge status={s.gstStatus} />
                            </span>
                          </span>
                        ),
                        hint: 'A live registration is needed to raise an invoice against an accepted milestone.',
                      },
                      { label: 'Udyam registration', value: <span className="tnum">{s.udyam}</span> },
                      { label: 'Entity type', value: s.entityType.replace(/_/g, ' ') },
                      {
                        label: 'Incorporated',
                        value: day(s.incorporationDate),
                        hint: `The statutory ceiling for startup recognition is ${policyNumber('eligibility.startup.maxAgeYears')} years from incorporation.`,
                        citation: citationShort('DPIIT-2019-127'),
                      },
                      { label: 'Registered office', value: `${s.city}, ${s.state}` },
                      { label: 'Turnover on record', value: `₹${num(s.turnoverCrore, 2)} crore` },
                    ]}
                    footnote="These come from the registers. Changing them here does not change the register; correct them at source and re-check."
                  />
                ) : null}

                {tab === 'recognition' ? (
                  <div className="flex flex-col gap-4">
                    <KeyValueSheet
                      headingLevel={2}
                      title="Startup recognition"
                      items={[
                        { label: 'Status', value: <StatusBadge status={s.dpiit.status} /> },
                        { label: 'Recognition number', value: s.dpiit.recognitionNumber ?? 'None on file' },
                        {
                          label: 'Valid to',
                          value: s.dpiit.validTo ? day(s.dpiit.validTo) : '—',
                          hint: s.dpiit.validTo
                            ? readClock(platformNowIso(), 0).words
                            : undefined,
                        },
                        { label: 'Verification', value: <StatusBadge status={s.dpiit.verification} /> },
                        { label: 'Last checked', value: day(s.dpiit.lastCheckedAt) },
                      ]}
                      footnote="Checked when you save this profile and again at screening. A change between the two is shown to the department, never used to reject you silently."
                    />
                    <div>
                      <Button
                        loading={recheck.isPending}
                        loadingLabel="Checking"
                        onClick={() =>
                          recheck.mutate(undefined, {
                            onSuccess: (res) => pushToast('verify', res.message ?? 'Checked.'),
                            onError: () => pushToast('seal', 'The check did not complete.', 'Nothing on your profile changed.'),
                          })
                        }
                      >
                        Re-check the recognition register
                      </Button>
                    </div>
                    <InlineNote tone="neutral" title="What relief actually means">
                      <p className="max-w-doc">
                        A current recognition relaxes prior turnover and prior experience under{' '}
                        {citationShort('GFR-2017-173')}. It does not relax technical capability, quality, cybersecurity,
                        performance or safety — those bars are the same for everyone.
                      </p>
                    </InlineNote>
                  </div>
                ) : null}

                {tab === 'capabilities' ? (
                  <div className="flex flex-col gap-6">
                    <p className="max-w-doc text-body text-ink-soft">
                      Matching is deterministic and published. What you declare here is what challenges are matched
                      against, and what a screening officer sees beside your application.
                    </p>

                    <Field label="Technology capabilities" hint="Declare what you can evidence, not what you aspire to.">
                      {({ id }) => (
                        <MultiSelectTags
                          id={id}
                          values={capabilities ?? s.capabilities}
                          onChange={setCapabilities}
                          options={[...CAPABILITIES]}
                          placeholder="Add a capability"
                        />
                      )}
                    </Field>

                    <Field label="Industries you work in">
                      {({ id }) => (
                        <MultiSelectTags
                          id={id}
                          values={industries ?? s.industries}
                          onChange={setIndustries}
                          options={[...SECTORS]}
                          placeholder="Add an industry"
                        />
                      )}
                    </Field>

                    <Field label="Certifications held" hint="Security certifications are checked at screening, not relaxed.">
                      {({ id }) => (
                        <MultiSelectTags
                          id={id}
                          values={certifications ?? s.certifications}
                          onChange={setCertifications}
                          options={[...CERTIFICATIONS]}
                          placeholder="Add a certification"
                        />
                      )}
                    </Field>

                    <Field label="States you can deploy and support in">
                      {({ id }) => (
                        <MultiSelectTags
                          id={id}
                          values={statesServed ?? s.statesServed}
                          onChange={setStatesServed}
                          options={[...STATES, 'Gujarat', 'Tamil Nadu', 'Telangana', 'Kerala']}
                          placeholder="Add a state"
                        />
                      )}
                    </Field>

                    <Field label="One-line summary" hint="Shown on your public profile and beside your applications.">
                      {({ id }) => (
                        <Textarea
                          id={id}
                          rows={3}
                          value={summary ?? s.summary}
                          onChange={(e) => setSummary(e.target.value)}
                        />
                      )}
                    </Field>

                    <section>
                      <h3 className="mb-3 text-h3 text-ink">Past deployments</h3>
                      <ul className="sheet-flat">
                        {s.deployments.map((dep) => (
                          <li key={dep.id} className="ledger-row flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                            <span className="min-w-0 max-w-doc">
                              <span className="block text-body text-ink">{dep.client}</span>
                              <span className="block text-micro text-ink-soft">{dep.summary}</span>
                              <span className="block text-micro text-ink-soft tnum">{dep.year}</span>
                            </span>
                            <span className="flex shrink-0 gap-2">
                              {dep.isGovernment ? <Badge tone="neutral">Government</Badge> : null}
                              {dep.validated ? (
                                <Badge tone="verify">Independently validated</Badge>
                              ) : (
                                <Badge tone="neutral">Self-declared</Badge>
                              )}
                            </span>
                          </li>
                        ))}
                        {s.deployments.length === 0 ? (
                          <li className="px-4 py-3 text-body text-ink-soft">
                            None recorded. A recognised startup can be relieved of a prior-experience requirement, so
                            this does not block you — but a validated deployment scores better than a declared one.
                          </li>
                        ) : null}
                      </ul>
                    </section>

                    <div>
                      <Button
                        tone="primary"
                        loading={save.isPending}
                        loadingLabel="Saving"
                        onClick={() =>
                          save.mutate(
                            {
                              capabilities: capabilities ?? s.capabilities,
                              industries: industries ?? s.industries,
                              certifications: certifications ?? s.certifications,
                              statesServed: statesServed ?? s.statesServed,
                              summary: summary ?? s.summary,
                            },
                            {
                              onSuccess: (res) => pushToast('verify', res.message ?? 'Profile saved.'),
                              onError: (err) => {
                                const api = err instanceof PrayogApiError ? err : null;
                                pushToast(
                                  'seal',
                                  api?.message ?? 'Unable to save. Your changes are preserved.',
                                  'Nothing you typed has been lost.',
                                );
                              },
                            },
                          )
                        }
                      >
                        Save your profile
                      </Button>
                    </div>
                  </div>
                ) : null}

                {tab === 'documents' ? (
                  <div className="flex flex-col gap-4">
                    {expiring.length > 0 ? (
                      <InlineNote tone="hold" title={`${countOf(expiring.length, 'document expires', 'documents expire')} within sixty days`}>
                        An expired document moves an application to needs review. Replace them before that happens.
                      </InlineNote>
                    ) : null}
                    <ul className="sheet-flat">
                      {documents.map((doc) => (
                        <li
                          key={doc.id}
                          className={[
                            'ledger-row border-l-2 px-4 py-3',
                            doc.scan === 'failed'
                              ? 'border-l-seal bg-seal-wash'
                              : doc.validTo && new Date(doc.validTo).getTime() < platformNow().getTime()
                                ? 'border-l-seal bg-seal-wash'
                                : doc.verification === 'pending'
                                  ? 'border-l-hold bg-hold-wash'
                                  : 'border-l-transparent',
                          ].join(' ')}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-body text-ink">{doc.type}</p>
                              <p className="mt-0.5 text-micro text-ink-soft">
                                {doc.fileName} · {fileSize(doc.sizeBytes)} · uploaded {day(doc.uploadedOn)}
                              </p>
                              {doc.validTo ? (
                                <p className="mt-0.5 text-micro text-ink-soft">Valid to {day(doc.validTo)}</p>
                              ) : null}
                              <p className="mt-0.5 text-micro text-ink-soft tnum">Checksum {shortHash(doc.hash)}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <StatusBadge
                                status={doc.scan}
                                label={
                                  doc.scan === 'clean' ? 'Scan clean' : doc.scan === 'pending' ? 'Scan pending' : 'Scan failed'
                                }
                              />
                              <StatusBadge status={doc.verification} />
                              {doc.scan === 'failed' ? (
                                <Button size="sm" tone="destructive">
                                  Replace this file
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {tab === 'payment' ? (
                  <div className="flex flex-col gap-4">
                    <KeyValueSheet
                      headingLevel={2}
                      title="Payment profile"
                      items={[
                        { label: 'Bank account', value: <span className="tnum">{s.bankAccountMasked}</span> },
                        { label: 'GST registration', value: <StatusBadge status={s.gstStatus} /> },
                        {
                          label: 'Payment limit',
                          value: `${policyNumber('payment.milestone.limit.days')} days from milestone acceptance`,
                          citation: citationShort('PRAYOG-SOP-9'),
                        },
                        {
                          label: 'Maximum deduction',
                          value: `${policyNumber('payment.deduction.max.percent')}% of a claim`,
                          hint: 'A larger deduction needs a separate competent-authority order and cannot be applied by a department.',
                        },
                      ]}
                    />
                    <InlineNote tone="neutral" title="Bank details are managed in your payment profile">
                      They are deliberately not editable from this application. A change of account is handled through
                      the payment profile with its own verification, because a payment redirected by a compromised
                      session is not recoverable.
                    </InlineNote>
                  </div>
                ) : null}
              </Tabs>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
