'use client';

import { useEffect } from 'react';
import { Modal, Input, Select, Checkbox, Form, Typography, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { useTeamsQuery, useTeamMembersQuery } from '@/modules/teams';
import type { Project } from '@/commons/types';
import type { ProjectFormInput } from '@/modules/project/types';

const { Text } = Typography;

const REPO_OPTIONS = [
  { value: 'repo_01', label: 'backend-api' },
  { value: 'repo_02', label: 'customer-web' },
  { value: 'repo_03', label: 'mobile-ios' },
  { value: 'repo_04', label: 'infra-terraform' },
  { value: 'repo_05', label: 'data-pipeline' },
  { value: 'repo_06', label: 'auth-service' },
];

interface ProjectFormModalProps {
  open: boolean;
  project?: Project | null;
  onCancel: () => void;
  onConfirm: (input: ProjectFormInput) => void;
  isLoading?: boolean;
}

export function ProjectFormModal({ open, project, onCancel, onConfirm, isLoading }: ProjectFormModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const teamsQuery = useTeamsQuery();
  const membersQuery = useTeamMembersQuery(teamsQuery.data?.[0]?.id ?? '');

  const teamOptions = (teamsQuery.data ?? []).map(t => ({ value: t.id, label: t.name }));
  const memberOptions = (membersQuery.data ?? [])
    .filter((m, i, arr) => arr.findIndex(x => x.userId === m.userId) === i)
    .map(m => ({ value: m.userId, label: `${m.name} (${m.email})` }));

  useEffect(() => {
    if (open) {
      if (project) {
        form.setFieldsValue({
          name: project.name,
          description: project.description,
          lead: project.lead,
          teamIds: [],
          memberIds: [],
          repositoryIds: [],
          enforceQualityGate: project.automation.includes('Gate enforced'),
          notifyOnCritical: false,
          autoTriggerScan: project.automation.includes('Auto scan'),
        });
      } else {
        form.resetFields();
      }
    }
  }, [project, open, form]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={project ? 'Edit project' : 'New project'}
      width={MODAL_WIDTH.XL}
      okText={project ? 'Save project' : 'Create project'}
      cancelText="Cancel"
      confirmLoading={isLoading}
      onOk={() => form.validateFields().then((values) => onConfirm(values))}
    >
      <div style={{ display: 'grid', gap: token.paddingXL, padding: `${token.paddingLG} 0` }}>
        <div style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>
          Groups repositories and teams. Repos and teams are attached, not owned.
        </div>

        <Form form={form} layout="vertical" initialValues={{ name: '', description: '', lead: '', teamIds: [], memberIds: [], repositoryIds: [], enforceQualityGate: false, notifyOnCritical: false, autoTriggerScan: false }}>
          <Form.Item label="Project name" name="name" required rules={[{ required: true, message: 'Project name is required' }]}>
            <Input placeholder="e.g. Backend API" />
          </Form.Item>

          <Form.Item label="Description (optional)" name="description">
            <Input.TextArea placeholder="Optional description" rows={2} />
          </Form.Item>

          <Form.Item label="Lead contact (optional)" name="lead">
            <Input placeholder="Optional — not a permission" />
          </Form.Item>

          <Form.Item label="Teams (optional)" name="teamIds">
            <Select mode="multiple" style={{ width: '100%' }} placeholder="Attach teams to this project" options={teamOptions} />
          </Form.Item>

          <Form.Item label="Direct members (optional)" name="memberIds" extra="For individual access outside of team membership.">
            <Select mode="multiple" style={{ width: '100%' }} placeholder="Add individual member access" options={memberOptions} filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
          </Form.Item>

          <Form.Item label="Repositories (optional)" name="repositoryIds">
            <Select mode="multiple" style={{ width: '100%' }} placeholder="Attach repositories to this project" options={REPO_OPTIONS} />
          </Form.Item>

          <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: token.paddingXL }}>
            <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize, marginBottom: token.paddingXL }}>Scan settings</div>
            <div style={{ display: 'grid', gap: token.paddingLG }}>
              <Form.Item name="enforceQualityGate" valuePropName="checked" noStyle>
                <ToggleRow label="Enforce quality gate on PRs" desc="Block PRs with critical findings" />
              </Form.Item>
              <Form.Item name="notifyOnCritical" valuePropName="checked" noStyle>
                <ToggleRow label="Notify on critical findings" desc="Send alerts for critical vulnerabilities" />
              </Form.Item>
              <Form.Item name="autoTriggerScan" valuePropName="checked" noStyle>
                <ToggleRow label="Auto-trigger scan from SCM webhooks" desc="Run scans on push events" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked?: boolean; onChange?: (checked: boolean) => void }) {
  const { token } = theme.useToken();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: token.marginMD }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: token.fontSize, color: token.colorText }}>{label}</div>
        <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{desc}</div>
      </div>
      <Checkbox checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
    </div>
  );
}
