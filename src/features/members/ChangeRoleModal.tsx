'use client';

import { useEffect } from 'react';
import { Modal, Select, Form, theme } from 'antd';
import { AUTH_THEME } from '@/commons/constants';
import { ASSIGNABLE_ROLES, ROLE_HELP, roleLabel } from '@/lib/utils/roleLabel';

/** Props for the ChangeRoleModal component. */
interface ChangeRoleModalProps {
  /** Whether the modal is currently visible. */
  open: boolean;
  /** The email address of the member whose role is being changed. */
  email: string | undefined;
  /** The currently selected new role value. */
  newRole: string;
  /** Callback triggered when the user selects a different role. */
  onRoleChange: (role: string) => void;
  /** Callback triggered when the user confirms the role change. */
  onConfirm: () => void;
  /** Callback triggered when the user cancels or closes the modal. */
  onCancel: () => void;
  /** Whether the role change request is in progress. */
  isLoading: boolean;
}

/**
 * A modal dialog for changing a workspace member's role.
 *
 * @param props - The modal configuration.
 * @returns An Ant Design Modal with a role selector and preview.
 *
 * @example
 * <ChangeRoleModal
 *   open={true}
 *   email="user@example.com"
 *   newRole="manager"
 *   onRoleChange={setNewRole}
 *   onConfirm={() => changeRole()}
 *   onCancel={() => closeModal()}
 *   isLoading={false}
 * />
 */
export function ChangeRoleModal({ open, email, newRole, onRoleChange, onConfirm, onCancel, isLoading }: ChangeRoleModalProps) {
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
      onRoleChange(values.role);
      onConfirm();
    } catch {
      // validation failed
    }
  };

  const watchedRole = Form.useWatch('role', form) ?? newRole;

  return (
    <Modal
      title="Change role"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={isLoading}
      okText="Save changes"
      okButtonProps={{ style: { background: AUTH_THEME.PRIMARY, borderColor: AUTH_THEME.PRIMARY } }}
    >
      <div style={{ display: 'grid', gap: token.marginSM }}>
        <div style={{ border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadiusLG, background: token.colorBgLayout, color: token.colorTextSecondary, fontSize: token.fontSizeSM, fontWeight: 500, padding: `${token.paddingXS}px ${token.paddingSM}px` }}>{email}</div>
        <Form form={form} layout="vertical" initialValues={{ role: newRole }}>
          <Form.Item name="role" rules={[{ required: true, message: 'Please select a role' }]}>
            <Select options={ASSIGNABLE_ROLES} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
        <div style={{ display: 'grid', gap: token.marginXXS, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadiusLG, background: token.colorBgLayout, padding: token.paddingSM }}>
          <strong>{roleLabel(watchedRole)}</strong>
          <span>{ROLE_HELP[watchedRole] ?? 'Role permissions follow the workspace default.'}</span>
        </div>
      </div>
    </Modal>
  );
}
