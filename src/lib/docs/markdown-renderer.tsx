'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { mdxComponents } from '@/lib/docs/mdx-components';
import { MermaidDiagram } from '@/lib/docs/mermaid-diagram';

interface MarkdownRendererProps {
  content: string;
}

const MERMAID_BLOCK_RE = /```mermaid\n([\s\S]*?)```/g;

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { parts, mermaids } = useMemo(() => {
    const parts: string[] = [];
    const mermaids: string[] = [];
    let lastIndex = 0;

    for (const match of content.matchAll(MERMAID_BLOCK_RE)) {
      parts.push(content.slice(lastIndex, match.index));
      mermaids.push(match[1]);
      lastIndex = match.index! + match[0].length;
    }
    parts.push(content.slice(lastIndex));

    return { parts, mermaids };
  }, [content]);

  const segments = useMemo(() => {
    const result: React.ReactNode[] = [];
    let mermaidIdx = 0;

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        result.push(
          <ReactMarkdown key={`md-${i}`} remarkPlugins={[remarkGfm]} components={mdxComponents as Record<string, React.ComponentType<unknown>>}>
            {parts[i]}
          </ReactMarkdown>
        );
      }
      if (mermaidIdx < mermaids.length) {
        result.push(<MermaidDiagram key={`mmd-${i}`} chart={mermaids[mermaidIdx]} />);
        mermaidIdx++;
      }
    }

    return result;
  }, [parts, mermaids]);

  return <>{segments}</>;
}
