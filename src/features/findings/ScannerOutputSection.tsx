'use client';

import { Flex, Typography, theme } from 'antd';
import type { Finding } from '@/commons/types';

const { Text } = Typography;

interface ScannerOutputSectionProps {
  finding: Finding;
}

export function ScannerOutputSection({ finding }: ScannerOutputSectionProps) {
  const { token } = theme.useToken();

  const SCANNER_ROWS = [
    { label: 'Rule', value: finding.rule ?? '—', color: token.colorSuccess },
    { label: 'Match', value: `String concatenation in SQL query at line ${finding.lineNumber ?? 88}`, color: token.colorError },
    { label: 'Data flow', value: 'req.query.id → query string → db.execute()', color: token.colorWarning },
    { label: 'Taint source', value: 'HTTP request parameter (untrusted)', color: token.colorWarning },
  ];

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
