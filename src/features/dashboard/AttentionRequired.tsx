'use client';

import { Card, Typography, theme } from 'antd';
import type { DashboardFinding } from '@/modules/dashboard';
import { StatusTag } from '@/components/shared/StatusTag';
import { StatusPill } from '@/components/shared/StatusPill';

interface AttentionRequiredProps {
  /** Array of findings requiring attention. */
  findings: DashboardFinding[];
}

function VerdictTag({ verdict }: { verdict: string }) {
  return <StatusTag type="verdict" value={verdict} />;
}

/**
 * Panel showing critical findings that require attention.
 * Displays a list of findings with rule name, file path, and verdict status.
 * Uses display:flex to match height with sibling cards.
 *
 * @example
 * <AttentionRequired findings={criticalFindings} />
 */
export function AttentionRequired({ findings }: AttentionRequiredProps) {
  const { token } = theme.useToken();
  const criticalCount = findings.length;

  return (
    <Card
      title="Attention required"
      extra={
        criticalCount > 0 ? (
          <StatusPill variant="red">{criticalCount} critical</StatusPill>
        ) : undefined
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', gap: token.marginMD } }}
    >
      {findings.length === 0 ? (
        <Typography.Text type="secondary">No critical findings.</Typography.Text>
      ) : (
        findings.map((finding) => (
          <div
            key={finding.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: `${token.paddingSM}px ${token.paddingMD}px`,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadius,
            }}
          >
            <div>
              <Typography.Text strong>{finding.rule}</Typography.Text>
              <br />
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{finding.file}</Typography.Text>
            </div>
            <VerdictTag verdict={finding.verdict} />
          </div>
        ))
      )}
    </Card>
  );
}
