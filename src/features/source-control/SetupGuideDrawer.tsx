'use client';

import { CloseOutlined, LinkOutlined, CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Drawer, Typography, Flex, Input, theme, App, Tooltip } from 'antd';
import { useState, useCallback } from 'react';

import { FaIcon } from '@/commons/components/FaIcon';

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
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const entry = providerId ? SETUP_GUIDES[providerId] : null;

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).then(() => message.success('Copied')).catch(() => message.warning('Copy failed — select and copy manually'));
  }, [message]);

  const toggleStep = useCallback((stepIndex: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepIndex)) next.delete(stepIndex);
      else next.add(stepIndex);
      return next;
    });
  }, []);

  const handleModeChange = useCallback((mode: string) => {
    setSelectedMode(mode);
    setCompletedSteps(new Set());
  }, []);

  if (!entry) return null;

  const guide = entry.guide;
  const icon = entry.icon;
  const currentModeKey = selectedMode || guide.modes[0].key;
  const steps = guide.steps[currentModeKey];
  const providerName = guide.title.replace(' setup', '');
  const allDone = steps && completedSteps.size === steps.length;

  return (
    <Drawer
      title={
        <Flex align="center" gap={token.paddingSM}>
          <FaIcon icon={icon} style={{ fontSize: token.fontSizeXL }} />
          <Typography.Title level={4} style={{ margin: 0 }}>{guide.title}</Typography.Title>
        </Flex>
      }
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      destroyOnHidden
      footer={
        <Flex vertical gap={token.paddingXS}>
          <Button
            type="primary"
            block
            size="large"
            disabled={!allDone}
            onClick={() => { onClose(); onConnect?.(providerName); }}
          >
            Connect {providerName}
          </Button>
          {!allDone && (
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, textAlign: 'center' }}>
              Complete all steps to continue
            </Typography.Text>
          )}
        </Flex>
      }
    >
      <Flex vertical gap={token.paddingLG}>
        {/* Mode selector */}
        <Flex gap={token.paddingSM}>
          {guide.modes.map((mode) => {
            const isActive = currentModeKey === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => handleModeChange(mode.key)}
                style={{
                  flex: 1,
                  padding: `${token.paddingSM}px ${token.paddingSM}px`,
                  border: `1.5px solid ${isActive ? token.colorPrimary : token.colorBorderSecondary}`,
                  borderRadius: token.borderRadius,
                  background: isActive ? token.colorPrimaryBg : token.colorBgContainer,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms ease',
                }}
              >
                <Typography.Text strong style={{ fontSize: token.fontSizeSM, color: isActive ? token.colorPrimary : token.colorText, display: 'block', marginBottom: 2 }}>
                  {mode.label}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {mode.desc}
                </Typography.Text>
              </button>
            );
          })}
        </Flex>

        <Button type="link" href={guide.docsUrl} target="_blank" icon={<LinkOutlined />} style={{ padding: 0, fontSize: token.fontSizeSM, alignSelf: 'flex-start', marginTop: -token.paddingXS }}>
          View official documentation
        </Button>

        <Alert
          title="Connect your SCM provider to enable automatic PR comments, commit statuses, and repository sync."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />

        {/* Steps as checkboxes */}
        <Flex vertical gap={0}>
          {steps.map((step, si) => {
            const isCompleted = completedSteps.has(si);
            return (
              <Flex
                key={si}
                gap={token.paddingSM}
                align="flex-start"
                style={{
                  padding: `${token.paddingSM}px 0`,
                  borderBottom: si < steps.length - 1 ? `1px solid ${token.colorBorderSecondary}` : 'none',
                }}
              >
                <Checkbox
                  checked={isCompleted}
                  onChange={() => toggleStep(si)}
                  style={{ marginTop: 2 }}
                />
                <Flex vertical gap={token.paddingXS} style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text
                    strong
                    style={{
                      fontSize: token.fontSize,
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      color: isCompleted ? token.colorTextSecondary : token.colorText,
                    }}
                  >
                    {step.label}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, lineHeight: 1.6 }}>
                    {step.detail}
                  </Typography.Text>

                  {step.link && (
                    <Button type="link" href={step.link.url} target="_blank" icon={<LinkOutlined />} style={{ padding: 0, fontSize: token.fontSizeSM, alignSelf: 'flex-start' }}>
                      {step.link.label}
                    </Button>
                  )}

                  {step.copyFields?.map((field) => (
                    <Flex key={field.label} gap={token.paddingXS}>
                      <Input
                        readOnly
                        value={field.value}
                        style={{ fontFamily: 'monospace', fontSize: token.fontSizeSM, flex: 1 }}
                      />
                      <Tooltip title="Copy">
                        <Button onClick={() => handleCopy(field.value)} icon={<CopyOutlined />} />
                      </Tooltip>
                    </Flex>
                  ))}

                  {step.checks.length > 0 && (
                    <Flex vertical gap={2} style={{ marginTop: token.paddingXXS }}>
                      {step.checks.map((check) => (
                        <Typography.Text key={check} style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
                          {check}
                        </Typography.Text>
                      ))}
                    </Flex>
                  )}
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      </Flex>
    </Drawer>
  );
}
