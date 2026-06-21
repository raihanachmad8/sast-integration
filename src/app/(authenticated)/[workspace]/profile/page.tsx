'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { App, Flex, Tabs, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { PageHeader } from '@/commons/components/PageHeader';
import { useSessionData } from '@/modules/auth/queries';
import { useUpdateProfileMutation, useRevokeSessionMutation, useChangePasswordMutation, useUploadAvatarMutation, useRemoveAvatarMutation, useProfileQuery } from '@/modules/profile';
import { errorMessage } from '@/lib/api/errors';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import { ProfileTab } from './ProfileTab';
import { SecurityTab } from './SecurityTab';



export default function ProfilePage() {
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const session = useSessionData();
  const { token } = theme.useToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const user = session.data?.user;
  const profileQuery = useProfileQuery(user?.id ?? '');
  const profile = profileQuery.data;
  const name = profile?.name ?? user?.name ?? 'Admin';
  const email = profile?.email ?? user?.email ?? 'admin@sast.local';
  const role = session.data?.workspace?.role ?? 'owner';

  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const removeAvatarMutation = useRemoveAvatarMutation();
  const revokeSessionMutation = useRevokeSessionMutation();

  if (session.isLoading || profileQuery.isLoading) return <LoadingState text="Loading profile..." />;
  if (session.isError) return <ErrorState title="Failed to load session" description="Please try refreshing the page." />;
  if (profileQuery.isError) return <ErrorState title="Failed to load profile" description="Could not load profile data." />;
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

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
    changePasswordMutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword, confirmPassword: values.confirmPassword },
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
                avatarUrl={profile?.avatarUrl}
                username={profile?.username}
                bio={profile?.bio}
                timezone={profile?.timezone}
                language={profile?.language}
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
        ]}
      />
    </Flex>
  );
}
