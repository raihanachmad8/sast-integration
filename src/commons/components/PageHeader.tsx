'use client';

import { Typography, Flex, Breadcrumb, Grid, theme } from 'antd';
import Link from 'next/link';
import type { ReactNode } from 'react';

const { Title, Text } = Typography;

/** A single breadcrumb item. */
interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Link href (if omitted, renders as plain text — current page) */
  href?: string;
}

/** Props for the PageHeader component. */
interface PageHeaderProps {
  /** Main heading text (renders as <h1>) */
  title: string;
  /** Optional supporting description below the title */
  description?: string;
  /** Optional action element(s) rendered on the right side (buttons, links, etc.) */
  actions?: ReactNode;
  /** Optional breadcrumb items for navigation context */
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Reusable page header with title, optional description, optional actions, and breadcrumbs.
 *
 * @param props - {@link PageHeaderProps}
 * @returns JSX element containing the page header layout.
 *
 * @example
 * <PageHeader
 *   title="Members"
 *   description="Invite reviewers and manage workspace members."
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Members' },
 *   ]}
 *   actions={<Button>Invite member</Button>}
 * />
 */
export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  const { token } = theme.useToken();
  const breakpoints = Grid.useBreakpoint();
  const isMobile = !breakpoints.md;

  const breadcrumbItems = breadcrumbs?.map((item) => ({
    title: item.href ? <Link href={item.href}>{item.label}</Link> : item.label,
  }));

  return (
    <Flex vertical gap={token.marginSM} style={{ marginBottom: token.marginXL }}>
      {breadcrumbItems && (
        <Breadcrumb items={breadcrumbItems} />
      )}
      <Flex vertical={isMobile} gap={token.paddingMD}>
        <Flex vertical gap={token.marginXS} style={{ minWidth: 0, flex: 1 }}>
          <Title level={3} style={{ margin: 0 }}>{title}</Title>
          {description && (
            <Text type="secondary" style={{ display: 'block' }}>
              {description}
            </Text>
          )}
        </Flex>
        {actions && <Flex wrap="wrap" gap={token.paddingSM}>{actions}</Flex>}
      </Flex>
    </Flex>
  );
}
