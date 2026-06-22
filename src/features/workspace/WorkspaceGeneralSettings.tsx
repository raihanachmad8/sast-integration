'use client';

import { useEffect } from 'react';
import { Form, Input, Button, Card, App, Flex, theme } from 'antd';
import { useWorkspaceDetailQuery, useUpdateWorkspaceMutation } from '@/modules/workspace/queries';
import { createZodSync } from '@/lib/utils/zod-sync';
import { workspaceUpdateSchema } from '@/commons/schemas';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import { errorMessage } from '@/lib/api/errors';

const rule = createZodSync(workspaceUpdateSchema);

interface WorkspaceGeneralSettingsProps {
  workspaceId: string;
}

/**
 * Workspace general settings form — edit name and description.
 * Fetches current workspace detail and submits updates via mutation.
 *
 * @example
 * <WorkspaceGeneralSettings workspaceId="ws_01" />
 */
export function WorkspaceGeneralSettings({ workspaceId }: WorkspaceGeneralSettingsProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const workspaceQuery = useWorkspaceDetailQuery(workspaceId);
  const updateMutation = useUpdateWorkspaceMutation();

  const workspace = workspaceQuery.data;

  useEffect(() => {
    if (workspace) {
      form.setFieldsValue({ name: workspace.name, description: workspace.description ?? '' });
    }
  }, [workspace, form]);

  if (workspaceQuery.isLoading) return <LoadingState compact text="Loading workspace..." />;
  if (workspaceQuery.isError) return <ErrorState title="Failed to load workspace" description={errorMessage(workspaceQuery.error)} />;

  const handleFinish = (values: { name: string; description: string }) => {
    updateMutation.mutate(
      { id: workspaceId, payload: values },
      {
        onSuccess: () => message.success('Workspace settings updated'),
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  };

  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ maxWidth: 560 }}>
        <Form.Item label="Workspace name" name="name" rules={[rule]}>
          <Input placeholder="e.g. SAST Integration" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea placeholder="Optional description" rows={3} />
        </Form.Item>

        <Flex gap={token.marginMD}>
          <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
            Save changes
          </Button>
          <Button onClick={() => form.resetFields()}>
            Reset
          </Button>
        </Flex>
      </Form>
    </Card>
  );
}
