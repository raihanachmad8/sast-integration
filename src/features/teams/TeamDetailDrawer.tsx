'use client';

import { App, Button, Drawer, Typography, Avatar, Descriptions, Card, Statistic, Tag, Flex, theme } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { FaIcon } from '@/components/shared/fa-icon';
import type { Team, TeamMember } from '@/commons/types';

interface TeamDetailDrawerProps {
  open: boolean;
  team: Team | null;
  members: TeamMember[];
  onClose: () => void;
  onEdit: (team: Team) => void;
}

export function TeamDetailDrawer({ open, team, members, onClose, onEdit }: TeamDetailDrawerProps) {
  const { modal } = App.useApp();
  const { token } = theme.useToken();

  if (!team) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: token.borderRadiusLG, background: token.colorPrimary, color: token.colorText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaIcon icon="fa-people-group" />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>{team.name}</Typography.Text>
            <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{team.slug}</div>
          </div>
        </div>
      }
      placement="right"
      size="large"
      closeIcon={<CloseOutlined />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: token.paddingXL }}>
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
          <section>
            <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: 700 }}>Description</Typography.Title>
            <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, lineHeight: 1.6, margin: 0 }}>{team.description}</Typography.Paragraph>
          </section>
        )}

        {/* Members */}
        <section>
          <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: 700 }}>Members ({members.length})</Typography.Title>
          {members.length > 0 ? (
            <Card size="small" styles={{ body: { padding: 0 } }}>
              {members.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: token.paddingMD, padding: `${token.paddingSM}px ${token.paddingMD}px`, borderBottom: i < members.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
                  <Avatar size={32} style={{ background: token.colorSidebarBg, flexShrink: 0 }}>{m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</Avatar>
                  <div>
                    <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize }}>{m.name}</div>
                    <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{m.email}</div>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>No members yet.</Typography.Paragraph>
          )}
        </section>

        {/* Projects */}
        <section>
          <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: 700 }}>Projects ({team.projects.length})</Typography.Title>
          {team.projects.length > 0 ? (
            <Flex wrap="wrap" gap={token.paddingXS}>
              {team.projects.map((p) => <Tag key={p} color="teal">{p}</Tag>)}
            </Flex>
          ) : (
            <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>Not assigned to any project.</Typography.Paragraph>
          )}
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: token.paddingMD, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: token.paddingXL }}>
          <Button type="primary" icon={<FaIcon icon="fa-pen" />} onClick={() => onEdit(team)}>Edit team</Button>
          <Button danger icon={<FaIcon icon="fa-trash" />} onClick={() => modal.confirm({ title: 'Delete team?', content: `Delete "${team.name}"? This cannot be undone.`, onOk: () => { modal.success({ title: 'Deleted', content: `${team.name} has been deleted.` }); onClose(); } })}>Delete</Button>
        </div>
      </div>
    </Drawer>
  );
}
