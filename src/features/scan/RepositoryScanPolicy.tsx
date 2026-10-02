'use client';

import { Typography, theme } from 'antd';

const { Text } = Typography;

interface RepositoryScanPolicyProps {
  workspaceId: string;
  projectId: string;
  repositoryId: string;
  currentPolicyId: string | null;
  connectionType: string;
  onManualScanTrigger?: () => void;
  onPolicyChanged?: () => void;
}

export function RepositoryScanPolicy({
  workspaceId,
  projectId,
  repositoryId,
  currentPolicyId,
  connectionType,
  onManualScanTrigger,
  onPolicyChanged,
}: RepositoryScanPolicyProps) {
  const { token } = theme.useToken();

  return (
    <div style={{ padding: token.paddingXL, background: token.colorBgLayout, borderRadius: token.borderRadiusLG, border: `1px dashed ${token.colorBorderSecondary}` }}>
      <Text type="secondary">
        Scan policy management for repository {repositoryId} in workspace {workspaceId} — coming soon.
      </Text>
      <div style={{ marginTop: token.paddingMD, fontSize: token.fontSize, color: token.colorTextSecondary }}>
        <div>Project: {projectId}</div>
        <div>Connection type: {connectionType}</div>
        <div>Current policy: {currentPolicyId || 'None'}</div>
      </div>
    </div>
  );
}
