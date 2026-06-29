import type { Metadata } from 'next';

import { LandingPage } from './page.client';

export const metadata: Metadata = {
  title: 'SAST Integration — AI-Powered Security Analysis',
  description: 'Multi-scanner static application security testing platform with AI-powered false positive verification. Ship secure code faster.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SAST Integration — AI-Powered Security Analysis',
    description: 'Multi-scanner static application security testing platform with AI-powered false positive verification.',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
