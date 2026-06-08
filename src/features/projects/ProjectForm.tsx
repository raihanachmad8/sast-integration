'use client';

import { useState, useEffect } from 'react';
import { App, Button, Form, Input, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { createZodSync } from '@/lib/utils/zod-sync';
import { projectFormSchema } from '@/commons/schemas';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description,
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
