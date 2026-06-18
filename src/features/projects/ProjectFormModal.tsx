'use client';

import { Modal, Input, Form, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { createZodSync } from '@/lib/utils/zod-sync';
import { projectFormSchema } from '@/commons/schemas';
import type { Project } from '@/commons/types';
import type { ProjectFormInput } from '@/modules/projects/types';

const rule = createZodSync(projectFormSchema);

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

  return (
    <Modal
      open={open}
      destroyOnHidden
      onCancel={onCancel}
      title={project ? 'Edit project' : 'New project'}
      width={MODAL_WIDTH.SM}
      okText={project ? 'Save project' : 'Create project'}
      cancelText="Cancel"
      confirmLoading={isLoading}
      onOk={() => form.validateFields().then((values) => onConfirm(values))}
    >
      <div style={{ display: 'grid', gap: token.paddingXL, padding: `${token.paddingLG} 0` }}>
        <Form form={form} layout="vertical" initialValues={{ name: project?.name ?? '', description: project?.description ?? '' }}>
          <Form.Item label="Project name" name="name" rules={[rule]}>
            <Input placeholder="e.g. Backend API" />
          </Form.Item>

          <Form.Item label="Description (optional)" name="description">
            <Input.TextArea placeholder="Optional description" rows={3} style={{ resize: 'vertical' }} />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
