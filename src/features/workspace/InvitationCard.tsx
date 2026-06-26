'use client';

import { Card, Button, Typography, Tag, Flex, Space, theme } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { FaIcon } from '@/commons/components/FaIcon';
import type { PendingInvitation } from '@/modules/workspace/types';
import { getInitials } from '@/lib/utils/getInitials';
import { roleLabel } from '@/lib/utils/roleLabel';

const { Text } = Typography;

interface InvitationCardProps {
  invitation: PendingInvitation;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

/**
 * Invitation card for workspace chooser page.
 * Shows a pending invitation with Accept/Decline buttons.
 */
export function InvitationCard({ invitation, onAccept, onDecline, isAccepting, isDeclining }: InvitationCardProps) {
  const { token } = theme.useToken();

  return (
    <Card
      hoverable
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${token.colorWarningBorder}` }}
    >
      <Flex justify="space-between" align="flex-start" gap={token.marginSM}>
        <Flex align="center" gap={token.marginSM}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: token.controlHeight,
              height: token.controlHeight,
              borderRadius: token.borderRadiusLG,
              background: token.colorWarningBg,
              color: token.colorWarning,
              fontWeight: token.fontWeightStrong,
              fontSize: token.fontSize,
              flexShrink: 0,
            }}
          >
            {getInitials(invitation.workspaceName)}
          </Flex>
          <div>
            <Text strong style={{ fontSize: token.fontSize }}>{invitation.workspaceName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: token.fontSizeLG }}>
              Invitation from {invitation.invitedBy ?? 'someone'}
            </Text>
          </div>
        </Flex>
        <Tag
          color="warning"
          style={{ borderRadius: 999 }}
        >
          Invitation
        </Tag>
      </Flex>

      <Flex vertical gap={token.marginXS} style={{ marginTop: token.marginLG, fontSize: token.fontSizeLG }}>
        <Space size={token.marginXS}>
          <FaIcon icon="fa-user-shield" style={{ color: token.colorTextSecondary, fontSize: token.fontSizeLG }} />
          <Text style={{ color: token.colorTextSecondary }}>{roleLabel(invitation.role)} permissions</Text>
        </Space>
        <Space size={token.marginXS}>
          <FaIcon icon="fa-clock" style={{ color: token.colorTextSecondary, fontSize: token.fontSizeLG }} />
          <Text style={{ color: token.colorTextSecondary }}>Invitation pending</Text>
        </Space>
      </Flex>

      <Flex gap={token.marginSM} style={{ marginTop: token.marginLG }}>
        <Button
          type="primary"
          block
          icon={<CheckOutlined />}
          loading={isAccepting}
          onClick={() => onAccept(invitation.id)}
          style={{ flex: 1 }}
        >
          Accept
        </Button>
        <Button
          block
          icon={<CloseOutlined />}
          loading={isDeclining}
          onClick={() => onDecline(invitation.id)}
          style={{ flex: 1 }}
        >
          Decline
        </Button>
      </Flex>
    </Card>
  );
}
