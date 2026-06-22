'use client';

import React, { useState } from 'react';
import { Typography, Tooltip, Button, Flex, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { TRANSITION } from '@/commons/constants/layout';
import { STATUS_TOKENS } from '@/commons/constants/tokens';
import { AiVerificationBadge } from './AiVerificationBadge';
import { FindingAiAnalysisCard } from './FindingAiAnalysisCard';
import type { ScanFinding } from './types';
import { StatusTag } from '@/commons/components/StatusTag';

const { Text, Paragraph } = Typography;

interface FindingItemProps {
  finding: ScanFinding;
  showCode?: boolean;
  showAi?: boolean;
  onStatusChange?: (findingId: string, status: ScanFinding['status']) => void;
}

export const FindingItem = React.memo(function FindingItem({ finding, showCode = false, showAi = false, onStatusChange }: FindingItemProps) {
  const { token } = theme.useToken();
  const [codeExpanded, setCodeExpanded] = useState(showCode);
  const [aiExpanded, setAiExpanded] = useState(showAi);

  const modelAnalyses = finding.aiAnalysis ? Object.entries(finding.aiAnalysis) : [];

  return (
    <div
      style={{
        padding: token.paddingLG,
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        transition: `border-color ${TRANSITION.FAST}`,
      }}
    >
      <Flex justify="space-between" align="flex-start" gap={token.paddingMD} style={{ marginBottom: token.paddingMD }}>
        <Flex align="center" gap={token.paddingSM} wrap="wrap">
          <StatusTag type="severity" value={finding.severity} />
          <StatusTag type="scanner" value={finding.scanner} />
          {finding.isNew === true && (
            <span style={{
              padding: '0 6px',
              fontSize: 11,
              fontWeight: token.fontWeightStrong,
              color: token.colorWarning,
              background: token.colorWarningBg,
              border: `1px solid ${token.colorWarningBorder}`,
              borderRadius: token.borderRadiusSM,
              lineHeight: '20px',
            }}>New</span>
          )}
          {finding.isNew === false && (
            <span style={{
              padding: '0 6px',
              fontSize: 11,
              fontWeight: token.fontWeightStrong,
              color: token.colorTextSecondary,
              background: token.colorFillSecondary,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusSM,
              lineHeight: '20px',
            }}>Pre-existing</span>
          )}
          {finding.groundTruth && (
            <StatusTag type="verdict" value={finding.groundTruth === 'true_positive' ? 'TP' : 'FP'} />
          )}
          <Text code style={{ fontSize: token.fontSizeSM }}>{finding.rule}</Text>
        </Flex>

        {finding.aiVerdict && (
          <AiVerificationBadge verdict={finding.aiVerdict} confidence={finding.confidence} size="small" />
        )}
      </Flex>

      <Paragraph
        style={{
          margin: `0 0 ${token.paddingMD}px`,
          fontSize: token.fontSize,
          color: token.colorText,
          lineHeight: '1.5',
        }}
      >
        {finding.message}
      </Paragraph>

      <Flex align="center" gap={token.paddingSM} style={{ fontSize: token.fontSize, color: token.colorTextSecondary }} wrap="wrap">
        <FaIcon icon="fa-file-code" style={{ fontSize: token.fontSizeSM }} />
        <Text type="secondary">{finding.filePath}:{finding.lineNumber}</Text>
        {finding.cwe && (
          <>
            <Text type="secondary">•</Text>
              <Tooltip title={finding.cwe}>
                <StatusTag type="knowledgeSource" value={finding.cwe.split(':')[0]} />
              </Tooltip>
          </>
        )}
      </Flex>

      {finding.codeSnippet && (
        <div style={{ marginTop: token.paddingMD }}>
          <Button size="small" onClick={() => setCodeExpanded(!codeExpanded)}>
            <FaIcon icon={codeExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} /> {codeExpanded ? 'Hide code' : 'Show code'}
          </Button>

          {codeExpanded && (
            <pre
              style={{
                marginTop: token.paddingSM,
                padding: token.paddingMD,
                background: token.colorCodeBg,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                fontSize: token.fontSizeSM,
                fontFamily: token.fontFamilyCode,
                overflow: 'auto',
                maxHeight: 240,
                lineHeight: 1.8,
                color: token.colorCodeText,
              }}
            >
              {finding.codeSnippet.split('\n').map((line, i) => {
                const isVuln = line.includes('←') || line.includes('// TP') || line.includes('// vulnerability');
                return (
                  <div
                    key={i}
                    style={{
                      background: isVuln ? STATUS_TOKENS.severity.critical.bg : 'transparent',
                      borderLeft: isVuln ? `3px solid ${STATUS_TOKENS.severity.critical.color}` : '3px solid transparent',
                      padding: `0 ${token.paddingSM}px`,
                    }}
                  >
                    <code>{line}</code>
                    {isVuln && <span style={{ color: STATUS_TOKENS.severity.critical.color, fontSize: token.fontSizeSM, marginLeft: token.paddingLG }}>← vulnerability</span>}
                  </div>
                );
              })}
            </pre>
          )}
        </div>
      )}

      {modelAnalyses.length > 0 && (
        <div style={{ marginTop: token.paddingMD }}>
          <Button size="small" onClick={() => setAiExpanded(!aiExpanded)}>
            <FaIcon icon={aiExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} /> {aiExpanded ? 'Hide AI analysis' : `Show AI analysis (${modelAnalyses.length} models)`}
          </Button>

          {aiExpanded && (
            <Flex vertical gap={token.paddingMD} style={{ marginTop: token.paddingSM }}>
              {modelAnalyses.map(([modelName, analysis]) => (
                <FindingAiAnalysisCard key={modelName} modelName={modelName} analysis={analysis} />
              ))}
            </Flex>
          )}
        </div>
      )}

      {onStatusChange && finding.status === 'open' && (
        <Flex gap={token.paddingSM} style={{ marginTop: token.paddingMD, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: token.paddingMD }}>
          <Button size="small" onClick={() => onStatusChange(finding.id, 'dismissed')}>
            <FaIcon icon="fa-xmark" /> Dismiss
          </Button>
          <Button size="small" onClick={() => onStatusChange(finding.id, 'resolved')}>
            <FaIcon icon="fa-check" /> Mark Resolved
          </Button>
        </Flex>
      )}
    </div>
  );
});
