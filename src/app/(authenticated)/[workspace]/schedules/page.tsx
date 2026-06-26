'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, App, Flex, Typography, theme } from 'antd';

import { ErrorBanner } from '@/commons/components/ErrorBanner';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { StatusPill } from '@/commons/components/StatusPill';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PERMISSION } from '@/commons/constants/permissions';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { errorMessage } from '@/lib/api/errors';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useSchedulesQuery, useCreateScheduleMutation, useUpdateScheduleMutation, useDeleteScheduleMutation, useToggleScheduleMutation } from '@/modules/schedules';
import type { CreateScheduleInput, UpdateScheduleInput } from '@/commons/schemas/schedule.schema';
import type { ScheduleRow } from '@/commons/types/schedules';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { AddScheduleModal, EditScheduleModal } from '@/features/schedules';

function buildColumns(token: ReturnType<typeof theme.useToken>['token']): DataTableColumn<ScheduleRow>[] {
  const RUN_ICON: Record<string, { icon: string; color: string }> = {
    pass: { icon: 'fa-circle-check', color: token.colorSuccess },
    fail: { icon: 'fa-circle-xmark', color: token.colorError },
  };

  return [
    {
      key: 'repositoryName',
      header: 'Repository',
      sortable: true,
      sortValue: (row) => row.repositoryName,
      render: (row) => (
        <div>
          <div style={{ fontWeight: token.fontWeightStrong }}>{row.repositoryName}</div>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{row.branch}</div>
        </div>
      ),
    },
    {
      key: 'cronExpression',
      header: 'Schedule',
      sortable: true,
      sortValue: (row) => row.cronExpression,
      render: (row) => (
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: token.fontSize }}>{row.cronExpression}</div>
        </div>
      ),
    },
    {
      key: 'timezone',
      header: 'Timezone',
      render: (row) => <Typography.Text style={{ color: token.colorTextSecondary }}>{row.timezone}</Typography.Text>,
    },
    {
      key: 'nextRunAt',
      header: 'Next run',
      render: (row) => <Typography.Text style={{ color: token.colorText, fontWeight: token.fontWeightStrong }}>{row.nextRunAt ?? '-'}</Typography.Text>,
    },
    {
      key: 'lastRunAt',
      header: 'Last run',
      render: (row) => {
        if (!row.lastRunAt) return <Typography.Text type="secondary">-</Typography.Text>;
        const cfg = RUN_ICON.pass;
        return <FaIcon icon={cfg.icon} style={{ color: cfg.color }} />;
      },
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => <StatusPill variant={row.active ? 'teal' : 'slate'}>{row.active ? 'Active' : 'Paused'}</StatusPill>,
    },
  ];
}

export default function SchedulesPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.SCHEDULES}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Schedules" description="Manage recurring scan schedules for repositories." />
          <ComingSoonCard
            icon="fa-calendar-days"
            title="Schedules"
            description="Scheduled scans allow you to automate recurring security scans."
            envHint="FEATURE_FLAG_SCHEDULES"
          />
        </Flex>
      }
    >
      <SchedulesPageContent />
    </FeatureGate>
  );
}

