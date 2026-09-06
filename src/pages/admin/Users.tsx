import { useState } from 'react';
import { useAdminUsers, useSaveUser } from '@/services/hooks';
import { QueryState } from '@/components/layout/QueryState';
import { PageHeader } from '@/components/layout/Shell';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { TableSkeleton, InlineNote } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Nav';
import { Switch } from '@/components/ui/Field';
import { day } from '@/lib/format';
import { PrayogApiError } from '@/services/api';
import { useUi } from '@/store/ui';

export default function AdminUsers() {
  const query = useAdminUsers();
  const saveUser = useSaveUser();
  const pushToast = useUi((s) => s.pushToast);
  const [tab, setTab] = useState('users');

  return (
    <div>
      <PageHeader
        title="Users and roles"
        lead="Who holds which role, and precisely what each role is permitted to do. The matrix below is the same configuration the API enforces — it is not a description of it."
        servedAt={query.data?.servedAt}
        onRefresh={() => void query.refetch()}
      />

      <QueryState query={query} errorTitle="Unable to load users." loading={<TableSkeleton rows={8} columns={5} />}>
        {(payload) => (
          <Tabs
            items={[
              { id: 'users', label: 'Users', count: payload.data.users.length },
              { id: 'matrix', label: 'Role and action matrix' },
              { id: 'roles', label: 'Roles', count: payload.data.roles.length },
            ]}
            value={tab}
            onChange={setTab}
          >
            {tab === 'users' ? (
              <LedgerTable
                caption="User accounts"
                pageSize={12}
                exportName="prayog-users"
                rows={payload.data.users}
                rowKey={(u) => u.user.id}
                rowTone={(u) => (u.user.active ? undefined : 'neutral')}
                savedViews={[
                  { id: 'department', label: 'Departmental staff', hiddenColumns: [], filters: { role: 'department' } },
                  { id: 'evaluators', label: 'Evaluators', hiddenColumns: [], filters: { role: 'evaluator' } },
                  { id: 'startups', label: 'Startup accounts', hiddenColumns: [], filters: { role: 'startup' } },
                ]}
                columns={[
                  {
                    key: 'name',
                    header: 'Name',
                    width: '24%',
                    sortValue: (u) => u.user.name,
                    filterValue: (u) => `${u.user.name} ${u.user.email}`,
                    render: (u) => (
                      <span>
                        <span className="block text-body text-ink">{u.user.name}</span>
                        <span className="block text-micro text-ink-soft">{u.user.email}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'role',
                    header: 'Role',
                    sortValue: (u) => u.user.role,
                    filterValue: (u) => u.user.role,
                    render: (u) => (
                      <span>
                        <Badge tone="neutral">
                          {payload.data.roles.find((r) => r.id === u.user.role)?.label ?? u.user.role}
                        </Badge>
                        <span className="mt-0.5 block text-micro text-ink-soft">{u.user.designation}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'org',
                    header: 'Organisation',
                    filterValue: (u) => u.department ?? u.startup ?? '',
                    render: (u) => u.department ?? u.startup ?? <span className="text-ink-soft">Programme-wide</span>,
                  },
                  {
                    key: 'active',
                    header: 'Active',
                    sortValue: (u) => (u.user.active ? 1 : 0),
                    render: (u) => (
                      <Switch
                        checked={u.user.active}
                        label={u.user.active ? 'Active' : 'Suspended'}
                        onChange={(v) =>
                          saveUser.mutate(
                            { id: u.user.id, active: v },
                            {
                              onSuccess: () =>
                                pushToast('verify', `${u.user.name} is now ${v ? 'active' : 'suspended'}.`),
                              onError: (err) => {
                                const api = err instanceof PrayogApiError ? err : null;
                                pushToast('seal', api?.message ?? 'The change was not saved.');
                              },
                            },
                          )
                        }
                      />
                    ),
                  },
                  {
                    key: 'lastActive',
                    header: 'Last active',
                    align: 'right',
                    sortValue: (u) => u.user.lastActiveAt,
                    render: (u) => day(u.user.lastActiveAt),
                  },
                ]}
              />
            ) : null}

            {tab === 'matrix' ? (
              <div className="flex flex-col gap-4">
                <InlineNote tone="neutral" title="This matrix is the configuration, not a picture of it">
                  Every API call re-checks these permissions server-side. A control the frontend shows you cannot succeed
                  if the matrix says otherwise, and a control it hides is still refused at the API.
                </InlineNote>

                <div className="overflow-auto scroll-quiet">
                  <table className="w-full border-collapse text-data">
                    <caption className="sr-only">Role by resource and action</caption>
                    <thead>
                      <tr className="rule-close">
                        <th
                          scope="col"
                          className="sticky left-0 border-b border-rule bg-sheet px-3 py-2 text-left text-label text-ink-soft"
                        >
                          Resource
                        </th>
                        {payload.data.roles.map((r) => (
                          <th
                            key={r.id}
                            scope="col"
                            className="border-b border-rule px-3 py-2 text-left text-label text-ink-soft"
                          >
                            {r.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payload.data.resources.map((resource) => (
                        <tr key={resource} className="ledger-row">
                          <th
                            scope="row"
                            className="sticky left-0 bg-sheet px-3 py-2 text-left align-top text-body font-normal text-ink"
                          >
                            {resource.replace(/_/g, ' ')}
                          </th>
                          {payload.data.roles.map((r) => {
                            const actions = payload.data.matrix[r.id]?.[resource] ?? [];
                            return (
                              <td key={r.id} className="px-3 py-2 align-top">
                                {actions.length === 0 ? (
                                  <span className="text-micro text-ink-soft">—</span>
                                ) : (
                                  <span className="flex flex-wrap gap-1">
                                    {actions.map((a) => (
                                      <span
                                        key={a}
                                        className="border border-rule bg-verify-wash px-1 text-micro text-ink"
                                      >
                                        {a}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-micro text-ink-soft">
                  Actions in use: {payload.data.actions.join(' · ')}. A blank cell means the role cannot touch that
                  resource at all.
                </p>
              </div>
            ) : null}

            {tab === 'roles' ? (
              <ul className="sheet-flat">
                {payload.data.roles.map((r) => {
                  const resources = payload.data.resources.filter(
                    (res) => (payload.data.matrix[r.id]?.[res] ?? []).length > 0,
                  );
                  return (
                    <li key={r.id} className="ledger-row px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 max-w-doc">
                          <p className="text-body text-ink">{r.label}</p>
                          <p className="mt-0.5 text-micro text-ink-soft">{r.description}</p>
                          <p className="mt-2 text-micro text-ink-soft">
                            Can act on: {resources.join(', ') || 'nothing'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone="neutral">Portal {r.portal}</Badge>
                          <span className="text-micro text-ink-soft tnum">
                            {payload.data.users.filter((u) => u.user.role === r.id).length} accounts
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Tabs>
        )}
      </QueryState>

      <div className="mt-8">
        <InlineNote tone="hold" title="The frontend is never the only protection">
          Suspending an account here stops it at the API, not merely in the interface. That distinction is the whole
          point of holding this matrix as configuration rather than as component logic.
        </InlineNote>
      </div>

      <div className="mt-4">
        <Button
          onClick={() =>
            pushToast(
              'verify',
              'Accounts come from government single sign-on.',
              'In this build that provider is a mock. Roles are assigned here; identities are not created here.',
            )
          }
        >
          How are accounts created?
        </Button>
      </div>
    </div>
  );
}
