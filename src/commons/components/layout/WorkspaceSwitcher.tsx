'use client';

import { useRef, useEffect } from 'react';
import { theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { getInitials } from '@/lib/utils/getInitials';

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
  onNavigate: (href: string) => void;
}

export function WorkspaceSwitcher({ user, currentWorkspace, currentWorkspaceDetails, workspaces = [], accountOpen, onToggleAccount, onSwitch, onGoToChooser, onSignout, onNavigate }: WorkspaceSwitcherProps) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggleAccount();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [accountOpen, onToggleAccount]);

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        style={{ display: 'flex', minWidth: 0, maxWidth: 360, height: token.controlHeightLG, alignItems: 'center', gap: token.marginXS, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, background: token.colorBgContainer, boxShadow: token.boxShadowTertiary, color: token.colorText, cursor: 'pointer', padding: `0 ${token.paddingXS + 2}px`, textAlign: 'left' }}
        type="button" aria-haspopup="menu" aria-expanded={accountOpen}
        aria-label={`Workspace menu ${currentWorkspace?.name ?? 'Select workspace'}`}
        onClick={onToggleAccount}
      >
        <span style={{ display: 'flex', width: token.sizeLG, height: token.sizeLG, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: token.borderRadiusSM, background: token.colorTextBase, color: token.colorTextLightSolid, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>{getInitials(user?.name ?? '', 'WS')}</span>
        <span style={{ minWidth: 0, lineHeight: 1.15 }}>
          <span style={{ display: 'block', overflow: 'hidden', color: token.colorText, fontSize: token.fontSize, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Reviewer'}</span>
          <span style={{ display: 'block', marginTop: token.marginXXS, overflow: 'hidden', color: token.colorTextDescription, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentWorkspace?.name ?? 'Select workspace'}</span>
        </span>
        <FaIcon icon="fa-chevron-down" style={{ flexShrink: 0, color: token.colorTextQuaternary, fontSize: token.fontSizeSM }} />
      </button>

      {accountOpen && (
        <div style={{ position: 'absolute', top: token.controlHeightLG + 6, right: 0, zIndex: 70, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, background: token.colorBgContainer, boxShadow: token.boxShadowSecondary, color: token.colorText, fontSize: token.fontSize, minWidth: 280 }} role="menu" aria-label="Workspace and account menu">
          <div style={{ display: 'flex', alignItems: 'center', gap: token.paddingSM, borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: token.paddingSM }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: token.sizeXL, height: token.sizeXL, borderRadius: token.borderRadius, background: token.colorTextBase, color: token.colorTextLightSolid, fontWeight: token.fontWeightStrong, fontSize: token.fontSize }}>{getInitials(user?.name ?? '', 'WS')}</span>
            <div style={{ display: 'grid', minWidth: 0, lineHeight: 1.25 }}>
              <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Reviewer'}</span>
              <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? 'Signed in'}</span>
            </div>
          </div>

          <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: token.paddingXS }}>
            <div style={{ padding: `${token.paddingXXS}px ${token.paddingSM}px ${token.paddingXS}px`, color: token.colorTextDescription, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>Current workspace</div>
            {currentWorkspace ? (
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, borderRadius: token.borderRadius, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgLayout, margin: `0 ${token.paddingXXS}px ${token.paddingXS}px`, padding: token.paddingSM }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: token.sizeLG, height: token.sizeLG, borderRadius: token.borderRadiusSM, background: token.colorPrimary, color: token.colorTextLightSolid, fontWeight: token.fontWeightStrong, fontSize: token.fontSizeSM }}>{getInitials(currentWorkspace.name ?? '', 'WS')}</span>
                <div style={{ display: 'grid', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentWorkspace.name}</span>
                  <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(currentWorkspaceDetails?.type ?? 'workspace').replace('-', ' ')} - {currentWorkspace.role?.toLowerCase()}</span>
                </div>
              </div>
            ) : (
              <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={onGoToChooser}>
                <FaIcon icon="fa-table-cells-large" style={{ width: token.size, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} />
                <div style={{ display: 'grid', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Choose workspace</span>
                  <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Select a workspace to continue</span>
                </div>
              </button>
            )}

            {workspaces.filter((ws) => ws.id !== currentWorkspace?.id).map((ws) => (
              <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" key={ws.id} onClick={() => onSwitch(ws.id, ws.slug)}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: token.sizeLG, height: token.sizeLG, borderRadius: token.borderRadiusSM, background: token.colorPrimary, color: token.colorTextLightSolid, fontWeight: token.fontWeightStrong, fontSize: token.fontSizeSM }}>{getInitials(ws.name)}</span>
                <div style={{ display: 'grid', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                  <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.role.toLowerCase()} permissions</span>
                </div>
                <span style={{ flexShrink: 0, borderRadius: 999, background: token.colorFillSecondary, color: token.colorTextSecondary, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, lineHeight: 1, padding: `${token.paddingXXS}px ${token.paddingXS}px` }}>{ws.role}</span>
              </button>
            ))}

            {currentWorkspace && (
              <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={onGoToChooser}>
                <FaIcon icon="fa-table-cells-large" style={{ width: token.size, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} />
                <div style={{ display: 'grid', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                  <span style={{ overflow: 'hidden', color: token.colorText, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>All workspaces</span>
                  <span style={{ overflow: 'hidden', color: token.colorTextDescription, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Manage workspace access and invitations</span>
                </div>
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gap: token.marginXXS, padding: token.paddingSM }}>
            <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', fontSize: token.fontSize, fontWeight: token.fontWeightStrong, padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={() => { onToggleAccount(); onNavigate(`/${currentWorkspace?.slug ?? ''}/profile`); }}>
              <FaIcon icon="fa-user" style={{ width: token.size, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} /> Profile
            </button>
            <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorText, cursor: 'pointer', fontSize: token.fontSize, fontWeight: token.fontWeightStrong, padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={() => { onToggleAccount(); onNavigate(`/${currentWorkspace?.slug ?? ''}/profile`); }}>
              <FaIcon icon="fa-shield-halved" style={{ width: token.size, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} /> Account security
            </button>
            <button style={{ display: 'flex', width: '100%', alignItems: 'center', gap: token.marginXS, border: 0, borderRadius: token.borderRadius, background: 'transparent', color: token.colorError, cursor: 'pointer', fontSize: token.fontSize, fontWeight: token.fontWeightStrong, padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left' }} type="button" role="menuitem" onClick={onSignout}>
              <FaIcon icon="fa-arrow-right-from-bracket" style={{ width: token.size, flexShrink: 0, color: token.colorTextDescription, textAlign: 'center' }} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
