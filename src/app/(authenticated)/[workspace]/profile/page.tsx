'use client';

import { useState } from 'react';
import { App, Avatar, Button, Card, Col, Flex, Form, Input, Row, Select, Tabs, Tag, Typography, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { useSessionQuery } from '@/modules/auth/queries';

const { Text } = Typography;

const SESSIONS = [
  { id: 's1', device: 'Windows Chrome', location: 'Jakarta', time: 'Now', current: true },
  { id: 's2', device: 'WSL Dev Browser', location: 'Localhost', time: '2 hours ago', current: false },
];

const AUDIT_LOG = [
  { id: 'a1', action: 'Login', ip: '203.0.113.42', time: 'Today 09:14', status: 'Success' },
  { id: 'a2', action: 'Password change', ip: '203.0.113.42', time: 'Yesterday 14:30', status: 'Success' },
  { id: 'a3', action: 'Login failed', ip: '198.51.100.7', time: '2 days ago 22:01', status: 'Failed' },
  { id: 'a4', action: 'API token created', ip: '203.0.113.42', time: '3 days ago 11:05', status: 'Success' },
];

export default function ProfilePage() {
  const { message, modal } = App.useApp();
  const session = useSessionQuery();
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState('profile');
  const [_pwModalOpen, _setPwModalOpen] = useState(false);

  const user = session.data?.user;
  const name = user?.name ?? 'Admin';
  const email = user?.email ?? 'admin@sast.local';
  const role = session.data?.workspace?.role ?? 'owner';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const profileTab = (
    <Flex vertical gap={token.paddingXL}>
      <Flex align="center" gap={token.paddingLG} wrap="wrap">
        <Avatar size={56} style={{ background: token.colorPrimary, fontWeight: 700, fontSize: 18 }}>{initials}</Avatar>
        <div>
          <Flex align="center" gap={token.paddingSM} wrap="wrap">
            <Text strong style={{ fontSize: token.fontSizeLG }}>{name}</Text>
            <Tag color="blue">{role}</Tag>
          </Flex>
          <Text type="secondary">{email}</Text>
        </div>
      </Flex>

      <Form layout="vertical" initialValues={{ name, username: name.split(' ')[0]?.toLowerCase(), email, role, timezone: 'Asia/Jakarta', language: 'id', bio: 'Security reviewer focused on AI-assisted SAST triage.' }}>
        <Row gutter={[token.marginMD, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item label="Full name" name="name"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Username" name="username"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Email" name="email"><Input disabled /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Organization role" name="role"><Input disabled /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Timezone" name="timezone">
              <Select options={[{ value: 'Asia/Jakarta', label: 'Asia/Jakarta' }, { value: 'UTC', label: 'UTC' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Language" name="language">
              <Select options={[{ value: 'id', label: 'Bahasa Indonesia' }, { value: 'en', label: 'English' }]} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Bio" name="bio"><Input.TextArea rows={3} /></Form.Item>
          </Col>
        </Row>
      </Form>
    </Flex>
  );

  const securityTab = (
    <Flex vertical gap={token.paddingXL}>
      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: token.fontWeightStrong }}>Active sessions</div>
        <Flex vertical>
          {SESSIONS.map((s, i) => (
            <Flex key={s.id} justify="space-between" align="center" style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: i < SESSIONS.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
              <div>
                <div style={{ fontWeight: token.fontWeightStrong }}>{s.device}</div>
                <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{s.location} · {s.time}</div>
              </div>
              {s.current ? (
                <StatusPill variant="teal">Current</StatusPill>
              ) : (
                <Button size="small" danger onClick={() => modal.confirm({ title: 'Revoke session?', content: `Revoke ${s.device} session?`, onOk: () => message.success('Session revoked') })}>Revoke</Button>
              )}
            </Flex>
          ))}
        </Flex>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: token.fontWeightStrong }}>Security audit log</div>
        <Flex vertical>
          {AUDIT_LOG.map((a, i) => (
            <Flex key={a.id} justify="space-between" align="center" style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: i < AUDIT_LOG.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
              <div>
                <div style={{ fontWeight: token.fontWeightStrong }}>{a.action}</div>
                <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{a.ip} · {a.time}</div>
              </div>
              <StatusPill variant={a.status === 'Success' ? 'teal' : 'red'}>{a.status}</StatusPill>
            </Flex>
          ))}
        </Flex>
      </Card>

      <Card title="Multi-factor authentication">
        <Flex justify="space-between" align="center" style={{ marginBottom: token.marginMD }}>
          <div>
            <div style={{ fontWeight: token.fontWeightStrong }}>Authenticator app</div>
            <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>TOTP second factor</div>
          </div>
          <StatusPill variant="red">Not set up</StatusPill>
        </Flex>
        <Button type="primary" block onClick={() => modal.info({ title: 'Set up MFA', content: 'MFA setup wizard would open here.' })}>
          <FaIcon icon="fa-shield-halved" /> Set up MFA
        </Button>
      </Card>

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

      <Card title="Change password">
        <Form layout="vertical">
          <Row gutter={[token.marginMD, 0]}>
            <Col xs={24}>
              <Form.Item label="Current password"><Input.Password placeholder="Enter current password" /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="New password"><Input.Password placeholder="Enter new password" /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Confirm new password"><Input.Password placeholder="Repeat new password" /></Form.Item>
            </Col>
          </Row>
          <Button type="primary"><FaIcon icon="fa-lock" /> Update password</Button>
        </Form>
      </Card>
    </Flex>
  );

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Profile"
        description="Personal identity, notifications, security, and API tokens."
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'profile', label: 'Profile', children: profileTab },
          { key: 'security', label: 'Security', children: securityTab },
          { key: 'notifications', label: 'Notifications', children: <Card><Text type="secondary">Coming soon. Configure email and in-app notification settings.</Text></Card> },
          { key: 'tokens', label: 'Personal tokens', children: <Card><Text type="secondary">Coming soon. Generate tokens for CLI and CI integration.</Text></Card> },
        ]}
      />
    </Flex>
  );
}
