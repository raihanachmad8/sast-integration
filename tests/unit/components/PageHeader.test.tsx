// @vitest-environment jsdom
/**
 * Purpose: Verify PageHeader renders title, description, actions, and breadcrumbs correctly.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfigProvider, Button, Grid } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('antd', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Grid: {
      ...actual.Grid,
      useBreakpoint: () => ({ md: true }),
    },
  };
});

function renderHeader(props: Record<string, any>) {
  return render(
    <ConfigProvider>
      <PageHeader title="Test" {...props} />
    </ConfigProvider>,
  );
}

describe('PageHeader', () => {
  /**
   * Purpose: Verify title is rendered as the main heading.
   */
  it('renders title', () => {
    renderHeader({ title: 'Members' });
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify description is rendered when provided.
   */
  it('renders description when provided', () => {
    renderHeader({
      title: 'Members',
      description: 'Invite reviewers and manage workspace members.',
    });
    expect(
      screen.getByText('Invite reviewers and manage workspace members.'),
    ).toBeInTheDocument();
  });

  /**
   * Purpose: Verify description is not rendered when omitted.
   */
  it('does not render description when not provided', () => {
    renderHeader({ title: 'Members' });
    expect(screen.queryByText(/Invite/)).not.toBeInTheDocument();
  });

  /**
   * Purpose: Verify actions are rendered when provided.
   */
  it('renders actions when provided', () => {
    renderHeader({
      title: 'Members',
      actions: <Button>Invite member</Button>,
    });
    expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument();
  });

  /**
   * Purpose: Verify actions are not rendered when omitted.
   */
  it('does not render actions when not provided', () => {
    renderHeader({ title: 'Members' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /**
   * Purpose: Verify breadcrumbs are rendered when provided.
   */
  it('renders breadcrumbs when provided', () => {
    renderHeader({
      title: 'Members',
      breadcrumbs: [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Members' },
      ],
    });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  /**
   * Purpose: Verify breadcrumb links have correct href.
   */
  it('renders breadcrumb links with correct href', () => {
    renderHeader({
      title: 'Members',
      breadcrumbs: [{ label: 'Dashboard', href: '/dashboard' }],
    });
    const link = screen.getByText('Dashboard');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  /**
   * Purpose: Verify breadcrumbs without href render as plain text (current page).
   */
  it('renders breadcrumb without href as plain text', () => {
    renderHeader({
      title: 'Members',
      breadcrumbs: [{ label: 'Members' }],
    });
    const breadcrumb = screen.getByText('Members');
    expect(breadcrumb.tagName).not.toBe('A');
  });

  /**
   * Purpose: Verify breadcrumbs are not rendered when omitted.
   */
  it('does not render breadcrumbs when not provided', () => {
    renderHeader({ title: 'Members' });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
