'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Modal, Select, Typography, Row, Col, Avatar, Input, Flex, Badge, theme } from 'antd';
import { SendOutlined } from '@ant-design/icons';

import { CodeBlock } from '@/components/shared/CodeBlock';
import { AiAnalysisCard } from '@/components/shared/AiAnalysisCard';
import { MemberSelect } from '@/components/shared/MemberSelect';
import { StatusTag } from '@/components/shared/StatusTag';
import { StatusPill } from '@/components/shared/StatusPill';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { useSessionData } from '@/modules/auth/queries';
import { useFindingQuery, useVerifyFindingMutation, useUpdateFindingMutation } from '@/modules/findings';
import { useMembersQuery } from '@/modules/members';
import { errorMessage } from '@/lib/api/errors';
import type { Finding } from '@/commons/types';
import type { Member } from '@/commons/types';

const { Title, Text } = Typography;

export default function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const _router = useRouter();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug;

  const findingQuery = useFindingQuery(id);
  const membersQuery = useMembersQuery(session.data?.workspace?.id ?? '');
  const verifyMutation = useVerifyFindingMutation();
  const updateFindingMutation = useUpdateFindingMutation();

  const finding = (findingQuery.data ?? null) as unknown as {
    id: string; rule: string; scanner: string; severity: string; status: string;
    filePath: string | null; lineNumber: number | null; codeSnippet: string | null;
    cwe: string; repo: string; assignee: string | null;
    verdict: string; model: string; confidence: number | null;
    explanation: string | null; dataFlow: string | null; taintSource: string | null;
    fixSuggestion: string | null; message: string | null; description: string | null;
    file: string; cweId: string | null; lineNumberOrig: number;
  } | null;
  const members = (membersQuery.data ?? []) as Member[];

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState<'TP' | 'FP'>('TP');
  const [assignee, setAssignee] = useState<string | null>(finding?.assignee ?? null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Array<{ id: string; author: string; avatar: string; time: string; text: string }>>([]);

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

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    setComments((prev) => [...prev, { id: String(Date.now()), author: 'You', avatar: 'RO', time: 'just now', text: trimmed }]);
    setCommentText('');
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
                  <CodeBlock lines={[]} suggestionCode={finding.codeSnippet} />
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
                  remediation={finding.fixSuggestion ?? 'Remediation pending.'}
                  knowledgeUses={0}
                />
              </Card>
            )}

            {/* Comments */}
            <Card styles={{ body: { padding: token.paddingXL } }}>
              <Flex vertical gap={token.marginMD}>
                <Flex align="center" gap={token.marginXS}>
                  <Text style={sectionTitleStyle}>Comments</Text>
                  <Badge count={comments.length} style={{ backgroundColor: token.colorPrimary }} />
                </Flex>
                <Flex vertical gap={token.marginSM}>
                  {comments.map((c) => (
                    <Flex key={c.id} gap={token.marginSM} align="flex-start">
                      <Avatar size={32} style={{ background: token.colorTextSecondary, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>{c.avatar}</Avatar>
                      <Flex vertical flex={1} gap={0} style={{ minWidth: 0 }}>
                        <Flex align="baseline" gap={token.marginXS}>
                          <Text strong>{c.author}</Text>
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{c.time}</Text>
                        </Flex>
                        <Text style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.text}</Text>
                      </Flex>
                    </Flex>
                  ))}
                </Flex>
                <Flex gap={token.marginXS} align="flex-end">
                  <Avatar size={32} style={{ background: token.colorTextSecondary, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>RO</Avatar>
                  <Flex flex={1} gap={token.marginXS} align="flex-end">
                    <Input.TextArea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment or review note…" autoSize={{ minRows: 1, maxRows: 4 }} style={{ flex: 1 }} />
                    <Button type="primary" icon={<SendOutlined />} disabled={!commentText.trim()} onClick={handleSendComment} style={{ width: 36, height: 36, minWidth: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: token.borderRadius }} />
                  </Flex>
                </Flex>
              </Flex>
            </Card>
          </Flex>
        </Col>

        {/* Right: Sidebar */}
        <Col xs={24} sm={24} md={24} lg={8} xl={7}>
          <Row gutter={[token.marginMD, token.marginMD]}>
            {/* Human decision */}
            <Col xs={24} sm={12} lg={24}>
              <Card styles={{ body: { padding: token.paddingXL } }} style={{ height: '100%' }}>
                <Flex vertical gap={token.marginSM}>
                  <Text style={sectionTitleStyle}>Human decision</Text>
                  <Button type="primary" block onClick={() => {
                    updateFindingMutation.mutate(
                      { id: finding.id, payload: { verdict: finding.verdict, status: 'verified' } },
                      {
                        onSuccess: () => { message.success('AI verdict accepted'); findingQuery.refetch(); },
                        onError: () => message.error('Failed to accept verdict'),
                      }
                    );
                  }} loading={updateFindingMutation.isPending}>Accept AI verdict</Button>
                  <Button block onClick={() => setOverrideOpen(true)}>Override verdict</Button>
                  <Button
                    block
                    onClick={() => {
                      verifyMutation.mutate(finding.id, {
                        onSuccess: () => {
                          message.success('Re-verification completed');
                          findingQuery.refetch();
                        },
                        onError: () => message.error('Re-verification failed'),
                      });
                    }}
                    loading={verifyMutation.isPending}
                  >
                    Re-verify
                  </Button>
                </Flex>
              </Card>
            </Col>

            {/* Assignee */}
            <Col xs={24} sm={12} lg={24}>
              <Card styles={{ body: { padding: token.paddingXL } }} style={{ height: '100%' }}>
                <Flex vertical gap={token.marginSM}>
                  <Text style={sectionTitleStyle}>Assignee</Text>
                  <MemberSelect members={members.map((m: Member) => ({ name: m.name, initials: m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(), color: token.colorPrimary }))} value={assignee} onChange={(name) => { setAssignee(name); if (name) message.success(`Assigned to ${name}`); }} placeholder="Assign to reviewer" />
                </Flex>
              </Card>
            </Col>

            {/* Details */}
            <Col span={24}>
              <Card styles={{ body: { padding: token.paddingXL } }}>
                <Flex vertical gap={token.marginMD}>
                  <Text style={sectionTitleStyle}>Details</Text>
                  <Flex vertical gap={token.marginSM}>
                    <Flex justify="space-between" align="center"><Text type="secondary">Scanner</Text><StatusTag type="scanner" value={finding.scanner} /></Flex>
                    <Flex justify="space-between" align="center"><Text type="secondary">CWE</Text><Text strong style={{ fontSize: token.fontSizeSM }}>{finding.cwe}</Text></Flex>
                    <Flex justify="space-between" align="center"><Text type="secondary">Repository</Text><Text strong style={{ fontSize: token.fontSizeSM }}>{finding.repo}</Text></Flex>
                    <Flex justify="space-between" align="center"><Text type="secondary">Status</Text><StatusTag type="findingStatus" value={finding.status} /></Flex>
                  </Flex>
                </Flex>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Override Modal */}
      <Modal title="Override Verdict" open={overrideOpen} onOk={() => {
        updateFindingMutation.mutate(
          { id: finding.id, payload: { verdict: overrideVerdict === 'TP' ? 'true_positive' : 'false_positive' } },
          {
            onSuccess: () => { setOverrideOpen(false); message.success(`Verdict overridden to "${overrideVerdict}"`); findingQuery.refetch(); },
            onError: () => message.error('Failed to override verdict'),
          }
        );
      }} onCancel={() => setOverrideOpen(false)} okText="Override" okButtonProps={{ danger: overrideVerdict === 'FP', loading: updateFindingMutation.isPending }}>
        <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginMD }}>
          <Text>Override the AI verdict for <strong>{finding.rule}</strong>?</Text>
          <Select value={overrideVerdict} onChange={setOverrideVerdict} style={{ width: '100%' }} options={[
            { value: 'TP', label: 'True Positive (TP)' },
            { value: 'FP', label: 'False Positive (FP)' },
          ]} />
        </Flex>
      </Modal>
    </Flex>
  );
}
