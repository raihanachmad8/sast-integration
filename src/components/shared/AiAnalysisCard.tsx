'use client';

import { Flex, Typography, theme } from 'antd';
import { FaIcon } from './FaIcon';
import { StatusTag } from './StatusTag';


interface AiAnalysisCardProps {
  /** Model name displayed in the header (optional) */
  model?: string;
  /** Verdict value for the StatusTag */
  verdict: string;
  /** Verdict reasoning text */
  reasoning: string;
  /** CWE identifier */
  cwe: string;
  /** Remediation text */
  remediation: string;
  /** Knowledge base usage count */
  knowledgeUses?: number;
}

/**
 * AI analysis result card showing verdict, reasoning, CWE mapping, and remediation.
 * Used in: Finding detail drawer, scan results.
 *
 * @example
 * <AiAnalysisCard
 *   model="sast-qlora-8b"
 *   verdict="TP"
 *   reasoning="The input flows directly to the SQL query without sanitization."
 *   cwe="CWE-89"
 *   remediation="Use parameterized queries instead of string concatenation."
 *   knowledgeUses={3}
 * />
 */
export function AiAnalysisCard({ model, verdict, reasoning, cwe, remediation, knowledgeUses = 0 }: AiAnalysisCardProps) {
  const { token } = theme.useToken();

  return (
    <Flex vertical>
      <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
        <Flex justify="space-between" align="center" style={{ padding: `${token.paddingSM}px ${token.paddingLG}px`, background: token.colorPurpleBg, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <Typography.Text strong style={{ color: token.colorPurple }}>
            <FaIcon icon="fa-brain" style={{ marginRight: token.marginXS }} /> AI Analysis{model ? ` — ${model}` : ''}
          </Typography.Text>
          <StatusTag type="verdict" value={verdict} />
        </Flex>
        <Flex vertical gap={token.paddingLG} style={{ padding: token.paddingLG }}>
          <Flex vertical gap={token.marginXS}>
            <Typography.Text strong style={{ color: token.colorPurple }}>Verdict reasoning</Typography.Text>
            <Typography.Text type="secondary" style={{ lineHeight: 1.6 }}>{reasoning}</Typography.Text>
          </Flex>
          <Flex vertical gap={token.marginXS}>
            <Typography.Text strong style={{ color: token.colorPurple }}>CWE mapping</Typography.Text>
            <Typography.Text type="secondary" style={{ lineHeight: 1.6 }}>{cwe}</Typography.Text>
          </Flex>
          <Flex vertical gap={token.marginXS}>
            <Typography.Text strong style={{ color: token.colorPurple }}>Remediation</Typography.Text>
            <Typography.Text type="secondary" style={{ lineHeight: 1.6 }}>{remediation}</Typography.Text>
          </Flex>
          <Flex align="center" gap={token.marginXS} style={{ padding: `${token.paddingXS}px ${token.paddingMD}px`, background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, fontSize: token.fontSizeSM }}>
            <FaIcon icon="fa-book" style={{ color: token.colorPurple }} /> <Typography.Text type="secondary">Knowledge ref: {cwe} ({knowledgeUses} prior uses)</Typography.Text>
          </Flex>
        </Flex>
      </div>
    </Flex>
  );
}
