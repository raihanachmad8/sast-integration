'use client';

import { Typography, theme } from 'antd';
import type { ReactNode } from 'react';

interface RadioCardOption {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface RadioCardGroupProps {
  ariaLabel: string;
  options: RadioCardOption[];
  value: string | null;
  onChange: (key: string) => void;
  columns?: number;
}

/**
 * Radio card group for visually selecting one option from a set.
 * Used in: Onboarding flows, workspace type selection, scan profile selection.
 *
 * @example
 * <RadioCardGroup
 *   ariaLabel="Select workspace type"
 *   options={[
 *     { key: 'personal', label: 'Personal', description: 'For individual use', icon: <FaIcon icon="fa-user" /> },
 *     { key: 'team', label: 'Team', description: 'For teams and organizations', icon: <FaIcon icon="fa-users" /> },
 *   ]}
 *   value={workspaceType}
 *   onChange={setWorkspaceType}
 *   columns={2}
 * />
 */
export function RadioCardGroup({ ariaLabel, options, value, onChange, columns }: RadioCardGroupProps) {
  const { token } = theme.useToken();

  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: 'grid', gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : undefined, gap: token.paddingSM }}>
      {options.map((opt) => {
        const isActive = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.key)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: token.marginMD,
              padding: token.paddingMD,
              border: isActive ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: isActive ? token.colorPrimaryBg : token.colorBgContainer,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 120ms ease',
            }}
          >
            {opt.icon && <span style={{ fontSize: token.fontSizeXL, color: isActive ? token.colorPrimary : token.colorTextSecondary, flexShrink: 0 }}>{opt.icon}</span>}
            <div>
              <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize, color: isActive ? token.colorPrimary : token.colorText }}>{opt.label}</div>
              {opt.description && <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, marginTop: token.paddingXS }}>{opt.description}</Typography.Text>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
