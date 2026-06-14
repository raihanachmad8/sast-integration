'use client';

import { Card, Flex, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';

/**
 * Arena — experimental AI model comparison page.
 *
 * Routes: `/{workspaceSlug}/arena`
 */
export default function ArenaPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.ARENA}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Arena" description="Compare AI model performance on the same findings." />
          <Card styles={{ body: { padding: token.paddingXL, textAlign: 'center' } }}>
            <FaIcon icon="fa-flask" style={{ fontSize: token.fontSizeHeading2, color: token.colorTextSecondary, marginBottom: token.paddingLG }} />
            <Typography.Title level={3} style={{ margin: `0 0 ${token.paddingMD}px` }}>Coming Soon</Typography.Title>
            <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>
              Arena is an experimental feature for comparing AI model performance. Enable it with <code>FEATURE_FLAG_ARENA=true</code> in your environment.
            </Typography.Paragraph>
          </Card>
        </Flex>
      }
    >
      <Flex vertical gap={token.paddingXL}>
        <PageHeader title="Arena" description="Compare AI model performance on the same findings." />
        <Card styles={{ body: { padding: token.paddingXL, textAlign: 'center' } }}>
          <FaIcon icon="fa-flask" style={{ fontSize: token.fontSizeHeading2, color: token.colorPrimary, marginBottom: token.paddingLG }} />
          <Typography.Title level={3} style={{ margin: `0 0 ${token.paddingMD}px` }}>AI Model Arena</Typography.Title>
          <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, maxWidth: 500, margin: '0 auto' }}>
            Run the same set of findings through different AI models and compare verdict accuracy, confidence scores, and response latency.
          </Typography.Paragraph>
          <Flex gap={token.paddingLG} wrap="wrap" justify="center" style={{ marginTop: token.paddingXL, maxWidth: 600, margin: `${token.paddingXL}px auto 0` }}>
            {[
              { icon: 'fa-scale-balanced', title: 'Compare Models', desc: 'Side-by-side verdict comparison' },
              { icon: 'fa-chart-line', title: 'Measure Accuracy', desc: 'True positive vs false positive rates' },
              { icon: 'fa-gauge-high', title: 'Track Latency', desc: 'Response time benchmarks' },
            ].map((f) => (
              <Card key={f.title} size="small" styles={{ body: { textAlign: 'center', padding: token.paddingLG } }} style={{ flex: '1 1 150px' }}>
                <FaIcon icon={f.icon} style={{ fontSize: token.fontSizeLG, color: token.colorPrimary, marginBottom: token.paddingSM }} />
                <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize, marginBottom: token.paddingXS }}>{f.title}</div>
                <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{f.desc}</div>
              </Card>
            ))}
          </Flex>
        </Card>
      </Flex>
    </FeatureGate>
  );
}
