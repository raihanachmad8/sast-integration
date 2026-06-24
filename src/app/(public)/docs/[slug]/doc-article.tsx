'use client';

import { Typography, theme } from 'antd';

const { Title, Text } = Typography;

interface DocArticleProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function DocArticle({ title, description, children }: DocArticleProps) {
  const { token } = theme.useToken();

  return (
    <article>
      {title && (
        <Title level={1} style={{ marginTop: 0, marginBottom: 8, fontWeight: token.fontWeightStrong, letterSpacing: '-0.02em' }}>
          {title}
        </Title>
      )}
      {description && (
        <Text type="secondary" style={{ fontSize: token.fontSizeLG, lineHeight: 1.7, display: 'block', marginBottom: token.marginXL }}>
          {description}
        </Text>
      )}
      <div style={{ borderTop: '1px solid', borderColor: 'inherit', paddingTop: token.paddingXL }}>
        {children}
      </div>
    </article>
  );
}
