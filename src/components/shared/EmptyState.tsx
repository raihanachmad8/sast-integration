'use client';

import { Empty } from 'antd';
import { FaIcon } from './fa-icon';

interface EmptyStateProps {
  /** Icon class name from Font Awesome (e.g., 'fa-folder-open') */
  icon?: string;
  /** Main title of the empty state */
  title: string;
  /** Supporting description text */
  text?: string;
  /** Optional action element (button, link, etc.) */
  action?: React.ReactNode;
}

/**
 * Standardized empty state component.
 * Always explain why the state is empty and what the user can do next.
 */
export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            {icon && (
              <div style={{ fontSize: 32, marginBottom: 12, color: '#bfbfbf' }}>
                <FaIcon icon={icon} />
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 500, color: '#262626', marginBottom: 4 }}>
              {title}
            </div>
            {text && (
              <div style={{ fontSize: 14, color: '#8c8c8c', maxWidth: 320, margin: '0 auto' }}>
                {text}
              </div>
            )}
          </div>
        }
      />
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
