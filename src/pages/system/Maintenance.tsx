import { Link } from 'react-router-dom';

export default function Maintenance() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center px-4 py-12">
      <h1 className="text-h1 text-ink">PRAYOG is closed for scheduled maintenance.</h1>
      <p className="mt-3 max-w-doc text-body text-ink-soft">
        Application windows, gate decision clocks and payment ageing clocks are all suspended for the duration and
        resume where they stopped. No deadline passes while the service is down.
      </p>
      <dl className="mt-6 sheet-flat">
        <div className="flex items-baseline justify-between border-b border-rule px-4 py-3">
          <dt className="text-body text-ink">Expected back</dt>
          <dd className="text-data text-ink">Within two hours</dd>
        </div>
        <div className="flex items-baseline justify-between px-4 py-3">
          <dt className="text-body text-ink">Public pages</dt>
          <dd className="text-data text-ink">Still available</dd>
        </div>
      </dl>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-control border border-rule px-4 text-body no-underline"
        >
          Back to the demand board
        </Link>
      </div>
    </main>
  );
}
