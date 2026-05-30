'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input, Modal, Pagination, Popconfirm, Select } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE, AUTH_THEME } from '@/commons/constants';
import { ROLE } from '@/commons/constants/permissions';
import { useSessionQuery } from '@/modules/auth/queries';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import styles from './members.module.css';

interface Member {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

interface ApiFieldError {
  field: string;
  message: string;
  code?: string;
}

interface ApiResponseBody {
  data?: unknown;
  message?: string;
  error?: {
    code?: string;
    details?: {
      fields?: unknown;
    };
  };
}

class ApiRequestError extends Error {
  fields: ApiFieldError[];

  constructor(message: string, fields: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.fields = fields;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

const ASSIGNABLE_ROLES = [
  { value: ROLE.MANAGER, label: 'Manager' },
  { value: ROLE.REVIEWER, label: 'Reviewer' },
  { value: ROLE.MEMBER, label: 'Member' },
];

const ROLE_LABELS: Record<string, string> = {
  [ROLE.OWNER]: 'Owner',
  [ROLE.MANAGER]: 'Manager',
  [ROLE.REVIEWER]: 'Reviewer',
  [ROLE.MEMBER]: 'Member',
};

const ROLE_HELP: Record<string, string> = {
  [ROLE.MANAGER]: 'Can invite members, manage access, and coordinate reviews.',
  [ROLE.REVIEWER]: 'Can inspect findings and participate in security review.',
  [ROLE.MEMBER]: 'Can view workspace context with limited review actions.',
};

type ActiveTab = 'members' | 'pending';

function useAuthHeaders() {
  const session = useSessionQuery();
  return { Authorization: `Bearer ${session.data?.accessToken ?? ''}` };
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResponseBody;
  if (!res.ok) {
    const fields = normalizeFieldErrors(json.error?.details?.fields);
    const fallbackMessage = fields.length ? 'Please fix the highlighted fields.' : `Error ${res.status}`;
    throw new ApiRequestError(json.message ?? fallbackMessage, fields);
  }
  return json.data as T;
}

function useMembersQuery(workspaceId: string | undefined) {
  const headers = useAuthHeaders();

  return useQuery<Member[]>({
    queryKey: ['members', workspaceId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/members`, { headers });
      return parseApiResponse<Member[]>(res);
    },
    enabled: !!workspaceId,
  });
}

function useInvitationsQuery(workspaceId: string | undefined) {
  const headers = useAuthHeaders();

  return useQuery<Invitation[]>({
    queryKey: ['invitations', workspaceId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/invitations`, { headers });
      return parseApiResponse<Invitation[]>(res);
    },
    enabled: !!workspaceId,
  });
}

function FaIcon({ icon }: { icon: string }) {
  return <i className={`fa-solid ${icon}`} aria-hidden="true" />;
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email;
  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'U';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

function roleClass(role: string) {
  if (role === ROLE.OWNER) return styles.pillPurple;
  if (role === ROLE.MANAGER) return styles.pillBlue;
  if (role === ROLE.REVIEWER) return styles.pillTeal;
  return styles.pillSlate;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function normalizeFieldErrors(value: unknown): ApiFieldError[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const field = typeof record.field === 'string' ? record.field : 'field';
    const message = typeof record.message === 'string' ? record.message : '';
    const code = typeof record.code === 'string' ? record.code : undefined;

    return message ? [{ field, message, code }] : [];
  });
}

function fieldErrors(error: unknown) {
  return error instanceof ApiRequestError ? error.fields : [];
}

function fieldErrorMessage(error: unknown, field: string) {
  return fieldErrors(error).find((item) => item.field === field)?.message;
}

function formatFieldLabel(field: string) {
  return field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

const DEBOUNCE_MS = 300;

function useDebouncedValue(value: string, delay = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function MembersPage() {
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id;
  const currentUserId = session.data?.user?.id;
  const currentRole = session.data?.workspace?.role;
  const members = useMembersQuery(workspaceId);
  const invitations = useInvitationsQuery(workspaceId);
  const queryClient = useQueryClient();
  const headers = useAuthHeaders();

  const [activeTab, setActiveTab] = useState<ActiveTab>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [inviteSearch, setInviteSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(10);
  const [invitePage, setInvitePage] = useState(1);
  const [invitePageSize, setInvitePageSize] = useState(10);
  const [editModal, setEditModal] = useState<{ userId: string; currentRole: string; email: string } | null>(null);
  const [newRole, setNewRole] = useState('');
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLE.REVIEWER);

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      await parseApiResponse<null>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
      setEditModal(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE', headers });
      await parseApiResponse<null>(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', workspaceId] }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/invitations/${invitationId}`, { method: 'DELETE', headers });
      await parseApiResponse<null>(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations', workspaceId] }),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/auth/invite`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'X-Workspace-Id': workspaceId ?? '' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      await parseApiResponse<null>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', workspaceId] });
      setInviteModal(false);
      setInviteEmail('');
      setInviteRole(ROLE.REVIEWER);
      setActiveTab('pending');
    },
  });

