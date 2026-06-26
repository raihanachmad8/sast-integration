'use client';

import { theme } from 'antd';
import { LANDING_TOKENS } from '@/commons/constants/landing-tokens';

const AI_STATS = [
  { value: '16', label: 'True Positive', color: LANDING_TOKENS.accent.green, bg: LANDING_TOKENS.severity.lowBg, border: `${LANDING_TOKENS.accent.green}33` },
  { value: '7', label: 'False Positive', color: LANDING_TOKENS.accent.red, bg: LANDING_TOKENS.severity.criticalBg, border: `${LANDING_TOKENS.accent.red}33` },
  { value: '94%', label: 'Accuracy', color: LANDING_TOKENS.accent.teal, bg: 'rgba(94,234,212,0.08)', border: `${LANDING_TOKENS.accent.teal}33` },
] as const;

/** AI verification summary panel inside the dashboard mock. */
export function AiVerificationPanel() {
  const { token } = theme.useToken();
  return (
    <div
      className="lp-result-3"
      style={{
        paddingTop: token.paddingSM,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: token.marginXS }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', color: `${LANDING_TOKENS.accent.purple}`, textTransform: 'uppercase' }}>
          🤖 AI Verification
        </span>
        <span style={{ fontSize: 12, color: LANDING_TOKENS.text.muted }}>QLoRA LLM</span>
      </div>
      <div style={{ display: 'flex', gap: token.marginXS }}>
        {AI_STATS.map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              padding: `${token.paddingXS}px ${token.paddingSM}px`,
              borderRadius: token.borderRadius,
              background: stat.bg,
              border: `1px solid ${stat.border}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: LANDING_TOKENS.text.muted, marginTop: token.marginXXS }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
