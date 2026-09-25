import { Suspense } from "react";
import Link from "next/link";
import ServicesList from "./ServicesList";
import { AnimatedHero } from "@/components/ui/animated-hero";
import { fetchCmsServices } from "@/lib/cms-api";
import { createPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = createPageMetadata({
  title: "Services | Curvvtech",
  description:
    "Web development, app development, backend & API, AI & automation, SaaS, and custom software from Curvvtech.",
  path: "/services",
});

const serviceBlurb =
  "We deliver end-to-end tech solutions—from web and mobile apps to APIs, cloud, and AI. Tell us your goals and we'll tailor a plan.";

async function CmsServicesList() {
  const cmsServices = await fetchCmsServices();
  return <ServicesList cmsServices={cmsServices} />;
}

function ServicesCta() {
  return (
    <div className="flex flex-col gap-4 xl:flex-row bg-white/5 items-center justify-between py-8 px-7 sm:px-12 rounded-3xl w-full mt-4">
      <h4 className="text-white text-center xl:text-left text-lg leading-snug">
        Ready to build something great?
        <br />
        Start your project with Curvvtech.
      </h4>
      <Link
        href="/contact"
        className="group gap-2 text-dark_black font-medium bg-white rounded-full flex items-center lg:gap-4 py-2 pl-5 pr-2 border border-white hover:bg-transparent hover:text-white transition-all duration-200 ease-in-out shrink-0"
      >
        <span className="group-hover:translate-x-9 transform transition-transform duration-200 ease-in-out">
          Discuss your project
        </span>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:-translate-x-36 transition-all duration-200 ease-in-out">
          <rect width="32" height="32" rx="16" fill="#1B1D1E" className="transition-colors duration-200 ease-in-out group-hover:fill-white" />
          <path d="M11.832 11.3335H20.1654M20.1654 11.3335V19.6668M20.1654 11.3335L11.832 19.6668" stroke="white" strokeWidth="1.42857" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-black" />
        </svg>
      </Link>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main className="bg-black">
      <section className="pb-10 2xl:pb-16 pt-36 md:pt-40">
        <div className="container">
          <AnimatedHero className="flex flex-col gap-10">
            <div className="flex flex-col text-center items-center gap-4 max-w-2xl mx-auto">
              <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-medium leading-tight tracking-tight">
                Where innovation meets{" "}
                <span className="italic font-normal instrument-font">aesthetics</span>
              </h1>
              <p className="text-white/60 text-base md:text-lg leading-relaxed">{serviceBlurb}</p>
            </div>

            <div className="flex flex-col gap-12">
              <Suspense fallback={<ServicesList />}>
                <CmsServicesList />
              </Suspense>
              <ServicesCta />
            </div>
          </AnimatedHero>
        </div>
      </section>
    </main>
  );
}
