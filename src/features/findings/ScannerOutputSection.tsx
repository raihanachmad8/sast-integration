'use client';

import { Flex, Typography, theme } from 'antd';
import type { Finding } from '@/commons/types';

const { Text } = Typography;

interface ScannerOutputSectionProps {
  finding: Finding;
}

/**
 * Displays scanner-specific output fields (rule, match, data flow, taint source) for a finding.
 *
 * Only renders rows that have actual data — empty fields are omitted.
 *
 * @param props - {@link ScannerOutputSectionProps}
 * @returns JSX element rendering the scanner output section with labeled key-value rows.
 *
 * @example
 * <ScannerOutputSection finding={finding} />
 */
export function ScannerOutputSection({ finding }: ScannerOutputSectionProps) {
  const { token } = theme.useToken();

  // Only show rows that have actual data
  const SCANNER_ROWS = [
    finding.rule ? { label: 'Rule', value: finding.rule, color: token.colorSuccess } : null,
    finding.message ? { label: 'Match', value: finding.message, color: token.colorError } : null,
    finding.dataFlow ? { label: 'Data flow', value: finding.dataFlow, color: token.colorWarning } : null,
    finding.taintSource ? { label: 'Taint source', value: finding.taintSource, color: token.colorWarning } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; color: string }>;

  if (SCANNER_ROWS.length === 0) return null;

  const sectionTitleStyle = {
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };

  return (
    <Flex vertical gap={token.marginSM}>
      <Text style={sectionTitleStyle}>Scanner output</Text>
      <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
        {SCANNER_ROWS.map(({ label, value, color }) => (
          <Flex key={label} gap={token.marginMD} align="flex-start" style={{ padding: `${token.paddingSM}px ${token.paddingLG}px`, borderLeft: `4px solid ${color}`, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Text strong style={{ minWidth: 90, fontSize: token.fontSizeSM, color, flexShrink: 0 }}>{label}</Text>
            <Text style={{ lineHeight: 1.5 }}>{value}</Text>
          </Flex>
        ))}
      </div>
    </Flex>
  );
}
