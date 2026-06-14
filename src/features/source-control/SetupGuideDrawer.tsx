'use client';

import { useState, useCallback } from 'react';
import { Button, Drawer, Checkbox, Typography, Flex, Progress, Alert, Input, Tag, Space, theme, App } from 'antd';
import { CloseOutlined, LinkOutlined, CopyOutlined, CheckCircleFilled } from '@ant-design/icons';
import { FaIcon } from '@/components/shared/FaIcon';
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
  github: {
    icon: 'fa-brands fa-github',
    guide: GITHUB_GUIDE,
  },
  gitlab: {
    icon: 'fa-brands fa-gitlab',
    guide: GITLAB_GUIDE,
  },
  gitea: {
    icon: 'fa-solid fa-code-fork',
    guide: GITEA_GUIDE,
  },
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
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const entry = providerId ? SETUP_GUIDES[providerId] : null;

  const toggle = useCallback((key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] })), []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).then(() => message.success('Copied')).catch(() => message.warning('Copy failed — select and copy manually'));
  }, [message]);

  if (!entry) return null;

  const guide = entry.guide;
  const icon = entry.icon;
  const currentModeKey = selectedMode || guide.modes[0].key;
  const steps = guide.steps[currentModeKey];
  const totalChecks = steps.reduce((a, s) => a + s.checks.length, 0);
  const doneCount = Object.values(checked).filter(Boolean).length;
  const allChecked = doneCount === totalChecks && totalChecks > 0;
  const providerName = guide.title.replace(' setup', '');

  return (
    <Drawer
      title={
        <Flex align="center" gap={token.paddingSM} style={{ minWidth: 0 }}>
          <FaIcon icon={icon} style={{ fontSize: token.fontSizeLG, flexShrink: 0 }} />
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
      {/* Mode tabs + Progress */}
      <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingXL}px ${token.paddingXL}px 0` }}>
        <Flex gap={token.paddingMD}>
          {guide.modes.map((mode) => {
            const isActive = currentModeKey === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => { setSelectedMode(mode.key); setChecked({}); }}
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
                <Typography.Text strong style={{ fontSize: token.fontSize, color: isActive ? token.colorPrimary : token.colorText, display: 'block', marginBottom: 4 }}>
                  {mode.label}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {mode.desc}
                </Typography.Text>
              </button>
            );
          })}
        </Flex>
        <Flex align="center" gap={token.paddingMD}>
          <Progress
            percent={totalChecks > 0 ? Math.round((doneCount / totalChecks) * 100) : 0}
            size="small"
            style={{ flex: 1 }}
            showInfo={false}
          />
          <Typography.Text type="secondary" strong style={{ fontSize: token.fontSizeSM, whiteSpace: 'nowrap' }}>
            {doneCount} / {totalChecks} done
          </Typography.Text>
          <Button type="link" size="small" href={guide.docsUrl} target="_blank" icon={<LinkOutlined />} style={{ padding: 0, fontSize: token.fontSizeSM }}>
            Full docs
          </Button>
        </Flex>
      </Flex>

      {/* Steps */}
      <Flex vertical gap={token.paddingMD} style={{ padding: token.paddingXL, overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
        {steps.map((step, si) => {
          const stepChecks = step.checks.map((check, ii) => {
            const key = `${currentModeKey}-${si}-${ii}`;
            return (
              <Flex key={key} align="center" gap={token.paddingSM}>
                <Checkbox checked={!!checked[key]} onChange={() => toggle(key)}>
                  {check}
                </Checkbox>
              </Flex>
            );
          });

          return (
            <Flex key={si} gap={token.paddingMD} align="flex-start" style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: token.paddingLG }}>
              <Tag
                color={token.colorPrimary}
                style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, flexShrink: 0, margin: 0, lineHeight: '28px', textAlign: 'center' }}
              >
                {si + 1}
              </Tag>
              <Flex vertical gap={token.paddingXS} style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong>{step.label}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{step.detail}</Typography.Text>

                {step.link && (
                  <Button type="link" size="small" href={step.link.url} target="_blank" icon={<LinkOutlined />} style={{ padding: 0, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                    {step.link.label}
                  </Button>
                )}

                {step.copyFields?.map((field) => (
                  <Flex key={field.label} vertical gap={token.paddingXS}>
                    <Typography.Text type="secondary" strong style={{ fontSize: token.fontSizeSM }}>{field.label}</Typography.Text>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        readOnly
                        value={field.value}
                        style={{ fontFamily: 'monospace', fontSize: token.fontSizeSM }}
                      />
                      <Button onClick={() => handleCopy(field.value)} icon={<CopyOutlined />} />
                    </Space.Compact>
                  </Flex>
                ))}

                <Flex vertical gap={token.paddingXS} style={{ marginTop: token.paddingXS }}>
                  {stepChecks}
                </Flex>
              </Flex>
            </Flex>
          );
        })}

        {/* Ready to connect? */}
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleFilled />}
          title={
            <Typography.Text strong style={{ color: token.colorSuccess }}>
              {allChecked ? 'Ready to connect!' : 'Ready to connect?'}
            </Typography.Text>
          }
          description={
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              {allChecked
                ? 'All steps are complete. Click Connect to open the configuration modal.'
                : 'Once all steps are checked, click Connect to enter your credentials and test the connection.'}
            </Typography.Text>
          }
          action={
            <Button type="primary" block disabled={!allChecked} onClick={() => { onClose(); onConnect?.(providerName); }} icon={<FaIcon icon="fa-plug" />}>
              Connect {providerName}
            </Button>
          }
        />
      </Flex>
    </Drawer>
  );
}
