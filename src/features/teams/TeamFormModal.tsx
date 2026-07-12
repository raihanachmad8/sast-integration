'use client';

import { Modal, Input, Select, Form, Typography, theme } from 'antd';

import { teamFormSchema } from '@/commons/schemas/team.schema';
import type { TeamWithSummary } from '@/commons/types/team';
import { useLazySelect } from '@/lib/hooks/useLazySelect';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { createZodSync } from '@/lib/utils/zod-sync';
import { membersApi } from '@/modules/members/api';
import { memberKeys } from '@/modules/members/keys';
import { useTeamQuery } from '@/modules/teams';
import type { TeamFormInput } from '@/modules/teams/types';

interface TeamFormModalProps {
  open: boolean;
  team?: TeamWithSummary | null;
  onCancel: () => void;
  onConfirm: (input: TeamFormInput) => void;
  isLoading?: boolean;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

/**
 * Modal form for creating or editing a team with name, description, and member assignment.
 *
 * Auto-generates a slug from the team name and supports selecting multiple members.
 *
 * @param props - {@link TeamFormModalProps}
 * @returns JSX element rendering the team create/edit modal.
 *
 * @example
 * <TeamFormModal
 *   open={true}
 *   team={existingTeam}
 *   onCancel={() => setOpen(false)}
 *   onConfirm={(input) => saveTeam(input)}
 *   isLoading={false}
 * />
 */
export function TeamFormModal({ open, team, onCancel, onConfirm, isLoading }: TeamFormModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const rule = createZodSync(teamFormSchema);
  const { workspaceId } = useWorkspace();

  // Fetch full team data with members when editing
  const { data: fullTeam } = useTeamQuery(team?.id ?? '');

  // Lazy select for members with infinite scroll and debounced search
  const members = useLazySelect({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, params) => membersApi.list(ws, params),
    getId: (m) => m.userId,
    getLabel: (m) => `${m.name} (${m.email})`,
    perPage: 100,
    baseKey: memberKeys.all,
  });

  const handleNameChange = (v: string) => {
    form.setFieldsValue({ slug: slugify(v) });
  };

  // Use fullTeam (with members) if available, fall back to team prop
  const activeTeam = fullTeam ?? team;

  const openChange = (visible: boolean) => {
    if (!visible) return;
    // Use microtask to ensure the Form element is connected after Modal renders children
    queueMicrotask(() => {
      if (activeTeam) {
        form.setFieldsValue({ 
          name: activeTeam.name, 
          slug: activeTeam.slug, 
          description: activeTeam.description, 
          memberIds: activeTeam.members?.map((m) => m.userId) || [] 
        });
      } else {
        form.resetFields();
      }
    });
  };

  return (
    <Modal
      open={open}
      afterOpenChange={openChange}
      destroyOnHidden
      onCancel={onCancel}
      title={team ? 'Edit team' : 'New team'}
      width={560}
      okText={team ? 'Save team' : 'Create team'}
      cancelText="Cancel"
      confirmLoading={isLoading}
      onOk={() => form.submit()}
    >
      <div style={{ display: 'grid', gap: token.paddingXL, padding: `${token.paddingLG} 0` }}>
        <Form form={form} layout="vertical" initialValues={{ name: '', slug: '', description: '', memberIds: [] }} onFinish={(values) => onConfirm(values)}>
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
              options={members.options}
              showSearch
              onSearch={members.handleSearch}
              onPopupScroll={members.handleScroll}
              filterOption={false}
              loading={members.isLoading}
              notFoundContent={members.isFetchingNextPage ? 'Loading...' : 'No members found'}
            />
          </Form.Item>
          <Typography.Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, marginTop: -token.paddingSM, display: 'block' }}>
            Members can be added or removed later from the team detail.
          </Typography.Text>
          {/* Hidden submit button enables Enter-to-submit in the form */}
          <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
        </Form>
      </div>
    </Modal>
  );
}
