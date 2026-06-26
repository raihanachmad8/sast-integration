'use client';

import { useState, useCallback } from 'react';
import { Button, Drawer, Typography, Flex, Input, Tag, Space, theme, App } from 'antd';
import { CloseOutlined, LinkOutlined, CopyOutlined } from '@ant-design/icons';
import { FaIcon } from '@/commons/components/FaIcon';
import { BORDER_RADIUS } from '@/commons/constants/layout';
import { GITHUB_GUIDE } from './GitHubGuide';
import { GITLAB_GUIDE } from './GitLabGuide';
import { GITEA_GUIDE } from './GiteaGuide';

export interface SetupStep {
  label: string;
  detail: string;
  link?: { label: string; url: string };
  copyFields?: { label: string; value: string }[];
  checks: string[];
}

export interface SetupMode {
  key: string;
  label: string;
  desc: string;
}

export interface SetupGuide {
  title: string;
  docsUrl: string;
  modes: SetupMode[];
  steps: Record<string, SetupStep[]>;
}

const SETUP_GUIDES: Record<string, { icon: string; guide: SetupGuide }> = {
  github: { icon: 'fa-brands fa-github', guide: GITHUB_GUIDE },
  gitlab: { icon: 'fa-brands fa-gitlab', guide: GITLAB_GUIDE },
  gitea: { icon: 'fa-solid fa-code-fork', guide: GITEA_GUIDE },
};

interface SetupGuideDrawerProps {
  open: boolean;
  onClose: () => void;
  providerId: string | null;
  onConnect?: (providerName: string) => void;
}

export function SetupGuideDrawer({ open, onClose, providerId, onConnect }: SetupGuideDrawerProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [selectedMode, setSelectedMode] = useState('');

  const entry = providerId ? SETUP_GUIDES[providerId] : null;

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).then(() => message.success('Copied')).catch(() => message.warning('Copy failed — select and copy manually'));
  }, [message]);

  if (!entry) return null;

  const guide = entry.guide;
  const icon = entry.icon;
  const currentModeKey = selectedMode || guide.modes[0].key;
  const steps = guide.steps[currentModeKey];
  const providerName = guide.title.replace(' setup', '');

  return (
    <Drawer
      title={
        <Flex align="center" gap={token.paddingSM} style={{ minWidth: 0 }}>
          <FaIcon icon={icon} style={{ fontSize: token.fontSizeXL, flexShrink: 0 }} />
          <Typography.Title level={4} style={{ margin: 0, minWidth: 0 }}>{guide.title}</Typography.Title>
        </Flex>
      }
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      styles={{ body: { padding: 0 } }}
      destroyOnHidden
    >
      {/* Mode tabs */}
      <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingXL}px ${token.paddingXL}px 0` }}>
        <Flex gap={token.paddingMD}>
          {guide.modes.map((mode) => {
            const isActive = currentModeKey === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => setSelectedMode(mode.key)}
                style={{
                  flex: 1,
                  padding: token.paddingLG,
                  border: `2px solid ${isActive ? token.colorPrimary : token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusLG,
                  background: isActive ? token.colorPrimaryBg : token.colorBgContainer,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms ease',
                }}
              >
                <Typography.Text strong style={{ fontSize: token.fontSizeLG, color: isActive ? token.colorPrimary : token.colorText, display: 'block', marginBottom: token.marginXS }}>
                  {mode.label}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSize }}>
                  {mode.desc}
                </Typography.Text>
              </button>
            );
          })}
        </Flex>
        <Button type="link" href={guide.docsUrl} target="_blank" icon={<LinkOutlined />} style={{ padding: 0, fontSize: token.fontSize, alignSelf: 'flex-start' }}>
          View full documentation
        </Button>
      </Flex>

      {/* Steps */}
      <Flex vertical gap={token.paddingMD} style={{ padding: token.paddingXL, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        {steps.map((step, si) => (
          <Flex key={si} gap={token.paddingMD} align="flex-start" style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: token.paddingLG }}>
            <Tag
              color={token.colorPrimary}
              style={{ width: token.sizeLG, height: token.sizeLG, borderRadius: BORDER_RADIUS.CIRCLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSize, fontWeight: token.fontWeightStrong, flexShrink: 0, margin: 0, lineHeight: `${token.sizeLG}px`, textAlign: 'center' }}
            >
              {si + 1}
            </Tag>
            <Flex vertical gap={token.paddingSM} style={{ flex: 1, minWidth: 0 }}>
              <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>{step.label}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSize }}>{step.detail}</Typography.Text>

              {step.link && (
                <Button type="link" href={step.link.url} target="_blank" icon={<LinkOutlined />} style={{ padding: 0, fontSize: token.fontSize, fontWeight: token.fontWeightStrong, alignSelf: 'flex-start' }}>
                  {step.link.label}
                </Button>
              )}

              {step.copyFields?.map((field) => (
                <Flex key={field.label} vertical gap={token.paddingXS}>
                  <Typography.Text type="secondary" strong style={{ fontSize: token.fontSize }}>{field.label}</Typography.Text>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      readOnly
                      value={field.value}
                      style={{ fontFamily: 'monospace', fontSize: token.fontSize }}
                    />
                    <Button onClick={() => handleCopy(field.value)} icon={<CopyOutlined />}>Copy</Button>
                  </Space.Compact>
                </Flex>
              ))}
            </Flex>
          </Flex>
        ))}

        {/* Connect button */}
        <Button type="primary" block size="large" onClick={() => { onClose(); onConnect?.(providerName); }} icon={<FaIcon icon="fa-plug" />} style={{ height: token.controlHeightLG, fontWeight: token.fontWeightStrong }}>
          Connect {providerName}
        </Button>
      </Flex>
    </Drawer>
  );
}
