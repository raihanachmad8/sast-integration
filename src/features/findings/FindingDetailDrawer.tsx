'use client';

import { useState, useRef } from 'react';
import { Drawer, Modal, Select, Input, Button, Typography, Avatar, Badge, Flex, Tag, Row, Col, theme } from 'antd';
import { CloseOutlined, SendOutlined } from '@ant-design/icons';
import { FaIcon } from '@/components/shared/fa-icon';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { AiAnalysisCard } from '@/components/shared/AiAnalysisCard';
import { MemberSelect } from '@/components/shared/MemberSelect';
import { StatusTag } from '@/components/shared/StatusTag';
import { useModelsQuery } from '@/modules/finding';
import type { Finding, FindingComment } from '@/commons/types';
import { MOCK_COMMENTS, getFindingScannerOutput, getFindingSourceCode, getFindingAiSuggestion, MOCK_SOURCE_LINES, MOCK_AI_SUGGESTION_CODE } from '@/modules/finding';

const { Title, Text } = Typography;

interface FindingDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  finding: Finding | null;
  members?: Array<{ userId: string; name: string; email: string; initials: string; color: string }>;
  onAcceptVerdict?: (id: string) => void;
  onOverrideVerdict?: (id: string, newVerdict: 'TP' | 'FP') => void;
  onReverify?: (id: string, model: string) => void;
  onOpenFullPage?: (id: string) => void;
  onAssign?: (findingId: string, assignee: string | null) => void;
  onAddComment?: (findingId: string, text: string) => void;
}

