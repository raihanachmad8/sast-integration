'use client';

import { Tag, Tooltip, Typography, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import type { AiVerdictDb } from './types';

const { Text } = Typography;

/** Props for AiVerificationBadge. */
interface AiVerificationBadgeProps {
  /** The AI verdict to display. */
  verdict: AiVerdictDb;
  /** Confidence score (0-100). */
  confidence?: number;
  /** AI model name. */
  model?: string;
  /** Size variant. */
  size?: 'small' | 'default';
}

/** Verdict configuration. */
const VERDICT_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  true_positive: {
    color: 'error',
    icon: 'fa-circle-check',
    label: 'True Positive',
  },
  false_positive: {
    color: 'success',
    icon: 'fa-circle-xmark',
    label: 'False Positive',
  },
  pending: {
    color: 'warning',
    icon: 'fa-clock',
    label: 'Pending Review',
  },
  verified: {
    color: 'processing',
    icon: 'fa-robot',
    label: 'AI Verified',
  },
  error: {
    color: 'warning',
    icon: 'fa-triangle-exclamation',
    label: 'AI Error',
  },
};

/**
 * Badge displaying AI verification status for a finding.
 * Shows verdict, confidence, and model on hover.
 */
export function AiVerificationBadge({
  verdict,
  confidence,
  model,
  size = 'default',
}: AiVerificationBadgeProps) {
  const { token } = theme.useToken();
  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.pending;
  const isSmall = size === 'small';

  const confDisplay = confidence != null
    ? (confidence <= 1 ? Math.round(confidence * 100) : confidence)
    : null;

  const badge = (
    <Tag
      color={config.color}
      icon={<FaIcon icon={config.icon} />}
      style={{
        borderRadius: token.borderRadius,
        fontSize: isSmall ? token.fontSizeSM : 14,
        fontWeight: token.fontWeightStrong,
        cursor: model ? 'help' : 'default',
      }}
    >
      {!isSmall && config.label}
      {confDisplay != null && (
        <span style={{ opacity: 0.8, marginLeft: token.marginXXS }}>
          {confDisplay}%
        </span>
      )}
    </Tag>
  );

  if (!model) {
    return badge;
  }

  return (
    <Tooltip
      title={
        <div style={{ maxWidth: 320 }}>
          <div style={{ fontWeight: token.fontWeightStrong, marginBottom: token.marginXXS }}>
            AI Verification
          </div>
          <div style={{ marginBottom: token.marginXXS }}>
            <Text style={{ color: token.colorBgContainer }}>Verdict: </Text>
            <Text strong style={{ color: token.colorBgContainer }}>{config.label}</Text>
          </div>
          {confDisplay != null && (
            <div style={{ marginBottom: token.marginXXS }}>
              <Text style={{ color: token.colorBgContainer }}>Confidence: </Text>
              <Text strong style={{ color: token.colorBgContainer }}>{confDisplay}%</Text>
            </div>
          )}
          {model && (
            <div>
              <Text style={{ color: token.colorBgContainer }}>Model: </Text>
              <Text strong style={{ color: token.colorBgContainer }}>{model}</Text>
            </div>
          )}
        </div>
      }
      placement="top"
    >
      {badge}
    </Tooltip>
  );
}
