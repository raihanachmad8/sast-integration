'use client';

import { Flex, theme } from 'antd';
import type { ReactNode } from 'react';

interface ListItemProps {
  children: ReactNode;
  action?: ReactNode;
  bordered?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

/**
 * List item with optional action - reusable for settings lists.
 * Used in: Profile sessions, Audit log, etc.
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
