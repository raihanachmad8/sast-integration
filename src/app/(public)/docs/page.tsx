import type { Metadata } from 'next';

import { DocsIndexPage } from './page.client';

export const metadata: Metadata = {
  title: 'Documentation — SAST Integration',
  description: 'Comprehensive documentation for the SAST Integration platform. Guides, architecture, configuration, and API reference.',
  alternates: {
    canonical: '/docs',
  },
  openGraph: {
    title: 'Documentation — SAST Integration',
    description: 'Comprehensive documentation for the SAST Integration platform.',
    type: 'website',
  },
};

export default function Page() {
  return <DocsIndexPage />;
}
