'use client';

import { Card, Row, Col, Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { roleLabel } from '@/lib/utils/roleLabel';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface MemberSummaryCardsProps {
  memberCount: number;
  invitationCount: number;
}

const STAT_ITEMS = [
  { key: 'members', label: 'Active members', icon: 'fa-users', colorKey: 'primary' as const, bgKey: 'primaryBg' as const },
  { key: 'invitations', label: 'Pending invitations', icon: 'fa-envelope-open-text', colorKey: 'blue' as const, bgKey: 'blueBg' as const },
  { key: 'role', label: 'Your role', icon: 'fa-user-shield', colorKey: 'purple' as const, bgKey: 'purpleBg' as const },
];

export function MemberSummaryCards({ memberCount, invitationCount }: MemberSummaryCardsProps) {
  const { token } = theme.useToken();
  const { role } = usePermissions();
  const values = [memberCount, invitationCount, roleLabel(role)];

  const colorMap = {
    primary: token.colorPrimary,
    blue: '#3b82f6',
    purple: token.colorPurple,
  } as const;

  const bgMap = {
    primaryBg: '#f0fdfa',
    blueBg: '#eff6ff',
    purpleBg: '#faf5ff',
  } as const;

  return (
    <Row gutter={[token.marginMD, token.marginMD]}>
      {STAT_ITEMS.map((s, i) => (
        <Col key={s.key} xs={24} sm={8}>
          <Card styles={{ body: { padding: token.paddingLG } }} style={{ height: '100%' }}>
            <Flex justify="space-between" align="flex-start" style={{ marginBottom: token.marginMD }}>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{s.label}</Typography.Text>
              <div style={{ width: 32, height: 32, borderRadius: token.borderRadiusSM, background: bgMap[s.bgKey], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaIcon icon={s.icon} style={{ color: colorMap[s.colorKey], fontSize: token.fontSizeSM }} />
              </div>
            </Flex>
            <div style={{ fontSize: token.fontSizeHeading3, fontWeight: token.fontWeightStrong, lineHeight: 1 }}>{values[i]}</div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
