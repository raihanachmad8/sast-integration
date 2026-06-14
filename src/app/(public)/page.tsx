'use client';

import { LandingHero } from '@/features/landing/LandingHero';
import { LandingFeatures } from '@/features/landing/LandingFeatures';
import { LandingHowItWorks } from '@/features/landing/LandingHowItWorks';
import { LandingMetrics } from '@/features/landing/LandingMetrics';
import { LandingTrust } from '@/features/landing/LandingTrust';
import { LandingCTA } from '@/features/landing/LandingCTA';
import { LandingFooter } from '@/features/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div>
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingMetrics />
      <LandingTrust />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
