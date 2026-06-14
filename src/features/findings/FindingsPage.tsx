'use client';

import { Button, Flex, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FindingsTable, FindingDetailDrawer } from '@/features/findings';
import { PermissionGate } from '@/components/shared/PermissionGate';
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
    handleAcceptVerdict,
    handleOverrideVerdict,
    handleReverify,
    handleOpenFullPage,
    handleAssign,
    handleBulkAccept,
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
        filterValues={tableParams as unknown as Record<string, string>}
        onPageChange={handleTableChange}
        onSearchChange={handleTableSearch}
        onFilterChange={handleTableFilter}
        onReview={handleReview}
        onAcceptVerdict={handleBulkAccept}
        onReverify={handleBulkReverify}
        onAssign={handleBulkAssign}
        onAssignRow={handleReview}
      />

      <FindingDetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        finding={selected}
        members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email, initials: m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(), color: token.colorTextSecondary }))}
        onAcceptVerdict={handleAcceptVerdict}
        onOverrideVerdict={handleOverrideVerdict}
        onReverify={handleReverify}
        onOpenFullPage={handleOpenFullPage}
        onAssign={handleAssign}
        onAddComment={() => {}}
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
