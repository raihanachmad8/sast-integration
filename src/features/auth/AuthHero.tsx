'use client';

import { Typography, Flex, theme } from 'antd';

const { Title, Text } = Typography;

const FEATURES = [
  { value: '3', label: 'Scanners' },
  { value: 'QLoRA', label: 'AI Verifier' },
  { value: 'RBAC', label: 'Permissions' },
];

const CHECKLIST = [
  'Connect GitHub, GitLab, or Gitea',
  'Run Semgrep, Gitleaks, Flawfinder',
  'AI-assisted TP/FP with confidence score',
  'Workspace RBAC with 4 role levels',
];

function ShieldIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/**
 * Auth hero panel — left side of login/signup pages.
 * Uses Ant Design teal tokens for all colors (responsive: hidden on mobile).
 *
 * @example
 * <AuthHero />
 */
export function AuthHero() {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      justify="center"
      gap={token.marginLG}
      style={{
        height: '100%',
        background: token.colorTealAccent,
        padding: `${token.paddingXL * 1.5}px ${token.paddingXL}px`,
        color: token.colorTextLightSolid,
      }}
    >
      {/* Brand */}
      <Flex align="center" gap={token.marginXS}>
        <Flex
          align="center"
          justify="center"
          style={{
            width: token.sizeXL,
            height: token.sizeXL,
            borderRadius: token.borderRadiusLG,
            background: token.colorFillQuaternary,
            color: token.colorTextLightSolid,
          }}
        >
          <ShieldIcon />
        </Flex>
        <Flex vertical gap={0}>
          <Text strong style={{ fontSize: token.fontSizeLG, color: token.colorTextLightSolid }}>
            SAST Integration
          </Text>
          <Text style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, textTransform: 'uppercase', letterSpacing: '0.14em', color: token.colorTealDeepBg }}>
            Security Review Console
          </Text>
        </Flex>
      </Flex>

      {/* Heading */}
      <Title level={2} style={{ margin: 0, fontWeight: token.fontWeightStrong, color: token.colorTextLightSolid }}>
        Review scanner findings<br />with clear AI attribution.
      </Title>
      <Text style={{ fontSize: token.fontSize, lineHeight: token.lineHeightLG, color: token.colorTealDeepBg, maxWidth: token.sizeXXL * 8 }}>
        Connect repositories, queue scans, verify findings with AI, and manage workspace access — all in one place.
      </Text>

      {/* Feature cards */}
      <Flex gap={token.marginXS} style={{ maxWidth: token.sizeXXL * 6.25 }}>
        {FEATURES.map((item) => (
          <Flex
            key={item.label}
            vertical
            align="center"
            style={{
              flex: 1,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillQuaternary,
              padding: `${token.paddingXS}px ${token.paddingXS}px`,
              textAlign: 'center',
            }}
          >
            <Text strong style={{ fontSize: token.fontSizeXL, color: token.colorTextLightSolid }}>
              {item.value}
            </Text>
            <Text style={{ fontSize: token.fontSizeSM, color: token.colorTealDeepBg, marginTop: token.marginXXS }}>
              {item.label}
            </Text>
          </Flex>
        ))}
      </Flex>

      {/* Checklist */}
      <Flex vertical gap={token.marginXS}>
        {CHECKLIST.map((text) => (
          <Flex key={text} align="center" gap={token.marginXS} style={{ fontSize: token.fontSizeSM, color: token.colorTealDeepBg }}>
            <span style={{ color: token.colorSuccess }}>✓</span> {text}
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
