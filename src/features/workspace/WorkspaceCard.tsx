'use client';

import { Card, Button, Typography, Tag, Flex, Space, theme } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { FaIcon } from '@/commons/components/FaIcon';

const { Text } = Typography;

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    type: string;
    role: string;
    description?: string | null;
    joinedAt?: string;
  };
  onSelect: (ws: { id: string; slug: string; name: string; role: string }) => void;
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'W';
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatJoinedDate(value: string) {
  const joinedAt = new Date(value);
  const today = new Date();

  if (
    joinedAt.getFullYear() === today.getFullYear() &&
    joinedAt.getMonth() === today.getMonth() &&
    joinedAt.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  return `Joined ${joinedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/**
 * Workspace card component for workspace chooser page.
 * Uses Ant Design tokens for all styling.
 *
 * @example
 * <WorkspaceCard
 *   workspace={{ id: '1', name: 'My Workspace', slug: 'my-ws', type: 'personal', role: 'owner' }}
 *   onSelect={(ws) => router.push(`/dashboard`)}
 * />
 */
export function WorkspaceCard({ workspace, onSelect }: WorkspaceCardProps) {
  const { token } = theme.useToken();
  const isPersonal = workspace.type === WORKSPACE.TYPE.PERSONAL;

  return (
    <Card
      hoverable
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${token.colorBorderSecondary}` }}
    >
      <Flex justify="space-between" align="flex-start" gap={token.marginSM}>
        <Flex align="center" gap={token.marginSM}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 44,
              height: 44,
              borderRadius: token.borderRadiusLG,
              background: isPersonal ? token.colorTextBase : token.colorPrimary,
              color: token.colorTextLightSolid,
              fontWeight: 800,
              fontSize: token.fontSize,
              flexShrink: 0,
            }}
          >
            {getInitials(workspace.name)}
          </Flex>
          <div>
            <Text strong style={{ fontSize: token.fontSize }}>{workspace.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: token.fontSizeLG }}>
              {isPersonal
                ? '0 repos, 1 members'
                : workspace.description || workspace.slug}
            </Text>
          </div>
        </Flex>
        <Tag
          color={isPersonal ? 'default' : 'warning'}
          style={{ borderRadius: 999 }}
        >
          {workspace.role}
        </Tag>
      </Flex>

      <Flex vertical gap={token.marginXS} style={{ marginTop: token.marginLG, fontSize: token.fontSizeLG }}>
        <Space size={token.marginXS}>
          <FaIcon icon="fa-user-shield" style={{ color: token.colorTextSecondary, fontSize: token.fontSizeLG }} />
          <Text style={{ color: token.colorTextSecondary }}>{formatRole(workspace.role)} permissions</Text>
        </Space>
        <Space size={token.marginXS}>
          <FaIcon icon="fa-clock" style={{ color: token.colorTextSecondary, fontSize: token.fontSizeLG }} />
          <Text style={{ color: token.colorTextSecondary }}>{workspace.joinedAt ? formatJoinedDate(workspace.joinedAt) : 'Recently joined'}</Text>
        </Space>
        <Space size={token.marginXS}>
          <FaIcon icon="fa-code-branch" style={{ color: token.colorTextSecondary, fontSize: token.fontSizeLG }} />
          <Text style={{ color: token.colorTextSecondary }}>No repositories yet</Text>
        </Space>
      </Flex>

      <Button
        type="primary"
        block
        icon={<RightOutlined />}
        iconPlacement="end"
        onClick={() => onSelect({ id: workspace.id, slug: workspace.slug, name: workspace.name, role: workspace.role })}
        style={{ marginTop: token.marginLG }}
      >
        Open workspace
      </Button>
    </Card>
  );
}
