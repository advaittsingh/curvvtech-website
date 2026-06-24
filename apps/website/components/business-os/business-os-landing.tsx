import { BusinessOsShell } from './business-os-shell';
import { BusinessOsFooter } from './business-os-footer';
import { CommandCenterHero } from './command-center-hero';
import { AiEmployeesSection } from './ai-employees-section';
import { BusinessTimelineSection } from './business-timeline-section';
import { SoftwareStackSection } from './software-stack-section';
import { BusinessBrainSection } from './business-brain-section';
import { BusinessOsInActionSection } from './business-os-in-action-section';
import { CommandCenterCockpitSection } from './command-center-cockpit-section';
import { IndustryPacksSection } from './industry-packs-section';
import { WhiteLabelMajorSection } from './white-label-major-section';
import { TestimonialsSection } from './testimonials-section';
import { FinalCtaSection } from './final-cta-section';
import { RoadmapSection } from './roadmap-section';

export function BusinessOsLanding() {
  return (
    <BusinessOsShell>
      <main>
        <CommandCenterHero />
        <AiEmployeesSection />
        <BusinessTimelineSection />
        <SoftwareStackSection />
        <BusinessBrainSection />
        <BusinessOsInActionSection />
        <CommandCenterCockpitSection />
        <IndustryPacksSection />
        <WhiteLabelMajorSection />
        <TestimonialsSection />
        <FinalCtaSection />
        <RoadmapSection />
      </main>
      <BusinessOsFooter />
    </BusinessOsShell>
  );
}
