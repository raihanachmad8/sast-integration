'use client';

import { Flex, theme, Typography } from 'antd';
import type { ReactNode } from 'react';
import { FaIcon } from './FaIcon';

/** Purpose: Layout constants for the code block to avoid inline magic values. */
const CODE_FONT_FAMILY = "'Cascadia Code', 'Fira Code', monospace";
const LINE_NUMBER_WIDTH = 48;
const CODE_LINE_HEIGHT = 1.7;

interface CodeLine {
  num: number;
  code: string;
  highlight?: boolean;
  annotation?: string;
}

interface CodeBlockProps {
  lines: CodeLine[];
  suggestionCode?: ReactNode;
}

/**
 * Syntax-highlighted code block with line numbers and AI suggestion panel.
 * Used in: Finding detail, scan results, source code viewer.
 *
 * @example
 * <CodeBlock
 *   lines={[
 *     { num: 1, code: 'const x = vulnerableFunction(input);', highlight: true, annotation: 'CWE-78' },
 *     { num: 2, code: 'return x;' },
 *   ]}
 *   suggestionCode="const x = sanitize(vulnerableFunction(input));"
 * />
 */
export function CodeBlock({ lines, suggestionCode }: CodeBlockProps) {
  const { token } = theme.useToken();

  return (
    <div style={{ background: token.colorCodeBg, borderRadius: token.borderRadiusLG, overflow: 'hidden', fontFamily: CODE_FONT_FAMILY }}>
      <div style={{ padding: `${token.paddingLG}px 0` }}>
        {lines.map(({ num, code, highlight, annotation }) => (
          <Flex key={num} align="flex-start" style={{ background: highlight ? 'rgba(220, 38, 38, 0.15)' : 'transparent', borderLeft: highlight ? `3px solid ${token.colorError}` : '3px solid transparent' }}>
            <Typography.Text style={{ width: LINE_NUMBER_WIDTH, textAlign: 'right', paddingRight: token.paddingLG, color: token.colorCodeAnnotation, fontSize: token.fontSizeSM, userSelect: 'none', flexShrink: 0 }}>{num}</Typography.Text>
            <Typography.Text style={{ color: highlight ? token.colorCodeHighlight : token.colorCodeText, fontSize: token.fontSizeSM, lineHeight: CODE_LINE_HEIGHT, whiteSpace: 'pre' }}>{code}</Typography.Text>
            {annotation && <Typography.Text style={{ color: token.colorCodeHighlight, fontSize: token.fontSizeSM, marginLeft: token.marginXS, fontStyle: 'italic' }}>{annotation}</Typography.Text>}
          </Flex>
        ))}
      </div>
      {suggestionCode && (
        <div style={{ margin: `0 ${token.paddingLG}px ${token.paddingLG}px`, padding: `${token.paddingSM}px ${token.paddingLG}px`, background: token.colorCodeAiBg, border: `1px solid ${token.colorCodeAiBorder}`, borderRadius: token.borderRadius }}>
          <Flex align="center" gap={token.marginXS} style={{ color: token.colorCodeAiText, fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, marginBottom: token.marginXS }}>
            <FaIcon icon="fa-lightbulb" /> AI Suggestion
          </Flex>
          <code style={{ color: token.colorCodeAiCode, fontSize: token.fontSizeSM, fontFamily: 'inherit' }}>{suggestionCode}</code>
        </div>
      )}
    </div>
  );
}
