'use client';

import React, { useState } from 'react';
import { Modal, Typography, Button, Flex, Steps, Tag, Alert, theme, App, Divider } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/commons/components/FaIcon';
import { ENTITY_COLORS } from '@/commons/constants/tokens';

const { Text, Link } = Typography;

interface CICDSetupModalProps {
  open: boolean;
  onClose: () => void;
  repository: { id: string; name: string; provider: string | null } | null;
  workspaceSlug?: string;
}

type Platform = 'github' | 'gitlab' | 'gitea';

const PLATFORMS: Record<Platform, { label: string; icon: string; file: string; color: string }> = {
  github: { label: 'GitHub Actions', icon: 'fa-brands fa-github', file: '.github/workflows/sast-scan.yml', color: ENTITY_COLORS.provider.github.color },
  gitlab: { label: 'GitLab CI', icon: 'fa-brands fa-gitlab', file: '.gitlab-ci.yml', color: ENTITY_COLORS.provider.gitlab.color },
  gitea: { label: 'Gitea Actions', icon: 'fa-solid fa-code-branch', file: '.gitea/workflows/sast-scan.yml', color: ENTITY_COLORS.provider.gitea.color },
};

const SECRETS = [
  { name: 'SAST_API_URL', desc: 'URL aplikasi SAST', example: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' },
  { name: 'SAST_API_KEY', desc: 'API token untuk autentikasi CI/CD', example: 'sast_xxxxxxxxxxxx' },
];

export const CICDSetupModal = React.memo(function CICDSetupModal({ open, onClose, repository, workspaceSlug }: CICDSetupModalProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('github');
  const [step, setStep] = useState(0);

  const platform = PLATFORMS[selectedPlatform];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied!`);
  };

  const copyYamlContent = () => {
    const yamlExample = `name: SAST Security Scan

on:
  push:
    branches: [main, develop, master]
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]
  workflow_dispatch:

env:
  SAST_API_URL: "\${{ secrets.SAST_API_URL }}"
  SAST_API_KEY: "\${{ secrets.SAST_API_KEY }}"

jobs:
  init:
    runs-on: ubuntu-latest
    outputs:
      scan_id: \${{ steps.create.outputs.scan_id }}
    steps:
      - name: Create scan
        id: create
        run: |
          RESP=$(curl -s -X POST "\${SAST_API_URL}/api/v1/ci/init" \\
            -H "Authorization: Bearer \${SAST_API_KEY}" \\
            -H "Content-Type: application/json" \\
            -d '{"repoName":"${repository?.name ?? 'owner/repo'}","repoUrl":"\${GITHUB_SERVER_URL}/${repository?.name ?? 'owner/repo'}.git","branch":"\${GITHUB_REF_NAME}","commit":"\${GITHUB_SHA}"}')
          SCAN_ID=$(echo "\${RESP}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['scanId'])")
          echo "scan_id=\${SCAN_ID}" >> \${GITHUB_OUTPUT}

  semgrep:
    needs: [init]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install semgrep --break-system-packages
      - run: semgrep scan --config p/default --json --output results.json --metrics off . || true
      - if: always()
        run: |
          curl -X POST -H "Authorization: Bearer \$SAST_API_KEY" \\
            -F "scanId=\${{ needs.init.outputs.scan_id }}" \\
            -F "tool=semgrep" \\
            -F "sarif=@results.json" \\
            -F "repoName=${repository?.name ?? 'owner/repo'}" \\
            "\${SAST_API_URL}/api/v1/ci/upload"

  finalize:
    needs: [init, semgrep]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "\${SAST_API_URL}/api/v1/ci/complete" \\
            -H "Authorization: Bearer \$SAST_API_KEY" \\
            -H "Content-Type: application/json" \\
            -d '{"scanId":"\${{ needs.init.outputs.scan_id }}","status":"completed","tools":["semgrep"],"platform":"github","trigger":"ci"}'`;
    copyToClipboard(yamlExample, 'YAML template');
  };

  return (
    <Modal
      title={
        <Flex align="center" gap={token.paddingMD}>
          <FaIcon icon="fa-link" style={{ color: token.colorPrimary, fontSize: token.fontSizeLG }} />
          <div>
            <Text strong style={{ fontSize: token.fontSizeLG }}>CI/CD Integration</Text>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block' }}>
              Setup automatic scanning for {repository?.name}
            </Text>
          </div>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={MODAL_WIDTH.LG}
      footer={
        <Flex justify="flex-end" gap={token.paddingMD}>
          <Button onClick={onClose}>Close</Button>
        </Flex>
      }
    >
      <Flex vertical gap={token.paddingLG}>
        <Alert
          message="How it works"
          description="Push code to your repository, CI/CD runs scanners automatically, results are uploaded to this SAST platform."
          type="info"
          showIcon
          icon={<FaIcon icon="fa-circle-info" />}
        />

        <Flex vertical gap={token.paddingMD}>
          <Text strong>1. Select your platform</Text>
          <Flex gap={token.paddingSM}>
            {(Object.entries(PLATFORMS) as [Platform, typeof platform][]).map(([key, p]) => (
              <Button
                key={key}
                type={selectedPlatform === key ? 'primary' : 'default'}
                onClick={() => { setSelectedPlatform(key); setStep(0); }}
                icon={<FaIcon icon={p.icon} />}
                style={selectedPlatform === key ? { borderColor: p.color } : {}}
              >
                {p.label}
              </Button>
            ))}
          </Flex>
        </Flex>

        <Divider style={{ margin: `${token.paddingSM}px 0` }} />

        <Flex vertical gap={token.paddingMD}>
          <Text strong>2. Setup steps</Text>
          <Steps
            direction="vertical"
            size="small"
            current={step}
            onChange={setStep}
            items={[
              {
                title: 'Copy workflow file',
                description: (
                  <Flex vertical gap={token.paddingXS}>
                    <Text type="secondary">Copy <Text code>{platform.file}</Text> to your repository</Text>
                    <Button size="small" onClick={copyYamlContent} icon={<FaIcon icon="fa-copy" />}>
                      Copy YAML
                    </Button>
                  </Flex>
                ),
              },
              {
                title: 'Add secrets/variables',
                description: (
                  <Flex vertical gap={token.paddingXS}>
                    <Text type="secondary">Add these in your repository {platform.color === ENTITY_COLORS.provider.gitlab.color ? 'CI/CD Variables' : 'Secrets'}:</Text>
                    {SECRETS.map((s) => (
                      <Flex key={s.name} align="center" gap={token.paddingXS}>
                        <Tag color="blue">{s.name}</Tag>
                        {s.name === 'SAST_API_KEY' ? (
                          <Text type="secondary">{s.desc}</Text>
                        ) : (
                          <Text type="secondary" copyable={{ text: s.example }}>{s.desc}</Text>
                        )}
                        {s.name === 'SAST_API_KEY' && workspaceSlug && (
                          <Link href={`/${workspaceSlug}/projects`} target="_blank">
                            <FaIcon icon="fa-arrow-up-right-from-square" style={{ fontSize: token.fontSizeSM }} /> Generate
                          </Link>
                        )}
                      </Flex>
                    ))}
                    <Alert
                      message="Token needs 'scans:upload' permission"
                      type="warning"
                      showIcon
                      icon={<FaIcon icon="fa-triangle-exclamation" />}
                      style={{ marginTop: token.paddingXS }}
                    />
                  </Flex>
                ),
              },
              {
                title: 'Push & scan',
                description: (
                  <Text type="secondary">
                    Push code to trigger automatic scan. Results appear in the Scans page.
                  </Text>
                ),
              },
            ]}
          />
        </Flex>

        <Divider style={{ margin: `${token.paddingSM}px 0` }} />

        <Flex vertical gap={token.paddingXS}>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            <FaIcon icon="fa-circle-info" /> Full workflow files with all 6 scanners are in the <Text code>examples/</Text> folder.
          </Text>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            Supported: Semgrep, Cppcheck, Flawfinder, Gitleaks, Clang-Tidy, GCC Fanalyzer
          </Text>
        </Flex>
      </Flex>
    </Modal>
  );
});
