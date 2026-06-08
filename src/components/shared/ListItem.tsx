'use client';

import { Flex, theme } from 'antd';
import type { ReactNode } from 'react';

interface ListItemProps {
  children: ReactNode;
  action?: ReactNode;
  bordered?: boolean;
  isLast?: boolean;
}

/**
 * List item with optional action - reusable for settings lists.
 * Used in: Profile sessions, Audit log, etc.
 *
 * @example
 * <ListItem action={<Button size="small">Edit</Button>}>
 *   <Typography.Text>Session from Chrome on Windows</Typography.Text>
 * </ListItem>
 *
 * @example
 * <ListItem bordered={false} isLast action={<Button danger size="small">Revoke</Button>}>
 *   <IdentityCell name="Active session" subtitle="2 hours ago" avatar="S" />
 * </ListItem>
 */
export function ListItem({ children, action, bordered = true, isLast = false }: ListItemProps) {
  const { token } = theme.useToken();
  
  return (
    <Flex 
      justify="space-between" 
      align="center" 
      gap={token.marginMD}
      style={{ 
        padding: `${token.paddingMD}px ${token.paddingLG}px`,
        borderBottom: bordered && !isLast ? `1px solid ${token.colorBorderSecondary}` : undefined 
      }}
    >
      <Flex align="center" gap={token.marginMD} style={{ flex: 1, minWidth: 0 }}>
        {children}
      </Flex>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </Flex>
  );
}
