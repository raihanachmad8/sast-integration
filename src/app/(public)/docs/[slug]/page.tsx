import { notFound } from 'next/navigation';
import { readDocFile, parseFrontmatter } from '@/lib/docs/utils';
import { getDocBySlug, getAllDocSlugs } from '@/lib/docs/config';
import { MarkdownRenderer } from '@/lib/docs/markdown-renderer';
import { DocArticle } from './doc-article';

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
    <DocArticle title={frontmatter.title} description={frontmatter.description}>
      <MarkdownRenderer content={body} />
    </DocArticle>
  );
}
