'use client';

import React, { Suspense } from 'react';
import { Drawer, Typography, Flex, Spin, theme } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { CodeBlock } from '@/commons/components/CodeBlock';
import { AiAnalysisCard } from '@/commons/components/AiAnalysisCard';
import { MemberSelect } from '@/commons/components/MemberSelect';
import { StatusTag } from '@/commons/components/StatusTag';
import { EmptyState } from '@/commons/components/EmptyState';
import { ScannerOutputSection } from './ScannerOutputSection';
import { FindingActions } from './FindingActions';
import type { Finding } from '@/commons/types';

const { Title, Text } = Typography;

interface FindingDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  finding: Finding | null;
  members?: Array<{ userId: string; name: string; email: string; initials: string; color: string }>;
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void;
  onReverify?: (id: string, model: string) => void;
  onOpenFullPage?: (id: string) => void;
  onAssign?: (findingId: string, assignee: string | null) => void;
}

/**
 * Drawer displaying full finding details including code snippet, AI analysis, scanner output, and actions.
 *
 * Provides member assignment, dismiss/resolve/reverify actions, and a link to the full finding page.
 *
 * @param props - {@link FindingDetailDrawerProps}
 * @returns JSX element rendering the finding detail drawer with all analysis sections.
 *
 * @example
 * <FindingDetailDrawer
 *   open={true}
 *   finding={finding}
 *   members={memberList}
 *   onClose={() => setOpen(false)}
 *   onDismiss={(id) => dismissFinding(id)}
 *   onResolve={(id) => resolveFinding(id)}
 *   onReverify={(id, model) => reverifyFinding(id, model)}
 *   onAssign={(findingId, assignee) => assignFinding(findingId, assignee)}
 * />
 */
export const FindingDetailDrawer = React.memo(function FindingDetailDrawer({
  open,
  onClose,
  finding,
  members = [],
  onDismiss,
  onResolve,
  onReverify,
  onOpenFullPage,
  onAssign,
}: FindingDetailDrawerProps) {
  const { token } = theme.useToken();

  if (!finding) {
    return (
      <Drawer title="Finding Details" placement="right" size="large" onClose={onClose} open={open}>
        <EmptyState title="No finding data available" />
      </Drawer>
    );
  }

  const normalizedFinding: Finding = {
    ...finding,
    repo: finding.repo || (finding as unknown as Record<string, unknown>).repositoryName as string || (finding as unknown as Record<string, unknown>).repository as string || '',
    cwe: finding.cwe || (finding as unknown as Record<string, unknown>).cweId as string || '',
    assignee: finding.assignee ?? (finding as unknown as Record<string, unknown>).assignedTo as string | null ?? null,
  };

  const sectionTitleStyle = {
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };

  return (
    <Drawer
      destroyOnClose
      title={
        <Flex vertical gap={token.marginSM}>
          <Flex gap={token.marginXS} wrap="wrap">
            <StatusTag type="verdict" value={finding.verdict} />
            {finding.model && (
              <Text style={{ color: token.colorTextSecondary, background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusSM, margin: 0, padding: `0 ${token.paddingXS}px` }}>
                {finding.model}
              </Text>
            )}
            <StatusTag type="severity" value={finding.severity} />
            <StatusTag type="findingStatus" value={finding.status} />
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

        {/* Scanner output */}
        <ScannerOutputSection finding={normalizedFinding} />

        {/* Source Code — only show if we have a code snippet */}
        {finding.codeSnippet && (
          <Suspense fallback={<Spin size="small" />}>
            <Flex vertical gap={token.marginSM}>
              <Flex justify="space-between" align="center">
                <Text style={sectionTitleStyle}>Source code</Text>
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
          </Suspense>
        )}

        {/* AI Analysis — only show if AI verification has run */}
        {finding.verdict && finding.verdict !== 'Pending' && (
          <Suspense fallback={<Spin size="small" />}>
            <AiAnalysisCard
              model={finding.model}
              verdict={finding.verdict}
              reasoning={finding.explanation ?? 'Analysis pending.'}
              cwe={normalizedFinding.cwe}
              matchDetail={finding.matchDetail}
              likelyCwe={finding.likelyCwe}
              dataFlow={finding.dataFlow}
              taintSource={finding.taintSource}
              remediation={finding.fixSuggestion ?? 'Remediation pending.'}
              knowledgeUses={0}
            />
          </Suspense>
        )}

        {/* Assignee */}
        <Flex vertical gap={token.marginSM}>
          <Text style={sectionTitleStyle}>Assignee</Text>
          <MemberSelect
            members={members.map((m) => ({ userId: m.userId, name: m.name, initials: m.initials, color: m.color }))}
            value={normalizedFinding.assignee ?? null}
            onChange={(userId) => { if (userId) onAssign?.(normalizedFinding.id, userId); }}
            placeholder="Assign to reviewer"
          />
        </Flex>

        {/* Actions */}
        <FindingActions
          finding={normalizedFinding}
          onDismiss={onDismiss}
          onResolve={onResolve}
          onReverify={onReverify}
          onOpenFullPage={onOpenFullPage}
        />

        {/* Details */}
        <Flex vertical gap={token.marginSM}>
          <Text style={sectionTitleStyle}>Details</Text>
          <Flex vertical gap={token.marginSM}>
            <Flex justify="space-between" align="center">
              <Text type="secondary">Scanner</Text>
              <StatusTag type="scanner" value={finding.scanner} />
            </Flex>
            <Flex justify="space-between" align="center">
              <Text type="secondary">CWE</Text>
              <Text strong style={{ fontSize: token.fontSizeSM }}>{normalizedFinding.cwe}</Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text type="secondary">Repository</Text>
              <Text strong style={{ fontSize: token.fontSizeSM }}>{normalizedFinding.repo}</Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text type="secondary">Status</Text>
              <StatusTag type="findingStatus" value={finding.status} />
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Drawer>
  );
});
