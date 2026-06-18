'use client';

import { useEffect } from 'react';
import { Modal, Select, Form, Card, Flex, Tag, Typography, theme } from 'antd';
import { ASSIGNABLE_ROLES, ROLE_HELP, roleLabel } from '@/lib/utils/roleLabel';
import { createZodSync } from '@/lib/utils/zod-sync';
import { changeRoleSchema } from '@/commons/schemas';

/** Zod-powered form rule — validates role from single schema source. */
const rule = createZodSync(changeRoleSchema);

interface ChangeRoleModalProps {
  /** Whether the modal is currently visible. */
  open: boolean;
  /** The email address of the member whose role is being changed. */
  email: string | undefined;
  /** The currently selected new role value. */
  newRole: string;
  /** Callback triggered when the user confirms the role change. */
  onConfirm: (role: string) => void;
  /** Callback triggered when the user cancels or closes the modal. */
  onCancel: () => void;
  /** Whether the role change request is in progress. */
  isLoading: boolean;
}

/**
 * Modal dialog for changing a workspace member's role.
 * Validation powered by Zod schema via createZodSync bridge.
 *
 * Schema: `changeRoleSchema` from `@/commons/schemas`
 * - role: required, one of manager/reviewer/member (owner excluded)
 *
 * @example
 * <ChangeRoleModal open={true} email="user@example.com" newRole="manager" onConfirm={fn} onCancel={fn} isLoading={false} />
 */
export function ChangeRoleModal({ open, email, newRole, onConfirm, onCancel, isLoading }: ChangeRoleModalProps) {
  const [form] = Form.useForm();
  const { token } = theme.useToken();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ role: newRole });
    }
  }, [open, newRole, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onConfirm(values.role);
    } catch {
      // validation failed
    }
  };

  const watchedRole = Form.useWatch('role', form) ?? newRole;

  return (
    <Modal
      title="Change role"
      open={open}
      destroyOnHidden
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={isLoading}
      okText="Save changes"
      okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary } }}
    >
      <Flex vertical gap={token.marginSM}>
        <Tag>{email}</Tag>
        <Form form={form} layout="vertical" initialValues={{ role: newRole }}>
          <Form.Item label="Role" name="role" rules={[rule]}>
            <Select options={ASSIGNABLE_ROLES} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
        <Card size="small" styles={{ body: { padding: token.paddingSM } }}>
          <Flex vertical gap={token.marginXXS}>
            <Typography.Text strong>{roleLabel(watchedRole)}</Typography.Text>
            <Typography.Text type="secondary">{ROLE_HELP[watchedRole] ?? 'Role permissions follow the workspace default.'}</Typography.Text>
          </Flex>
        </Card>
      </Flex>
    </Modal>
  );
}
