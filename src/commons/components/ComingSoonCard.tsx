'use client';

import { Card, Typography, theme } from 'antd';
import { FaIcon } from './FaIcon';

interface ComingSoonCardProps {
  icon: string;
  title: string;
  description: string;
  envHint: string;
}

/**
 * Standardized "Coming Soon" fallback for feature-gated pages.
 *
 * @example
 * <ComingSoonCard
 *   icon="fa-calendar-days"
 *   title="Schedules"
 *   description="Scheduled scans allow you to automate recurring security scans."
 *   envHint="FEATURE_FLAG_SCHEDULES"
 * />
 */
export function ComingSoonCard({ icon, title: _title, description, envHint }: ComingSoonCardProps) {
  const { token } = theme.useToken();

  return (
    <Card styles={{ body: { padding: token.paddingXL, textAlign: 'center' } }}>
      <FaIcon
        icon={icon}
        style={{ fontSize: token.fontSizeHeading2, color: token.colorTextSecondary, marginBottom: token.paddingLG }}
      />
      <Typography.Title level={3} style={{ margin: `0 0 ${token.paddingMD}px` }}>
        Coming Soon
      </Typography.Title>
      <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>
        {description} Enable it with <code>NEXT_PUBLIC_{envHint}=true</code> in your environment and rebuild.
      </Typography.Paragraph>
    </Card>
  );
}
