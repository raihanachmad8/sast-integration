'use client';

import { Typography, theme, Flex } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS_CONFIG } from '@/lib/docs/config';
import { ROUTES } from '@/commons/constants';

const { Title, Text } = Typography;

interface DocArticleProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

function getBreadcrumb(slug: string): { section: string; title: string } | null {
  for (const section of DOCS_CONFIG) {
    const item = section.items.find((i) => i.slug === slug);
    if (item) {
      return { section: section.label, title: item.title };
    }
  }
  return null;
}

export function DocArticle({ title, description, children }: DocArticleProps) {
  const { token } = theme.useToken();
  const pathname = usePathname();
  const slug = pathname.split('/docs/')[1] || '';
  const breadcrumb = getBreadcrumb(slug);

  return (
    <article>
      {/* Breadcrumbs */}
      {breadcrumb && (
        <Flex align="center" gap={8} style={{ marginBottom: token.marginLG, fontSize: token.fontSizeSM }}>
          <Link href={ROUTES.DOCS.INDEX} style={{ color: token.colorTextSecondary, textDecoration: 'none' }}>
            Docs
          </Link>
          <span style={{ color: token.colorTextQuaternary }}>/</span>
          <Text type="secondary">{breadcrumb.section}</Text>
          <span style={{ color: token.colorTextQuaternary }}>/</span>
          <Text strong>{breadcrumb.title}</Text>
        </Flex>
      )}

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

      {/* Last updated + Edit on GitHub */}
      <Flex justify="space-between" align="center" style={{ marginBottom: token.paddingXL, paddingBottom: token.paddingMD, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
        <a
          href={`https://github.com/raihanachmad8/sast-integration/edit/main/docs/content/${slug}.md`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, textDecoration: 'none' }}
        >
          Edit this page on GitHub
        </a>
      </Flex>

      <div style={{ borderTop: '1px solid', borderColor: 'inherit', paddingTop: token.paddingXL }}>
        {children}
      </div>
    </article>
  );
}
