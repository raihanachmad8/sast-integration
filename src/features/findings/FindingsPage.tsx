'use client';

import { Button, Flex, theme } from 'antd';

import { ErrorState } from '@/commons/components/ErrorState';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { errorMessage } from '@/lib/api/errors';
import { FindingsTable, BulkAssignModal, FindingDetailDrawer } from '@/features/findings';
import { useFindingsPageState } from './useFindingsPageState';

/**
 * Findings management page — browse, filter, review, and triage security findings.
 *
 * Routes: `/{workspaceSlug}/findings`
 */
export function FindingsPage() {
  const { token } = theme.useToken();
  const {
    findingsQuery,
    findings,
    totalCount,
    members,
    MEMBER_OPTIONS,
    PROJECT_OPTIONS,
    REPOSITORY_OPTIONS,
    tableParams,
    drawerOpen,
    setDrawerOpen,
    selected,
    setSelected,
    bulkAssignOpen,
    setBulkAssignOpen,
    bulkAssignee,
    setBulkAssignee,
    handleRunAiVerification,
    handleReview,
    handleDismiss,
    handleResolve,
    handleReverify,
    handleOpenFullPage,
    handleAssign,
    handleBulkDismiss,
    handleBulkResolve,
    handleBulkReverify,
    handleBulkAssign,
    handleBulkAssignConfirm,
    handleTableChange,
    handleTableSearch,
    handleTableFilter,
    handleSortChange,
  } = useFindingsPageState();

  if (findingsQuery.isLoading) {
    return <LoadingState text="Loading findings..." />;
  }

  if (findingsQuery.isError) {
    return <ErrorState title="Failed to load findings" description={errorMessage(findingsQuery.error)} onRetry={() => findingsQuery.refetch()} />;
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Findings"
        description="Filter, triage, accept AI verdicts, override decisions, or re-verify with another model."
        actions={
          <PermissionGate permission={PERMISSION.FINDING_OVERRIDE_AI}>
            <Button type="primary" onClick={handleRunAiVerification}>
              <FaIcon icon="fa-brain" /> Run AI verification
            </Button>
          </PermissionGate>
        }
      />

      <FindingsTable
        rows={findings}
        isLoading={findingsQuery.isFetching}
        total={totalCount}
        page={tableParams.page}
        pageSize={tableParams.perPage}
        search={tableParams.search}
        filterValues={{
          ...(tableParams.severity ? { severity: tableParams.severity } : {}),
          ...(tableParams.verdict ? { verdict: tableParams.verdict } : {}),
          ...(tableParams.status ? { status: tableParams.status } : {}),
          ...(tableParams.projectId ? { project: tableParams.projectId } : {}),
          ...(tableParams.repositoryId ? { repository: tableParams.repositoryId } : {}),
        }}
        onPageChange={handleTableChange}
        onSearchChange={handleTableSearch}
        onFilterChange={handleTableFilter}
        onReview={handleReview}
        onDismiss={handleBulkDismiss}
        onResolve={handleBulkResolve}
        onReverify={handleBulkReverify}
        onAssign={handleBulkAssign}
        onAssignRow={handleReview}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email }))}
        projectOptions={PROJECT_OPTIONS}
        repositoryOptions={REPOSITORY_OPTIONS}
        sort={tableParams.sort && tableParams.order ? { key: tableParams.sort, dir: tableParams.order.toLowerCase() as 'asc' | 'desc' } : null}
        onSortChange={handleSortChange}
      />

      <FindingDetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        finding={selected}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email, initials: m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(), color: token.colorTextSecondary }))}
        onDismiss={handleDismiss}
        onResolve={handleResolve}
        onReverify={handleReverify}
        onOpenFullPage={handleOpenFullPage}
        onAssign={handleAssign}
      />

      <BulkAssignModal
        open={bulkAssignOpen}
        bulkAssignee={bulkAssignee}
        memberOptions={MEMBER_OPTIONS}
        onOk={handleBulkAssignConfirm}
        onCancel={() => setBulkAssignOpen(false)}
        onChange={(value) => setBulkAssignee(value)}
      />
    </Flex>
  );
}
