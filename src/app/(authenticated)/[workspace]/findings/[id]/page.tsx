'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Modal, Select, Typography, Row, Col, Tag, Avatar, Input, Flex, Badge, theme } from 'antd';
import { SendOutlined } from '@ant-design/icons';

import { CodeBlock } from '@/components/shared/CodeBlock';
import { AiAnalysisCard } from '@/components/shared/AiAnalysisCard';
import { MemberSelect } from '@/components/shared/MemberSelect';
import { StatusTag } from '@/components/shared/StatusTag';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader';
import { useSessionQuery } from '@/modules/auth/queries';
import { useFindingQuery, useMembersQuery, useModelsQuery } from '@/modules/finding';
import { MOCK_COMMENTS, getFindingScannerOutput, MOCK_SOURCE_LINES, MOCK_AI_SUGGESTION_CODE } from '@/modules/finding';

const { Title, Text } = Typography;

export default function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const _router = useRouter();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaceSlug = session.data?.workspace?.slug;

  const findingQuery = useFindingQuery(id);
  const membersQuery = useMembersQuery();
  const modelsQuery = useModelsQuery();

  const finding = findingQuery.data;
  const members = membersQuery.data ?? [];
  const _models = modelsQuery.data ?? [];

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState<'TP' | 'FP'>('TP');
  const [assignee, setAssignee] = useState<string | null>(finding?.assignee ?? null);
  const [commentText, setCommentText] = useState('');

  if (findingQuery.isLoading) return <LoadingState text="Loading finding..." />;
  if (findingQuery.isError) return <ErrorState title="Error" description={String(findingQuery.error)} />;
  if (!finding) return <ErrorState title="Not found" description="The requested finding could not be found." />;

  const sectionTitleStyle = {
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
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
                  <Tag style={{ color: token.colorTextSecondary, background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusSM, margin: 0 }}>
                    {finding.model}
                  </Tag>
                  <StatusTag type="severity" value={finding.severity} />
                  <StatusTag type="findingStatus" value={finding.status} />
                </Flex>
                <Title level={2} style={{ margin: 0 }}>{finding.rule}</Title>
                <Flex gap={token.marginXS} align="center">
                  <StatusTag type="scanner" value={finding.scanner} />
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{finding.file}:{finding.lineNumber ?? 88}</Text>
                </Flex>
              </Flex>
            </Card>

            {/* Scanner Output */}
            <Card styles={{ body: { padding: token.paddingXL } }}>
              <Flex vertical gap={token.marginSM}>
                <Text style={sectionTitleStyle}>Scanner output</Text>
                <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
                  {getFindingScannerOutput(finding).map((item) => (
                    <Flex key={item.label} gap={token.marginMD} align="flex-start" style={{ padding: `${token.paddingSM}px ${token.paddingLG}px`, borderLeft: `4px solid ${token.colorPrimary}`, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text strong style={{ minWidth: 90, fontSize: token.fontSizeSM, color: token.colorPrimary, flexShrink: 0 }}>{item.label}</Text>
                      <Text style={{ lineHeight: 1.5 }}>{item.value}</Text>
                    </Flex>
                  ))}
                </div>
              </Flex>
            </Card>

            {/* Source Code */}
            <Card styles={{ body: { padding: token.paddingXL } }}>
              <Flex vertical gap={token.marginSM}>
                <Flex justify="space-between" align="center">
                  <Text style={sectionTitleStyle}>Source code</Text>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{finding.file}:{finding.lineNumber ?? 88}</Text>
                </Flex>
                <CodeBlock lines={MOCK_SOURCE_LINES} suggestionCode={MOCK_AI_SUGGESTION_CODE} />
              </Flex>
            </Card>

            {/* AI Analysis */}
            <Card styles={{ body: { padding: token.paddingXL } }}>
              <AiAnalysisCard
                model={finding.model}
                verdict={finding.verdict}
                reasoning="The user-supplied parameter req.query.id is concatenated directly into a SQL string without sanitization or parameterization. The data flow from HTTP input to db.execute() is unguarded. This is a confirmed True Positive."
                cwe={finding.cwe}
                remediation="Replace string concatenation with parameterized queries: db.execute(&apos;SELECT * FROM orders WHERE id = ?&apos;, [req.query.id]). Validate and sanitize all user inputs before use in queries."
                knowledgeUses={142}
              />
            </Card>

            {/* Comments */}
            <Card styles={{ body: { padding: token.paddingXL } }}>
              <Flex vertical gap={token.marginMD}>
                <Flex align="center" gap={token.marginXS}>
                  <Text style={sectionTitleStyle}>Comments</Text>
                  <Badge count={MOCK_COMMENTS.length} style={{ backgroundColor: token.colorPrimary }} />
                </Flex>
                <Flex vertical gap={token.marginSM}>
                  {MOCK_COMMENTS.map((c) => (
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
                    <Button type="primary" icon={<SendOutlined />} disabled={!commentText.trim()} style={{ width: 36, height: 36, minWidth: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: token.borderRadius }} />
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
                  <Button type="primary" block onClick={() => { message.success('AI verdict accepted'); }}>Accept AI verdict</Button>
                  <Button block onClick={() => setOverrideOpen(true)}>Override verdict</Button>
                  <Button block onClick={() => message.loading('Re-verifying...', 2).then(() => { message.success('Re-verification complete'); })}>Re-verify</Button>
                </Flex>
              </Card>
            </Col>

            {/* Assignee */}
            <Col xs={24} sm={12} lg={24}>
              <Card styles={{ body: { padding: token.paddingXL } }} style={{ height: '100%' }}>
                <Flex vertical gap={token.marginSM}>
                  <Text style={sectionTitleStyle}>Assignee</Text>
                  <MemberSelect members={members.map((m) => ({ name: m.name, initials: m.initials, color: m.color }))} value={assignee} onChange={(name) => { setAssignee(name); if (name) message.success(`Assigned to ${name}`); }} placeholder="Assign to reviewer" />
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
      <Modal title="Override Verdict" open={overrideOpen} onOk={() => { setOverrideOpen(false); message.success(`Verdict overridden to "${overrideVerdict}"`); }} onCancel={() => setOverrideOpen(false)} okText="Override" okButtonProps={{ danger: overrideVerdict === 'FP' }}>
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
