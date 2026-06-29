import type { MetadataRoute } from 'next';

import { getAllDocSlugs } from '@/lib/docs/config';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const docSlugs = getAllDocSlugs();

  const docPages: MetadataRoute.Sitemap = docSlugs.map((slug) => ({
    url: `${BASE_URL}/docs/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...docPages,
  ];
}
