'use client';

import { theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';

function getInitials(name?: string | null) {
  return (name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'WS';
}

interface WorkspaceSwitcherProps {
  user?: { name?: string | null; email?: string | null };
  currentWorkspace?: { id?: string; name?: string; slug?: string; role?: string } | null;
  currentWorkspaceDetails?: { type?: string } | null;
  workspaces?: Array<{ id: string; name: string; slug: string; role: string }>;
  accountOpen: boolean;
  onToggleAccount: () => void;
  onSwitch: (wsId: string, slug: string) => void;
  onGoToChooser: () => void;
  onSignout: () => void;
}

export function WorkspaceSwitcher({ user, currentWorkspace, currentWorkspaceDetails, workspaces = [], accountOpen, onToggleAccount, onSwitch, onGoToChooser, onSignout }: WorkspaceSwitcherProps) {
  const { token } = theme.useToken();

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        style={{ display: 'flex', minWidth: 0, maxWidth: 360, height: 40, alignItems: 'center', gap: token.marginXS, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, background: token.colorBgContainer, boxShadow: '0 1px 2px rgba(15,23,42,0.05)', color: token.colorText, cursor: 'pointer', padding: '0 10px', textAlign: 'left' }}
        type="button" aria-haspopup="menu" aria-expanded={accountOpen}
        aria-label={`Workspace menu ${currentWorkspace?.name ?? 'Select workspace'}`}
        onClick={onToggleAccount}
      >
        <span style={{ display: 'flex', width: 28, height: 28, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: token.colorTextBase, color: token.colorTextLightSolid, fontSize: 11, fontWeight: 800 }}>{getInitials(user?.name)}</span>
        <span style={{ minWidth: 0, lineHeight: 1.15 }}>
          <span style={{ display: 'block', overflow: 'hidden', color: token.colorText, fontSize: 13, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Reviewer'}</span>
          <span style={{ display: 'block', marginTop: 2, overflow: 'hidden', color: token.colorTextDescription, fontSize: 11, fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentWorkspace?.name ?? 'Select workspace'}</span>
        </span>
        <FaIcon icon="fa-chevron-down" style={{ flexShrink: 0, color: token.colorTextQuaternary, fontSize: 10 }} />
      </button>

      {accountOpen && (
        <div style={{ position: 'absolute', top: 46, right: 0, zIndex: 70, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, background: token.colorBgContainer, boxShadow: '0 20px 25px -5px rgba(15,23,42,0.14), 0 8px 10px -6px rgba(15,23,42,0.12)', color: token.colorText, fontSize: token.fontSize, minWidth: 280 }} role="menu" aria-label="Workspace and account menu">
          <div style={{ display: 'flex', alignItems: 'center', gap: token.paddingSM, borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: token.paddingSM }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 40, height: 40, borderRadius: token.borderRadius, background: token.colorTextBase, color: token.colorTextLightSolid, fontWeight: 800, fontSize: 13 }}>{getInitials(user?.name)}</span>
            <div style={{ display: 'grid', minWidth: 0, lineHeight: 1.25 }}>
              <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Reviewer'}</span>
              <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: 12, fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? 'Signed in'}</span>
            </div>
          </div>

          <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: token.paddingXS }}>
            <div style={{ padding: `${token.paddingXXS}px ${token.paddingSM}px ${token.paddingXS}px`, color: token.colorTextDescription, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>Current workspace</div>
            {currentWorkspace ? (
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, borderRadius: token.borderRadius, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, margin: `0 ${token.paddingXXS}px ${token.paddingXS}px`, padding: token.paddingSM }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 32, height: 32, borderRadius: 6, background: token.colorPrimary, color: token.colorTextLightSolid, fontWeight: 800, fontSize: 12 }}>{getInitials(currentWorkspace.name)}</span>
                <div style={{ display: 'grid', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentWorkspace.name}</span>
                  <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: 12, fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(currentWorkspaceDetails?.type ?? 'workspace').replace('-', ' ')} - {currentWorkspace.role?.toLowerCase()}</span>
                </div>
              </div>
            ) : (
              <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', padding: '8px 12px', textAlign: 'left' }} type="button" role="menuitem" onClick={onGoToChooser}>
                <FaIcon icon="fa-table-cells-large" style={{ width: 16, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} />
                <div style={{ display: 'grid', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Choose workspace</span>
                  <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: 12, fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Select a workspace to continue</span>
                </div>
              </button>
            )}

            {workspaces.filter((ws) => ws.id !== currentWorkspace?.id).map((ws) => (
              <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" key={ws.id} onClick={() => onSwitch(ws.id, ws.slug)}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 32, height: 32, borderRadius: 6, background: token.colorPrimary, color: token.colorTextLightSolid, fontWeight: 800, fontSize: 12 }}>{getInitials(ws.name)}</span>
                <div style={{ display: 'grid', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                  <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: 12, fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.role.toLowerCase()} permissions</span>
                </div>
                <span style={{ flexShrink: 0, borderRadius: 999, background: token.colorFillSecondary, color: token.colorTextSecondary, fontSize: 11, fontWeight: 800, lineHeight: 1, padding: '5px 7px' }}>{ws.role}</span>
              </button>
            ))}

            {currentWorkspace && (
              <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={onGoToChooser}>
                <FaIcon icon="fa-table-cells-large" style={{ width: 16, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} />
                <div style={{ display: 'grid', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>All workspaces</span>
                  <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: 12, fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Manage workspace access and invitations</span>
                </div>
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gap: 2, padding: token.paddingSM }}>
            <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', fontSize: token.fontSize, fontWeight: 500, padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={() => onToggleAccount()}>
              <FaIcon icon="fa-user" style={{ width: 16, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} /> Profile
            </button>
            <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', fontSize: token.fontSize, fontWeight: 500, padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={() => onToggleAccount()}>
              <FaIcon icon="fa-shield-halved" style={{ width: 16, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} /> Account security
            </button>
            <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorError, cursor: 'pointer', fontSize: token.fontSize, fontWeight: 500, padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={onSignout}>
              <FaIcon icon="fa-arrow-right-from-bracket" style={{ width: 16, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