  const isOwner = currentRole === ROLE.OWNER;
  const isManager = currentRole === ROLE.OWNER || currentRole === ROLE.MANAGER;
  const memberRows = useMemo(() => members.data ?? [], [members.data]);
  const invitationRows = useMemo(() => invitations.data ?? [], [invitations.data]);

  const debouncedMemberSearch = useDebouncedValue(memberSearch);
  const debouncedInviteSearch = useDebouncedValue(inviteSearch);

  const filteredMembers = useMemo(() => {
    const query = debouncedMemberSearch.trim().toLowerCase();

    return memberRows.filter((member) => {
      const matchesQuery = !query || `${member.name} ${member.email}`.toLowerCase().includes(query);
      const matchesRole = !roleFilter || member.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [memberRows, debouncedMemberSearch, roleFilter]);

  const filteredInvitations = useMemo(() => {
    const query = debouncedInviteSearch.trim().toLowerCase();
    return invitationRows.filter((invite) => !query || `${invite.email} ${invite.role}`.toLowerCase().includes(query));
  }, [invitationRows, debouncedInviteSearch]);

  const paginatedMembers = filteredMembers.slice((memberPage - 1) * memberPageSize, memberPage * memberPageSize);
  const paginatedInvitations = filteredInvitations.slice((invitePage - 1) * invitePageSize, invitePage * invitePageSize);

  const mutationError = changeRoleMutation.error ?? removeMutation.error ?? revokeMutation.error;
  const inviteErrorFields = fieldErrors(inviteMutation.error);
  const serverEmailError = fieldErrorMessage(inviteMutation.error, 'email');
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());
  const localEmailError = inviteEmail.trim().length > 0 && !isValidEmail ? 'Please enter a valid email address' : undefined;
  const inviteEmailError = localEmailError ?? serverEmailError;
  const canSendInvite = isValidEmail;

  return (
    <div className={styles.membersPage}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.eyebrow}>Workspace access</div>
          <h1>Members</h1>
          <p>Invite reviewers, assign roles, and keep pending access requests visible.</p>
        </div>
        {isManager && (
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={() => setInviteModal(true)}>
            <FaIcon icon="fa-user-plus" />
            Invite member
          </button>
        )}
      </header>

      <section className={styles.summaryGrid} aria-label="Workspace access summary">
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Active members</span>
          <strong>{memberRows.length}</strong>
          <span className={styles.summaryMeta}>Current workspace users</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Pending invitations</span>
          <strong>{invitationRows.length}</strong>
          <span className={styles.summaryMeta}>Waiting for accept</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Your role</span>
          <strong>{roleLabel(currentRole ?? ROLE.MEMBER)}</strong>
          <span className={styles.summaryMeta}>{isManager ? 'Can manage access' : 'View-only access'}</span>
        </div>
      </section>

      {mutationError && (
        <div className={styles.errorBanner} role="alert">
          <FaIcon icon="fa-circle-exclamation" />
          {errorMessage(mutationError)}
        </div>
      )}

      <section className={styles.surface}>
        <div className={styles.tabBar} role="tablist" aria-label="Members and invitations">
          <button
            className={`${styles.tabButton} ${activeTab === 'members' ? styles.tabButtonActive : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'members'}
            onClick={() => setActiveTab('members')}
          >
            <FaIcon icon="fa-users" />
            Members
            <span>{memberRows.length}</span>
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'pending' ? styles.tabButtonActive : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
          >
            <FaIcon icon="fa-envelope-open-text" />
            Pending invitations
            <span>{invitationRows.length}</span>
          </button>
        </div>

        {activeTab === 'members' ? (
          <div className={styles.panel} role="tabpanel">
            <div className={styles.toolbar}>
              <Input
                allowClear
                className={styles.searchInput}
                placeholder="Search members"
                prefix={<FaIcon icon="fa-magnifying-glass" />}
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
              />
              <Select
                className={styles.filterSelect}
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: '', label: 'All roles' },
                  { value: ROLE.OWNER, label: 'Owner' },
                  { value: ROLE.MANAGER, label: 'Manager' },
                  { value: ROLE.REVIEWER, label: 'Reviewer' },
                  { value: ROLE.MEMBER, label: 'Member' },
                ]}
              />
            </div>

            {members.isLoading ? (
              <LoadingState text="Loading members..." />
            ) : filteredMembers.length ? (
              <>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th className={styles.alignRight}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMembers.map((member) => {
                      const isSelf = member.userId === currentUserId;
                      const isRecordOwner = member.role === ROLE.OWNER;

                      return (
                        <tr key={member.userId}>
                          <td>
                            <div className={styles.identityCell}>
                              <div className={styles.avatar}>{getInitials(member.name, member.email)}</div>
                              <div>
                                <div className={styles.primaryText}>{member.name}</div>
                                <div className={styles.secondaryText}>{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className={`${styles.pill} ${roleClass(member.role)}`}>{roleLabel(member.role)}</span></td>
                          <td><span className={`${styles.pill} ${styles.pillTeal}`}>Active</span></td>
                          <td className={styles.secondaryText}>{formatDate(member.joinedAt)}</td>
                          <td>
                            <div className={styles.actionGroup}>
                              {isManager && !isSelf && !isRecordOwner ? (
                                <>
                                  {isOwner && (
                                    <button
                                      className={styles.btnSmall}
                                      type="button"
                                      onClick={() => {
                                        setEditModal({ userId: member.userId, currentRole: member.role, email: member.email });
                                        setNewRole(member.role);
                                      }}
                                    >
                                      <FaIcon icon="fa-pen" />
                                      Edit
                                    </button>
                                  )}
                                  <Popconfirm title="Remove this member?" onConfirm={() => removeMutation.mutate(member.userId)}>
                                    <button className={`${styles.btnSmall} ${styles.btnDanger}`} type="button">
                                      <FaIcon icon="fa-user-slash" />
                                      Remove
                                    </button>
                                  </Popconfirm>
                                </>
                              ) : (
                                <span className={styles.lockedText}>{isSelf ? 'You' : 'Locked'}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.tableFooter}>
                <span className={styles.showingText}>Showing {Math.min((memberPage - 1) * memberPageSize + 1, filteredMembers.length)}–{Math.min(memberPage * memberPageSize, filteredMembers.length)} of {filteredMembers.length}</span>
                <Pagination current={memberPage} pageSize={memberPageSize} total={filteredMembers.length} onChange={(p, ps) => { setMemberPage(p); setMemberPageSize(ps); }} showSizeChanger pageSizeOptions={['10', '25', '50']} size="small" />
              </div>
              </>
            ) : (
              <EmptyState 
                icon="fa-user-magnifying-glass" 
                title="No members found" 
                text="Try a different search term or role filter." 
              />
            )}
          </div>
        ) : (
          <div className={styles.panel} role="tabpanel">
            <div className={styles.toolbar}>
              <Input
                allowClear
                className={styles.searchInput}
                placeholder="Search pending invitations"
                prefix={<FaIcon icon="fa-magnifying-glass" />}
                value={inviteSearch}
                onChange={(event) => setInviteSearch(event.target.value)}
              />
            </div>

            {invitations.isLoading ? (
              <LoadingState text="Loading members..." />
            ) : filteredInvitations.length ? (
              <>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Sent</th>
                      <th>Expires</th>
                      <th className={styles.alignRight}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvitations.map((invite) => (
                      <tr key={invite.id}>
                        <td>
                          <div className={styles.identityCell}>
                            <div className={styles.inviteAvatar}><FaIcon icon="fa-envelope" /></div>
                            <div>
                              <div className={styles.primaryText}>{invite.email}</div>
                              <div className={styles.secondaryText}>Invitation email</div>
                            </div>
                          </div>
                        </td>
                        <td><span className={`${styles.pill} ${roleClass(invite.role)}`}>{roleLabel(invite.role)}</span></td>
                        <td><span className={`${styles.pill} ${styles.pillAmber}`}>Pending</span></td>
                        <td className={styles.secondaryText}>{formatDate(invite.createdAt)}</td>
                        <td className={styles.secondaryText}>{formatDate(invite.expiresAt)}</td>
                        <td>
                          <div className={styles.actionGroup}>
                            {isManager ? (
                              <Popconfirm title="Revoke this invitation?" onConfirm={() => revokeMutation.mutate(invite.id)}>
                                <button className={`${styles.btnSmall} ${styles.btnDanger}`} type="button">
                                  <FaIcon icon="fa-xmark" />
                                  Revoke
                                </button>
                              </Popconfirm>
                            ) : (
                              <span className={styles.lockedText}>View only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.tableFooter}>
                <span className={styles.showingText}>Showing {Math.min((invitePage - 1) * invitePageSize + 1, filteredInvitations.length)}–{Math.min(invitePage * invitePageSize, filteredInvitations.length)} of {filteredInvitations.length}</span>
                <Pagination current={invitePage} pageSize={invitePageSize} total={filteredInvitations.length} onChange={(p, ps) => { setInvitePage(p); setInvitePageSize(ps); }} showSizeChanger pageSizeOptions={['10', '25', '50']} size="small" />
              </div>
              </>
            ) : (
              <EmptyState
                icon="fa-envelope-circle-check"
                title="No pending invitations"
                text="Invitations waiting for acceptance will appear here."
              />
            )}
          </div>
        )}
      </section>

      <Modal
        title="Change role"
        open={!!editModal}
        onCancel={() => setEditModal(null)}
        onOk={() => editModal && changeRoleMutation.mutate({ userId: editModal.userId, role: newRole })}
        confirmLoading={changeRoleMutation.isPending}
        okText="Save changes"
        okButtonProps={{ style: { background: AUTH_THEME.PRIMARY, borderColor: AUTH_THEME.PRIMARY } }}
      >
        <div className={styles.modalBody}>
          <div className={styles.modalSubject}>{editModal?.email}</div>
          <Select value={newRole} onChange={setNewRole} options={ASSIGNABLE_ROLES} style={{ width: '100%' }} />
          <div className={styles.rolePreview}>
            <strong>{roleLabel(newRole)}</strong>
            <span>{ROLE_HELP[newRole] ?? 'Role permissions follow the workspace default.'}</span>
          </div>
        </div>
      </Modal>

      <Modal
        title="Invite member"
        open={inviteModal}
        onCancel={() => { setInviteModal(false); inviteMutation.reset(); }}
        onOk={() => inviteMutation.mutate()}
        confirmLoading={inviteMutation.isPending}
        okText="Send invitation"
        okButtonProps={{ style: canSendInvite ? { background: AUTH_THEME.PRIMARY, borderColor: AUTH_THEME.PRIMARY } : undefined, disabled: !canSendInvite }}
      >
        <div className={styles.modalBody}>
          {inviteMutation.error && (
            <div className={styles.errorBanner} role="alert">
              <FaIcon icon="fa-circle-exclamation" />
              <div className={styles.errorContent}>
                <strong>{errorMessage(inviteMutation.error)}</strong>
                {inviteErrorFields.length > 0 && (
                  <ul className={styles.errorList}>
                    {inviteErrorFields.map((item) => (
                      <li key={`${item.field}-${item.code ?? item.message}`}>
                        <span>{formatFieldLabel(item.field)}</span>
                        {item.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <Input
            placeholder="Email address"
            value={inviteEmail}
            onChange={(event) => {
              setInviteEmail(event.target.value);
              if (inviteMutation.error) inviteMutation.reset();
            }}
            status={inviteEmailError ? 'error' : undefined}
          />
          {inviteEmailError && <div className={styles.fieldError}>{inviteEmailError}</div>}
          <Select
            value={inviteRole}
            onChange={(value) => {
              setInviteRole(value);
              if (inviteMutation.error) inviteMutation.reset();
            }}
            options={ASSIGNABLE_ROLES}
            style={{ width: '100%' }}
          />
          <div className={styles.rolePreview}>
            <strong>{roleLabel(inviteRole)}</strong>
            <span>{ROLE_HELP[inviteRole]}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
