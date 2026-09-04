import { http } from 'msw';
import type { Role } from '@/config/rbac';
import { getDb } from '../store/db';
import { currentUser, signIn, signInAs, signOut } from '../store/session';
import { fail, gate, ok, readBody } from './util';

export const authHandlers = [
  http.get('/api/auth/me', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const user = currentUser();
    if (!user) return ok({ user: null, role: 'public' as Role });
    const db = getDb();
    return ok({
      user,
      role: user.role,
      department: db.departments.find((d) => d.id === user.departmentId) ?? null,
      startup: db.startups.find((s) => s.id === user.startupId) ?? null,
    });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const body = await readBody<{ userId?: string; role?: Role }>(request);
    const user = body.userId ? signIn(body.userId) : body.role ? signInAs(body.role) : null;
    if (!user && body.role !== 'public') {
      return fail(401, 'SIGN_IN_FAILED', 'That account does not exist in this demonstration dataset.');
    }
    return ok({ user }, user ? `Signed in as ${user.name}.` : 'Signed out. You are browsing as a member of the public.');
  }),

  http.post('/api/auth/logout', async () => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    signOut();
    return ok({ user: null }, 'Signed out.');
  }),

  http.post('/api/auth/refresh', async () => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    return ok({ user: currentUser() });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const blocked = await gate('write');
    if (blocked) return blocked;
    const body = await readBody<{ kind: 'startup' | 'expert'; legalName?: string; name?: string; email?: string }>(request);
    if (!body.email) {
      return fail(422, 'VALIDATION_FAILED', 'Registration could not be completed.', ['An email address is required.']);
    }
    return ok(
      { registered: true, kind: body.kind, email: body.email },
      body.kind === 'startup'
        ? 'Registration received. Verify your entity details to see which challenges you are eligible for.'
        : 'Registration received. The programme management unit reviews expert registrations before assignment.',
    );
  }),

  http.get('/api/auth/accounts', async () => {
    const blocked = await gate('read');
    if (blocked) return blocked;
    const db = getDb();
    // The demo role switcher lists one representative account per role.
    const byRole: Role[] = [
      'startup',
      'department_officer',
      'department_admin',
      'procurement_officer',
      'evaluator',
      'validator',
      'pmu',
    ];
    return ok(
      byRole
        .map((role) => db.users.find((u) => u.role === role))
        .filter((u): u is NonNullable<typeof u> => Boolean(u)),
    );
  }),
];
