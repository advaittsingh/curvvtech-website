import ContactForm from "@/components/contact-form";
import Faq from "@/components/home/faq";
import { AnimatedSection } from "@/components/ui/animated-section";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Curvvtech",
};

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
