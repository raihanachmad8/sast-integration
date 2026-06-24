'use client';

import React from 'react';
import { Typography, Alert, theme } from 'antd';

const { Title, Paragraph } = Typography;

/* ─── Code Blocks ─── */
function PreBlock({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) {
  const { token } = theme.useToken();
  return (
    <pre
      style={{
        background: token.colorCodeBg,
        color: token.colorCodeText,
        borderRadius: token.borderRadiusLG,
        padding: `${token.paddingLG}px ${token.paddingXL}px`,
        overflowX: 'auto',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: token.fontSizeSM,
        lineHeight: 1.8,
        margin: `${token.marginLG}px 0`,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
      {...props}
    >
      {children}
    </pre>
  );
}

function InlineCode({ children, className }: { children: React.ReactNode; className?: string }) {
  const { token } = theme.useToken();
  const isBlock = className?.includes('language-');
  if (isBlock) return <code className={className}>{children}</code>;
  return (
    <code
      style={{
        background: token.colorFillQuaternary,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusXS,
        padding: `${token.paddingXXS}px ${token.paddingXS}px`,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '0.875em',
        color: token.colorError,
      }}
    >
      {children}
    </code>
  );
}

/* ─── Table ─── */
function StyledTable({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        overflowX: 'auto',
        margin: `${token.marginLG}px 0`,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: token.fontSize }} {...props}>
        {children}
      </table>
    </div>
  );
}

function StyledTH({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) {
  const { token } = theme.useToken();
  return (
    <th
      style={{
        textAlign: 'left',
        padding: `${token.paddingSM}px ${token.paddingLG}px`,
        fontWeight: token.fontWeightStrong,
        background: token.colorFillQuaternary,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        color: token.colorText,
        fontSize: token.fontSizeSM,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
      {...props}
    >
      {children}
    </th>
  );
}

function StyledTD({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) {
  const { token } = theme.useToken();
  return (
    <td
      style={{
        padding: `${token.paddingSM}px ${token.paddingLG}px`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        color: token.colorText,
      }}
      {...props}
    >
      {children}
    </td>
  );
}

/* ─── Heading ─── */
function Heading({ level, children, ...props }: { level: 1 | 2 | 3 | 4 } & React.ComponentPropsWithoutRef<'h1' | 'h2' | 'h3' | 'h4'>) {
  const { token } = theme.useToken();
  const config = {
    1: { size: token.fontSizeHeading1, mt: 0, mb: token.marginXS, weight: 800, spacing: '-0.02em' as const },
    2: { size: token.fontSizeHeading2, mt: token.marginXXL, mb: token.marginSM, weight: 700, spacing: undefined },
    3: { size: token.fontSizeHeading3, mt: token.marginXL, mb: token.marginXS, weight: 600, spacing: undefined },
    4: { size: token.fontSizeHeading4, mt: token.marginLG, mb: token.marginXS, weight: 600, spacing: undefined },
  };
  const cfg = config[level];

  return (
    <Title
      level={level}
      style={{
        marginTop: cfg.mt,
        marginBottom: cfg.mb,
        fontSize: cfg.size,
        fontWeight: cfg.weight,
        letterSpacing: cfg.spacing,
        color: token.colorText,
        scrollMarginTop: 80,
      }}
      {...props}
    >
      {children}
    </Title>
  );
}

/* ─── Exports ─── */
export const mdxComponents = {
  h1: (props: React.ComponentPropsWithoutRef<'h1'>) => <Heading level={1} {...props} />,
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => <Heading level={2} {...props} />,
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => <Heading level={3} {...props} />,
  h4: (props: React.ComponentPropsWithoutRef<'h4'>) => <Heading level={4} {...props} />,

  p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => {
    const { token } = theme.useToken();
    return (
      <Paragraph
        style={{ marginBottom: token.marginLG, lineHeight: token.lineHeightLG, fontSize: token.fontSizeLG, color: token.colorText }}
        {...props}
      >
        {children}
      </Paragraph>
    );
  },

  pre: PreBlock,
  code: InlineCode,

  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => {
    const { token } = theme.useToken();
    return <ul style={{ paddingLeft: token.paddingXL, marginBottom: token.marginLG, lineHeight: token.lineHeightLG }} {...props}>{children}</ul>;
  },
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => {
    const { token } = theme.useToken();
    return <ol style={{ paddingLeft: token.paddingXL, marginBottom: token.marginLG, lineHeight: token.lineHeightLG }} {...props}>{children}</ol>;
  },
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) => {
    const { token } = theme.useToken();
    return <li style={{ marginBottom: token.marginXS, color: token.colorText, fontSize: token.fontSizeLG }} {...props}>{children}</li>;
  },

  table: StyledTable,
  thead: ({ children, ...props }: React.ComponentPropsWithoutRef<'thead'>) => <thead {...props}>{children}</thead>,
  tbody: ({ children, ...props }: React.ComponentPropsWithoutRef<'tbody'>) => <tbody {...props}>{children}</tbody>,
  tr: ({ children, ...props }: React.ComponentPropsWithoutRef<'tr'>) => <tr {...props}>{children}</tr>,
  th: StyledTH,
  td: StyledTD,

  hr: (props: React.ComponentPropsWithoutRef<'hr'>) => {
    const { token } = theme.useToken();
    return <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, margin: `${token.marginXXL}px 0` }} {...props} />;
  },

  blockquote: ({ children }: React.ComponentPropsWithoutRef<'blockquote'>) => {
    const { token } = theme.useToken();
    return (
      <Alert
        type="info"
        showIcon
        style={{ margin: `${token.marginLG}px 0`, borderRadius: token.borderRadiusLG }}
        message={<div style={{ fontSize: token.fontSizeLG }}>{children}</div>}
      />
    );
  },

  a: ({ children, href, ...props }: React.ComponentPropsWithoutRef<'a'>) => {
    const { token } = theme.useToken();
    return (
      <a
        href={href}
        style={{ color: token.colorPrimary, fontWeight: token.fontWeightStrong, textDecoration: 'underline', textUnderlineOffset: 3 }}
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },

  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => {
    const { token } = theme.useToken();
    return <strong style={{ fontWeight: token.fontWeightStrong, color: token.colorText }} {...props}>{children}</strong>;
  },

  em: ({ children }: React.ComponentPropsWithoutRef<'em'>) => {
    const { token } = theme.useToken();
    return <em style={{ fontStyle: 'italic', color: token.colorTextSecondary }}>{children}</em>;
  },
};
