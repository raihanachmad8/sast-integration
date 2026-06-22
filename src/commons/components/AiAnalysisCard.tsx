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
  /** CWE identifier from scanner */
  cwe: string;
  /** What the scanner found and why it flagged this */
  matchDetail?: string | null;
  /** Likely CWE identifiers predicted by AI */
  likelyCwe?: string[] | null;
  /** Data flow path from source to sink */
  dataFlow?: string | null;
  /** Taint source description */
  taintSource?: string | null;
  /** Remediation text */
  remediation: string;
  /** Knowledge base usage count */
  knowledgeUses?: number;
}

/**
 * AI analysis result card showing verdict, reasoning, CWE mapping, and remediation.
 * Used in: Finding detail drawer, scan results.
 */
export function AiAnalysisCard({
  model,
  verdict,
  reasoning,
  cwe,
  matchDetail,
  likelyCwe,
  dataFlow,
  taintSource,
  remediation,
  knowledgeUses = 0,
}: AiAnalysisCardProps) {
  const { token } = theme.useToken();
  const displayCwes = likelyCwe && likelyCwe.length > 0 ? likelyCwe : (cwe ? [cwe] : []);

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
            <Typography.Text type="secondary" style={{ lineHeight: 1.6 }}>{reasoning || '—'}</Typography.Text>
          </Flex>

          <Flex vertical gap={token.marginXS}>
            <Typography.Text strong style={{ color: token.colorPurple }}>Match detail</Typography.Text>
            <Typography.Text type="secondary" style={{ lineHeight: 1.6 }}>{matchDetail || '—'}</Typography.Text>
          </Flex>

          <Flex vertical gap={token.marginXS}>
            <Typography.Text strong style={{ color: token.colorPurple }}>CWE mapping</Typography.Text>
            <Flex gap={token.marginXXS} wrap="wrap">
              {displayCwes.length > 0 ? displayCwes.map((cw) => (
                <StatusTag key={cw} type="knowledgeSource" value={cw} />
              )) : <Typography.Text type="secondary">—</Typography.Text>}
            </Flex>
          </Flex>

          <Flex vertical gap={token.marginXS}>
            <Typography.Text strong style={{ color: token.colorPurple }}>Data flow</Typography.Text>
            <Typography.Text type="secondary" style={{ lineHeight: 1.6, fontFamily: token.fontFamilyCode }}>{dataFlow || '—'}</Typography.Text>
          </Flex>

          <Flex vertical gap={token.marginXS}>
            <Typography.Text strong style={{ color: token.colorPurple }}>Taint source</Typography.Text>
            <Typography.Text type="secondary" style={{ lineHeight: 1.6 }}>{taintSource || '—'}</Typography.Text>
          </Flex>

          <Flex vertical gap={token.marginXS}>
            <Typography.Text strong style={{ color: token.colorPurple }}>Remediation</Typography.Text>
            <Typography.Text type="secondary" style={{ lineHeight: 1.6 }}>{remediation || '—'}</Typography.Text>
          </Flex>

          <Flex align="center" gap={token.marginXS} style={{ padding: `${token.paddingXS}px ${token.paddingMD}px`, background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, fontSize: token.fontSizeSM }}>
            <FaIcon icon="fa-book" style={{ color: token.colorPurple }} /> <Typography.Text type="secondary">Knowledge ref: {cwe || '—'} ({knowledgeUses} prior uses)</Typography.Text>
          </Flex>
        </Flex>
      </div>
    </Flex>
  );
}
