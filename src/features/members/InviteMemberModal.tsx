'use client';

import { Input, Modal, Select, Form, theme } from 'antd';
import { AUTH_THEME } from '@/commons/constants';
import { ROLE } from '@/commons/constants/permissions';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { ASSIGNABLE_ROLES, ROLE_HELP, roleLabel, formatFieldLabel } from '@/lib/utils/roleLabel';
import { errorMessage, fieldErrors, fieldErrorMessage } from '@/lib/api/errors';

/** Props for the InviteMemberModal component. */
interface InviteMemberModalProps {
  /** Whether the modal is currently visible. */
  open: boolean;
  /** Callback triggered when the user submits the invitation. */
  onConfirm: () => void;
  /** Callback triggered when the user cancels or closes the modal. */
  onCancel: () => void;
  /** Whether the invitation request is in progress. */
  isLoading: boolean;
  /** Server-side error returned from the invitation API, if any. */
  error: unknown;
}

/**
 * A modal dialog for inviting a new member to the workspace via email.
 *
 * @param props - The modal configuration.
 * @returns An Ant Design Modal with email input, role selector, and validation.
 *
 * @example
 * <InviteMemberModal
 *   open={true}
 *   onConfirm={() => sendInvite()}
 *   onCancel={() => closeModal()}
 *   isLoading={false}
 *   error={null}
 * />
 */
export function InviteMemberModal({ open, onConfirm, onCancel, isLoading, error }: InviteMemberModalProps) {
  const [form] = Form.useForm();
  const { token } = theme.useToken();

  const inviteErrorFields = fieldErrors(error);
  const serverEmailError = fieldErrorMessage(error, 'email');

  const email = Form.useWatch('email', form) ?? '';
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const localEmailError = email.trim().length > 0 && !isValidEmail ? 'Please enter a valid email address' : undefined;
  const emailError = localEmailError ?? serverEmailError;
  const canSend = isValidEmail;

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Invite member"
      open={open}
      onCancel={handleCancel}
      onOk={() => form.validateFields().then(() => onConfirm())}
      confirmLoading={isLoading}
      okText="Send invitation"
      okButtonProps={{ style: canSend ? { background: AUTH_THEME.PRIMARY, borderColor: AUTH_THEME.PRIMARY } : undefined, disabled: !canSend }}
    >
      <div style={{ display: 'grid', gap: token.marginSM }}>
        {error != null && (
          <ErrorBanner
            message={errorMessage(error)}
            errors={inviteErrorFields.map(e => ({ ...e, field: formatFieldLabel(e.field) }))}
          />
        )}
        <Form form={form} layout="vertical" initialValues={{ email: '', role: ROLE.REVIEWER }}>
          <Form.Item
            label="Email address"
            name="email"
            required
            rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Please enter a valid email address' }]}
          >
            <Input placeholder="Email address" status={emailError ? 'error' : undefined} />
          </Form.Item>
          {emailError && <div style={{ marginTop: -8, color: token.colorError, fontSize: token.fontSizeSM, fontWeight: 500, lineHeight: 18 }}>{emailError}</div>}
          <Form.Item label="Role" name="role" required rules={[{ required: true, message: 'Role is required' }]}>
            <Select options={ASSIGNABLE_ROLES} style={{ width: '100%' }} />
          </Form.Item>
          <RolePreview form={form} />
        </Form>
      </div>
    </Modal>
  );
}

function RolePreview({ form }: { form: ReturnType<typeof Form.useForm>[0] }) {
  const { token } = theme.useToken();
  const role = Form.useWatch('role', form) ?? ROLE.REVIEWER;
  return (
    <div style={{ display: 'grid', gap: token.marginXXS, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadiusLG, background: token.colorBgLayout, padding: token.paddingSM }}>
      <strong>{roleLabel(role)}</strong>
      <span>{ROLE_HELP[role]}</span>
    </div>
  );
}
