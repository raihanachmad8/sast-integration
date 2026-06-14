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
  status: 'Connected' | 'Pending' | 'Disconnected';
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
    <Card>
      <Flex vertical gap={token.marginLG}>
        <Flex align="center" gap={token.marginMD}>
          <Avatar size={40} icon={<FaIcon icon={provider.icon} />} style={{ backgroundColor: token.colorBgLayout, color: token.colorText }} />
          <Flex vertical gap={token.marginXXS} style={{ minWidth: 0 }}>
            <Flex align="center" gap={token.marginXS} wrap>
              <Typography.Text strong style={{ minWidth: 0 }}>{provider.name}</Typography.Text>
              <StatusPill variant={provider.status === 'Connected' ? 'teal' : provider.status === 'Pending' ? 'amber' : 'slate'}>
                {provider.status}
              </StatusPill>
            </Flex>
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{provider.mode} · {provider.modeDetail}</Typography.Text>
          </Flex>
        </Flex>

        <Flex gap={token.marginMD}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}><Typography.Text strong>{provider.repos}</Typography.Text> discovered</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}><Typography.Text strong>{provider.imported}</Typography.Text> imported</Typography.Text>
        </Flex>

        {provider.status === 'Pending' && (
          <Alert type="warning" showIcon message="Incomplete configuration" description="Some credentials are missing. Click Configure to complete setup." style={{ fontSize: token.fontSizeSM }} />
        )}
        {provider.status === 'Disconnected' && (
          <Alert type="info" showIcon message="Not connected" description="Click Connect to set up credentials." style={{ fontSize: token.fontSizeSM }} />
        )}

        <Flex wrap gap={token.marginXS}>
          <Button size="small" onClick={() => onConfigure(provider.name)} icon={<FaIcon icon="fa-gear" />}>{provider.status === 'Connected' || provider.status === 'Pending' ? 'Configure' : 'Connect'}</Button>
          <Button size="small" disabled={provider.status === 'Disconnected'} onClick={() => onTest(provider.name)} icon={<FaIcon icon="fa-flask-vial" />}>Test</Button>
          <Button size="small" disabled={provider.status !== 'Connected'} onClick={() => onSync(provider.id)} icon={<FaIcon icon="fa-arrows-rotate" />}>Sync</Button>
          {provider.status === 'Connected' && <Button size="small" danger onClick={() => onDisconnect(provider.id)} icon={<FaIcon icon="fa-link-slash" />}>Disconnect</Button>}
        </Flex>
      </Flex>
    </Card>
  );
}
