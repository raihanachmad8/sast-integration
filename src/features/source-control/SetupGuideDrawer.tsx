'use client';

import { useState } from 'react';
import { Button, Drawer, Checkbox, Card, App, Typography, Input, Flex, theme } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { FaIcon } from '@/components/shared/fa-icon';
import { RadioCardGroup } from '@/components/shared/RadioCardGroup';
import { ConfigureModal } from './ConfigureModal';

interface SetupStep {
  title: string;
  description: string;
  items: string[];
  urls?: { label: string; value: string }[];
}

interface SetupMode {
  value: string;
  label: string;
  description: string;
  steps: SetupStep[];
}

interface SetupGuide {
  name: string;
  icon: string;
  modes: SetupMode[];
}

const SETUP_GUIDES: Record<string, SetupGuide> = {
  github: {
    name: 'GitHub',
    icon: 'fa-brands fa-github',
    modes: [
      {
        value: 'github-app', label: 'GitHub App', description: 'Recommended — fine-grained permissions, no user token needed',
        steps: [
          { title: 'Create a GitHub App', description: 'Go to your GitHub organization settings → Developer settings → GitHub Apps → New GitHub App.', items: ['App name set (e.g. sast-integration)', 'Homepage URL filled in'] },
          { title: 'Set callback & webhook URLs', description: 'Copy these values exactly into the GitHub App form.', items: ['Callback URL pasted', 'Webhook URL pasted', 'Webhook secret generated and saved'], urls: [{ label: 'Callback URL', value: 'https://sast.local/api/v1/source-control/callback/github' }, { label: 'Webhook URL', value: 'https://sast.local/api/v1/source-control/webhooks/github' }] },
          { title: 'Set required permissions', description: 'Under Permissions & events, set the following repository permissions:', items: ['Contents → Read-only', 'Pull requests → Read & write', 'Checks → Read & write', 'Commit statuses → Read & write'] },
          { title: 'Subscribe to events', description: 'Check the following events:', items: ['Push', 'Pull request', 'Check run'] },
          { title: 'Generate & download private key', description: 'Scroll to the bottom of the App page → Generate a private key. A .pem file will download.', items: ['Private key downloaded (.pem file)', 'App ID noted (shown at top of App page)', 'App slug noted (from App URL)'] },
          { title: 'Install app to your organization', description: 'Go to the App page → Install App → select your organization → All repositories or select specific repos.', items: ['App installed to organization', 'Installation ID noted (from URL after install)'] },
          { title: 'Paste credentials here', description: 'Click Configure on the GitHub card and fill in App ID, App slug, and paste the private key content.', items: ['App ID entered', 'App slug entered', 'Private key pasted'] },
        ],
      },
      {
        value: 'oauth-app', label: 'OAuth App', description: 'Classic OAuth flow — simpler but broader scope',
        steps: [
          { title: 'Create an OAuth App', description: 'Go to Settings → Developer settings → OAuth Apps → New OAuth App.', items: ['Application name set', 'Homepage URL configured'] },
          { title: 'Set callback URL', description: 'Paste this exact value into the Authorization callback URL field.', items: ['Callback URL pasted'], urls: [{ label: 'Callback URL', value: 'https://sast.local/api/v1/source-control/callback/github' }] },
          { title: 'Save credentials', description: 'Copy the Client ID and generate a Client Secret.', items: ['Client ID copied', 'Client Secret generated and copied'] },
        ],
      },
      {
        value: 'pat', label: 'Personal Access Token', description: 'Quick setup — uses a user-scoped token',
        steps: [
          { title: 'Create a fine-grained PAT', description: 'Go to Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.', items: ['Token name set', 'Expiration set', 'Repository access configured', 'Permissions: Contents (Read), Pull requests (Read & Write)'] },
          { title: 'Copy the token', description: 'Copy the token immediately — it will not be shown again.', items: ['Token copied and saved'] },
        ],
      },
    ],
  },
  gitlab: {
    name: 'GitLab',
    icon: 'fa-brands fa-gitlab',
    modes: [
      {
        value: 'oauth-app', label: 'OAuth Application', description: 'Recommended — group-level or instance-level app',
        steps: [
          { title: 'Create an OAuth application', description: 'Go to GitLab → your group → Settings → Applications → Add new application.', items: ['Application name set', 'Confidential checkbox checked'] },
          { title: 'Set redirect URI', description: 'Paste this exact value.', items: ['Redirect URI pasted'], urls: [{ label: 'Redirect URI', value: 'https://sast.local/api/v1/source-control/callback/gitlab' }] },
          { title: 'Set required scopes', description: 'Check the following scopes:', items: ['api', 'read_repository', 'read_user'] },
          { title: 'Save credentials', description: 'Click Save application. Copy the Application ID and Secret.', items: ['Application ID copied', 'Secret copied'] },
        ],
      },
      {
        value: 'pat', label: 'Personal Access Token', description: 'Quick setup — user-scoped token',
        steps: [
          { title: 'Create a PAT', description: 'Go to User Settings → Access Tokens → Add new token.', items: ['Token name set', 'Expiration date set', 'Scopes: api, read_repository'] },
          { title: 'Copy the token', description: 'Copy the token immediately.', items: ['Token copied'] },
        ],
      },
    ],
  },
  gitea: {
    name: 'Gitea',
    icon: 'fa-solid fa-code-fork',
    modes: [
      {
        value: 'oauth-app', label: 'OAuth Application', description: 'Standard OAuth flow for Gitea instances',
        steps: [
          { title: 'Create an OAuth application', description: 'Go to Site Administration → Applications → Create Application.', items: ['Name set', 'Redirect URI configured'], urls: [{ label: 'Redirect URI', value: 'https://sast.local/api/v1/source-control/callback/gitea' }] },
          { title: 'Save credentials', description: 'Copy the Client ID and Client Secret.', items: ['Client ID copied', 'Client Secret copied'] },
        ],
      },
      {
        value: 'pat', label: 'Access Token', description: 'Quick setup — user-scoped token',
        steps: [
          { title: 'Generate token', description: 'Go to Settings → Applications → Generate New Token.', items: ['Token name set', 'Token generated and copied'] },
        ],
      },
    ],
  },
};

