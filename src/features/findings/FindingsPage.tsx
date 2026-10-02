'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Modal, Select, Flex, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FindingsTable, FindingDetailDrawer } from '@/features/findings';
import { useSessionQuery } from '@/modules/auth/queries';
import { useFindingsQuery, useMembersQuery, useUpdateFindingMutation, useRunAiVerificationMutation } from '@/modules/finding';
import { API_BASE } from '@/commons/constants';
import { useAuthHeaders } from '@/modules/auth/hooks';
import { parseApiResponse } from '@/lib/api/errors';
import type { Finding } from '@/commons/types';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

export function FindingsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const { token } = theme.useToken();
  const workspaceId = session.data?.workspace?.id;
  const workspaceSlug = session.data?.workspace?.slug;

  const findingsQuery = useFindingsQuery();
  const membersQuery = useMembersQuery();
  const updateStatusMutation = useUpdateFindingMutation();
  const verifyMutation = useRunAiVerificationMutation();
  const headers = useAuthHeaders();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignIds, setBulkAssignIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState<string | undefined>(undefined);

  const findings = useMemo(() => findingsQuery.data ?? [], [findingsQuery.data]);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const MEMBER_OPTIONS = useMemo(() => members.map((m) => ({ value: m.userId, label: `${m.name} (${m.email})` })), [members]);

  const assignMutation = useMutation({
    mutationFn: async ({ id, assignedTo }: { id: string; assignedTo: string | null }) => {
      const res = await fetch(`${API_BASE}/findings/${id}/assign`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      });
      return parseApiResponse(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
    },
  });

  const handleReview = useCallback((row: Finding) => {
    setSelected(row);
    setDrawerOpen(true);
  }, []);

  const handleAcceptVerdict = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, payload: { status: 'accepted' } }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, status: 'accepted' as const } : prev);
        message.success('AI verdict accepted');
      },
    });
  }, [updateStatusMutation, message]);

  const handleOverrideVerdict = useCallback((id: string, verdict: 'TP' | 'FP') => {
    const status = verdict === 'FP' ? 'false_positive' : 'open';
    updateStatusMutation.mutate({ id, payload: { status, verdict } }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, verdict, confidence: 85 } : prev);
        message.success(`Verdict overridden to ${verdict}`);
      },
    });
  }, [updateStatusMutation, message]);

  const handleReverify = useCallback((id: string, model: string) => {
    verifyMutation.mutate([id], {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, verdict: 'Pending' as const, model, confidence: null } : prev);
        message.info(`Re-verification queued with ${model}`);
      },
    });
  }, [verifyMutation, message]);

  const handleOpenFullPage = useCallback((id: string) => {
    setDrawerOpen(false);
    if (workspaceSlug) {
      router.push(`/${workspaceSlug}/findings/${id}`);
    }
  }, [router, workspaceSlug]);

  const handleAssign = useCallback((id: string, assignee: string | null) => {
    assignMutation.mutate({ id, assignedTo: assignee }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, assignee } : prev);
        message.success(assignee ? 'Finding assigned' : 'Finding unassigned');
      },
    });
  }, [assignMutation, message]);

  const handleBulkAccept = useCallback((ids: string[]) => {
    let completed = 0;
    ids.forEach((id) => {
      updateStatusMutation.mutate({ id, payload: { status: 'accepted' } }, {
        onSuccess: () => {
          completed++;
          if (completed === ids.length) {
            message.success(`${ids.length} finding(s) accepted`);
          }
        },
      });
    });
  }, [updateStatusMutation, message]);

  const handleBulkReverify = useCallback((ids: string[]) => {
    let completed = 0;
    ids.forEach((id) => {
      verifyMutation.mutate([id], {
        onSuccess: () => {
          completed++;
          if (completed === ids.length) {
            message.info(`${ids.length} finding(s) queued for re-verification`);
          }
        },
      });
    });
  }, [verifyMutation, message]);

  const handleBulkAssign = useCallback((ids: string[]) => {
    setBulkAssignIds(ids);
    setBulkAssignee(undefined);
    setBulkAssignOpen(true);
  }, []);

  const handleBulkAssignConfirm = useCallback(() => {
    if (!bulkAssignee) return;
    let completed = 0;
    bulkAssignIds.forEach((id) => {
      assignMutation.mutate({ id, assignedTo: bulkAssignee }, {
        onSuccess: () => {
          completed++;
          if (completed === bulkAssignIds.length) {
            const member = members.find((m) => m.userId === bulkAssignee);
            message.success(`${bulkAssignIds.length} finding(s) assigned to ${member?.name ?? bulkAssignee}`);
          }
        },
      });
    });
    setBulkAssignOpen(false);
  }, [bulkAssignIds, bulkAssignee, assignMutation, members, message]);

  const handleRunAiVerification = useCallback(() => {
    const pending = findings.filter((f) => f.verdict === 'Pending');
    if (!pending.length) {
      message.info('No pending findings to verify');
      return;
    }
    let completed = 0;
    pending.forEach((f) => {
      verifyMutation.mutate([f.id], {
        onSuccess: () => {
          completed++;
          if (completed === pending.length) {
            message.success(`AI verification completed for ${pending.length} finding(s)`);
          }
        },
      });
    });
  }, [findings, verifyMutation, message]);

  if (findingsQuery.isLoading) {
    return <LoadingState text="Loading findings..." />;
  }

  if (findingsQuery.isError) {
    return <ErrorState title="Failed to load findings" description={String(findingsQuery.error)} />;
  }

  return (
    <Flex vertical gap={token.marginXL}>
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
        isLoading={findingsQuery.isLoading}
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
        members={members}
        onAcceptVerdict={handleAcceptVerdict}
        onOverrideVerdict={handleOverrideVerdict}
        onReverify={handleReverify}
        onOpenFullPage={handleOpenFullPage}
        onAssign={handleAssign}
        onAddComment={() => {}}
      />

      <Modal
        title="Assign to reviewer"
        open={bulkAssignOpen}
        onOk={handleBulkAssignConfirm}
        onCancel={() => setBulkAssignOpen(false)}
        okText="Assign"
        okButtonProps={{ disabled: !bulkAssignee }}
      >
        <Flex vertical gap={token.marginSM} style={{ padding: `${token.paddingSM}px 0` }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Select a reviewer"
            value={bulkAssignee}
            onChange={setBulkAssignee}
            options={MEMBER_OPTIONS}
            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            showSearch
          />
        </Flex>
      </Modal>
    </Flex>
  );
}
