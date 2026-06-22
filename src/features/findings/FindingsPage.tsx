'use client';

import { Button, Flex, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import dynamic from 'next/dynamic';
import { FindingsTable } from '@/features/findings';

const FindingDetailDrawer = dynamic(
  () => import('@/features/findings/FindingDetailDrawer').then((m) => m.FindingDetailDrawer),
  { ssr: false },
);
import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { useFindingsPageState } from './useFindingsPageState';
import { BulkAssignModal } from './BulkAssignModal';
import { errorMessage } from '@/lib/api/errors';

/**
 * Findings management page — browse, filter, review, and triage security findings.
 *
 * Routes: `/{workspaceSlug}/findings`
 */
export default function FindingsPage() {
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
    handleOverrideVerdict,
    handleReverify,
    handleOpenFullPage,
    handleAssign,
    handleBulkDismiss,
    handleBulkReverify,
    handleBulkAssign,
    handleBulkAssignConfirm,
    handleTableChange,
    handleTableSearch,
    handleTableFilter,
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
          <PermissionGate permission={PERMISSION.SCAN_RUN}>
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
        onReverify={handleBulkReverify}
        onAssign={handleBulkAssign}
        onAssignRow={handleReview}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email }))}
        projectOptions={PROJECT_OPTIONS}
        repositoryOptions={REPOSITORY_OPTIONS}
      />

      <FindingDetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        finding={selected}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email, initials: m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(), color: token.colorTextSecondary }))}
        onDismiss={handleDismiss}
        onOverrideVerdict={handleOverrideVerdict}
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
