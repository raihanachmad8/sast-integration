'use client';

import { App, Button, Drawer, Flex, Typography, theme } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { FaIcon } from '@/commons/components/FaIcon';
import { LAYOUT } from '@/commons/constants/layout';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { useDeleteProjectMutation } from '@/modules/projects';
import { errorMessage } from '@/lib/api/errors';
import type { Project } from '@/commons/types';
import { StatusPill } from '@/commons/components/StatusPill';
import { EmptyState } from '@/commons/components/EmptyState';

interface ProjectDetailDrawerProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onEdit: (project: Project) => void;
}

export function ProjectDetailDrawer({ open, project, onClose, onEdit }: ProjectDetailDrawerProps) {
  const { modal } = App.useApp();
  const { confirm } = useConfirm();
  const { token } = theme.useToken();
  const deleteMutation = useDeleteProjectMutation();

  if (!project) {
    return (
      <Drawer open={open} onClose={onClose} title="Project Details">
        <EmptyState title="No project data available" />
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: token.marginXS }}>
          <div style={{ width: LAYOUT.ICON_MD, height: LAYOUT.ICON_MD, borderRadius: token.borderRadiusLG, background: token.colorPrimary, color: token.colorText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaIcon icon="fa-diagram-project" />
          </div>
          <div>
            <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>{project.name}</Typography.Text>
            {project.lead && <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>Lead: {project.lead}</div>}
          </div>
        </div>
      }
      placement="right"
      size="large"
      closeIcon={<CloseOutlined />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: token.paddingXL }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: token.marginMD }}>
          <StatCard label="Repos" value={project.repositories?.length ?? 0} />
          <StatCard label="Teams" value={project.teams?.length ?? 0} />
          <StatCard label="Members" value={project.members?.length ?? 0} />
          <StatCard label="Automation" value={project.automation?.length ?? 0} />
        </div>

        {project.description && (
          <section>
            <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: 700 }}>Description</Typography.Title>
            <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, lineHeight: 1.6, margin: 0 }}>{project.description}</Typography.Paragraph>
          </section>
        )}

        <section>
          <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: 700 }}>Repositories</Typography.Title>
          {project.repositories?.length > 0
            ? <Flex wrap="wrap" gap={token.paddingXS}>{project.repositories.map(r => <StatusPill key={r} variant="slate">{r}</StatusPill>)}</Flex>
            : <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>No repositories attached.</Typography.Paragraph>
          }
        </section>

        <section>
          <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: 700 }}>Teams</Typography.Title>
          {(project.teamNames ?? project.teams ?? []).length > 0
            ? <Flex wrap="wrap" gap={token.paddingXS}>{(project.teamNames ?? project.teams ?? []).map((t, i) => <StatusPill key={project.teams?.[i] ?? t} variant="teal">{t}</StatusPill>)}</Flex>
            : <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>No teams assigned.</Typography.Paragraph>
          }
        </section>

        <section>
          <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: 700 }}>Direct members</Typography.Title>
          {(project.memberNames ?? project.members ?? []).length > 0
            ? <Flex wrap="wrap" gap={token.paddingXS}>{(project.memberNames ?? project.members ?? []).map((m, i) => <StatusPill key={project.members?.[i] ?? m} variant="slate">{m}</StatusPill>)}</Flex>
            : <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>No direct members.</Typography.Paragraph>
          }
        </section>

        <section>
          <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: 700 }}>Automation</Typography.Title>
          {project.automation?.length > 0
            ? <Flex wrap="wrap" gap={token.paddingXS}>{project.automation.map(a => <StatusPill key={a} variant="teal">{a}</StatusPill>)}</Flex>
            : <StatusPill variant="slate">Manual</StatusPill>
          }
        </section>

        <div style={{ display: 'flex', gap: token.paddingMD, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: token.paddingXL }}>
          <Button type="primary" icon={<FaIcon icon="fa-pen" />} onClick={() => onEdit(project)}>Edit project</Button>
          <Button
            danger
            icon={<FaIcon icon="fa-trash" />}
            loading={deleteMutation.isPending}
            onClick={() => confirm({
              title: 'Delete project?',
              content: `Delete "${project.name}"? This cannot be undone.`,
              danger: true,
              onOk: () => {
                deleteMutation.mutate(project.id, {
                  onSuccess: () => { modal.success({ title: 'Deleted', content: `${project.name} has been deleted.` }); onClose(); },
                  onError: (err) => modal.error({ title: 'Failed to delete', content: errorMessage(err) }),
                });
              },
            })}
          >
            Delete
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const { token } = theme.useToken();
  return (
    <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, background: token.colorBgContainer, padding: `${token.paddingMD}px ${token.paddingLG}px` }}>
      <Typography.Text style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, color: token.colorText, display: 'block' }}>{value}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{label}</Typography.Text>
    </div>
  );
}
