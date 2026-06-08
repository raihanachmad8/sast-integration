'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { App, Flex, Tabs, Typography, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { PageHeader } from '@/components/shared/PageHeader';
import { useSessionQuery } from '@/modules/auth/queries';
import { useUpdateProfileMutation, useRevokeSessionMutation, useChangePasswordMutation, useUploadAvatarMutation, useRemoveAvatarMutation } from '@/modules/profile';
import { errorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { ProfileTab } from './ProfileTab';
import { SecurityTab } from './SecurityTab';

const { Text } = Typography;

export default function ProfilePage() {
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const session = useSessionQuery();
  const { token } = theme.useToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const user = session.data?.user;
  const name = user?.name ?? 'Admin';
  const email = user?.email ?? 'admin@sast.local';
  const role = session.data?.workspace?.role ?? 'owner';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const removeAvatarMutation = useRemoveAvatarMutation();
  const revokeSessionMutation = useRevokeSessionMutation();

  const handleProfileSave = (values: { name: string; username: string; timezone: string; language: string; bio: string }) => {
    if (!user?.id) return;
    updateProfileMutation.mutate(
      { userId: user.id, payload: values },
      {
        onSuccess: () => message.success('Profile updated'),
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  };

  const handlePasswordChange = (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          message.success('Password updated');
        },
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  };

  const handleRevokeSession = (sessionId: string) => {
    revokeSessionMutation.mutate(sessionId, {
      onSuccess: () => message.success('Session revoked'),
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleAvatarUpload = (file: File) => {
    uploadAvatarMutation.mutate(file, {
      onSuccess: () => message.success('Avatar updated'),
      onError: (err) => message.error(errorMessage(err)),
    });
    return false;
  };

  const handleAvatarRemove = () => {
    removeAvatarMutation.mutate(undefined, {
      onSuccess: () => message.success('Avatar removed'),
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Profile"
        description="Personal identity, security, and API tokens."
      />

      <Tabs
        activeKey={activeTab}
        onChange={(tab) => { setActiveTab(tab); router.replace(`?tab=${tab}`, { scroll: false }); }}
        size="large"
        items={[
          {
            key: 'profile',
            label: <span><FaIcon icon="fa-user" style={{ marginRight: 8 }} /> Profile</span>,
            children: (
              <ProfileTab
                name={name}
                email={email}
                role={role}
                initials={initials}
                isPending={updateProfileMutation.isPending}
                onSave={handleProfileSave}
                onAvatarUpload={handleAvatarUpload}
                onAvatarRemove={handleAvatarRemove}
                onConfirmRemove={(opts) => confirm(opts)}
              />
            ),
          },
          {
            key: 'security',
            label: <span><FaIcon icon="fa-shield-halved" style={{ marginRight: 8 }} /> Security</span>,
            children: (
              <SecurityTab
                isPasswordPending={changePasswordMutation.isPending}
                onPasswordChange={handlePasswordChange}
                onRevokeSession={handleRevokeSession}
                onConfirmRevoke={(opts) => confirm(opts)}
              />
            ),
          },
          { key: 'notifications', label: <span><FaIcon icon="fa-bell" style={{ marginRight: 8 }} /> Notifications</span>, children: <div><Text type="secondary">Coming soon. Configure email and in-app notification settings.</Text></div> },
          { key: 'tokens', label: <span><FaIcon icon="fa-key" style={{ marginRight: 8 }} /> Personal tokens</span>, children: <div><Text type="secondary">Coming soon. Generate tokens for CLI and CI integration.</Text></div> },
        ]}
      />
    </Flex>
  );
}
