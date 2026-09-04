import { Link } from 'react-router-dom';
import { ROLES } from '@/config/rbac';

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center px-4 py-12">
      <p className="text-label text-ink-soft tnum">403</p>
      <h1 className="mt-2 text-h1 text-ink">You can view this programme, but not this record.</h1>
      <p className="mt-3 max-w-doc text-body text-ink-soft">
        This action needs a role your account does not hold. Nothing has been hidden from you silently — the API refused
        the request, and this page is the refusal.
      </p>
      <div className="mt-6 sheet-flat">
        <p className="border-b border-ink px-4 py-2 text-label text-ink">Who can act here</p>
        <ul>
          {ROLES.filter((r) => r.id !== 'public').map((r) => (
            <li key={r.id} className="ledger-row px-4 py-2">
              <span className="block text-body text-ink">{r.label}</span>
              <span className="block text-micro text-ink-soft">{r.description}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/login"
          className="inline-flex h-10 items-center rounded-control border border-verify bg-verify px-4 text-body text-white no-underline"
        >
          Sign in with another role
        </Link>
        <Link to="/" className="inline-flex h-10 items-center rounded-control border border-rule px-4 text-body no-underline">
          Back to the demand board
        </Link>
      </div>
    </main>
  );
}
