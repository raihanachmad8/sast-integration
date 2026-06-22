'use client';

import { theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';

type NavItem = {
  key: string;
  label: string;
  icon: string;
  href?: string;
  badge?: string;
};

type NavSection = {
  title: string;
  groups: Array<{
    title?: string;
    items: NavItem[];
  }>;
};

interface SidebarNavProps {
  navSections: NavSection[];
  activeKey: string;
  isMobile: boolean;
  mobileOpen: boolean;
  onNavigate: (href: string) => void;
}

export function SidebarNav({ navSections, activeKey, isMobile, mobileOpen, onNavigate }: SidebarNavProps) {
  const { token } = theme.useToken();

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: 'none', background: token.colorSidebarBgDark, color: token.colorSidebarTextDark, zIndex: 60, transition: 'width 200ms ease, flex 200ms ease', ...(isMobile ? { position: 'fixed' as const, top: 0, left: 0, height: '100vh', width: mobileOpen ? 260 : 0, flex: mobileOpen ? '0 0 260px' : '0 0 0', transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' } : { position: 'relative' as const, width: 260, flex: '0 0 260px' }) }}>
      {/* Sidebar brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: token.paddingSM, padding: `${token.paddingMD}px ${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorSidebarBorderDark}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', width: 36, height: 36, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: token.borderRadius, background: token.colorPrimary, color: token.colorTextLightSolid, fontSize: 17 }}>
          <FaIcon icon="fa-shield-halved" />
        </div>
        <div style={{ minWidth: 0, lineHeight: 1.15 }}>
          <div style={{ overflow: 'hidden', color: '#ffffff', fontSize: token.fontSize, fontWeight: 800, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>SAST Workspace</div>
          <div style={{ marginTop: 3, overflow: 'hidden', color: token.colorSidebarTextSecondaryDark, fontSize: token.fontSizeSM, fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>AI-assisted security review</div>
        </div>
      </div>

      {/* Sidebar nav */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {navSections.map((section, si) => (
          <div style={{ padding: `${token.paddingMD}px ${token.paddingSM}px`, ...(si > 0 ? { borderTop: `1px solid ${token.colorSidebarBorderDark}` } : {}) }} key={section.title}>
            <div style={{ margin: `0 ${token.paddingSM}px ${token.paddingXS}px`, color: token.colorSidebarTextSecondaryDark, fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' as const }}>{section.title}</div>
            {section.groups.map((group, gi) => (
              <div style={gi > 0 ? { marginTop: 12 } : undefined} key={group.title ?? `${section.title}-${gi}`}>
                {group.title && <div style={{ margin: `14px ${token.paddingSM}px ${token.paddingXXS}px`, color: token.colorSidebarTextSecondaryDark, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>{group.title}</div>}
                <nav style={{ display: 'grid', gap: 4 }} aria-label={group.title ?? section.title}>
                  {group.items.map((item) => {
                    const active = activeKey === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => item.href && onNavigate(item.href)}
                        aria-current={active ? 'page' : undefined}
                        style={{
                          display: 'flex', width: '100%', minHeight: 36, alignItems: 'center', gap: token.marginXS,
                          border: 0, borderRadius: token.borderRadius,
                          background: active ? `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorInfo} 100%)` : 'transparent',
                          boxShadow: active ? `0 4px 12px rgba(15,118,110,0.3)` : undefined,
                          color: active ? token.colorTextLightSolid : token.colorSidebarTextDark,
                          cursor: item.href ? 'pointer' : 'default',
                          fontSize: 13, lineHeight: '18px', padding: `${token.paddingXS}px ${token.paddingSM}px`, textAlign: 'left',
                        }}
                      >
                        <FaIcon icon={item.icon} style={{ width: 16, flexShrink: 0, textAlign: 'center' }} />
                        <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                        {item.badge && <span style={{ flexShrink: 0, borderRadius: 999, background: token.colorWarningBg, color: token.colorWarningText, fontSize: 10, fontWeight: 800, lineHeight: 1, padding: '3px 6px' }}>{item.badge}</span>}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
