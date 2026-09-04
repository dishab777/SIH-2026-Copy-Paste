import type { Role } from '@/config/rbac';
import type { User } from '@/types/models';
import { getDb } from './db';

/**
 * The signed-in identity, held in memory on the mock server side.
 * The demo role switcher changes it through POST /api/auth/login, exactly as a
 * real sign-in would; the client never asserts its own role to the API.
 */

const DEFAULT_BY_ROLE: Record<Role, string> = {
  public: '',
  startup: 'USR-STP-001',
  department_officer: 'USR-D01-OFF',
  department_admin: 'USR-D01-ADM',
  procurement_officer: 'USR-D01-PRO',
  evaluator: 'USR-EVAL-01',
  validator: 'USR-VAL-01',
  pmu: 'USR-PMU-01',
};

let currentUserId: string | null = 'USR-D01-OFF';

export function signIn(userId: string): User | null {
  const user = getDb().users.find((u) => u.id === userId) ?? null;
  currentUserId = user ? user.id : null;
  return user;
}

export function signInAs(role: Role): User | null {
  if (role === 'public') {
    currentUserId = null;
    return null;
  }
  return signIn(DEFAULT_BY_ROLE[role]);
}

export function signOut(): void {
  currentUserId = null;
}

export function currentUser(): User | null {
  if (!currentUserId) return null;
  return getDb().users.find((u) => u.id === currentUserId) ?? null;
}

export function currentRole(): Role {
  return currentUser()?.role ?? 'public';
}
