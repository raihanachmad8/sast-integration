'use client';

import { useMemo } from 'react';

function getStrength(val: string): number {
  if (!val) return 0;
  let score = 0;
  if (val.length >= 8) score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
  if (/[0-9]/.test(val) && /[^a-zA-Z0-9]/.test(val)) score++;
  return score;
}

const CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: '', color: '#e2e8f0' },
  1: { label: 'Weak', color: '#ef4444' },
  2: { label: 'Fair', color: '#f59e0b' },
  3: { label: 'Strong', color: '#10b981' },
  4: { label: 'Very strong', color: '#10b981' },
};

/**
 * Password strength indicator — 4 bars + label.
 * Scores: length ≥8, length ≥12, mixed case, numbers+symbols.
 */
export function PasswordStrength({ value }: { value: string }) {
  const score = useMemo(() => getStrength(value), [value]);
  const { label, color } = CONFIG[score];

  if (!value) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= score ? color : '#e2e8f0',
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>
      {label && <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 500 }}>{label}</div>}
    </div>
  );
}
