export interface DocItem {
  slug: string;
  title: string;
  description: string;
  file: string;
}

export interface DocSection {
  label: string;
  items: DocItem[];
}

export const DOCS_CONFIG: DocSection[] = [
  {
    label: 'Introduction',
    items: [
      {
        slug: 'overview',
        title: 'Overview',
        description: 'Platform introduction and key capabilities',
        file: 'overview.mdx',
      },
      {
        slug: 'getting-started',
        title: 'Getting Started',
        description: 'Deploy and run your first scan',
        file: 'getting-started.mdx',
      },
    ],
  },
  {
    label: 'Core Concepts',
    items: [
      {
        slug: 'architecture',
        title: 'Architecture',
        description: 'System design and data flow',
        file: 'architecture.mdx',
      },
      {
        slug: 'scanning',
        title: 'Scanning',
        description: 'Scanner engines and pipeline',
        file: 'scanning.mdx',
      },
      {
        slug: 'ai-verification',
        title: 'AI Verification',
        description: 'Model-based finding classification',
        file: 'ai-verification.mdx',
      },
    ],
  },
  {
    label: 'Reference',
    items: [
      {
        slug: 'api-reference',
        title: 'API Reference',
        description: 'REST API endpoints',
        file: 'api-reference.mdx',
      },
    ],
  },
];

export function getAllDocSlugs(): string[] {
  return DOCS_CONFIG.flatMap((section) => section.items.map((item) => item.slug));
}

export function getDocBySlug(slug: string): DocItem | undefined {
  return DOCS_CONFIG.flatMap((section) => section.items).find((item) => item.slug === slug);
}
