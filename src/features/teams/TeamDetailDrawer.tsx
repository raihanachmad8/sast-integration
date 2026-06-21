'use client';

import { App, Button, Drawer, Typography, Avatar, Card, Statistic, Flex, Table, theme } from 'antd';
import { CloseOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { FaIcon } from '@/commons/components/FaIcon';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { useDeleteTeamMutation } from '@/modules/teams';
import { errorMessage } from '@/lib/api/errors';
import type { Team, TeamMember } from '@/commons/types';
import { StatusPill } from '@/commons/components/StatusPill';
import { EmptyState } from '@/commons/components/EmptyState';

interface TeamDetailDrawerProps {
  open: boolean;
  team: Team | null;
  members: TeamMember[];
  onClose: () => void;
  onEdit: (team: Team) => void;
}

export function TeamDetailDrawer({ open, team, members, onClose, onEdit }: TeamDetailDrawerProps) {
  const { modal } = App.useApp();
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteTeamMutation();
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
            {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
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
            width: 40, 
            height: 40, 
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
        <Flex gap={token.paddingSM}>
          <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(team)}>
            Edit
          </Button>
          <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} onClick={() => confirm({ 
            title: 'Delete team?', 
            content: `Delete "${team.name}"? This cannot be undone.`, 
            danger: true,
            onOk: () => {
              deleteMutation.mutate(team.id, {
                onSuccess: () => {
                  modal.success({ title: 'Deleted', content: `${team.name} has been deleted.` });
                  onClose();
                },
                onError: (err) => modal.error({ title: 'Failed to delete', content: errorMessage(err) }),
              });
            }
          })}>
            Delete
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap={token.paddingXL}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: token.marginMD }}>
          <Card size="small">
            <Statistic title="Members" value={team.memberCount} />
          </Card>
          <Card size="small">
            <Statistic title="Projects" value={team.projects.length} />
          </Card>
          <Card size="small">
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>Created</Typography.Text>
            <Typography.Text style={{ fontSize: token.fontSize }}>{team.createdAt}</Typography.Text>
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
        <Card size="small" title={`Projects (${team.projects.length})`}>
          {team.projects.length > 0 ? (
            <Flex wrap="wrap" gap={token.paddingXS}>
              {team.projects.map((p) => <StatusPill key={p} variant="teal">{p}</StatusPill>)}
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
