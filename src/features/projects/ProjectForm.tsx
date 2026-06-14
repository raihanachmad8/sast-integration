'use client';

import { useEffect } from 'react';
import { App, Button, Form, Input, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { createZodSync } from '@/lib/utils/zod-sync';
import { projectFormSchema } from '@/commons/schemas';
import { useCreateProjectMutation, useUpdateProjectMutation } from '@/modules/projects';
import { errorMessage } from '@/lib/api/errors';
import type { Project } from '@/commons/types';

const rule = createZodSync(projectFormSchema);

interface ProjectFormProps {
  project?: Project | null;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();

  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description,
      });
    }
  }, [project, form]);

  const handleFinish = (values: Record<string, unknown>) => {
    const name = values.name as string;
    const description = (values.description as string) || '';

    const payload = { name, description, lead: '', teamIds: [], memberIds: [], repositoryIds: [] };

    if (project) {
      updateMutation.mutate(
        { id: project.id, payload },
        {
          onSuccess: () => {
            message.success(`Project "${name}" updated`);
            router.push('/' + window.location.pathname.split('/')[1] + '/projects');
          },
          onError: (err: Error) => message.error(errorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(
        payload,
        {
          onSuccess: () => {
            message.success(`Project "${name}" created`);
            router.push('/' + window.location.pathname.split('/')[1] + '/projects');
          },
          onError: (err: Error) => message.error(errorMessage(err)),
        },
      );
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      style={{ display: 'grid', gap: token.paddingXL, maxWidth: 480 }}
    >
      <Form.Item
        label="Project name"
        name="name"
        rules={[rule]}
      >
        <Input placeholder="e.g. Backend API" />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input.TextArea
          placeholder="Optional description"
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </Form.Item>

      <Flex gap={token.paddingMD} style={{ paddingTop: token.paddingLG }}>
        <Button type="primary" htmlType="submit" loading={isSubmitting}>
          {project ? 'Save project' : 'Create project'}
        </Button>
        <Button onClick={() => router.back()}>Cancel</Button>
      </Flex>
    </Form>
  );
}
