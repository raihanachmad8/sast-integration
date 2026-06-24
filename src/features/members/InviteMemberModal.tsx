'use client';

import { Input, Modal, Select, Form, Card, Flex, Typography, theme } from 'antd';
import { ROLE } from '@/commons/constants/permissions';
import { ErrorBanner } from '@/commons/components/ErrorBanner';
import { ASSIGNABLE_ROLES, ROLE_HELP, roleLabel, formatFieldLabel } from '@/lib/utils/roleLabel';
import { errorMessage, fieldErrors, fieldErrorMessage } from '@/lib/api/errors';
import { createZodSync } from '@/lib/utils/zod-sync';
import { inviteMemberSchema } from '@/commons/schemas';

/** Zod-powered form rule — validates email + role from single schema source. */
const rule = createZodSync(inviteMemberSchema);

interface InviteMemberModalProps {
  /** Whether the modal is currently visible. */
  open: boolean;
  /** Callback triggered when the user submits the invitation with validated form data. */
  onConfirm: (values: { email: string; role: string }) => void;
  /** Callback triggered when the user cancels or closes the modal. */
  onCancel: () => void;
  /** Whether the invitation request is in progress. */
  isLoading: boolean;
  /** Server-side error returned from the invitation API, if any. */
  error: unknown;
}

/**
 * Modal dialog for inviting a new member to the workspace via email.
 * Validation powered by Zod schema via createZodSync bridge.
 *
 * Schema: `inviteMemberSchema` from `@/commons/schemas`
 * - email: required, valid email format
 * - role: required, one of manager/reviewer/member (owner excluded)
 *
 * @example
 * <InviteMemberModal open={true} onConfirm={(v) => sendInvite(v)} onCancel={close} isLoading={false} error={null} />
 */
export function InviteMemberModal({ open, onConfirm, onCancel, isLoading, error }: InviteMemberModalProps) {
  const [form] = Form.useForm();
  const { token } = theme.useToken();

  const inviteErrorFields = fieldErrors(error);
  const serverEmailError = fieldErrorMessage(error, 'email');

  const email = Form.useWatch('email', form) ?? '';
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailError = email.trim().length > 0 && !isValidEmail ? 'Please enter a valid email address' : serverEmailError;
  const canSend = isValidEmail;

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleSubmit = (values: { email: string; role: string }) => {
    onConfirm(values);
  };

  return (
    <Modal
      title="Invite member"
      open={open}
      destroyOnHidden
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      okText="Send invitation"
      okButtonProps={{ style: canSend ? { background: token.colorPrimary, borderColor: token.colorPrimary } : undefined, disabled: !canSend }}
    >
      <Flex vertical gap={token.marginSM}>
        {error != null && (
          <ErrorBanner
            message={errorMessage(error)}
            errors={inviteErrorFields.map(e => ({ ...e, field: formatFieldLabel(e.field) }))}
          />
        )}
        <Form form={form} layout="vertical" initialValues={{ email: '', role: ROLE.REVIEWER }} onFinish={handleSubmit}>
          <Form.Item
            label="Email address"
            name="email"
            rules={[rule]}
            help={emailError || undefined}
            validateStatus={emailError ? 'error' : undefined}
          >
            <Input placeholder="Email address" status={emailError ? 'error' : undefined} />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[rule]}>
            <Select options={ASSIGNABLE_ROLES} style={{ width: '100%' }} />
          </Form.Item>
          <RolePreview form={form} />
          {/* Hidden submit button enables Enter-to-submit in the form */}
          <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
        </Form>
      </Flex>
    </Modal>
  );
}

function RolePreview({ form }: { form: ReturnType<typeof Form.useForm>[0] }) {
  const { token } = theme.useToken();
  const role = Form.useWatch('role', form) ?? ROLE.REVIEWER;
  return (
    <Card size="small" styles={{ body: { padding: token.paddingSM } }}>
      <Flex vertical gap={token.marginXXS}>
        <Typography.Text strong>{roleLabel(role)}</Typography.Text>
        <Typography.Text type="secondary">{ROLE_HELP[role]}</Typography.Text>
      </Flex>
    </Card>
  );
}
