'use client';

import { Flex, theme } from 'antd';
import type { ReactNode } from 'react';

/** Props for the Toolbar component. */
interface ToolbarProps {
  /** Left-side content (search input, filter dropdowns) */
  children: ReactNode;
  /** Optional right-side content (action buttons) */
  end?: ReactNode;
}

/**
 * Shared toolbar layout using Ant Design Flex.
 * Renders inside a surface with consistent padding and border.
 *
 * @param props - {@link ToolbarProps}
 * @returns JSX element rendering a flex toolbar with children on the left and optional end slot on the right.
 *
 * @example
 * <Toolbar>
 *   <Input placeholder="Search..." />
 *   <Select options={filters} />
 * </Toolbar>
 *
 * @example
 * <Toolbar end={<Button>Export</Button>}>
 *   <Input placeholder="Search..." />
 * </Toolbar>
 */
export function Toolbar({ children, end }: ToolbarProps) {
  const { token } = theme.useToken();

  return (
    <Flex
      justify="space-between"
      align="center"
      wrap="wrap"
      gap="middle"
      style={{
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: token.paddingSM,
      }}
    >
      <Flex gap="middle" align="center" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </Flex>
      {end && (
        <Flex gap="middle" align="center">
          {end}
        </Flex>
      )}
    </Flex>
  );
}