export function FindingDetailDrawer({
  open,
  onClose,
  finding,
  members = [],
  onAcceptVerdict,
  onOverrideVerdict,
  onReverify,
  onOpenFullPage,
  onAssign,
  onAddComment,
}: FindingDetailDrawerProps) {
  const { token } = theme.useToken();
  const modelsQuery = useModelsQuery();
  const models = modelsQuery.data ?? [];

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<FindingComment[]>(MOCK_COMMENTS);
  const [assignee, setAssignee] = useState<string | null>(finding?.assignee ?? null);

  const SCANNER_ROWS = [
    { label: 'Rule', value: 'python.django.security.injection.tainted-sql-string', color: token.colorSuccess },
    { label: 'Match', value: 'String concatenation in SQL query at line 88', color: token.colorError },
    { label: 'Data flow', value: 'req.query.id → query string → db.execute()', color: token.colorWarning },
    { label: 'Taint source', value: 'HTTP request parameter (untrusted)', color: token.colorWarning },
  ];
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState<'TP' | 'FP'>('TP');
  const [reverifyOpen, setReverifyOpen] = useState(false);
  const [reverifyModel, setReverifyModel] = useState(models[0]?.name ?? '');
  const textareaRef = useRef<any>(null);

  if (!finding) return null;

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    const newComment: FindingComment = {
      id: String(Date.now()),
      author: 'You',
      avatar: 'RO',
      time: 'just now',
      text: trimmed,
    };
    setComments((prev) => [...prev, newComment]);
    setCommentText('');
    onAddComment?.(finding.id, trimmed);
  };

  const handleAcceptVerdict = () => onAcceptVerdict?.(finding.id);

  const handleOverride = () => {
    onOverrideVerdict?.(finding.id, overrideVerdict);
    setOverrideOpen(false);
  };

  const handleReverify = () => {
    onReverify?.(finding.id, reverifyModel);
    setReverifyOpen(false);
  };

  const sectionTitleStyle = {
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };

  return (
    <>
      <Drawer
        title={
          <Flex vertical gap={token.marginSM}>
            <Flex gap={token.marginXS} wrap="wrap">
              <StatusTag type="verdict" value={finding.verdict} />
              <Tag style={{ color: token.colorTextSecondary, background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusSM, margin: 0 }}>
                {finding.model}
              </Tag>
              <StatusTag type="severity" value={finding.severity} />
            </Flex>
            <Title level={2} style={{ margin: 0 }}>{finding.rule}</Title>
            <Flex gap={token.marginXS} align="center">
              <StatusTag type="scanner" value={finding.scanner} />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{finding.file}:{finding.lineNumber ?? 88}</Text>
            </Flex>
          </Flex>
        }
        placement="right"
        size="large"
        onClose={onClose}
        open={open}
        closeIcon={<CloseOutlined />}
        styles={{ body: { padding: 0, overflowY: 'auto' } }}
      >

        {/* Content */}
        <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingXL}px` }}>

          {/* Scanner Output */}
          <Flex vertical gap={token.marginSM}>
            <Text style={sectionTitleStyle}>Scanner output</Text>
            <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
              {SCANNER_ROWS.map(({ label, value, color }) => (
                <Flex key={label} gap={token.marginMD} align="flex-start" style={{ padding: `${token.paddingSM}px ${token.paddingLG}px`, borderLeft: `4px solid ${color}`, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                  <Text strong style={{ minWidth: 90, fontSize: token.fontSizeSM, color, flexShrink: 0 }}>{label}</Text>
                  <Text style={{ lineHeight: 1.5 }}>{value}</Text>
                </Flex>
              ))}
            </div>
          </Flex>

          {/* Source Code */}
          <Flex vertical gap={token.marginSM}>
            <Flex justify="space-between" align="center">
              <Text style={sectionTitleStyle}>Source code</Text>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{finding.file}:{finding.lineNumber ?? 88}</Text>
            </Flex>
            <CodeBlock lines={MOCK_SOURCE_LINES} suggestionCode={MOCK_AI_SUGGESTION_CODE} />
          </Flex>

          {/* AI Analysis */}
          <AiAnalysisCard
            verdict={finding.verdict}
            reasoning="The user-supplied parameter req.query.id is concatenated directly into a SQL string without sanitization or parameterization. The data flow from HTTP input to db.execute() is unguarded. This is a confirmed True Positive."
            cwe={finding.cwe}
            remediation="Replace string concatenation with parameterized queries: db.execute(&apos;SELECT * FROM orders WHERE id = ?&apos;, [req.query.id]). Validate and sanitize all user inputs before use in queries."
            knowledgeUses={142}
          />

          {/* Assignee */}
          <Flex vertical gap={token.marginSM}>
            <Text style={sectionTitleStyle}>Assignee</Text>
            <MemberSelect
              members={members.map((m) => ({ name: m.name, initials: m.initials, color: m.color }))}
              value={assignee}
              onChange={(name) => { setAssignee(name); if (name) onAssign?.(finding.id, name); }}
              placeholder="Assign to reviewer"
            />
          </Flex>

          {/* Actions */}
          <Flex vertical gap={token.marginSM}>
            <Text style={sectionTitleStyle}>Actions</Text>
            <Row gutter={[token.marginSM, token.marginSM]}>
              <Col span={12}>
                <Button type="primary" block onClick={handleAcceptVerdict}>Accept AI verdict</Button>
              </Col>
              <Col span={12}>
                <Button block onClick={() => setOverrideOpen(true)}>Override verdict</Button>
              </Col>
              <Col span={12}>
                <Button block onClick={() => setReverifyOpen(true)}>Re-verify</Button>
              </Col>
              <Col span={12}>
                <Button block onClick={() => onOpenFullPage?.(finding.id)}>Open full page</Button>
              </Col>
            </Row>
          </Flex>

          {/* Comments */}
          <Flex vertical gap={token.marginMD}>
            <Flex align="center" gap={token.marginXS}>
              <Text style={sectionTitleStyle}>Comments</Text>
              <Badge count={comments.length} style={{ backgroundColor: token.colorPrimary }} />
            </Flex>

            <Flex vertical gap={token.marginSM}>
              {comments.map((c) => (
                <Flex key={c.id} gap={token.marginSM} align="flex-start">
                  <Avatar size={32} style={{ background: token.colorTextSecondary, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
                    {c.avatar}
                  </Avatar>
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
                <div role="textbox" tabIndex={0} style={{ flex: 1, position: 'relative' }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <Input.TextArea
                    ref={textareaRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                    placeholder="Add a comment or review note…"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    style={{ width: '100%' }}
                  />
                </div>
                <Button type="primary" icon={<SendOutlined />} onClick={handleSendComment} disabled={!commentText.trim()} style={{ width: 36, height: 36, minWidth: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: token.borderRadius, opacity: commentText.trim() ? 1 : 0.4 }} />
              </Flex>
            </Flex>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, marginLeft: 40 }}>Enter to send · Shift+Enter for new line</Text>
          </Flex>
        </Flex>
      </Drawer>

      {/* Override Modal */}
      <Modal title="Override Verdict" open={overrideOpen} onOk={handleOverride} onCancel={() => setOverrideOpen(false)} okText="Override" okButtonProps={{ danger: overrideVerdict === 'FP' }}>
        <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginMD }}>
          <Text>Override the AI verdict for <strong>{finding.rule}</strong>?</Text>
          <Select value={overrideVerdict} onChange={setOverrideVerdict} style={{ width: '100%' }} options={[
            { value: 'TP', label: 'True Positive (TP)' },
            { value: 'FP', label: 'False Positive (FP)' },
          ]} />
        </Flex>
      </Modal>

      {/* Re-verify Modal */}
      <Modal title="Re-verify" open={reverifyOpen} onOk={handleReverify} onCancel={() => setReverifyOpen(false)} okText="Start">
        <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginMD }}>
          <Text>Select a model to re-verify <strong>{finding.rule}</strong>.</Text>
          <Select value={reverifyModel} onChange={setReverifyModel} style={{ width: '100%' }} options={models.map((m) => ({ value: m.name, label: m.name }))} />
        </Flex>
      </Modal>
    </>
  );
}
