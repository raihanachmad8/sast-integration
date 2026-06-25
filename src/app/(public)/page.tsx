'use client';

import {
  LandingHero,
  LandingFeatures,
  LandingHowItWorks,
  LandingMetrics,
  LandingTrust,
  LandingCTA,
  LandingFooter,
} from '@/features/landing';

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
