'use client';

import { use, useState } from 'react';

import { App, Card, Typography, Row, Col, Flex, theme } from 'antd';

import { AiAnalysisCard } from '@/commons/components/AiAnalysisCard';
import { CodeBlock } from '@/commons/components/CodeBlock';
import { MemberSelect } from '@/commons/components/MemberSelect';
import { StatusTag } from '@/commons/components/StatusTag';
import { StatusPill } from '@/commons/components/StatusPill';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import { PageHeader } from '@/commons/components/PageHeader';
import { useSessionData } from '@/modules/auth/queries';
import { useFindingQuery, useVerifyFindingMutation, useUpdateFindingMutation } from '@/modules/findings';
import { useMembersQuery } from '@/modules/members';
import { errorMessage } from '@/lib/api/errors';
import { ScannerOutputSection } from '@/features/findings/ScannerOutputSection';
import { FindingActions } from '@/features/findings/FindingActions';
import type { Finding } from '@/commons/types';
import type { Member } from '@/commons/types';

const { Title, Text } = Typography;

export default function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug;

  const findingQuery = useFindingQuery(id);
  const membersQuery = useMembersQuery(session.data?.workspace?.id ?? '');
  const verifyMutation = useVerifyFindingMutation();
  const updateFindingMutation = useUpdateFindingMutation();

  const rawFinding = (findingQuery.data ?? null) as Finding | null;

  // Normalize field names: API returns `cweId`, `assignedTo`, `repositoryName`, `filePath`
  // but Finding type expects `cwe`, `assignee`, `repo`, `file`
  const finding: Finding | null = rawFinding ? {
    ...rawFinding,
    cwe: rawFinding.cwe || (rawFinding as unknown as Record<string, unknown>).cweId as string || '',
    assignee: rawFinding.assignee ?? (rawFinding as unknown as Record<string, unknown>).assignedTo as string | null ?? null,
    repo: rawFinding.repo || (rawFinding as unknown as Record<string, unknown>).repositoryName as string || '',
    file: rawFinding.file || rawFinding.filePath || '',
  } : null;

  const members = (membersQuery.data?.data ?? []) as Member[];

  const [assignee, setAssignee] = useState<string | null>(finding?.assignee ?? null);

  if (findingQuery.isLoading) return <LoadingState text="Loading finding..." />;
  if (findingQuery.isError) return <ErrorState title="Error" description={errorMessage(findingQuery.error)} />;
  if (!finding) return <ErrorState title="Not found" description="The requested finding could not be found." />;

  const sectionTitleStyle = {
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };

  const handleResolve = (findingId: string) => {
    updateFindingMutation.mutate(
      { id: findingId, payload: { status: 'resolved' } },
      {
        onSuccess: () => { message.success('Finding resolved'); findingQuery.refetch(); },
        onError: () => message.error('Failed to resolve finding'),
      }
    );
  };

  const handleReverify = (findingId: string, modelId: string) => {
    verifyMutation.mutate({ findingId, modelId }, {
      onSuccess: () => {
        message.success('Re-verification completed');
        findingQuery.refetch();
      },
      onError: () => message.error('Re-verification failed'),
    });
  };

  const handleDismiss = (findingId: string) => {
    updateFindingMutation.mutate(
      { id: findingId, payload: { status: 'dismissed' } },
      {
        onSuccess: () => { message.success('Finding dismissed'); findingQuery.refetch(); },
        onError: () => message.error('Failed to dismiss finding'),
      }
    );
  };

  const handleAssign = (findingId: string, assigneeId: string | null) => {
    if (!assigneeId) return;
    updateFindingMutation.mutate(
      { id: findingId, payload: { assignedTo: assigneeId } },
      {
        onSuccess: () => {
          const member = members.find((m: Member) => m.userId === assigneeId);
          message.success(`Assigned to ${member?.name ?? assigneeId}`);
        },
        onError: () => message.error('Failed to assign'),
      }
    );
  };

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Finding detail"
        description="Route based detail view with AI evidence, code context, and decision audit."
        breadcrumbs={[
          { label: 'Dashboard', href: workspaceSlug ? `/${workspaceSlug}` : '/' },
          { label: 'Findings', href: workspaceSlug ? `/${workspaceSlug}/findings` : '/findings' },
          { label: finding.rule },
        ]}
      />

      <Row gutter={[token.marginXL, token.marginXL]} align="top">
        {/* Left: Main content */}
        <Col xs={24} sm={24} md={24} lg={16} xl={17}>
          <Flex vertical gap={token.marginXL}>

            {/* Header Card */}
            <Card styles={{ body: { padding: token.paddingXL } }}>
              <Flex vertical gap={token.marginMD}>
                <Flex gap={token.marginXS} wrap="wrap">
                  <StatusTag type="verdict" value={finding.verdict} />
                  {finding.model && (
                    <StatusPill variant="slate">{finding.model}</StatusPill>
                  )}
                  <StatusTag type="severity" value={finding.severity} />
                  <StatusTag type="findingStatus" value={finding.status} />
                </Flex>
                <Title level={2} style={{ margin: 0 }}>{finding.rule}</Title>
                <Flex gap={token.marginXS} align="center">
                  <StatusTag type="scanner" value={finding.scanner} />
                  {finding.filePath && (
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      {finding.filePath}{finding.lineNumber != null ? `:${finding.lineNumber}` : ''}
                    </Text>
                  )}
                </Flex>
              </Flex>
            </Card>

            {/* Scanner output */}
            <Card styles={{ body: { padding: token.paddingXL } }}>
              <ScannerOutputSection finding={finding as unknown as Finding} />
            </Card>

            {/* Source Code — only show if we have a code snippet */}
            {finding.codeSnippet && (
              <Card styles={{ body: { padding: token.paddingXL } }}>
                <Flex vertical gap={token.marginSM}>
                  <Flex justify="space-between" align="center">
                    <Text style={sectionTitleStyle}>Source code</Text>
                    {finding.filePath && (
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        {finding.filePath}{finding.lineNumber != null ? `:${finding.lineNumber}` : ''}
                      </Text>
                    )}
                  </Flex>
                  <CodeBlock
                    lines={(() => {
                      const allLines = finding.codeSnippet!.split('\n');
                      const targetLine = finding.lineNumber ?? 1;
                      return allLines.map((line, i) => ({
                        num: targetLine + i,
                        code: line,
                        highlight: i === 0,
                      }));
                    })()}
                  />
                </Flex>
              </Card>
            )}

            {/* AI Analysis — only show if AI verification has run */}
            {finding.verdict && finding.verdict !== 'Pending' && (
              <Card styles={{ body: { padding: token.paddingXL } }}>
                <AiAnalysisCard
                  model={finding.model}
                  verdict={finding.verdict}
                  reasoning={finding.explanation ?? 'Analysis pending.'}
                  cwe={finding.cwe}
                  matchDetail={finding.matchDetail}
                  likelyCwe={finding.likelyCwe}
                  dataFlow={finding.dataFlow}
                  taintSource={finding.taintSource}
                  remediation={finding.fixSuggestion ?? 'Remediation pending.'}
                  knowledgeUses={0}
                />
              </Card>
            )}
          </Flex>
        </Col>

        {/* Right: Sidebar */}
        <Col xs={24} sm={24} md={24} lg={8} xl={7}>
          <Row gutter={[token.marginMD, token.marginMD]}>
            {/* Actions */}
            <Col span={24}>
              <Card styles={{ body: { padding: token.paddingXL } }}>
                <FindingActions
                  finding={finding as unknown as Finding}
                  onResolve={handleResolve}
                  onDismiss={handleDismiss}
                  onReverify={handleReverify}
                />
              </Card>
            </Col>

            {/* Assignee */}
            <Col span={24}>
              <Card styles={{ body: { padding: token.paddingXL } }} style={{ height: '100%' }}>
                <Flex vertical gap={token.marginSM}>
                  <Text style={sectionTitleStyle}>Assignee</Text>
                  <MemberSelect
                    members={members.map((m: Member) => ({
                      userId: m.userId,
                      name: m.name,
                      initials: m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
                      color: token.colorPrimary,
                    }))}
                    value={assignee}
                    onChange={(userId) => {
                      setAssignee(userId);
                      handleAssign(finding.id, userId);
                    }}
                    placeholder="Assign to reviewer"
                  />
                </Flex>
              </Card>
            </Col>

            {/* Details */}
            <Col span={24}>
              <Card styles={{ body: { padding: token.paddingXL } }}>
                <Flex vertical gap={token.marginMD}>
                  <Text style={sectionTitleStyle}>Details</Text>
                  <Flex vertical gap={token.marginSM}>
                    <Flex justify="space-between" align="center">
                      <Text type="secondary">Scanner</Text>
                      <StatusTag type="scanner" value={finding.scanner} />
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text type="secondary">CWE</Text>
                      <Text strong style={{ fontSize: token.fontSizeSM }}>{finding.cwe}</Text>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text type="secondary">Repository</Text>
                      <Text strong style={{ fontSize: token.fontSizeSM }}>{finding.repo}</Text>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text type="secondary">Status</Text>
                      <StatusTag type="findingStatus" value={finding.status} />
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Flex>
  );
}
