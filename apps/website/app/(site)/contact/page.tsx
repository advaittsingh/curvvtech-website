import ContactForm from "@/components/contact-form";
import Faq from "@/components/home/faq";
import { AnimatedSection } from "@/components/ui/animated-section";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contact | Curvvtech",
  description:
    "Get in touch with Curvvtech for custom software, web development, mobile apps, and AI automation projects.",
  path: "/contact",
});

export default function Page() {
  return (
    <main>
      <AnimatedSection>
        <ContactForm />
      </AnimatedSection>
      <AnimatedSection>
        <Faq />
      </AnimatedSection>
    </main>
  );
}
