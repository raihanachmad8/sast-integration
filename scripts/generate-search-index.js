/**
 * Build-time search index generator.
 * Run this script to generate a full-text search index from markdown files.
 *
 * Usage: node scripts/generate-search-index.js
 *
 * This generates src/lib/docs/search-index.ts with all headings and content
 * extracted from docs/content/*.md files.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../docs/content');
const OUTPUT_FILE = path.join(__dirname, '../src/lib/docs/search-index.ts');

/** Extract headings (h1, h2, h3) from markdown content */
function extractHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) {
      headings.push(match[1].trim());
    }
  }
  return headings;
}

/** Extract paragraphs (non-heading, non-code, non-empty lines) */
function extractParagraphs(content) {
  const paragraphs = [];
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (line.startsWith('#')) continue;
    if (line.startsWith('|')) continue; // table rows
    if (line.startsWith('-') || line.startsWith('*')) continue; // list items
    if (line.trim() === '') continue;

    const cleaned = line.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    if (cleaned.length > 10) {
      paragraphs.push(cleaned);
    }
  }
  return paragraphs;
}

/** Generate search index from all markdown files */
function generateSearchIndex() {
  const index = {};

  // Read all markdown files
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const slug = file.replace('.md', '');
    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const headings = extractHeadings(content);
    const paragraphs = extractParagraphs(content);

    index[slug] = {
      headings,
      content: paragraphs.join(' '),
    };
  }

  // Generate TypeScript file
  const tsContent = `/**
 * Auto-generated search index from markdown files.
 * Run: node scripts/generate-search-index.js
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
  console.log(`Generated search index with ${Object.keys(index).length} pages`);
}

generateSearchIndex();
