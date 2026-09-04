import { Link, useRouteError } from 'react-router-dom';
import { errorReference } from '@/lib/ids';

export default function ServerError() {
  const error = useRouteError();
  const reference = errorReference();
  const detail = error instanceof Error ? error.message : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center px-4 py-12">
      <p className="text-label text-ink-soft tnum">500</p>
      <h1 className="mt-2 text-h1 text-ink">This page did not load.</h1>
      <p className="mt-3 max-w-doc text-body text-ink-soft">
        The failure is on our side, not yours. Nothing you had entered elsewhere has been discarded. Reload the page, and
        if it happens again quote the reference below.
      </p>
      {detail ? (
        <p className="mt-3 border-l-2 border-l-seal bg-seal-wash px-3 py-2 text-body text-ink">{detail}</p>
      ) : null}
      <p className="mt-3 text-micro text-ink-soft">Reference {reference}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-10 items-center rounded-control border border-verify bg-verify px-4 text-body text-white"
        >
          Try again
        </button>
        <Link to="/" className="inline-flex h-10 items-center rounded-control border border-rule px-4 text-body no-underline">
          Back to the demand board
        </Link>
      </div>
    </main>
  );
}
