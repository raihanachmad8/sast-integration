'use client';

import { Card, Button, Typography, Flex, Alert, theme } from 'antd';
import { StatusPill } from '@/commons/components/StatusPill';
import { LeftOutlined, PlusOutlined } from '@ant-design/icons';
import { FaIcon } from '@/commons/components/FaIcon';

const { Title, Text, Paragraph } = Typography;

interface EmptyWorkspaceStateProps {
  isSingleMode: boolean;
  canCreatePersonal: boolean;
  hasValidSession: boolean;
  isLoading: boolean;
  isCreating: boolean;
  error?: string;
  email?: string;
  onSignout: () => void;
  onCreatePersonal: () => void;
}

/**
 * Empty state when user has no workspaces.
 * Uses Ant Design tokens for all styling.
 *
 * @example
 * <EmptyWorkspaceState
 *   isSingleMode={false}
 *   canCreatePersonal={true}
 *   hasValidSession={true}
 *   isLoading={false}
 *   isCreating={false}
 *   email="user@example.com"
 *   onSignout={() => signout()}
 *   onCreatePersonal={() => createWorkspace()}
 * />
 */
export function EmptyWorkspaceState({
  isSingleMode,
  canCreatePersonal,
  hasValidSession,
  isCreating,
  error,
  email,
  onSignout,
  onCreatePersonal,
}: EmptyWorkspaceStateProps) {
  const { token } = theme.useToken();

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', padding: `${token.paddingXL}px ${token.padding}px` }}>
      <Card
        style={{ width: '100%', maxWidth: 760 }}
        aria-labelledby="workspace-access-title"
      >
        <Flex justify="space-between" align="flex-start" wrap="wrap" gap={token.marginLG} style={{ paddingBottom: token.paddingLG, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <Flex align="center" gap={token.marginSM}>
            <Flex
              align="center"
              justify="center"
              style={{
                width: 44,
                height: 44,
                borderRadius: token.borderRadiusLG,
                background: token.colorPrimary,
                color: token.colorTextLightSolid,
                flexShrink: 0,
              }}
            >
              <FaIcon icon="fa-shield-halved" style={{ fontSize: token.fontSizeXL }} />
            </Flex>
            <div>
              <Flex align="center" gap={token.marginXS} wrap="wrap">
                <Title level={4} id="workspace-access-title" style={{ margin: 0 }}>
                  Workspace access required
                </Title>
                <StatusPill variant="amber">No workspace</StatusPill>
              </Flex>
              <Text type="secondary" style={{ fontSize: token.fontSize }}>
                This account is active, but it is not connected to an active workspace.
              </Text>
            </div>
          </Flex>

          <Button icon={<LeftOutlined />} onClick={onSignout}>
            Back to sign in
          </Button>
        </Flex>

        <Flex gap={token.paddingLG} style={{ padding: `${token.paddingLG}px 0` }} wrap="wrap">
          <div style={{ flex: 1, minWidth: 280 }}>
            <Paragraph style={{ fontSize: token.fontSizeLG }}>
              {isSingleMode
                ? 'Workspaces scope repositories, scans, findings, and permissions. Use an invitation link to join a workspace and continue.'
                : 'Workspaces scope repositories, scans, findings, and permissions. Create your personal workspace to continue, or use an invitation link to join an organization.'}
            </Paragraph>

            <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginLG }}>
              <Flex gap={token.marginXS} align="flex-start">
                <FaIcon
                  icon={isSingleMode ? 'fa-envelope-circle-check' : 'fa-circle-check'}
                  style={{ width: 18, color: token.colorPrimary, fontSize: token.fontSize, marginTop: 3 }}
                />
                <Text style={{ fontSize: token.fontSize }}>
                  {isSingleMode
                    ? 'Registration is invitation-only. Use the invitation link sent to your email address.'
                    : 'New self-service accounts receive one personal workspace automatically during signup.'}
                </Text>
              </Flex>
              <Flex gap={token.marginXS} align="flex-start">
                <FaIcon
                  icon="fa-envelope-open-text"
                  style={{ width: 18, color: token.colorPrimary, fontSize: token.fontSize, marginTop: 3 }}
                />
                <Text style={{ fontSize: token.fontSize }}>
                  Organization workspace access remains invitation-only and cannot be created from
                  this screen.
                </Text>
              </Flex>
              <Flex gap={token.marginXS} align="flex-start">
                <FaIcon
                  icon="fa-user-shield"
                  style={{ width: 18, color: token.colorPrimary, fontSize: token.fontSize, marginTop: 3 }}
                />
                <Text style={{ fontSize: token.fontSize }}>
                  If you expected access, ask an owner or manager to send a new invitation to this
                  email address.
                </Text>
              </Flex>
            </Flex>

            <Flex gap={token.marginXS} wrap="wrap" style={{ marginTop: token.marginLG }}>
              {canCreatePersonal ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={onCreatePersonal}
                  loading={isCreating}
                >
                  {isCreating ? 'Creating workspace...' : 'Create personal workspace'}
                </Button>
              ) : !hasValidSession ? (
                <Alert
                  type="error"
                  title="Session expired. Sign in again to continue."
                  showIcon
                  style={{ width: '100%' }}
                />
              ) : (
                <Text type="secondary" strong>
                  Waiting for a workspace invitation.
                </Text>
              )}
              {error && (
                <Alert
                  type="error"
                  title={error}
                  showIcon
                  style={{ width: '100%' }}
                />
              )}
            </Flex>
          </div>

          <Flex vertical gap={token.marginSM} style={{ borderLeft: `1px solid ${token.colorBorderSecondary}`, paddingLeft: token.paddingLG, minWidth: 200 }}>
            <Text type="secondary" strong style={{ fontSize: token.fontSizeSM - 1, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Workspace status
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Account</Text>
              <br />
              <Text strong style={{ fontSize: token.fontSize }}>
                {email ?? 'Session expired'}
              </Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Workspaces</Text>
              <br />
              <Text strong style={{ fontSize: token.fontSize }}>0 active workspaces</Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Next step</Text>
              <br />
              <Text strong style={{ fontSize: token.fontSize }}>
                {canCreatePersonal
                  ? 'Create personal workspace'
                  : hasValidSession
                    ? 'Accept an invitation'
                    : 'Sign in again'}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
