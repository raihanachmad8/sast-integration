'use client';

import { Card, Typography, Flex, Avatar, Button, Alert, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusPill } from '@/components/shared/StatusPill';

interface ScmProvider {
  id: string;
  name: string;
  icon: string;
  mode: string;
  modeDetail: string;
  status: 'Connected' | 'Needs refresh' | 'Disconnected';
  org: string;
  repos: number;
  imported: number;
}

interface ProviderCardProps {
  provider: ScmProvider;
  onConfigure: (provider: string) => void;
  onTest: (provider: string) => void;
  onSync: (provider: string) => void;
  onDisconnect: (provider: string) => void;
}

export function ProviderCard({ provider, onConfigure, onTest, onSync, onDisconnect }: ProviderCardProps) {
  const { token } = theme.useToken();
  return (
    <Card styles={{ body: { padding: token.paddingXL, display: 'flex', flexDirection: 'column', gap: token.paddingLG } }}>
      <Flex align="center" gap={token.paddingLG}>
        <Avatar size={40} icon={<FaIcon icon={provider.icon} />} style={{ backgroundColor: token.colorBgLayout, color: token.colorText }} />
        <Flex vertical gap={token.paddingXS} style={{ minWidth: 0 }}>
          <Flex align="center" gap={token.paddingSM} wrap>
            <Typography.Text strong style={{ minWidth: 0 }}>{provider.name}</Typography.Text>
            <StatusPill variant={provider.status === 'Connected' ? 'teal' : provider.status === 'Needs refresh' ? 'amber' : 'slate'}>
              {provider.status}
            </StatusPill>
          </Flex>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{provider.mode} · {provider.modeDetail}</Typography.Text>
        </Flex>
      </Flex>

      <Flex gap={token.paddingMD}>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}><Typography.Text strong>{provider.repos}</Typography.Text> discovered</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}><Typography.Text strong>{provider.imported}</Typography.Text> imported</Typography.Text>
      </Flex>

      {provider.status === 'Needs refresh' && (
        <Alert
          type="warning"
          showIcon
          message="Token needs refresh"
          description="Re-authorize via Configure or follow the Setup guide."
          style={{ fontSize: token.fontSizeSM }}
        />
      )}
      {provider.status === 'Disconnected' && (
        <Alert
          type="info"
          showIcon
          message="Not connected"
          description="Click Connect to set up credentials."
          style={{ fontSize: token.fontSizeSM }}
        />
      )}

      <Flex wrap gap={token.paddingSM}>
        <Button size="small" onClick={() => onConfigure(provider.name)} icon={<FaIcon icon="fa-gear" />}>{provider.status === 'Connected' || provider.status === 'Needs refresh' ? 'Configure' : 'Connect'}</Button>
        <Button size="small" disabled={provider.status === 'Disconnected'} onClick={() => onTest(provider.name)} icon={<FaIcon icon="fa-flask-vial" />}>Test</Button>
        <Button size="small" disabled={provider.status === 'Disconnected'} onClick={() => onSync(provider.name)} icon={<FaIcon icon="fa-arrows-rotate" />}>Sync</Button>
        {provider.status === 'Connected' && <Button size="small" danger onClick={() => onDisconnect(provider.id)} icon={<FaIcon icon="fa-link-slash" />}>Disconnect</Button>}
      </Flex>
    </Card>
  );
}
