'use client';

import { useEffect } from 'react';
import { Modal, Input, Select, Form, Typography, theme } from 'antd';
import { useMembersQuery } from '@/modules/members';
import { useSessionData } from '@/modules/auth/queries';
import type { Team } from '@/commons/types';
import type { TeamFormInput } from '@/modules/teams/types';
import { teamFormSchema } from '@/commons/schemas/team.schema';
import { createZodSync } from '@/lib/utils/zod-sync';

interface TeamFormModalProps {
  open: boolean;
  team?: Team | null;
  onCancel: () => void;
  onConfirm: (input: TeamFormInput) => void;
  isLoading?: boolean;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function TeamFormModal({ open, team, onCancel, onConfirm, isLoading }: TeamFormModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const rule = createZodSync(teamFormSchema);

  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';
  const membersQuery = useMembersQuery(workspaceId, { page: 1, perPage: 1000 });
  const memberOptions = (membersQuery.data?.data ?? [])
    .filter((m, i, arr) => arr.findIndex(x => x.userId === m.userId) === i)
    .map(m => ({ value: m.userId, label: `${m.name} (${m.email})` }));

  useEffect(() => {
    if (open) {
      if (team) {
        form.setFieldsValue({ name: team.name, slug: team.slug, description: team.description, memberIds: [] });
      } else {
        form.resetFields();
      }
    }
  }, [team, open, form]);

  const handleNameChange = (v: string) => {
    form.setFieldsValue({ slug: slugify(v) });
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={team ? 'Edit team' : 'New team'}
      width={560}
      okText={team ? 'Save team' : 'Create team'}
      cancelText="Cancel"
      confirmLoading={isLoading}
      onOk={() => form.validateFields().then((values) => onConfirm(values))}
    >
      <div style={{ display: 'grid', gap: token.paddingXL, padding: `${token.paddingLG} 0` }}>
        <Form form={form} layout="vertical" initialValues={{ name: '', slug: '', description: '', memberIds: [] }}>
          <Form.Item label="Team name" name="name" required rules={[rule]}>
            <Input placeholder="e.g. Security Team" onChange={(e) => handleNameChange(e.target.value)} />
          </Form.Item>

          <Form.Item label="Slug" name="slug" required rules={[rule]}>
            <Input placeholder="e.g. security-team" />
          </Form.Item>

          <Form.Item label="Description (optional)" name="description" rules={[rule]}>
            <Input.TextArea placeholder="Optional description" rows={2} />
          </Form.Item>

          <Form.Item label="Members (optional)" name="memberIds" rules={[rule]}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select workspace members to add"
              options={memberOptions}
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Typography.Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, marginTop: -token.paddingSM, display: 'block' }}>
            Members can be added or removed later from the team detail.
          </Typography.Text>
        </Form>
      </div>
    </Modal>
  );
}