interface SetupGuideDrawerProps {
  open: boolean;
  onClose: () => void;
  providerId: string | null;
}

export function SetupGuideDrawer({ open, onClose, providerId }: SetupGuideDrawerProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [configureOpen, setConfigureOpen] = useState(false);

  const guide = providerId ? SETUP_GUIDES[providerId] : null;
  if (!guide) return null;

  const currentMode = guide.modes.find(m => m.value === selectedMode) || guide.modes[0];
  const totalItems = currentMode.steps.reduce((a, s) => a + s.items.length, 0);
  const doneCount = Object.values(checked).filter(Boolean).length;
  const progress = totalItems > 0 ? (doneCount / totalItems) * 100 : 0;

  const toggle = (key: string) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
    <Drawer
      title={null}
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
      destroyOnHidden
    >
      {/* Header */}
      <div style={{ padding: token.paddingXL, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex justify="space-between" align="flex-start">
          <Flex align="center" gap={token.paddingLG}>
             <div style={{ width: 36, height: 36, borderRadius: token.borderRadiusLG, background: token.colorBgLayout, color: token.colorText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeLG }}>
              <FaIcon icon={guide.icon} />
            </div>
            <div>
              <Typography.Title level={2} style={{ margin: 0, fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong }}>{guide.name} setup</Typography.Title>
              <div style={{ fontSize: token.fontSize, color: token.colorTextSecondary, marginTop: token.paddingXS }}>Choose a connection mode, then follow the steps.</div>
            </div>
          </Flex>
          <Button type="text" onClick={onClose} icon={<CloseOutlined />} />
        </Flex>
      </div>

      <Flex vertical gap={token.paddingXL} style={{ padding: token.paddingXL, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
        {/* Mode cards */}
        <RadioCardGroup
          ariaLabel="Setup mode"
          columns={guide.modes.length}
          options={guide.modes.map((mode) => ({ key: mode.value, label: mode.label, description: mode.description }))}
          value={selectedMode || currentMode.value}
          onChange={(mode) => { setSelectedMode(mode); setChecked({}); }}
        />

        {/* Progress bar */}
        <Flex vertical gap={token.marginSM}>
          <div style={{ height: 6, borderRadius: 3, background: token.colorBorderSecondary, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: token.colorPrimary, borderRadius: 3, transition: 'width 200ms ease' }} />
          </div>
          <Flex justify="space-between" style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
            <Typography.Text>{doneCount} / {totalItems} done</Typography.Text>
            <Typography.Link style={{ color: token.colorPrimary, textDecoration: 'none', fontWeight: token.fontWeightStrong }}>Full docs →</Typography.Link>
          </Flex>
        </Flex>

        {/* Steps */}
        {currentMode.steps.map((step, si) => (
          <Card key={si} styles={{ body: { padding: token.paddingXL } }}>
            <Flex gap={token.paddingLG} style={{ marginBottom: token.paddingLG }}>
               <div style={{ width: 28, height: 28, borderRadius: '50%', background: token.colorPrimary, color: token.colorText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, flexShrink: 0 }}>
                {si + 1}
              </div>
              <div>
                <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize, color: token.colorText }}>{step.title}</div>
                <div style={{ fontSize: token.fontSize, color: token.colorTextSecondary, marginTop: token.paddingXS, lineHeight: 1.5 }}>{step.description}</div>
              </div>
            </Flex>

            {/* Copy URLs */}
            {step.urls?.map((url) => (
              <div key={url.label} style={{ marginBottom: token.paddingLG }}>
                <div style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, color: token.colorTextSecondary, marginBottom: token.paddingXS }}>{url.label}</div>
                <Flex gap={token.marginSM}>
                  <Input readOnly value={url.value} style={{ flex: 1, fontFamily: 'monospace' }} />
                  <Button size="small" onClick={() => navigator.clipboard.writeText(url.value)}><FaIcon icon="fa-copy" /></Button>
                </Flex>
              </div>
            ))}

            {/* Checklist items */}
            <Flex vertical gap={token.marginSM} style={{ marginLeft: 40 }}>
              {step.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                return (
                  <Checkbox key={key} checked={!!checked[key]} onChange={() => toggle(key)} style={{ fontSize: token.fontSize, color: checked[key] ? token.colorPrimary : token.colorText }}>
                    {item}
                  </Checkbox>
                );
              })}
            </Flex>
          </Card>
        ))}
      </Flex>

      {/* Footer: Ready banner + Connect button */}
      <div style={{ padding: token.paddingXL, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ padding: token.paddingLG, background: token.colorWarningBg, borderRadius: token.borderRadiusLG, marginBottom: token.paddingLG, fontSize: token.fontSize }}>
          <strong style={{ color: token.colorWarningDark }}>Ready to connect?</strong>
          <div style={{ color: token.colorWarningDark, marginTop: token.paddingXS }}>Once all steps are checked, click Connect to enter your credentials and test the connection.</div>
        </div>
        <Button type="primary" block style={{ minHeight: 44, fontSize: token.fontSize }} onClick={() => { onClose(); setConfigureOpen(true); }}>
          <FaIcon icon="fa-plug" /> Connect {guide.name}
        </Button>
      </div>
    </Drawer>

    <ConfigureModal
      open={configureOpen}
      providerName={guide?.name ?? ''}
      isConnected={false}
      onCancel={() => setConfigureOpen(false)}
      onSave={() => { setConfigureOpen(false); message.success(`${guide?.name} connected successfully`); }}
    />
    </>
  );
}
