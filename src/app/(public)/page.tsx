'use client';

import {
  LandingHero,
  LandingFeatures,
  LandingHowItWorks,
  LandingTrust,
  LandingMetrics,
  LandingCTA,
  LandingFooter,
} from '@/features/landing';

/**
 * Landing page — renders all seven sections in order:
 * Hero → Features → How It Works → Tech Stack → Metrics → CTA → Footer
 */
export default function LandingPage() {
  return (
    <div>
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingTrust />
      <LandingMetrics />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
