'use client';

import { Drawer, Typography, Flex, theme } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { AiAnalysisCard } from '@/components/shared/AiAnalysisCard';
import { MemberSelect } from '@/components/shared/MemberSelect';
import { StatusTag } from '@/components/shared/StatusTag';
import { EmptyState } from '@/components/shared/EmptyState';
import { ScannerOutputSection } from './ScannerOutputSection';
import { FindingActions } from './FindingActions';
import { FindingComments } from './FindingComments';
import type { Finding } from '@/commons/types';

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

  if (!finding) {
    return (
      <Drawer title="Finding Details" placement="right" size="large" onClose={onClose} open={open}>
        <EmptyState title="No finding data available" />
      </Drawer>
    );
  }

  return (
    <Drawer
      title={
        <Flex vertical gap={token.marginSM}>
          <Flex gap={token.marginXS} wrap="wrap">
            <StatusTag type="verdict" value={finding.verdict} />
            {finding.model && (
              <Text style={{ color: token.colorTextSecondary, background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusSM, margin: 0, padding: '0 8px' }}>
                {finding.model}
              </Text>
            )}
            <StatusTag type="severity" value={finding.severity} />
          </Flex>
          <Title level={2} style={{ margin: 0 }}>{finding.rule}</Title>
          <Flex gap={token.marginXS} align="center">
            <StatusTag type="scanner" value={finding.scanner} />
            {finding.file && (
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {finding.file}{finding.lineNumber != null ? `:${finding.lineNumber}` : ''}
              </Text>
            )}
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
      <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingXL}px` }}>

        <ScannerOutputSection finding={finding} />

        {/* Source Code — only show if we have a code snippet */}
        {finding.codeSnippet && (
          <Flex vertical gap={token.marginSM}>
            <Flex justify="space-between" align="center">
              <Text style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source code</Text>
              {finding.file && (
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {finding.file}{finding.lineNumber != null ? `:${finding.lineNumber}` : ''}
                </Text>
              )}
            </Flex>
            <CodeBlock
              lines={(() => {
                const allLines = finding.codeSnippet.split('\n');
                const targetLine = finding.lineNumber ?? 1;
                return allLines.map((line, i) => ({
                  num: targetLine + i,
                  code: line,
                  highlight: i === 0,
                }));
              })()}
            />
          </Flex>
        )}

        {/* AI Analysis — only show if AI verification has run */}
        {finding.verdict && finding.verdict !== 'Pending' && (
          <AiAnalysisCard
            verdict={finding.verdict}
            reasoning={(finding as unknown as { explanation?: string }).explanation ?? 'Analysis pending.'}
            cwe={finding.cwe}
            remediation={(finding as unknown as { fixSuggestion?: string }).fixSuggestion ?? 'Remediation pending.'}
            knowledgeUses={0}
          />
        )}

        {/* Assignee */}
        <Flex vertical gap={token.marginSM}>
          <Text style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assignee</Text>
          <MemberSelect
            members={members.map((m) => ({ name: m.name, initials: m.initials, color: m.color }))}
            value={finding.assignee ?? null}
            onChange={(name) => { if (name) onAssign?.(finding.id, name); }}
            placeholder="Assign to reviewer"
          />
        </Flex>

        <FindingActions
          finding={finding}
          onAcceptVerdict={onAcceptVerdict}
          onOverrideVerdict={onOverrideVerdict}
          onReverify={onReverify}
          onOpenFullPage={onOpenFullPage}
        />

        <FindingComments findingId={finding.id} onAddComment={onAddComment} />
      </Flex>
    </Drawer>
  );
}
