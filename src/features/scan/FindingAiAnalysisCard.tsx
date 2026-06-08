'use client';

import { Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { STATUS_TOKENS } from '@/commons/constants/tokens';
import type { AiRichAnalysis } from './types';
import { StatusPill } from '@/components/shared/StatusPill';
import { StatusTag } from '@/components/shared/StatusTag';

const { Text, Paragraph } = Typography;

interface FindingAiAnalysisCardProps {
  modelName: string;
  analysis: AiRichAnalysis;
}

export function FindingAiAnalysisCard({ modelName, analysis }: FindingAiAnalysisCardProps) {
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
            <StatusPill variant="red">ERROR</StatusPill>
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
                  <StatusTag key={cwe} type="knowledgeSource" value={cwe} />
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
