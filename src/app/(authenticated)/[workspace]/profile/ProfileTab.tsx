'use client';

import { useEffect } from 'react';
import { Card, Avatar, Button, Flex, Form, Input, Row, Col, Select, Typography, Upload, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { createZodSync } from '@/lib/utils/zod-sync';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric'),
});

const validateProfile = createZodSync(profileSchema);

const { Text } = Typography;

interface ProfileTabProps {
  name: string;
  email: string;
  role: string;
  initials: string;
  avatarUrl?: string | null;
  username?: string | null;
  bio?: string | null;
  timezone?: string | null;
  language?: string | null;
  isPending: boolean;
  onSave: (values: { name: string; username: string; timezone: string; language: string; bio: string }) => void;
  onAvatarUpload: (file: File) => boolean;
  onAvatarRemove: () => void;
  onConfirmRemove: (opts: { title: string; danger: boolean; onOk: () => void }) => void;
}

export function ProfileTab({ name, email, role, initials, avatarUrl, username, bio, timezone, language, isPending, onSave, onAvatarUpload, onAvatarRemove, onConfirmRemove }: ProfileTabProps) {
  const { token } = theme.useToken();
  const [profileForm] = Form.useForm();

  useEffect(() => {
    profileForm.setFieldsValue({
      name,
      username: username ?? name.split(' ')[0]?.toLowerCase(),
      email,
      timezone: timezone ?? 'Asia/Jakarta',
      language: language ?? 'en',
      bio: bio ?? '',
    });
  }, [name, email, username, timezone, language, bio, profileForm]);

  return (
    <Flex vertical gap={token.paddingXL}>
      <Card>
        <Flex align="center" gap={token.paddingLG} wrap="wrap">
          <Upload showUploadList={false} beforeUpload={(file) => { onAvatarUpload(file); return false; }} accept="image/*">
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              {avatarUrl ? (
                <Avatar size={72} src={avatarUrl} />
              ) : (
                <Avatar size={72} style={{ background: token.colorPrimary, fontWeight: token.fontWeightStrong, fontSize: token.fontSizeHeading3 }}>{initials}</Avatar>
              )}
              <div style={{ position: 'absolute', bottom: 0, right: 0, background: token.colorBgContainer, borderRadius: '50%', padding: 4, border: `1px solid ${token.colorBorder}` }}>
                <FaIcon icon="fa-camera" style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }} />
              </div>
            </div>
          </Upload>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Flex align="center" gap={token.paddingSM} wrap="wrap">
              <Text strong style={{ fontSize: token.fontSizeLG }}>{name}</Text>
              <div style={{ padding: `0 ${token.paddingXS}px`, borderRadius: token.borderRadiusXS, background: token.colorPrimaryBg, color: token.colorPrimary, fontSize: token.fontSizeSM }}>{role}</div>
            </Flex>
            <Text type="secondary">{email}</Text>
          </div>
          {avatarUrl && (
            <Button size="small" danger icon={<FaIcon icon="fa-trash" />} onClick={() => onConfirmRemove({ title: 'Remove avatar?', danger: true, onOk: onAvatarRemove })}>
              Remove
            </Button>
          )}
        </Flex>
      </Card>

      <Card title="Profile details">
        <Form form={profileForm} layout="vertical" onFinish={onSave}>
          <Row gutter={[token.marginMD, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label="Full name" name="name" rules={[validateProfile]}><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Username" name="username" rules={[validateProfile]}><Input /></Form.Item>
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
          <Button type="primary" htmlType="submit" loading={isPending}>
            <FaIcon icon="fa-floppy-disk" /> Save profile
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}
