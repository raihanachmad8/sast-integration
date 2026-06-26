'use client';

import { theme } from 'antd';
import { LANDING_TOKENS } from '@/commons/constants/landing-tokens';

interface AiStatCardProps {
  value: string;
  label: string;
  accent: string;
  glow: string;
}

/** Individual stat card inside the AI verification panel. */
export function AiStatCard({ value, label, accent, glow }: AiStatCardProps) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        flex: 1,
        padding: `${token.paddingXS}px ${token.paddingSM}px`,
        borderRadius: token.borderRadius,
        background: glow,
        border: `1px solid ${accent}33`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: `${LANDING_TOKENS.text.muted}`, marginTop: token.marginXXS }}>{label}</div>
    </div>
  );
}
