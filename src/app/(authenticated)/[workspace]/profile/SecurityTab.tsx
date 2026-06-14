'use client';

import { Card, Button, Flex, Form, Input, Row, Col, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusPill } from '@/components/shared/StatusPill';
import { useSessionsQuery } from '@/modules/profile';

interface SecurityTabProps {
  isPasswordPending: boolean;
  onPasswordChange: (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => void;
  onRevokeSession: (sessionId: string) => void;
  onConfirmRevoke: (opts: { title: string; content: string; danger: boolean; onOk: () => void }) => void;
}

export function SecurityTab({ isPasswordPending, onPasswordChange, onRevokeSession, onConfirmRevoke }: SecurityTabProps) {
  const { token } = theme.useToken();
  const sessionsQuery = useSessionsQuery();

  return (
    <Flex vertical gap={token.paddingXL}>
      <SessionList
        sessionsQuery={sessionsQuery}
        onRevokeSession={onRevokeSession}
        onConfirmRevoke={onConfirmRevoke}
      />

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: token.fontWeightStrong }}>Security audit log</div>
        <Flex vertical>
          <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorTextSecondary }}>No audit log entries</div>
        </Flex>
      </Card>

      <MfaSection />

      <Card title="Security alerts">
        <Flex vertical gap={token.marginMD}>
          <Flex gap={token.marginSM}>
            <FaIcon icon="fa-triangle-exclamation" style={{ color: token.colorWarning, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: token.fontWeightStrong }}>Failed login attempt</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>From 198.51.100.7 · 2 days ago</div>
            </div>
          </Flex>
          <Flex gap={token.marginSM}>
            <FaIcon icon="fa-circle-info" style={{ color: token.colorInfo, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: token.fontWeightStrong }}>New device sign-in</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>WSL Dev Browser · Today 08:50</div>
            </div>
          </Flex>
        </Flex>
      </Card>

      <PasswordChangeForm isPending={isPasswordPending} onPasswordChange={onPasswordChange} />
    </Flex>
  );
}

function SessionList({ sessionsQuery, onRevokeSession, onConfirmRevoke }: { sessionsQuery: ReturnType<typeof useSessionsQuery>; onRevokeSession: (id: string) => void; onConfirmRevoke: (opts: { title: string; content: string; danger: boolean; onOk: () => void }) => void }) {
  const { token } = theme.useToken();

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: token.fontWeightStrong }}>Active sessions</div>
      <Flex vertical>
        {sessionsQuery.isLoading ? (
          <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorTextSecondary }}>Loading sessions...</div>
        ) : (sessionsQuery.data ?? []).length === 0 ? (
          <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorTextSecondary }}>No active sessions</div>
        ) : (sessionsQuery.data ?? []).map((s, i, arr) => (
          <Flex key={s.id} justify="space-between" align="center" style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: i < arr.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
            <div>
              <div style={{ fontWeight: token.fontWeightStrong }}>{s.userAgent || 'Unknown device'}</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{s.ipAddress || 'Unknown'} · {new Date(s.lastActivity).toLocaleString()}</div>
            </div>
            <Button size="small" danger onClick={() => onConfirmRevoke({ title: 'Revoke session?', content: `Revoke this session?`, danger: true, onOk: () => onRevokeSession(s.id) })}>Revoke</Button>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

function MfaSection() {
  const { token } = theme.useToken();

  return (
    <Card title="Multi-factor authentication">
      <Flex justify="space-between" align="center" style={{ marginBottom: token.marginMD }}>
        <div>
          <div style={{ fontWeight: token.fontWeightStrong }}>Authenticator app</div>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>TOTP second factor</div>
        </div>
        <StatusPill variant="red">Not set up</StatusPill>
      </Flex>
      <Button type="primary" block onClick={() => {}}>
        <FaIcon icon="fa-shield-halved" /> Set up MFA
      </Button>
    </Card>
  );
}

function PasswordChangeForm({ isPending, onPasswordChange }: { isPending: boolean; onPasswordChange: (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => void }) {
  const { token } = theme.useToken();
  const [passwordForm] = Form.useForm();

  return (
    <Card title="Change password">
      <Form form={passwordForm} layout="vertical" onFinish={onPasswordChange}>
        <Row gutter={[token.marginMD, 0]}>
          <Col xs={24}>
            <Form.Item label="Current password" name="currentPassword" rules={[{ required: true, message: 'Current password is required' }]}>
              <Input.Password placeholder="Enter current password" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="New password" name="newPassword" rules={[{ required: true, message: 'New password is required' }, { min: 8, message: 'Password must be at least 8 characters' }]}>
              <Input.Password placeholder="Enter new password" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Confirm new password" name="confirmPassword" rules={[{ required: true, message: 'Please confirm password' }]}>
              <Input.Password placeholder="Repeat new password" />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={isPending}>
          <FaIcon icon="fa-lock" /> Update password
        </Button>
      </Form>
    </Card>
  );
}
