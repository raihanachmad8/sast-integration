'use client';

import { useState } from 'react';
import { Typography, Tag, Tooltip, Button, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { TRANSITION } from '@/commons/constants/layout';
import { STATUS_TOKENS } from '@/commons/tokens';
import { AiVerificationBadge } from './AiVerificationBadge';
import type { Finding, AiRichAnalysis } from './types';

const { Text, Paragraph } = Typography;

interface FindingItemProps {
  finding: Finding;
  showCode?: boolean;
  showAi?: boolean;
  onStatusChange?: (findingId: string, status: Finding['status']) => void;
}

const SCANNER_ICONS: Record<string, string> = {
  semgrep: 'fa-code',
  gitleaks: 'fa-key',
  flawfinder: 'fa-bug',
  trivy: 'fa-shield-halved',
  cppcheck: 'fa-magnifying-glass',
  sarif: 'fa-file-lines',
};

function AiAnalysisCard({ modelName, analysis }: { modelName: string; analysis: AiRichAnalysis }) {
  const { token } = theme.useToken();
  const isCorrect = analysis.verdict !== 'error';
  const conf = typeof analysis.confidence === 'number'
    ? (analysis.confidence <= 1 ? Math.round(analysis.confidence * 100) : analysis.confidence)
    : null;
  const modelShort = modelName.replace('ai_rich_', '').replace(/_/g, ' ').toUpperCase();

  return (
    <div
      style={{
        padding: token.paddingMD,
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${isCorrect ? token.colorBorderSecondary : token.colorError}`,
      }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: token.paddingMD }}>
        <Flex align="center" gap={token.paddingSM}>
          <FaIcon icon="fa-brain" style={{ color: token.colorPurple }} />
          <Text style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize }}>
            {modelShort}
          </Text>
          {analysis.verdict === 'error' && (
            <Tag color="error" style={{ margin: 0 }}>ERROR</Tag>
          )}
        </Flex>
        {conf !== null && (
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{conf}% confidence</Text>
        )}
      </Flex>

      {analysis.verdict === 'error' ? (
        <div style={{ padding: token.paddingSM, background: STATUS_TOKENS.severity.critical.bg, borderRadius: token.borderRadiusLG }}>
          <Text style={{ fontSize: token.fontSize, color: token.colorError }}>{analysis.raw}</Text>
        </div>
      ) : (
        <Flex vertical gap={token.paddingMD}>
          {analysis.explanation && (
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verdict Reasoning
              </Text>
              <Paragraph style={{ margin: `${token.marginXXS}px 0 0`, fontSize: token.fontSize, lineHeight: '1.6' }}>
                {analysis.explanation}
              </Paragraph>
            </div>
          )}

          {analysis.likelyCwe && analysis.likelyCwe.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CWE Mapping
              </Text>
              <Flex gap={token.marginXXS} style={{ marginTop: token.marginXXS }} wrap="wrap">
                {analysis.likelyCwe.map((cwe) => (
                  <Tag key={cwe} color="primary" style={{ margin: 0 }}>{cwe}</Tag>
                ))}
              </Flex>
            </div>
          )}

          {analysis.dataFlow && (
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Data Flow Analysis
              </Text>
              <div
                style={{
                  marginTop: token.marginXXS,
                  padding: `${token.paddingSM}px ${token.paddingMD}px`,
                  background: token.colorBgLayout,
                  borderRadius: token.borderRadiusLG,
                  fontFamily: token.fontFamilyCode,
                  fontSize: token.fontSize,
                  color: token.colorText,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                {analysis.dataFlow}
              </div>
            </div>
          )}

          {analysis.taintSource && (
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Taint Source
              </Text>
              <Text style={{ display: 'block', marginTop: token.marginXXS, fontSize: token.fontSize }}>
                {analysis.taintSource}
              </Text>
            </div>
          )}

          {analysis.fixSuggestion && analysis.fixSuggestion !== 'None' && (
            <div
              style={{
                padding: `${token.paddingSM}px ${token.paddingMD}px`,
                background: token.colorTealBg,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorTealAccent}`,
              }}
            >
              <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Remediation Suggestion
              </Text>
              <Text style={{ display: 'block', marginTop: token.marginXXS, fontSize: token.fontSize, color: token.colorPrimary }}>
                {analysis.fixSuggestion}
              </Text>
            </div>
          )}
        </Flex>
      )}
    </div>
  );
}

export function FindingItem({ finding, showCode = false, showAi = false, onStatusChange }: FindingItemProps) {
  const { token } = theme.useToken();
  const [codeExpanded, setCodeExpanded] = useState(showCode);
  const [aiExpanded, setAiExpanded] = useState(showAi);

  const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
    critical: { color: token.colorError, bg: STATUS_TOKENS.severity.critical.bg, icon: 'fa-skull-crossbones' },
    ERROR: { color: token.colorError, bg: STATUS_TOKENS.severity.critical.bg, icon: 'fa-circle-exclamation' },
    high: { color: token.colorWarning, bg: token.colorWarningBg, icon: 'fa-triangle-exclamation' },
    WARNING: { color: token.colorWarning, bg: token.colorWarningBg, icon: 'fa-triangle-exclamation' },
    medium: { color: token.colorInfo, bg: token.colorInfoBg, icon: 'fa-circle-exclamation' },
    low: { color: token.colorTealAccent, bg: token.colorTealBg, icon: 'fa-circle-info' },
    info: { color: token.colorTextSecondary, bg: token.colorBgLayout, icon: 'fa-circle-info' },
  };

  const severityCfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  const scannerIcon = SCANNER_ICONS[finding.scanner] || 'fa-code';
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
          <Tag color={severityCfg.color} icon={<FaIcon icon={severityCfg.icon} />} style={{ borderRadius: token.borderRadius, textTransform: 'uppercase' }}>
            {finding.severity}
          </Tag>
          <Tag icon={<FaIcon icon={scannerIcon} />} style={{ borderRadius: token.borderRadius }}>
            {finding.scanner}
          </Tag>
          {finding.groundTruth && (
            <Tag color={finding.groundTruth === 'true_positive' ? 'red' : 'teal'} style={{ borderRadius: token.borderRadius }}>
              GT: {finding.groundTruth === 'true_positive' ? 'TP' : 'FP'}
            </Tag>
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
              <Tag color="primary" style={{ margin: 0, fontSize: token.fontSizeSM }}>{finding.cwe.split(':')[0]}</Tag>
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
                <AiAnalysisCard key={modelName} modelName={modelName} analysis={analysis} />
              ))}
            </Flex>
          )}
        </div>
      )}

      {onStatusChange && finding.status === 'open' && (
        <Flex gap={token.paddingSM} style={{ marginTop: token.paddingMD, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: token.paddingMD }}>
          <Button size="small" onClick={() => onStatusChange(finding.id, 'verified')}>
            <FaIcon icon="fa-check" /> Mark Verified
          </Button>
          <Button size="small" onClick={() => onStatusChange(finding.id, 'false_positive')}>
            <FaIcon icon="fa-xmark" /> False Positive
          </Button>
          <Button size="small" onClick={() => onStatusChange(finding.id, 'fixed')}>
            <FaIcon icon="fa-check-double" /> Mark Fixed
          </Button>
        </Flex>
      )}
    </div>
  );
}
