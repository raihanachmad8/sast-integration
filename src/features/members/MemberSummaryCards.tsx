'use client';

import { Avatar, Card, Row, Col, Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
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

/**
 * Summary cards showing member count, invitation count, and user role.
 *
 * @example
 * <MemberSummaryCards memberCount={12} invitationCount={3} />
 */
export function MemberSummaryCards({ memberCount, invitationCount }: MemberSummaryCardsProps) {
  const { token } = theme.useToken();
  const { role } = usePermissions();
  const values = [memberCount, invitationCount, roleLabel(role)];

  const colorMap = {
    primary: token.colorPrimary,
    blue: token.colorPrimary,
    purple: token.colorPurple,
  } as const;

  const bgMap = {
    primaryBg: token.colorTealBg,
    blueBg: token.colorPrimaryBg,
    purpleBg: token.colorPurpleBg,
  } as const;

  return (
    <Row gutter={[token.marginMD, token.marginMD]}>
      {STAT_ITEMS.map((s, i) => (
        <Col key={s.key} xs={24} sm={8}>
          <Card styles={{ body: { padding: token.paddingLG } }} style={{ height: '100%' }}>
            <Flex justify="space-between" align="flex-start" style={{ marginBottom: token.marginMD }}>
              <Typography.Text type="secondary">{s.label}</Typography.Text>
              <Avatar size={32} shape="square" style={{ background: bgMap[s.bgKey], color: colorMap[s.colorKey] }}>
                <FaIcon icon={s.icon} />
              </Avatar>
            </Flex>
            <Typography.Title level={3} style={{ margin: 0 }}>{values[i]}</Typography.Title>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
