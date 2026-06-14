'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { theme, Grid } from 'antd';
import { useWorkspacesQuery, useSwitchWorkspaceMutation } from '@/modules/workspace/queries';
import { useSessionQuery, useSignoutMutation } from '@/modules/auth/queries';
import { ROUTES } from '@/commons/constants';
import { SidebarNav } from './SidebarNav';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

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

function getActiveKey(pathname: string) {
  const segment = pathname.split('/').filter(Boolean);
  if (segment.length < 2) return 'dashboard';
  const page = segment.slice(1).join('/');
  if (page === '') return 'dashboard';
  return page;
}

/**
 * Primary application layout for authenticated routes.
 *
 * Renders a full-height flex layout with:
 * - **Sidebar** (left, 260px): dark-themed navigation with brand, section groups, and active state highlighting.
 *   On mobile (<md), collapses off-screen and slides in via hamburger button.
 * - **Topbar** (right, top): workspace switcher dropdown with account menu.
 * - **Content** (right, bottom): scrollable page content area.
 *
 * All styles use Ant Design `theme.useToken()` — no CSS modules or hardcoded values (except dark sidebar constants).
 * Responsive behavior is handled by `Grid.useBreakpoint()` from Ant Design.
 *
 * @example
 * ```tsx
 * // Used by AuthenticatedShell to wrap all authenticated pages
 * <Layout>
 *   <DashboardPage />
 * </Layout>
 * ```
 *
 * @example
 * ```tsx
 * // Layout structure:
 * // ┌──────────────┬──────────────────────────┐
 * // │  Sidebar     │  Topbar (h: 56px)        │
 * // │  (full       ├──────────────────────────┤
 * // │   height)    │  Page content            │
 * // │  w: 260px    │  (scrollable)            │
 * // └──────────────┴──────────────────────────┘
 * ```
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { token } = theme.useToken();
  const breakpoints = Grid.useBreakpoint();
  const isMobile = !breakpoints.md;
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionQuery();
  const workspaces = useWorkspacesQuery();
  const switchMutation = useSwitchWorkspaceMutation();
  const signout = useSignoutMutation();

  const currentWorkspace = session.data?.workspace;
  const workspaceSlug = currentWorkspace?.slug ?? pathname.split('/')[1] ?? '';
  const activeKey = getActiveKey(pathname);
  const user = session.data?.user;
  const currentWorkspaceDetails = workspaces.data?.find((ws) => ws.id === currentWorkspace?.id);

  const handleSwitch = (wsId: string, slug: string) => {
    setAccountOpen(false);
    switchMutation.mutate(wsId, { onSuccess: () => router.push(ROUTES.WORKSPACE.DASHBOARD(slug)) });
  };

  const goToWorkspaceChooser = () => { setAccountOpen(false); router.push(ROUTES.CHOOSER); };

  const handleSignout = () => {
    setAccountOpen(false);
    if (!session.data?.accessToken) { router.push(ROUTES.AUTH.SIGNIN); return; }
    signout.mutate(undefined, { onSettled: () => { window.location.href = ROUTES.AUTH.SIGNIN; } });
  };

  const navSections: NavSection[] = [
    {
      title: 'Navigate',
      groups: [{
        items: [
          { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', href: ROUTES.WORKSPACE.DASHBOARD(workspaceSlug) },
          { key: 'repositories', label: 'Repositories', icon: 'fa-code-branch', href: ROUTES.WORKSPACE.REPOSITORIES(workspaceSlug) },
          { key: 'scan', label: 'Scans', icon: 'fa-list-check', href: ROUTES.WORKSPACE.SCANS(workspaceSlug) },
          { key: 'findings', label: 'Findings', icon: 'fa-bug', href: ROUTES.WORKSPACE.FINDINGS(workspaceSlug) },
          { key: 'reports', label: 'Reports', icon: 'fa-file-lines', href: ROUTES.WORKSPACE.REPORTS(workspaceSlug) },
          { key: 'arena', label: 'Arena', icon: 'fa-flask-vial', href: ROUTES.WORKSPACE.ARENA(workspaceSlug) },
        ],
      }],
    },
    {
      title: 'Manage',
      groups: [{
        items: [
          { key: 'members', label: 'Members', icon: 'fa-users', href: ROUTES.WORKSPACE.MEMBERS(workspaceSlug) },
          { key: 'teams', label: 'Teams', icon: 'fa-people-group', href: ROUTES.WORKSPACE.TEAMS(workspaceSlug) },
          { key: 'projects', label: 'Projects', icon: 'fa-diagram-project', href: ROUTES.WORKSPACE.PROJECTS(workspaceSlug) },
          { key: 'schedules', label: 'Schedules', icon: 'fa-calendar-days', href: ROUTES.WORKSPACE.SCHEDULES(workspaceSlug) },
        ],
      }],
    },
    {
      title: 'Configure',
      groups: [{
        items: [
          { key: 'profile', label: 'Profile', icon: 'fa-user', href: ROUTES.WORKSPACE.PROFILE(workspaceSlug) },
          { key: 'source-control', label: 'Source Control', icon: 'fa-plug', href: ROUTES.WORKSPACE.SOURCE_CONTROL(workspaceSlug) },
          { key: 'webhooks', label: 'Webhooks', icon: 'fa-satellite-dish', href: ROUTES.WORKSPACE.WEBHOOKS(workspaceSlug) },
          { key: 'scanner-engines', label: 'Scanner Engines', icon: 'fa-bolt', href: ROUTES.WORKSPACE.SCANNER_ENGINES(workspaceSlug) },
          { key: 'ai-models', label: 'AI Models', icon: 'fa-brain', href: ROUTES.WORKSPACE.AI_MODELS(workspaceSlug) },
          { key: 'quality-gates', label: 'Quality Gates', icon: 'fa-shield', href: ROUTES.WORKSPACE.QUALITY_GATES(workspaceSlug) },
          { key: 'knowledge-base', label: 'Knowledge Base', icon: 'fa-database', href: ROUTES.WORKSPACE.KNOWLEDGE_BASE(workspaceSlug) },
          { key: 'settings', label: 'Workspace Settings', icon: 'fa-gear', href: ROUTES.WORKSPACE.SETTINGS(workspaceSlug) },
        ],
      }],
    },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', minHeight: '100vh', background: token.colorBgLayout, color: token.colorText, fontFamily: token.fontFamily, fontSize: token.fontSize, lineHeight: token.lineHeight }}>
      <SidebarNav
        navSections={navSections}
        activeKey={activeKey}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onNavigate={(href) => { setMobileOpen(false); router.push(href); }}
      />

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          style={{ position: 'fixed' as const, inset: 0, zIndex: 55, background: 'rgba(15,23,42,0.46)', cursor: 'pointer' }}
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Right panel: topbar + content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ zIndex: 30, height: 56, flex: '0 0 56px', borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: token.margin,             padding: `0 ${token.paddingXL}px` }}>
            <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 12 }}>
              <button style={{ display: isMobile ? 'flex' : 'none', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius, background: token.colorBgContainer, color: token.colorText, cursor: 'pointer' }} type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>☰</span>
              </button>
            </div>

            <WorkspaceSwitcher
              user={user}
              currentWorkspace={currentWorkspace}
              currentWorkspaceDetails={currentWorkspaceDetails}
              workspaces={workspaces.data}
              accountOpen={accountOpen}
              onToggleAccount={() => setAccountOpen((o) => !o)}
              onSwitch={handleSwitch}
              onGoToChooser={goToWorkspaceChooser}
              onSignout={handleSignout}
            />
          </div>
        </header>

        {/* Page content */}
        <main style={{ minWidth: 0, flex: 1, overflowY: 'auto', background: token.colorBgLayout, padding: isMobile ? token.paddingMD : token.paddingLG }}>{children}</main>
      </div>
    </div>
  );
}