function SchedulesPageContent() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { confirm } = useConfirm();
  const { has } = usePermissions();
  const canManage = has(PERMISSION.SCHEDULE_MANAGE);

  const { params, setPagination, setSearch } = useTableParams({
    defaultPageSize: 10,
  });

  const schedulesQuery = useSchedulesQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
  });
  const createMutation = useCreateScheduleMutation();
  const updateMutation = useUpdateScheduleMutation();
  const deleteMutation = useDeleteScheduleMutation();
  const toggleMutation = useToggleScheduleMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleRow | null>(null);

  const handleEdit = useCallback((schedule: ScheduleRow) => { setSelectedSchedule(schedule); setEditOpen(true); }, []);

  const handleSaveEdit = (values: Record<string, unknown>) => {
    if (!selectedSchedule) return;
    updateMutation.mutate({ id: selectedSchedule.id, data: values as UpdateScheduleInput }, { onSuccess: () => { setEditOpen(false); message.success('Schedule updated'); }, onError: (err: Error) => message.error(errorMessage(err)) });
  };

  const handleCreate = (values: Record<string, unknown>) => {
    createMutation.mutate(values as CreateScheduleInput, { onSuccess: () => { setAddOpen(false); message.success('Schedule created'); }, onError: (err: Error) => message.error(errorMessage(err)) });
  };

  const handleToggleStatus = useCallback((schedule: ScheduleRow) => {
    toggleMutation.mutate({ id: schedule.id, enabled: !schedule.active }, { onSuccess: () => message.success(`Schedule ${schedule.active ? 'paused' : 'resumed'}`), onError: (err: Error) => message.error(errorMessage(err)) });
  }, [toggleMutation, message]);

  const handleDelete = useCallback((schedule: ScheduleRow) => {
    confirm({ title: 'Delete schedule?', content: `Delete schedule for "${schedule.repositoryName}"?`, okText: 'Delete', danger: true,
      onOk: () => { deleteMutation.mutate(schedule.id, { onSuccess: () => message.success('Schedule deleted'), onError: (err: Error) => message.error(errorMessage(err)) }); },
    });
  }, [confirm, deleteMutation, message]);

  const columns = useMemo(() => buildColumns(token), [token]);

  const actions = useMemo<ActionConfig<ScheduleRow>[]>(() => [
    { label: 'Edit', icon: <FaIcon icon="fa-pen" />, onClick: (schedule) => handleEdit(schedule), show: () => canManage },
    { label: 'Pause', icon: <FaIcon icon="fa-pause" />, onClick: (schedule) => handleToggleStatus(schedule), show: (schedule) => schedule.active && canManage },
    { label: 'Resume', icon: <FaIcon icon="fa-play" />, onClick: (schedule) => handleToggleStatus(schedule), show: (schedule) => !schedule.active && canManage },
    { label: 'Delete', icon: <FaIcon icon="fa-trash" />, onClick: (schedule) => handleDelete(schedule), variant: 'danger', show: () => canManage },
  ], [handleEdit, handleToggleStatus, handleDelete, canManage]);

  if (schedulesQuery.isLoading) return <LoadingState text="Loading schedules..." />;
  if (schedulesQuery.error) return <ErrorBanner message={errorMessage(schedulesQuery.error)} />;

  return (
    <PermissionGate permission={PERMISSION.SCHEDULE_VIEW} fallback={<PermissionHint permission={PERMISSION.SCHEDULE_VIEW} />}>
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="Schedules" description="Manage recurring scan schedules for repositories."
        actions={<PermissionGate permission={PERMISSION.SCHEDULE_MANAGE}>
          <Button type="primary" onClick={() => setAddOpen(true)} icon={<FaIcon icon="fa-plus" />}>Add schedule</Button>
        </PermissionGate>} />
      <DataTable
        source={makeSource(schedulesQuery.data)}
        columns={columns}
        rowKey={(r) => r.id}
        actions={actions}
        emptyText="No schedules found. Create a schedule to automate recurring scans."
        isLoading={schedulesQuery.isLoading}
        searchable
        searchPlaceholder="Search schedules"
        searchValue={params.search}
        onSearchChange={setSearch}
        onChange={(p, ps) => setPagination(p, ps)}
      />
      <EditScheduleModal open={editOpen} schedule={selectedSchedule ? { id: selectedSchedule.id, repo: selectedSchedule.repositoryName, branch: selectedSchedule.branch, frequency: selectedSchedule.cronExpression, cron: selectedSchedule.cronExpression, timezone: selectedSchedule.timezone, policy: '', nextRun: selectedSchedule.nextRunAt ?? '', lastRuns: [], status: selectedSchedule.active ? 'active' : 'paused' } : null} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
      <AddScheduleModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleCreate} />
    </Flex>
    </PermissionGate>
  );
}
