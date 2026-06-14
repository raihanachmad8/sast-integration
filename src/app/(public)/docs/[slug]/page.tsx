import { notFound } from 'next/navigation';
import { Typography } from 'antd';
import { readDocFile, parseFrontmatter } from '@/lib/docs/utils';
import { getDocBySlug, getAllDocSlugs } from '@/lib/docs/config';
import { MarkdownRenderer } from '@/lib/docs/markdown-renderer';

const { Title, Text } = Typography;

interface DocPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return {};
  return { title: `${doc.title} — SAST Integration Docs`, description: doc.description };
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const raw = readDocFile(doc.file);
  const { frontmatter, body } = parseFrontmatter(raw);

  return (
    <article>
      {frontmatter.title && (
        <Title level={1} style={{ marginTop: 0, marginBottom: 8, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {frontmatter.title}
        </Title>
      )}
      {frontmatter.description && (
        <Text type="secondary" style={{ fontSize: 17, lineHeight: 1.7, display: 'block', marginBottom: 32 }}>
          {frontmatter.description}
        </Text>
      )}
      <div style={{ borderTop: '1px solid', borderColor: 'inherit', paddingTop: 32 }}>
        <MarkdownRenderer content={body} />
      </div>
    </article>
  );
}
