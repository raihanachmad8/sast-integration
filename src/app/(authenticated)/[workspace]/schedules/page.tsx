'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Input, App, Card, Tag, Flex, Typography, theme } from 'antd';
import { useSessionQuery } from '@/modules/auth/queries';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { TableFooter } from '@/components/shared/TableFooter';
import { EditScheduleModal, AddScheduleModal } from '@/features/schedules/ScheduleModals';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { errorMessage } from '@/lib/api/errors';
import { useSchedulesQuery, useCreateScheduleMutation, useUpdateScheduleMutation, useDeleteScheduleMutation, useToggleScheduleMutation } from '@/modules/schedules';
import type { Schedule } from '@/modules/schedules/api';

function toViewSchedule(s: Schedule) {
  return {
    ...s,
    repo: s.repositoryName,
    branch: '',
    frequency: s.name,
    policy: s.name,
    next_run: s.nextRun ?? '',
    last_runs: s.lastRun ? [s.lastRun] : [],
    active: s.enabled,
  };
}

function buildColumns(handleEdit: (s: Schedule) => void, handleToggle: (s: Schedule) => void, handleDelete: (s: Schedule) => void, token: ReturnType<typeof theme.useToken>['token']): DataTableColumn<Schedule>[] {
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
          <div style={{ fontWeight: 600 }}>{row.repositoryName}</div>
          <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{row.scanners.join(', ')}</div>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Schedule',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <div>
          <div>{row.name}</div>
          <div style={{ fontSize: 12, color: token.colorTextSecondary, fontFamily: 'monospace' }}>{row.cron}</div>
        </div>
      ),
    },
    {
      key: 'timezone',
      header: 'Timezone',
      render: (row) => <Typography.Text style={{ color: token.colorTextSecondary }}>{row.timezone}</Typography.Text>,
    },
    {
      key: 'nextRun',
      header: 'Next run',
      render: (row) => <Typography.Text style={{ color: token.colorText, fontWeight: 500 }}>{row.nextRun ?? '-'}</Typography.Text>,
    },
    {
      key: 'lastRun',
      header: 'Last run',
      render: (row) => {
        if (!row.lastRun) return <Typography.Text type="secondary">-</Typography.Text>;
        const cfg = RUN_ICON[row.lastRun] ?? RUN_ICON.pass;
        return <FaIcon icon={cfg.icon} style={{ color: cfg.color }} />;
      },
    },
    {
      key: 'enabled',
      header: 'Status',
      render: (row) => <Tag color={row.enabled ? 'success' : 'default'}>{row.enabled ? 'Active' : 'Paused'}</Tag>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={4}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}><FaIcon icon="fa-pen" /> Edit</Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleToggle(row); }}><FaIcon icon={row.enabled ? 'fa-pause' : 'fa-play'} /> {row.enabled ? 'Pause' : 'Resume'}</Button>
          <Button size="small" danger onClick={(e) => { e.stopPropagation(); handleDelete(row); }}><FaIcon icon="fa-trash" /></Button>
        </Flex>
      ),
    },
  ];
}

/**
 * Schedules management page.
 * Manages recurring scan schedules for repositories.
 *
 * @returns JSX element with schedule table, search, and create/edit modals.
 */
export default function SchedulesPage() {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();

  const schedulesQuery = useSchedulesQuery();
  const createMutation = useCreateScheduleMutation();
  const updateMutation = useUpdateScheduleMutation();
  const deleteMutation = useDeleteScheduleMutation();
  const toggleMutation = useToggleScheduleMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  const schedules = schedulesQuery.data ?? [];

  const { params, setPage, setPageSize, setSearch, filtered, paginated } = useTableParams<Schedule>({
    data: schedules,
    searchField: 'repositoryName',
    defaultPageSize: 10,
  });

  const handleEdit = useCallback((schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setEditOpen(true);
  }, []);

  const handleSaveEdit = (values: { repo: string; branch: string; frequency: string; timezone: string; policy: string }) => {
    if (!selectedSchedule) return;
    updateMutation.mutate(
      { id: selectedSchedule.id, data: { repositoryName: values.repo, name: values.policy, cron: values.frequency, timezone: values.timezone } },
      { onSuccess: () => { setEditOpen(false); message.success('Schedule updated'); }, onError: (err) => message.error(errorMessage(err)) },
    );
  };

  const handleCreate = (values: { repo: string; branch: string; frequency: string; timezone: string; policy: string }) => {
    createMutation.mutate(
      { repositoryName: values.repo, name: values.policy, cron: values.frequency, timezone: values.timezone, scanners: [], enabled: true },
      {
        onSuccess: () => { setAddOpen(false); message.success('Schedule created'); },
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  };

  const handleToggleStatus = useCallback((schedule: Schedule) => {
    toggleMutation.mutate(
      { id: schedule.id, enabled: !schedule.enabled },
      {
        onSuccess: () => message.success(`Schedule ${schedule.enabled ? 'paused' : 'resumed'}`),
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  }, [toggleMutation, message]);

  const handleDelete = useCallback((schedule: Schedule) => {
    modal.confirm({
      title: 'Delete schedule?',
      content: `Delete schedule for "${schedule.repositoryName}"? This cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteMutation.mutate(schedule.id, {
          onSuccess: () => message.success('Schedule deleted'),
          onError: (err) => message.error(errorMessage(err)),
        });
      },
    });
  }, [modal, deleteMutation, message]);

  const columns = useMemo(() => buildColumns(handleEdit, handleToggleStatus, handleDelete, token), [handleEdit, handleToggleStatus, handleDelete, token]);

  if (schedulesQuery.isLoading) {
    return <LoadingState text="Loading schedules..." />;
  }

  if (schedulesQuery.error) {
    return <ErrorBanner message={errorMessage(schedulesQuery.error)} />;
  }

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="Schedules"
        description="Manage recurring scan schedules for repositories."
        actions={
          <PermissionGate permission={PERMISSION.SCHEDULE_MANAGE}>
            <Button type="primary" onClick={() => setAddOpen(true)}><FaIcon icon="fa-plus" /> Add schedule</Button>
          </PermissionGate>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 12 }}>
          <Input
            allowClear
            style={{ width: '100%', maxWidth: 360 }}
            placeholder="Search schedules"
            prefix={<FaIcon icon="fa-magnifying-glass" />}
            value={params.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="fa-calendar-check"
            title="No schedules found"
            text="Create a schedule to automate recurring scans."
          />
        ) : (
          <>
            <DataTable
              data={paginated}
              columns={columns}
              rowKey={(r) => r.id}
              emptyText="No schedules found."
            />
            <TableFooter
              current={params.page}
              pageSize={params.per_page}
              total={filtered.length}
              onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
            />
          </>
        )}
      </Card>

      <EditScheduleModal open={editOpen} schedule={selectedSchedule ? toViewSchedule(selectedSchedule) : null} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
      <AddScheduleModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleCreate} />
    </Flex>
  );
}
