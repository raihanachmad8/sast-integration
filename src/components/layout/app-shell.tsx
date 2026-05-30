'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspacesQuery, useSwitchWorkspaceMutation } from '@/modules/workspace/queries';
import { useSessionQuery, useSignoutMutation } from '@/modules/auth/queries';
import { ROUTES } from '@/commons/constants';
import styles from './app-shell.module.css';

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

function FaIcon({ icon, className }: { icon: string; className?: string }) {
  return <i className={`fa-solid ${icon} ${className ?? ''}`} aria-hidden="true" />;
}

function getInitials(name?: string | null) {
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'WS';
}

function getActiveKey(pathname: string) {
  return pathname.split('/')[2] || 'dashboard';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
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

  const goToWorkspaceChooser = () => {
    setAccountOpen(false);
    router.push(ROUTES.CHOOSER);
  };

  const handleSignout = () => {
    setAccountOpen(false);
    if (!session.data?.accessToken) {
      router.push(ROUTES.AUTH.SIGNIN);
      return;
    }

    signout.mutate(session.data.accessToken, {
      onSettled: () => {
        window.location.href = ROUTES.AUTH.SIGNIN;
      },
    });
  };

  const navSections: NavSection[] = [
    {
      title: 'Daily Work',
      groups: [{
        items: [
          { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', href: ROUTES.WORKSPACE.DASHBOARD(workspaceSlug) },
          { key: 'repositories', label: 'Repositories', icon: 'fa-code-branch', badge: 'Plan' },
          { key: 'scans', label: 'Scans', icon: 'fa-list-check', badge: 'Plan' },
          { key: 'findings', label: 'Findings', icon: 'fa-bug', href: ROUTES.WORKSPACE.FINDINGS(workspaceSlug) },
          { key: 'reports', label: 'Reports', icon: 'fa-file-lines', href: ROUTES.WORKSPACE.REPORTS(workspaceSlug) },
          { key: 'arena', label: 'Arena', icon: 'fa-flask', badge: 'Plan' },
        ],
      }],
    },
    {
      title: 'Settings',
      groups: [
        {
          title: 'Account',
          items: [
            { key: 'profile', label: 'Profile', icon: 'fa-user', badge: 'Plan' },
            { key: 'security', label: 'Security', icon: 'fa-shield-halved', badge: 'Plan' },
          ],
        },
        {
          title: 'Workspace',
          items: [
            { key: 'members', label: 'Members', icon: 'fa-users', badge: 'Plan' },
            { key: 'teams', label: 'Teams', icon: 'fa-people-group', badge: 'Plan' },
            { key: 'projects', label: 'Projects', icon: 'fa-diagram-project', href: ROUTES.WORKSPACE.PROJECTS(workspaceSlug), badge: 'Plan' },
          ],
        },
        {
          title: 'Integrations',
          items: [
            { key: 'source-control', label: 'Source Control', icon: 'fa-plug', badge: 'Plan' },
            { key: 'webhooks', label: 'Webhooks', icon: 'fa-satellite-dish', badge: 'Plan' },
          ],
        },
        {
          title: 'Analysis Policy',
          items: [
            { key: 'scan-policies', label: 'Scan Policies', icon: 'fa-sliders', badge: 'Plan' },
            { key: 'scanners', label: 'Scanner Engines', icon: 'fa-bolt', badge: 'Plan' },
            { key: 'settings-ai', label: 'AI Models', icon: 'fa-brain', badge: 'Plan' },
            { key: 'quality-gates', label: 'Quality Gates', icon: 'fa-shield', badge: 'Plan' },
          ],
        },
        {
          title: 'Intelligence',
          items: [{ key: 'knowledge', label: 'Knowledge Base', icon: 'fa-database', badge: 'Plan' }],
        },
        {
          title: 'Operations',
          items: [{ key: 'schedules', label: 'Schedules', icon: 'fa-calendar-days', badge: 'Plan' }],
        },
      ],
    },
  ];

  const navigate = (item: NavItem) => {
    if (!item.href) return;
    setMobileOpen(false);
    router.push(item.href);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brandCluster}>
            <button className={styles.mobileMenuButton} type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <FaIcon icon="fa-bars" />
            </button>

            <div className={styles.brandMark}>
              <FaIcon icon="fa-shield-halved" />
            </div>
            <div className={styles.brandCopy}>
              <div className={styles.brandTitle}>SAST Workspace</div>
              <div className={styles.brandSubtitle}>AI-assisted security review</div>
            </div>
          </div>

          <div className={styles.accountRoot}>
            <button
              className={styles.accountButton}
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label={`Workspace menu ${currentWorkspace?.name ?? 'Select workspace'}`}
              onClick={() => setAccountOpen((open) => !open)}
            >
              <span className={styles.userAvatar}>{getInitials(user?.name)}</span>
              <span className={styles.accountCopy}>
                <span className={styles.accountName}>{user?.name ?? 'Reviewer'}</span>
                <span className={styles.accountWorkspace}>{currentWorkspace?.name ?? 'Select workspace'}</span>
              </span>
              <FaIcon icon="fa-chevron-down" className={styles.chevronIcon} />
            </button>

            {accountOpen && (
              <div className={styles.accountDropdown} role="menu" aria-label="Workspace and account menu">
                <div className={styles.dropdownHeader}>
                  <span className={styles.dropdownUserAvatar}>{getInitials(user?.name)}</span>
                  <span className={styles.dropdownHeaderCopy}>
                    <span className={styles.dropdownUserName}>{user?.name ?? 'Reviewer'}</span>
                    <span className={styles.dropdownUserEmail}>{user?.email ?? 'Signed in'}</span>
                  </span>
                </div>

                <div className={styles.dropdownSection}>
                  <div className={styles.dropdownSectionLabel}>Current workspace</div>
                  {currentWorkspace ? (
                    <div className={styles.currentWorkspaceCard}>
                      <span className={styles.dropdownWorkspaceAvatar}>{getInitials(currentWorkspace.name)}</span>
                      <span className={styles.workspaceRowText}>
                        <span className={styles.workspaceRowName}>{currentWorkspace.name}</span>
                        <span className={styles.workspaceRowMeta}>
                          {(currentWorkspaceDetails?.type ?? 'workspace').replace('-', ' ')} - {currentWorkspace.role.toLowerCase()}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <button className={styles.workspaceRow} type="button" role="menuitem" onClick={goToWorkspaceChooser}>
                      <FaIcon icon="fa-table-cells-large" className={styles.dropdownActionIcon} />
                      <span className={styles.workspaceRowText}>
                        <span className={styles.workspaceRowName}>Choose workspace</span>
                        <span className={styles.workspaceRowMeta}>Select a workspace to continue</span>
                      </span>
                    </button>
                  )}

                  {workspaces.data?.filter((ws) => ws.id !== currentWorkspace?.id).map((ws) => {
                    const isCurrent = ws.id === currentWorkspace?.id;
                    return (
                      <button
                        className={styles.workspaceRow}
                        type="button"
                        role="menuitem"
                        key={ws.id}
                        onClick={() => handleSwitch(ws.id, ws.slug)}
                      >
                        <span className={styles.workspaceAvatar}>{getInitials(ws.name)}</span>
                        <span className={styles.workspaceRowText}>
                          <span className={styles.workspaceRowName}>{ws.name}</span>
                          <span className={styles.workspaceRowMeta}>{ws.role.toLowerCase()} permissions</span>
                        </span>
                        <span className={isCurrent ? styles.pillTeal : styles.pillSlate}>{isCurrent ? 'Current' : ws.role}</span>
                      </button>
                    );
                  })}

                  {currentWorkspace && (
                    <button className={styles.workspaceRow} type="button" role="menuitem" onClick={goToWorkspaceChooser}>
                      <FaIcon icon="fa-table-cells-large" className={styles.dropdownActionIcon} />
                      <span className={styles.workspaceRowText}>
                        <span className={styles.workspaceRowName}>All workspaces</span>
                        <span className={styles.workspaceRowMeta}>Manage workspace access and invitations</span>
                      </span>
                    </button>
                  )}
                </div>

                <div className={styles.dropdownFooter}>
                  <button className={styles.footerAction} type="button" role="menuitem" onClick={() => setAccountOpen(false)}>
                    <FaIcon icon="fa-user" className={styles.dropdownActionIcon} />
                    Profile
                  </button>
                  <button className={styles.footerAction} type="button" role="menuitem" onClick={() => setAccountOpen(false)}>
                    <FaIcon icon="fa-shield-halved" className={styles.dropdownActionIcon} />
                    Account security
                  </button>
                  <button className={styles.footerActionDanger} type="button" role="menuitem" onClick={handleSignout}>
                    <FaIcon icon="fa-arrow-right-from-bracket" className={styles.dropdownActionIcon} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
          {navSections.map((section, sectionIndex) => (
            <div className={sectionIndex === 0 ? styles.sidebarBlock : styles.sidebarBlockBordered} key={section.title}>
              <div className={styles.sectionHeading}>{section.title}</div>
              {section.groups.map((group, groupIndex) => (
                <div className={styles.navGroup} key={group.title ?? `${section.title}-${groupIndex}`}>
                  {group.title && <div className={styles.navSectionTitle}>{group.title}</div>}
                  <nav className={styles.navList} aria-label={group.title ?? section.title}>
                    {group.items.map((item) => {
                      const active = activeKey === item.key;
                      return (
                        <button
                          className={`${styles.navItem} ${active ? styles.navItemActive : ''} ${!item.href ? styles.navItemPlanned : ''}`}
                          key={item.key}
                          type="button"
                          onClick={() => navigate(item)}
                          aria-current={active ? 'page' : undefined}
                        >
                          <FaIcon icon={item.icon} className={styles.navIcon} />
                          <span className={styles.navCopy}>{item.label}</span>
                          {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>
          ))}
        </aside>
        <button
          className={`${styles.sidebarOverlay} ${mobileOpen ? styles.sidebarOverlayOpen : ''}`}
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
