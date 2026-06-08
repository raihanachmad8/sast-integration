'use client';

import { useMemo } from 'react';
import { theme } from 'antd';

function getStrength(val: string): number {
  if (!val) return 0;
  let score = 0;
  if (val.length >= 8) score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
  if (/[0-9]/.test(val) && /[^a-zA-Z0-9]/.test(val)) score++;
  return score;
}

interface PasswordStrengthProps {
  value: string;
}

/**
 * Password strength indicator — 4 bars + label.
 * Scores: length >=8, length >=12, mixed case, numbers+symbols.
 *
 * @example
 * <PasswordStrength value={password} />
 */
export function PasswordStrength({ value }: PasswordStrengthProps) {
  const { token } = theme.useToken();
  const score = useMemo(() => getStrength(value), [value]);

  const configs = {
    0: { label: '', color: token.colorBorderSecondary },
    1: { label: 'Weak', color: token.colorError },
    2: { label: 'Fair', color: token.colorWarning },
    3: { label: 'Strong', color: token.colorSuccess },
    4: { label: 'Very strong', color: token.colorSuccess },
  };

  const { label, color } = configs[score as keyof typeof configs];

  if (!value) return null;

  return (
    <div style={{ marginTop: token.marginXS }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? color : token.colorBorderSecondary, transition: 'background 200ms' }} />
        ))}
      </div>
      {label && <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 500 }}>{label}</div>}
    </div>
  );
}
