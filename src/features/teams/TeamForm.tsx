'use client';

import { Button, App, Select, Form, Input, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';

import { teamFormSchema } from '@/commons/schemas';
import type { TeamWithSummary } from '@/commons/types/team';
import { errorMessage } from '@/lib/api/errors';
import { useLazySelect } from '@/lib/hooks/useLazySelect';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { createZodSync } from '@/lib/utils/zod-sync';
import { membersApi } from '@/modules/members/api';
import { memberKeys } from '@/modules/members/keys';
import { useCreateTeamMutation, useUpdateTeamMutation } from '@/modules/teams';

const rule = createZodSync(teamFormSchema);

interface TeamFormProps {
  /** The team being edited (null for creating a new team). */
  team?: TeamWithSummary | null;
}

/**
 * Form for creating or editing a team.
 * Used as a full-page form (not modal).
 *
 * @example
 * <TeamForm team={null} />
 * <TeamForm team={existingTeam} />
 */
export function TeamForm({ team }: TeamFormProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const { workspaceId } = useWorkspace();

  const createMutation = useCreateTeamMutation();
  const updateMutation = useUpdateTeamMutation();

  // Lazy select for members with infinite scroll and debounced search
  const members = useLazySelect({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, params) => membersApi.list(ws, params),
    getId: (m) => m.userId,
    getLabel: (m) => `${m.name} (${m.email})`,
    perPage: 100,
    baseKey: memberKeys.all,
  });

  const initialValues = team
    ? {
        name: team.name,
        slug: team.slug,
        description: team.description,
        memberIds: [],
      }
    : { name: '', slug: '', description: '', memberIds: [] };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setFieldsValue({ name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') });
  };

  const handleFinish = (values: { name: string; slug: string; description: string; memberIds: string[] }) => {
    if (team) {
      updateMutation.mutate(
        { id: team.id, payload: values },
        {
          onSuccess: () => {
            message.success(`Team "${values.name}" updated`);
            router.push('/' + window.location.pathname.split('/')[1] + '/teams');
          },
          onError: (err) => message.error(errorMessage(err)),
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          message.success(`Team "${values.name}" created`);
          router.push(`/${workspaceId}/teams`);
        },
        onError: (err) => message.error(errorMessage(err)),
      });
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={initialValues} style={{ maxWidth: 720 }}>
      <Form.Item
        label="Team name"
        name="name"
        rules={[rule]}
      >
        <Input placeholder="e.g. Security Team" onChange={handleNameChange} />
      </Form.Item>

      <Form.Item
        label="Slug"
        name="slug"
        rules={[rule]}
        extra="Unique identifier for URL paths"
      >
        <Input placeholder="e.g. security-team" />
      </Form.Item>

      <Form.Item
        label="Description"
        name="description"
      >
        <Input.TextArea placeholder="Optional description" rows={3} style={{ resize: 'vertical' }} />
      </Form.Item>

      <Form.Item label="Members" name="memberIds" extra="Members can be added or removed later from the team detail.">
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

      <Flex gap={token.paddingMD} style={{ paddingTop: token.paddingLG }}>
        <Button type="primary" htmlType="submit" loading={team ? updateMutation.isPending : createMutation.isPending}>
          {team ? 'Save team' : 'Create team'}
        </Button>
        <Button onClick={() => router.back()}>
          Cancel
        </Button>
      </Flex>
    </Form>
  );
}
