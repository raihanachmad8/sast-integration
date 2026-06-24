'use client';

import { Button, Card, Descriptions, Drawer, Space, Statistic, Tag, Typography, theme } from 'antd';
import { CloseOutlined, CodeOutlined } from '@ant-design/icons';
import { FaIcon } from '@/commons/components/FaIcon';
import type { Repository } from '@/commons/types';
import { StatusTag } from '@/commons/components/StatusTag';
import { EmptyState } from '@/commons/components/EmptyState';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

const { Text, Title } = Typography;

interface RepositoryDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  repository: Repository | null;
  onRunScan?: (repositoryId: string) => void;
  onViewHistory?: (repositoryId: string) => void;
}

const PROVIDER_CONFIG: Record<string, { icon: string; label: string }> = {
  github: { icon: 'fa-brands fa-github', label: 'GitHub' },
  gitlab: { icon: 'fa-brands fa-gitlab', label: 'GitLab' },
  gitea: { icon: 'fa-code-branch', label: 'Gitea' },
};

export function RepositoryDetailDrawer({ open, onClose, repository, onRunScan, onViewHistory }: RepositoryDetailDrawerProps) {
  const { token } = theme.useToken();

  if (!repository) {
    return (
      <Drawer open={open} onClose={onClose} title="Repository Details">
        <EmptyState title="No repository data available" />
      </Drawer>
    );
  }

  const provider = repository.provider ? PROVIDER_CONFIG[repository.provider] : null;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CodeOutlined style={{ color: token.colorPrimary, fontSize: token.fontSizeLG }} />
          <Text strong style={{ fontSize: token.fontSizeLG }}>{repository.name}</Text>
        </div>
      }
      placement="right"
      size="large"
      onClose={onClose}
      open={open}
      closeIcon={<CloseOutlined />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Overview */}
        <section>
          <Title level={5} style={{ marginBottom: token.marginSM, marginTop: 0, fontWeight: token.fontWeightStrong }}>Overview</Title>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="URL">
              <Text copyable style={{ wordBreak: 'break-all', fontSize: token.fontSizeSM }}>{repository.url}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Branch">
              <Text code>{repository.branch}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Project">
              <Text>{repository.project ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Connection">
              <Space size={[4, 4]} wrap>
                {repository.connectionType?.includes('scm') && (
                  <Tag color="cyan">SCM (Managed)</Tag>
                )}
                {repository.connectionType?.includes('external') && (
                  <Tag color="orange">External (CI)</Tag>
                )}
                {(!repository.connectionType || repository.connectionType.length === 0) && (
                  <Tag>Unknown</Tag>
                )}
              </Space>
            </Descriptions.Item>
            {provider && (
              <Descriptions.Item label="Provider">
                <Text>
                  <FaIcon icon={provider.icon} style={{ marginRight: token.marginXS }} />
                  {provider.label}
                </Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Status">
              <StatusTag type="scanner" value={repository.status} />
            </Descriptions.Item>
          </Descriptions>
        </section>

        {/* Scan Policy */}
        <section>
          <Title level={5} style={{ marginBottom: token.marginSM, marginTop: 0, fontWeight: token.fontWeightStrong }}>Scan Policy</Title>
          {repository.policyName ? (
            <Card size="small">
              <Text strong>{repository.policyName}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                Attached policy governs scanner selection and thresholds.
              </Text>
            </Card>
          ) : (
            <Card size="small" style={{ borderStyle: 'dashed' }}>
              <Text type="secondary">No policy attached. Scans use workspace defaults.</Text>
            </Card>
          )}
        </section>

        {/* Scan Statistics */}
        <section>
          <Title level={5} style={{ marginBottom: token.marginSM, marginTop: 0, fontWeight: token.fontWeightStrong }}>Scan Statistics</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.marginSM }}>
            <Card size="small">
              <Statistic title="Total Scans" value={repository.scans} />
            </Card>
            <Card size="small">
              <Statistic title="Findings" value={repository.findings} />
            </Card>
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: token.marginXS, fontSize: token.fontSizeSM }}>
            Last scan: {repository.lastScan ? new Date(repository.lastScan).toLocaleDateString() : 'Never'}
          </Text>
        </section>

        {/* Actions */}
        <section style={{ display: 'flex', gap: token.marginSM }}>
          <PermissionGate permission={PERMISSION.SCAN_RUN}>
            <Button
              type="primary"
              block
              disabled={!repository.connectionType?.includes('scm')}
              icon={<FaIcon icon="fa-play" />}
              onClick={() => onRunScan?.(repository.id)}
            >
              Run Scan
            </Button>
          </PermissionGate>
          <PermissionGate permission={PERMISSION.REPOSITORY_VIEW}>
            <Button
              block
              icon={<FaIcon icon="fa-clock-rotate-left" />}
              onClick={() => onViewHistory?.(repository.id)}
            >
              View History
            </Button>
          </PermissionGate>
        </section>

      </div>
    </Drawer>
  );
}
