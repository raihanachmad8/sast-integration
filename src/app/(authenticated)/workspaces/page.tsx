'use client';

import { LeftOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Flex, Typography, Alert, App, theme } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';

import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { ROUTES } from '@/commons/constants';
import { clientEnv } from '@/config/client-env';
import { WorkspaceCard, EmptyWorkspaceState } from '@/features/workspace';
import { setWorkspaceId } from '@/lib/api/client';
import { authKeys } from '@/modules/auth/keys';
import { useSessionQuery, useSignoutMutation } from '@/modules/auth/queries';
import {
  useWorkspacesQuery,
  useCreateWorkspaceMutation,
  useSwitchWorkspaceMutation,
} from '@/modules/workspace/queries';
import { WORKSPACE } from '@/server/modules/workspace/constants';

const { Title, Text } = Typography;

export default function WorkspaceChooserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaces = useWorkspacesQuery();
  const switchMutation = useSwitchWorkspaceMutation();
  const createMutation = useCreateWorkspaceMutation();
  const signout = useSignoutMutation();

  const hasValidSession = Boolean(session.data?.accessToken);
  const workspaceMode = clientEnv.workspaceMode;
  const isSingleMode = workspaceMode === 'single';
  const canCreatePersonal = hasValidSession && workspaceMode === WORKSPACE.MODE.MULTIPLE;
  const redirectTo = searchParams.get('redirect');

  const handleSelect = (ws: { id: string; slug: string; name: string; role: string }) => {
    switchMutation.mutate(ws.id, {
      onSuccess: () => {
        setWorkspaceId(ws.id, ws.slug);
        queryClient.setQueryData(authKeys.session(), (old: Record<string, unknown> | undefined) => {
          if (!old) return old;
          return { ...old, workspace: { id: ws.id, name: ws.name, slug: ws.slug, role: ws.role } };
        });
        if (redirectTo && redirectTo.startsWith('/')) {
          router.push(redirectTo);
        } else {
          router.push(ROUTES.WORKSPACE.DASHBOARD(ws.slug));
        }
      },
      onError: () => message.error('Failed to switch workspace'),
    });
  };

  const handleSignout = () => {
    if (session.data?.accessToken) {
      signout.mutate(undefined, {
        onSettled: () => {
          window.location.href = ROUTES.AUTH.SIGNIN;
        },
      });
      return;
    }

    window.location.href = ROUTES.AUTH.SIGNIN;
  };

  const handleCreatePersonal = () => {
    if (!hasValidSession) {
      window.location.href = ROUTES.AUTH.SIGNIN;
      return;
    }

    createMutation.mutate(
      { name: 'Personal Workspace', type: WORKSPACE.TYPE.PERSONAL },
      {
        onSuccess: (ws) => {
          setWorkspaceId(ws.id, ws.slug);
          if (redirectTo && redirectTo.startsWith('/')) {
            router.push(redirectTo);
          } else {
            router.push(ROUTES.WORKSPACE.DASHBOARD(ws.slug));
          }
        },
        onError: () => message.error('Failed to create workspace'),
      }
    );
  };

  if (workspaces.isLoading || session.isLoading) {
    return <LoadingState text="Loading workspaces..." fullHeight />;
  }

  if (!workspaces.data || workspaces.data.length === 0) {
    return (
      <EmptyWorkspaceState
        isSingleMode={isSingleMode}
        canCreatePersonal={canCreatePersonal}
        hasValidSession={hasValidSession}
        isLoading={createMutation.isPending}
        isCreating={createMutation.isPending}
        error={createMutation.error?.message}
        email={session.data?.user.email}
        onSignout={handleSignout}
        onCreatePersonal={handleCreatePersonal}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: `${token.paddingXL}px clamp(24px, 3.4vw, 64px)` }}>
      <div style={{ width: '100%', maxWidth: 1742, flex: 1 }}>
        <Flex align="center" gap={token.marginSM} style={{ marginBottom: token.marginXL }}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 40,
              height: 40,
              borderRadius: token.borderRadiusLG,
              background: token.colorPrimary,
              color: token.colorTextLightSolid,
              flexShrink: 0,
            }}
          >
            <FaIcon icon="fa-shield-halved" style={{ fontSize: token.fontSizeLG }} />
          </Flex>
          <div>
            <Title level={4} style={{ margin: 0 }}>Choose workspace</Title>
            <Text style={{ fontSize: token.fontSizeLG, color: token.colorTextSecondary }}>
              Data, permissions, and scans are scoped per workspace.
            </Text>
          </div>
        </Flex>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 566px))',
            gap: token.marginLG,
          }}
        >
          {workspaces.data.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <Alert
          title="Each account owns one personal workspace. Additional workspace access is added by invitation."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginTop: token.marginLG }}
        />
      </div>

      <Flex justify="flex-end" style={{ marginTop: token.marginXL }}>
        <Button icon={<LeftOutlined />} onClick={handleSignout}>
          Back to sign in
        </Button>
      </Flex>
    </div>
  );
}
