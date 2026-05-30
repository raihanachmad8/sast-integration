'use client';

import type { CSSProperties } from 'react';
import { Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useWorkspacesQuery, useCreateWorkspaceMutation, useSwitchWorkspaceMutation } from '@/modules/workspace/queries';
import { useConfigQuery, useSessionQuery, useSignoutMutation } from '@/modules/auth/queries';
import { ROUTES, AUTH_THEME } from '@/commons/constants';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { WORKSPACE_MODE } from '@/server/modules/auth/constants';

function FaIcon({ icon, style }: { icon: string; style?: CSSProperties }) {
  return <i className={`fa-solid ${icon}`} aria-hidden="true" style={style} />;
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'W';
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatJoinedDate(value: string) {
  const joinedAt = new Date(value);
  const today = new Date();

  if (
    joinedAt.getFullYear() === today.getFullYear() &&
    joinedAt.getMonth() === today.getMonth() &&
    joinedAt.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  return `Joined ${joinedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

const pageStyle = {
  minHeight: '100vh',
  background: '#eef3f8',
  padding: '36px clamp(24px, 3.4vw, 64px)',
  color: '#0f172a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const contentStyle = {
  width: '100%',
  maxWidth: 1742,
} as const;

const metaRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 18,
  color: '#42526b',
} as const;

const metaIconStyle = {
  width: 16,
  color: '#94a3b8',
  fontSize: 15,
  display: 'inline-flex',
  justifyContent: 'center',
} as const;

const emptyStateShellStyle = {
  ...pageStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
} as const;

const emptyStateCardStyle = {
  width: '100%',
  maxWidth: 760,
  border: '1px solid #dbe3ec',
  borderRadius: 10,
  background: '#fff',
  boxShadow: '0 12px 32px rgba(15,23,42,0.08)',
  overflow: 'hidden',
} as const;

const emptyStateHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 24,
  flexWrap: 'wrap',
  borderBottom: '1px solid #e2e8f0',
  padding: '24px 28px',
} as const;

const emptyStateBodyStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
  gap: 28,
  padding: '28px',
} as const;

const emptyStateActionStyle = {
  minHeight: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#0f172a',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 650,
  padding: '7px 13px',
  whiteSpace: 'nowrap',
  boxShadow: '0 1px 1px rgba(15,23,42,0.03)',
} as const;

const primaryEmptyActionStyle = {
  ...emptyStateActionStyle,
  border: `1px solid ${AUTH_THEME.PRIMARY}`,
  background: AUTH_THEME.PRIMARY,
  color: '#fff',
  boxShadow: '0 4px 12px rgba(15,118,110,0.22)',
} as const;

const emptyStepStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  color: '#42526b',
  fontSize: 14,
  lineHeight: '21px',
} as const;

export default function WorkspaceChooserPage() {
  const router = useRouter();
  const session = useSessionQuery();
  const workspaces = useWorkspacesQuery();
  const switchMutation = useSwitchWorkspaceMutation();
  const createMutation = useCreateWorkspaceMutation();
  const signout = useSignoutMutation();
  const config = useConfigQuery();
  const hasValidSession = Boolean(session.data?.accessToken);
  const workspaceMode = config.data?.workspaceMode ?? WORKSPACE_MODE.SINGLE;
  const isSingleMode = workspaceMode === WORKSPACE_MODE.SINGLE;
  const canCreatePersonal = hasValidSession && workspaceMode === WORKSPACE_MODE.MULTIPLE;

  const handleSelect = (ws: { id: string; slug: string }) => {
    switchMutation.mutate(ws.id, { onSuccess: () => router.push(ROUTES.WORKSPACE.DASHBOARD(ws.slug)) });
  };

  const handleSignout = () => {
    if (session.data?.accessToken) {
      signout.mutate(session.data.accessToken, { onSettled: () => { window.location.href = ROUTES.AUTH.SIGNIN; } });
      return;
    }

    window.location.href = ROUTES.AUTH.SIGNIN;
  };

  const handleCreatePersonal = () => {
    if (!hasValidSession) {
      window.location.href = ROUTES.AUTH.SIGNIN;
      return;
    }

    createMutation.mutate(
      { name: 'Personal Workspace', type: WORKSPACE.TYPE.PERSONAL },
      { onSuccess: (ws) => router.push(ROUTES.WORKSPACE.DASHBOARD(ws.slug)) },
    );
  };

  if (workspaces.isLoading || session.isLoading || config.isLoading) {
    return <div style={{ ...pageStyle, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>;
  }

  if (!workspaces.data || workspaces.data.length === 0) {
    return (
      <div style={emptyStateShellStyle}>
        <section style={emptyStateCardStyle} aria-labelledby="workspace-access-title">
          <div style={emptyStateHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: AUTH_THEME.PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', boxShadow: '0 1px 2px rgba(15,23,42,0.08)' }}>
                <FaIcon icon="fa-shield-halved" style={{ fontSize: 20 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 id="workspace-access-title" style={{ margin: 0, color: '#0f172a', fontSize: 22, lineHeight: '28px', fontWeight: 750, letterSpacing: 0 }}>
                    Workspace access required
                  </h1>
                  <span style={{ borderRadius: 999, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 800, lineHeight: 1, padding: '5px 8px' }}>
                    No workspace
                  </span>
                </div>
                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 14, lineHeight: '20px' }}>
                  This account is active, but it is not connected to an active workspace.
                </p>
              </div>
            </div>

            <button onClick={handleSignout} style={emptyStateActionStyle}>
              <FaIcon icon="fa-arrow-left" style={{ fontSize: 13 }} />
              Back to sign in
            </button>
          </div>

          <div style={emptyStateBodyStyle}>
            <div>
              <p style={{ margin: 0, color: '#334155', fontSize: 15, lineHeight: '24px' }}>
                {isSingleMode
                  ? 'Workspaces scope repositories, scans, findings, and permissions. Use an invitation link to join a workspace and continue.'
                  : 'Workspaces scope repositories, scans, findings, and permissions. Create your personal workspace to continue, or use an invitation link to join an organization.'}
              </p>

              <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>
                <div style={emptyStepStyle}>
                  <FaIcon icon={isSingleMode ? 'fa-envelope-circle-check' : 'fa-circle-check'} style={{ width: 18, color: AUTH_THEME.PRIMARY, fontSize: 14, marginTop: 3 }} />
                  <span>
                    {isSingleMode
                      ? 'Registration is invitation-only. Use the invitation link sent to your email address.'
                      : 'New self-service accounts receive one personal workspace automatically during signup.'}
                  </span>
                </div>
                <div style={emptyStepStyle}>
                  <FaIcon icon="fa-envelope-open-text" style={{ width: 18, color: AUTH_THEME.PRIMARY, fontSize: 14, marginTop: 3 }} />
                  <span>Organization workspace access remains invitation-only and cannot be created from this screen.</span>
                </div>
                <div style={emptyStepStyle}>
                  <FaIcon icon="fa-user-shield" style={{ width: 18, color: AUTH_THEME.PRIMARY, fontSize: 14, marginTop: 3 }} />
                  <span>If you expected access, ask an owner or manager to send a new invitation to this email address.</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
                {canCreatePersonal ? (
                  <button onClick={handleCreatePersonal} style={primaryEmptyActionStyle} disabled={createMutation.isPending}>
                    <FaIcon icon="fa-plus" style={{ fontSize: 13 }} />
                    {createMutation.isPending ? 'Creating workspace...' : 'Create personal workspace'}
                  </button>
                ) : !hasValidSession ? (
                  <span role="alert" style={{ alignSelf: 'center', color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
                    Session expired. Sign in again to continue.
                  </span>
                ) : (
                  <span style={{ alignSelf: 'center', color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                    Waiting for a workspace invitation.
                  </span>
                )}
                {createMutation.error && (
                  <span role="alert" style={{ alignSelf: 'center', color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
                    {createMutation.error.message}
                  </span>
                )}
              </div>
            </div>

            <aside style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 24 }}>
              <div style={{ color: '#64748b', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Workspace status
              </div>
              <dl style={{ display: 'grid', gap: 14, margin: '16px 0 0' }}>
                <div>
                  <dt style={{ color: '#64748b', fontSize: 12, fontWeight: 650 }}>Account</dt>
                  <dd style={{ color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '3px 0 0' }}>{session.data?.user.email ?? 'Session expired'}</dd>
                </div>
                <div>
                  <dt style={{ color: '#64748b', fontSize: 12, fontWeight: 650 }}>Workspaces</dt>
                  <dd style={{ color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '3px 0 0' }}>0 active workspaces</dd>
                </div>
                <div>
                  <dt style={{ color: '#64748b', fontSize: 12, fontWeight: 650 }}>Next step</dt>
                  <dd style={{ color: '#0f172a', fontSize: 14, fontWeight: 700, margin: '3px 0 0' }}>
                    {canCreatePersonal ? 'Create personal workspace' : hasValidSession ? 'Accept an invitation' : 'Sign in again'}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={contentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, overflow: 'hidden', background: AUTH_THEME.PRIMARY, flex: '0 0 auto', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>
              <FaIcon icon="fa-shield-halved" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <h1 style={{ fontSize: 21, lineHeight: '26px', fontWeight: 750, letterSpacing: 0, color: '#111827', margin: 0 }}>Choose workspace</h1>
              <p style={{ fontSize: 15, lineHeight: '21px', color: '#50627c', margin: '2px 0 0' }}>Data, permissions, and scans are scoped per workspace.</p>
            </div>
          </div>
          <button onClick={handleSignout} style={{ minHeight: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#111827', boxShadow: '0 1px 1px rgba(15, 23, 42, 0.03)' }}>
            <FaIcon icon="fa-arrow-left" style={{ fontSize: 14 }} />
            Back to sign in
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 566px))', gap: 20, alignItems: 'stretch' }}>
          {workspaces.data.map((ws) => (
            <article
              key={ws.id}
              style={{ minHeight: 225, border: '1px solid #dbe3ec', borderRadius: 8, background: '#fff', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(15,23,42,0.04)', transition: 'border-color 150ms, box-shadow 150ms' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#b6c4d5';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#dbe3ec';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: ws.type === WORKSPACE.TYPE.PERSONAL ? '#17233a' : AUTH_THEME.PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flex: '0 0 auto' }}>
                      {getInitials(ws.name)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: 14, lineHeight: '20px', fontWeight: 750, letterSpacing: 0, color: '#111827', margin: 0 }}>{ws.name}</h2>
                      <div style={{ fontSize: 15, lineHeight: '21px', color: '#50627c', marginTop: 2 }}>
                        {ws.type === WORKSPACE.TYPE.PERSONAL ? '0 repos, 1 members' : (ws.description || ws.slug)}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, lineHeight: '14px', fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: ws.type === WORKSPACE.TYPE.PERSONAL ? '#eef2f7' : '#fff3d6', color: ws.type === WORKSPACE.TYPE.PERSONAL ? '#334155' : '#9a5b00' }}>
                    {ws.role}
                  </span>
                </div>

                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: '20px' }}>
                  <div style={metaRowStyle}>
                    <FaIcon icon="fa-user-shield" style={metaIconStyle} />
                    {formatRole(ws.role)} permissions
                  </div>
                  <div style={metaRowStyle}>
                    <FaIcon icon="fa-clock" style={metaIconStyle} />
                    {formatJoinedDate(ws.joinedAt)}
                  </div>
                  <div style={metaRowStyle}>
                    <FaIcon icon="fa-code-branch" style={metaIconStyle} />
                    No repositories yet
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSelect(ws)}
                style={{ marginTop: 16, width: '100%', minHeight: 36, padding: '8px 0', borderRadius: 6, border: 'none', background: AUTH_THEME.PRIMARY, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <FaIcon icon="fa-arrow-right" style={{ fontSize: 14 }} />
                Open workspace
              </button>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 20, minHeight: 45, padding: '12px 16px', background: '#fff', border: '1px solid #dbe3ec', borderRadius: 8, fontSize: 15, lineHeight: '20px', color: '#50627c', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaIcon icon="fa-circle-info" style={{ color: '#94a3b8', fontSize: 14 }} />
          <span>Each account owns one personal workspace. Additional workspace access is added by invitation.</span>
        </div>
      </div>
    </div>
  );
}

