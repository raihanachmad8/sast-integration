'use client';

import { theme } from 'antd';
import { LANDING_TOKENS } from '@/commons/constants/landing-tokens';
import { BORDER_RADIUS } from '@/commons/constants/layout';

const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: LANDING_TOKENS.accent.red, bg: LANDING_TOKENS.severity.criticalBg },
  HIGH:     { color: LANDING_TOKENS.severity.high, bg: LANDING_TOKENS.severity.highBg },
  MEDIUM:   { color: LANDING_TOKENS.severity.medium, bg: LANDING_TOKENS.severity.mediumBg },
  LOW:      { color: LANDING_TOKENS.accent.green, bg: LANDING_TOKENS.severity.lowBg },
};

const DEFAULT_SEVERITY = { color: '#8b949e', bg: 'rgba(139,148,158,0.1)' };

/** Severity badge used inside the dashboard mock. */
export function SeverityBadge({ level, count }: { level: string; count: number }) {
  const { token } = theme.useToken();
  const c = SEVERITY_COLORS[level] ?? DEFAULT_SEVERITY;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${token.paddingXS}px ${token.paddingSM}px`,
        borderRadius: token.borderRadius,
        background: c.bg,
        border: `1px solid ${c.color}28`,
        marginBottom: token.marginXS,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: token.marginXXS }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: BORDER_RADIUS.CIRCLE,
            background: c.color,
            display: 'inline-block',
            boxShadow: `0 0 6px ${c.color}`,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: c.color, letterSpacing: '0.04em' }}>
          {level}
        </span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: LANDING_TOKENS.text.primary }}>{count}</span>
    </div>
  );
}
