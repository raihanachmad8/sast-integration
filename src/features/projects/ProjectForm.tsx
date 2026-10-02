'use client';

import { useState, useEffect } from 'react';
import { App, Button, Select, Checkbox, Form, Input, Typography, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useTeamsQuery, useTeamMembersQuery } from '@/modules/teams';
import type { Project } from '@/commons/types';

const REPO_OPTIONS = [
  { value: 'repo_01', label: 'backend-api' },
  { value: 'repo_02', label: 'customer-web' },
  { value: 'repo_03', label: 'mobile-ios' },
  { value: 'repo_04', label: 'infra-terraform' },
  { value: 'repo_05', label: 'data-pipeline' },
  { value: 'repo_06', label: 'auth-service' },
];

interface ProjectFormProps {
  project?: Project | null;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teamsQuery = useTeamsQuery();
  const membersQuery = useTeamMembersQuery(teamsQuery.data?.[0]?.id ?? '');

  const teamOptions = (teamsQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }));
  const memberOptions = (membersQuery.data ?? [])
    .filter((m, i, arr) => arr.findIndex((x) => x.userId === m.userId) === i)
    .map((m) => ({ value: m.userId, label: `${m.name} (${m.email})` }));

  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description,
        lead: project.lead,
      });
    }
  }, [project, form]);

  const handleFinish = (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    const name = values.name as string;
    message.success(project ? `Project "${name}" updated` : `Project "${name}" created`);
    setIsSubmitting(false);
    router.push('/' + window.location.pathname.split('/')[1] + '/projects');
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} style={{ display: 'grid', gap: token.paddingXL, maxWidth: 720 }}>
      <div style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>
        Groups repositories and teams. Repos and teams are attached, not owned.
      </div>

      <Form.Item label="Project name" name="name" rules={[{ required: true, message: 'Project name is required' }]}>
        <Input placeholder="e.g. Backend API" />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input.TextArea placeholder="Optional description" rows={3} style={{ resize: 'vertical' }} />
      </Form.Item>

      <Form.Item label="Lead contact" name="lead">
        <Input placeholder="Optional — not a permission" />
      </Form.Item>

      <Form.Item label="Teams" name="teams">
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Attach teams to this project"
          options={teamOptions}
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Form.Item>

      <Form.Item label="Direct members" name="members" extra="For individual access outside of team membership.">
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Add individual member access"
          options={memberOptions}
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Form.Item>

      <Form.Item label="Repositories" name="repositories">
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Attach repositories to this project"
          options={REPO_OPTIONS}
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Form.Item>

      <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: token.paddingXL }}>
        <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize, marginBottom: token.paddingXL }}>Scan settings</div>
        <div style={{ display: 'grid', gap: token.paddingLG }}>
          <ToggleRow label="Enforce quality gate on PRs" desc="Block PRs with critical findings" />
          <ToggleRow label="Notify on critical findings" desc="Send alerts for critical vulnerabilities" />
          <ToggleRow label="Auto-trigger scan from SCM webhooks" desc="Run scans on push events" />
        </div>
      </div>

      <Flex gap={token.paddingMD} style={{ paddingTop: token.paddingLG }}>
        <Button type="primary" htmlType="submit" loading={isSubmitting}>
          {project ? 'Save project' : 'Create project'}
        </Button>
        <Button onClick={() => router.back()}>
          Cancel
        </Button>
      </Flex>
    </Form>
  );
}

function ToggleRow({ label, desc }: { label: string; desc: string }) {
  const { token } = theme.useToken();
  return (
    <Flex justify="space-between" align="flex-start" gap={token.marginMD}>
      <div>
        <div style={{ fontWeight: 500, fontSize: token.fontSize, color: token.colorText }}>{label}</div>
        <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{desc}</div>
      </div>
      <Checkbox />
    </Flex>
  );
}
