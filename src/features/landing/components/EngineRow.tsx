'use client';

import { theme } from 'antd';
import { LANDING_TOKENS } from '@/commons/constants/landing-tokens';
import { BORDER_RADIUS } from '@/commons/constants/layout';

/** Engine row in the scanner status panel. */
export function EngineRow({ name, status, findings }: { name: string; status: 'done' | 'running'; findings?: number }) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${token.paddingXXS}px 0`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: token.marginXS }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: BORDER_RADIUS.CIRCLE,
            background: status === 'done' ? LANDING_TOKENS.accent.green : LANDING_TOKENS.accent.yellow,
            display: 'inline-block',
            boxShadow: status === 'running' ? `0 0 6px ${LANDING_TOKENS.accent.yellow}` : 'none',
          }}
        />
        <span style={{ fontSize: 12, color: LANDING_TOKENS.text.secondary, fontWeight: 500 }}>{name}</span>
      </div>
      {status === 'done' && findings !== undefined ? (
        <span style={{ fontSize: 12, color: LANDING_TOKENS.accent.teal, fontWeight: 600 }}>{findings} found</span>
      ) : (
        <span style={{ fontSize: 12, color: LANDING_TOKENS.accent.yellow }}>scanning…</span>
      )}
    </div>
  );
}
