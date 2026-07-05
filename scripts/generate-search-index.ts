/**
 * Build-time search index generator.
 * Run: bun run scripts/generate-search-index.ts
 *
 * Generates src/lib/docs/search-index.ts with all headings and content
 * extracted from markdown files under docs/site/content/.
 */

import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(__dirname, '../docs/site/content');
const OUTPUT_FILE = path.join(__dirname, '../src/lib/docs/search-index.ts');

function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) headings.push(match[1].trim());
  }
  return headings;
}

function extractParagraphs(content: string): string[] {
  const paragraphs: string[] = [];
  let inCodeBlock = false;

  for (const line of content.split('\n')) {
    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock || line.startsWith('#') || line.startsWith('|') || line.startsWith('-') || line.startsWith('*') || line.trim() === '') continue;

    const cleaned = line.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    if (cleaned.length > 10) paragraphs.push(cleaned);
  }
  return paragraphs;
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(fullPath));
    else if (entry.name.endsWith('.md')) files.push(fullPath);
  }
  return files;
}

function main(): void {
  const index: Record<string, { headings: string[]; content: string }> = {};
  const mdFiles = walkDir(CONTENT_DIR);

  for (const filePath of mdFiles) {
    const rel = path.relative(CONTENT_DIR, filePath).replace(/\\/g, '/');
    const slug = rel.replace(/\.md$/, '');
    const content = fs.readFileSync(filePath, 'utf-8');

    index[slug] = {
      headings: extractHeadings(content),
      content: extractParagraphs(content).join(' '),
    };
  }

  const tsContent = `/**
 * Auto-generated search index from markdown files.
 * Run: bun run scripts/generate-search-index.ts
 *
 * Last generated: ${new Date().toISOString()}
 */

export interface SearchEntry {
  headings: string[];
  content: string;
}

export const SEARCH_INDEX: Record<string, SearchEntry> = ${JSON.stringify(index, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');
  console.log(`Generated search index: ${Object.keys(index).length} pages`);
}

main();
