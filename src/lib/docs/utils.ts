/**
 * Docs content utility.
 * Reads doc content from the docs/content/ directory at runtime.
 */

import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'docs', 'content');

/**
 * Read doc content for a given filename from disk.
 * Falls back to a placeholder if the file is missing.
 */
export function readDocFile(filename: string): string {
  const slug = filename.replace(/\.md$/, '');
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return `## Content Coming Soon\n\nDocumentation for this page is being written.`;
  }
}

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter: Record<string, string> = {};
  match[1].split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  });

  return { frontmatter, body: match[2] };
}
