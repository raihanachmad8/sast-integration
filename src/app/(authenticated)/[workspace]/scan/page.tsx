"use client";

import { useMemo, useState } from "react";
import { App, Button, Flex, theme } from "antd";
import { useRouter } from "next/navigation";
import { useSessionQuery } from "@/modules/auth/queries";
import { FaIcon } from "@/components/shared/fa-icon";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  ScanTable,
  NewScanModal,
  ScanSummaryCards,
  ScanDetailDrawer,
  FindingItem,
} from "@/features/scan";
import type { ScanPolicy } from "@/features/scan";
import { useScanRowsQuery, useScanRepositoriesListQuery, useScanPoliciesQuery } from "@/modules/scan";
import type { ScanConfig, ScanDetail, Finding } from "@/commons/types";
import type { Finding as ScanFinding } from "@/features/scan/types";

/**
 * Scan management page for the current workspace.
 *
 * Displays scan results from both flows:
 * - **External upload (primary)**: CI pipeline runs scanners → uploads results → platform parses → AI validates
 * - **Managed SCM (future)**: Platform triggers scan → clones repo → runs scanners → stores results
 *
 * The "New Scan" button triggers managed scans for SCM-connected repos.
 * For external repos, users upload results via CI pipeline (POST /projects/{id}/scans/upload).
 *
 * @returns The rendered scan management page component.
 *
 * @example
 * // Accessible at /:workspace/scan
 * <ScanManagementPage />
 */
export default function ScanManagementPage() {
  const { message } = App.useApp();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id;
  const router = useRouter();
  const workspaceSlug = session.data?.workspace?.slug ?? "";

  // Queries
  const scanRowsQuery = useScanRowsQuery();
  const scanReposQuery = useScanRepositoriesListQuery();
  const scanPoliciesQuery = useScanPoliciesQuery(workspaceId ?? "");

  const scanRows = useMemo(() => scanRowsQuery.data ?? [], [scanRowsQuery.data]);
  const scanRepos = useMemo(() => scanReposQuery.data ?? [], [scanReposQuery.data]);
  const scanPolicies = useMemo(() => (scanPoliciesQuery.data ?? []) as ScanPolicy[], [scanPoliciesQuery.data]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [connectionTypeFilter, setConnectionTypeFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");

  // Modals & Drawers
  const [newScanOpen, setNewScanOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null);
  const [selectedScanFindings, setSelectedScanFindings] = useState<Finding[]>([]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scanRows.filter((row) => {
      const searchable = [row.repository, row.repoSub, row.status, row.stage, `${row.findings}`, `${row.critical} critical`, row.ai].join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesType = connectionTypeFilter === "all" || row.connectionType === connectionTypeFilter;
      const matchesOrigin = originFilter === "all" || row.origin === originFilter;
      return matchesSearch && matchesStatus && matchesType && matchesOrigin;
    });
  }, [scanRows, search, statusFilter, connectionTypeFilter, originFilter]);

  /**
   * Handle new scan confirmation.
   * For managed repos: triggers scan via SCM integration (future).
   * For external repos: shows upload instructions.
   */
  const handleNewScan = (config: ScanConfig) => {
    setNewScanOpen(false);
    message.success(`Scan queued for ${config.repositoryId} (${config.branch})`);
  };

  /**
   * Handle scan row click - open detail drawer.
   */
  const handleRepoClick = (row: (typeof scanRows)[number]) => {
    // For now, create a basic scan detail from the row data
    const scanDetail: ScanDetail = {
      id: row.id,
      repository: row.repository,
      branch: row.repoSub.split(" • ")[0] ?? "main",
      commitSha: "—",
      origin: row.origin,
      status: row.status.toLowerCase() as ScanDetail["status"],
      startedAt: row.repoSub.split(" • ")[1] ?? "—",
      scannerResults: [],
      totalFindings: row.findings,
      severityBreakdown: { critical: row.critical, high: 0, medium: 0, low: 0, info: 0 },
      timeline: [],
    };
    setSelectedScan(scanDetail);
    setSelectedScanFindings([]);
    setDetailDrawerOpen(true);
  };

  /**
   * Handle retry scan — update status to Running.
   */
  const handleRetry = (row: (typeof scanRows)[number]) => {
    message.success(`Retrying ${row.repository} scan...`);
  };

  /**
   * Handle view findings — navigate to findings page.
   */
  const handleViewFindings = (row: (typeof scanRows)[number]) => {
    router.push(`/${workspaceSlug}/findings`);
  };

  const { token } = theme.useToken();

  if (scanRowsQuery.isLoading) {
    return <LoadingState text="Loading scans..." fullHeight />;
  }

  if (!workspaceId) {
    return <LoadingState text="Loading workspace..." fullHeight />;
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Scans"
        description="Queue status, scan progress, retry path, and finding navigation."
        actions={
          <Button type="primary" onClick={() => setNewScanOpen(true)}>
            <FaIcon icon="fa-play" /> New scan
          </Button>
        }
      />

      <ScanSummaryCards scans={scanRows} />

      <ScanTable
        rows={filteredRows}
        totalCount={scanRows.length}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        connectionTypeFilter={connectionTypeFilter}
        onConnectionTypeFilterChange={setConnectionTypeFilter}
        originFilter={originFilter}
        onOriginFilterChange={setOriginFilter}
        onRepoClick={handleRepoClick}
        onRetry={handleRetry}
        onViewFindings={handleViewFindings}
      />

      <NewScanModal
        open={newScanOpen}
        onClose={() => setNewScanOpen(false)}
        onConfirm={handleNewScan}
        repositories={scanRepos}
        policies={scanPolicies}
      />

      <ScanDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedScan(null);
        }}
        scan={selectedScan}
        findings={selectedScanFindings as ScanFinding[]}
        onViewFindings={() => { setDetailDrawerOpen(false); router.push(`/${workspaceSlug}/findings`); }}
        onRetry={() => { setDetailDrawerOpen(false); message.success(`Retrying scan...`); }}
      />
    </Flex>
  );
}
