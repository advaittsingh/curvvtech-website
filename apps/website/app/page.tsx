import Brand from "@/components/home/brand";
import CustomerStories from "@/components/home/customer-stories";
import Faq from "@/components/home/faq";
import HeroSection from "@/components/home/hero";
import Innovation from "@/components/home/innovation";
import OnlinePresence from "@/components/home/online-presence";
import WebResult from "@/components/home/web-result";
import { JsonLd } from "@/components/seo/json-ld";
import { createPageMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Curvvtech | Tech Agency",
  description:
    "Curvvtech builds custom software, web and mobile apps, AI automation, and SaaS products. Your technology partner for design, development, and digital innovation.",
  path: "/",
});

export default function Home() {
  return (
    <main>
      <JsonLd data={[organizationJsonLd, websiteJsonLd]} />
      {/* ---------------------Hero section Starts-----------------  */}
      <HeroSection />
      {/* ---------------------Hero section Ends-----------------  */}

      {/* ---------------------Brand logo section Starts-----------------  */}
      <Brand />
      {/* ---------------------Brand logo section Ends-----------------  */}

      {/* ---------------------Web result section Starts-----------------  */}
      <WebResult />
      {/* ---------------------Web result section Ends-----------------  */}

      {/* ---------------------Innovation section Starts-----------------  */}
      <Innovation />
      {/* ---------------------Innovation section Ends-----------------  */}

      {/* ---------------------Online presence section Starts-----------------  */}
      <OnlinePresence />
      {/* ---------------------Online presence section Ends-----------------  */}

      {/* ---------------------Customer Stories section Starts-----------------  */}
      <CustomerStories />
      {/* ---------------------Customer Stories section Ends-----------------  */}

      {/* ---------------------Faq section Starts-----------------  */}
      <Faq />
      {/* ---------------------Faq section Ends-----------------  */}
    </main>
  )
}
