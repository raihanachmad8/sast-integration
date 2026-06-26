'use client';

import { Empty, theme } from 'antd';
import { FaIcon } from './FaIcon';

interface EmptyStateProps {
  icon?: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}

/**
 * Standardized empty state component.
 *
 * @example
 * <EmptyState icon="fa-folder-open" title="No projects yet" text="Create your first project." />
 */
export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  const { token } = theme.useToken();

  return (
    <div style={{ padding: `${token.paddingXL * 2}px ${token.paddingLG}px`, textAlign: 'center' }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            {icon && (
              <div style={{ fontSize: token.fontSizeHeading2, marginBottom: token.marginSM, color: token.colorTextQuaternary }}>
                <FaIcon icon={icon} />
              </div>
            )}
            <div style={{ fontSize: token.fontSizeLG, fontWeight: token.fontWeightStrong, color: token.colorText, marginBottom: token.marginXXS }}>
              {title}
            </div>
            {text && (
              <div style={{ fontSize: token.fontSize, color: token.colorTextDescription, maxWidth: 320, margin: '0 auto' }}>
                {text}
              </div>
            )}
          </div>
        }
      />
      {action && <div style={{ marginTop: token.marginMD }}>{action}</div>}
    </div>
  );
}
