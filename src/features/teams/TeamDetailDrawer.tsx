'use client';

import { CloseOutlined } from '@ant-design/icons';
import { Drawer, Typography, Avatar, Card, Statistic, Flex, Table, Button, theme } from 'antd';

import { EmptyState } from '@/commons/components/EmptyState';
import { FaIcon } from '@/commons/components/FaIcon';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { StatusPill } from '@/commons/components/StatusPill';
import { PERMISSION } from '@/commons/constants/permissions';
import type { Team, TeamMember } from '@/commons/types';
import { formatDate } from '@/lib/utils/formatDate';
import { getInitials } from '@/lib/utils/getInitials';

interface TeamDetailDrawerProps {
  open: boolean;
  team: Team | null;
  members: TeamMember[];
  onClose: () => void;
  onDelete?: (team: Team) => void;
}

/**
 * Drawer displaying team details including members, statistics, and assigned projects.
 *
 * @param props - {@link TeamDetailDrawerProps}
 * @returns JSX element rendering the team detail drawer.
 *
 * @example
 * <TeamDetailDrawer
 *   open={true}
 *   team={team}
 *   members={teamMembers}
 *   onClose={() => setOpen(false)}
 * />
 */
export function TeamDetailDrawer({ open, team, members, onClose, onDelete }: TeamDetailDrawerProps) {
  const { token } = theme.useToken();

  if (!team) {
    return (
      <Drawer open={open} onClose={onClose} title="Team Details">
        <EmptyState title="No team data available" />
      </Drawer>
    );
  }

  const memberColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TeamMember) => (
        <Flex align="center" gap={token.paddingSM}>
          <Avatar size={32} style={{ background: token.colorPrimary, flexShrink: 0 }}>
            {getInitials(name, record.email)}
          </Avatar>
          <div>
            <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize }}>{name}</div>
            <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{record.email}</div>
          </div>
        </Flex>
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <Flex align="center" gap={token.paddingMD}>
          <div style={{ 
            width: token.sizeXL, 
            height: token.sizeXL, 
            borderRadius: token.borderRadiusLG, 
            background: token.colorPrimaryBg, 
            color: token.colorPrimary, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: token.fontSizeLG
          }}>
            <FaIcon icon="fa-people-group" />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>{team.name}</Typography.Text>
            <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{team.slug}</div>
          </div>
        </Flex>
      }
      placement="right"
      size="large"
      closeIcon={<CloseOutlined />}
      footer={
        <PermissionGate permission={PERMISSION.TEAM_MANAGE}>
          <Flex justify="flex-end">
            <Button
              danger
              icon={<FaIcon icon="fa-trash" />}
              onClick={() => team && onDelete?.(team)}
            >
              Delete
            </Button>
          </Flex>
        </PermissionGate>
      }
    >
      <Flex vertical gap={token.paddingXL}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: token.marginMD }}>
          <Card size="small">
            <Statistic title="Members" value={team.memberCount} />
          </Card>
          <Card size="small">
            <Statistic title="Projects" value={(team.projects ?? []).length} />
          </Card>
          <Card size="small">
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>Created</Typography.Text>
            <Typography.Text style={{ fontSize: token.fontSize }}>{formatDate(team.createdAt)}</Typography.Text>
          </Card>
        </div>

        {/* Description */}
        {team.description && (
          <Card size="small" title="Description">
            <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, lineHeight: 1.6, margin: 0 }}>
              {team.description}
            </Typography.Paragraph>
          </Card>
        )}

        {/* Members */}
        <Card 
          size="small" 
          title={`Members (${members.length})`}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={members}
            columns={memberColumns}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: 'No members yet.' }}
          />
        </Card>

        {/* Projects */}
        <Card size="small" title={`Projects (${(team.projects ?? []).length})`}>
          {(team.projects ?? []).length > 0 ? (
            <Flex wrap="wrap" gap={token.paddingXS}>
              {(team.projects ?? []).map((p) => <StatusPill key={p} variant="teal">{p}</StatusPill>)}
            </Flex>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: token.fontSize }}>
              Not assigned to any project.
            </Typography.Text>
          )}
        </Card>
      </Flex>
    </Drawer>
  );
}
