'use client';

import { Card, Button, Flex, Form, Input, Row, Col, App, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { StatusPill } from '@/commons/components/StatusPill';
import { useSessionsQuery } from '@/modules/profile';

interface SecurityTabProps {
  currentSessionId?: string;
  isPasswordPending: boolean;
  onPasswordChange: (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => void;
  onRevokeSession: (sessionId: string) => void;
  onConfirmRevoke: (opts: { title: string; content: string; danger: boolean; onOk: () => void }) => void;
}

export function SecurityTab({ currentSessionId, isPasswordPending, onPasswordChange, onRevokeSession, onConfirmRevoke }: SecurityTabProps) {
  const { token } = theme.useToken();
  const sessionsQuery = useSessionsQuery();

  return (
    <Flex vertical gap={token.paddingXL}>
      <SessionList
        sessionsQuery={sessionsQuery}
        currentSessionId={currentSessionId}
        onRevokeSession={onRevokeSession}
        onConfirmRevoke={onConfirmRevoke}
      />

      {/* Audit log hidden — API requires workspaceId but query doesn't pass it
      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: token.fontWeightStrong }}>Security audit log</div>
        <Flex vertical>
          {auditLogQuery.isLoading ? (
            <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorTextSecondary }}>Loading audit log...</div>
          ) : (auditLogQuery.data?.logs ?? []).length === 0 ? (
            <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorTextSecondary }}>No audit log entries</div>
          ) : (auditLogQuery.data?.logs ?? []).slice(0, 10).map((entry, i, arr) => (
            <Flex key={entry.id} justify="space-between" align="center" style={{ padding: `${token.paddingSM}px ${token.paddingLG}px`, borderBottom: i < arr.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
              <Flex align="center" gap={token.marginSM}>
                <FaIcon icon="fa-clock-rotate-left" style={{ color: token.colorTextSecondary }} />
                <div>
                  <Typography.Text strong style={{ fontSize: token.fontSizeSM }}>{entry.action}</Typography.Text>
                  {entry.details && <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, marginLeft: token.marginXS }}>{entry.details}</Typography.Text>}
                </div>
              </Flex>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{new Date(entry.timestamp).toLocaleString()}</Typography.Text>
            </Flex>
          ))}
        </Flex>
      </Card>
      */}

      <MfaSection />

      <PasswordChangeForm isPending={isPasswordPending} onPasswordChange={onPasswordChange} />
    </Flex>
  );
}

function SessionList({ sessionsQuery, currentSessionId, onRevokeSession, onConfirmRevoke }: { sessionsQuery: ReturnType<typeof useSessionsQuery>; currentSessionId?: string; onRevokeSession: (id: string) => void; onConfirmRevoke: (opts: { title: string; content: string; danger: boolean; onOk: () => void }) => void }) {
  const { token } = theme.useToken();

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: token.fontWeightStrong }}>Active sessions</div>
      <Flex vertical>
        {sessionsQuery.isLoading ? (
          <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorTextSecondary }}>Loading sessions...</div>
        ) : (sessionsQuery.data ?? []).length === 0 ? (
          <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorTextSecondary }}>No active sessions</div>
        ) : (sessionsQuery.data ?? []).map((s, i, arr) => {
          const isCurrent = s.id === currentSessionId;
          return (
            <Flex key={s.id} justify="space-between" align="center" style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: i < arr.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
              <div>
                <div style={{ fontWeight: token.fontWeightStrong }}>{s.userAgent || 'Unknown device'}</div>
                <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{s.ipAddress || 'Unknown'} · {new Date(s.lastActivity).toLocaleString()}</div>
              </div>
              {isCurrent ? (
                <span style={{ fontSize: token.fontSizeSM, color: token.colorSuccess, fontWeight: token.fontWeightStrong }}>Current</span>
              ) : (
                <Button danger onClick={() => onConfirmRevoke({ title: 'Revoke session?', content: `Revoke this session?`, danger: true, onOk: () => onRevokeSession(s.id) })}>Revoke</Button>
              )}
            </Flex>
          );
        })}
      </Flex>
    </Card>
  );
}

function MfaSection() {
  const { token } = theme.useToken();
  const { message } = App.useApp();

  return (
    <Card title="Multi-factor authentication">
      <Flex justify="space-between" align="center" style={{ marginBottom: token.marginMD }}>
        <div>
          <div style={{ fontWeight: token.fontWeightStrong }}>Authenticator app</div>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>TOTP second factor</div>
        </div>
        <StatusPill variant="red">Not set up</StatusPill>
      </Flex>
      <Button type="primary" block disabled onClick={() => message.info('MFA setup coming soon')}>
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
            <Form.Item
              label="Confirm new password"
              name="confirmPassword"
              rules={[
                { required: true, message: 'Please confirm password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
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
