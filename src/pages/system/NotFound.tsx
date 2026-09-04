import { Link } from 'react-router-dom';
import { useUi } from '@/store/ui';

export default function NotFound() {
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center px-4 py-12">
      <p className="text-label text-ink-soft tnum">404</p>
      <h1 className="mt-2 text-h1 text-ink">That case does not exist, or you cannot see it.</h1>
      <p className="mt-3 max-w-doc text-body text-ink-soft">
        Case identifiers look like CH-2026-0143 for a challenge, PL-2026-0031 for a pilot and APP-2026-0087 for an
        application. If you have one, search for it.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="inline-flex h-10 items-center rounded-control border border-verify bg-verify px-4 text-body text-white"
        >
          Search by case id
        </button>
        <Link to="/" className="inline-flex h-10 items-center rounded-control border border-rule px-4 text-body no-underline">
          Back to the demand board
        </Link>
      </div>
    </main>
  );
}
