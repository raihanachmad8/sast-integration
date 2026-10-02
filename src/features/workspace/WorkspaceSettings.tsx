'use client';

import { App, Button, Card, Flex, Form, Input, Typography, Alert, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { useSessionQuery } from '@/modules/auth/queries';
import { useUpdateWorkspaceMutation } from '@/modules/workspace/queries';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { errorMessage } from '@/lib/api/errors';
import { updateWorkspaceSchema, type UpdateWorkspaceInput } from '@/commons/schemas';

export function WorkspaceSettings() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm<UpdateWorkspaceInput>();
  const session = useSessionQuery();
  const { isAtLeast } = usePermissions();
  const canEdit = isAtLeast('owner');

  const workspace = session.data?.workspace;
  const updateMutation = useUpdateWorkspaceMutation(workspace?.id ?? '');

  const handleSave = (values: UpdateWorkspaceInput) => {
    updateMutation.mutate(
      { name: values.name, slug: values.slug || undefined, description: values.description || undefined },
      {
        onSuccess: () => message.success('Workspace settings saved'),
        onError: (err) => message.error(err.message),
      },
    );
  };

  if (session.isLoading) return <LoadingState text="Loading workspace..." />;
  if (!workspace) return <LoadingState text="No workspace selected..." />;

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Workspace Settings"
        description="Manage your workspace name, slug, and description."
        actions={canEdit ? (
          <Button type="primary" icon={<FaIcon icon="fa-floppy-disk" />} loading={updateMutation.isPending} onClick={() => form.submit()}>
            Save changes
          </Button>
        ) : undefined}
      />

      {!canEdit && (
        <Alert
          message="Read-only"
          description="Only the workspace owner can edit settings."
          type="warning"
          showIcon
          icon={<FaIcon icon="fa-lock" />}
        />
      )}

      {updateMutation.isError && (
        <ErrorBanner message={errorMessage(updateMutation.error)} />
      )}

      <Card styles={{ body: { padding: token.paddingXL } }}>
        <Form form={form} layout="vertical" disabled={!canEdit} onFinish={handleSave} key={workspace?.id ?? 'default'} initialValues={{ name: workspace?.name ?? '', slug: workspace?.slug ?? '', description: '' }}>
          <Form.Item name="name" label="Workspace name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. My Team Workspace" />
          </Form.Item>

          <Form.Item name="slug" label="Slug" extra="Lowercase alphanumeric with hyphens. Used in URLs.">
            <Input placeholder="auto-generated-from-name" onChange={(e) => form.setFieldValue('slug', e.target.value.replace(/[^a-z0-9-]/g, ''))} />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Optional workspace description" rows={3} />
          </Form.Item>
        </Form>
      </Card>
    </Flex>
  );
}
