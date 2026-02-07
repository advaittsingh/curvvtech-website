import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About us | Curvvtech",
  description: "Curvvtech is a technology solutions company that builds custom software and offers innovative SaaS products to help businesses scale and succeed.",
};

export default function AboutUsPage() {
  return (
    <main>
      {/* Hero - matches home hero */}
      <section>
        <div className="relative w-full pt-44 2xl:pb-20 pb-10 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-blue_gradient before:via-white before:to-yellow_gradient before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-dark_blue_gradient dark:before:via-black dark:before:to-dark_yellow_gradient dark:before:rounded-full dark:before:blur-3xl dark:before:-z-10">
          <div className="container relative z-10">
            <div className="flex flex-col gap-8">
              <div className="relative flex flex-col text-center items-center gap-4">
                <h1>About Curvvtech</h1>
                <p className="max-w-38 text-dark_black/60 dark:text-white/60">
                  We&apos;re a technology solutions company that builds custom software and offers innovative SaaS products to help businesses scale and succeed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story - 4 cards */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="flex flex-col gap-10">
              <div className="max-w-2xl text-center mx-auto">
                <h2 className="mb-2">Our Story</h2>
                <p className="text-dark_black/60 dark:text-white/60 text-lg">
                  From founding vision to where we are today.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                <div className="about-story-card flex flex-col gap-3 p-8 rounded-2xl border border-dark_black/10 dark:border-white/10 bg-[linear-gradient(135deg,#CDEFFB_0%,#FFFFFF_50%,#FDEECB_100%)] min-h-[220px]">
                  <span className="text-sm font-medium uppercase tracking-wide text-purple_blue dark:text-blue">
                    The beginning
                  </span>
                  <p className="text-dark_black/80 dark:text-white text-base leading-relaxed">
                    Curvvtech was founded with a simple yet powerful vision: to bridge the gap between businesses and technology. We recognized that many companies struggle to find technology partners who truly understand both the technical and business sides of software development.
                  </p>
                </div>
                <div className="about-story-card flex flex-col gap-3 p-8 rounded-2xl border border-dark_black/10 dark:border-white/10 bg-[linear-gradient(135deg,#CDEFFB_0%,#FFFFFF_50%,#FDEECB_100%)] min-h-[220px]">
                  <span className="text-sm font-medium uppercase tracking-wide text-purple_blue dark:text-blue">
                    Our dual approach
                  </span>
                  <p className="text-dark_black/80 dark:text-white text-base leading-relaxed">
                    What sets us apart is our unique dual approach. We don&apos;t just build custom software for clients—we also own and operate our own suite of SaaS products. This gives us invaluable insights into product development, user experience, scalability, and the challenges businesses face when building and maintaining software.
                  </p>
                </div>
                <div className="about-story-card flex flex-col gap-3 p-8 rounded-2xl border border-dark_black/10 dark:border-white/10 bg-[linear-gradient(135deg,#CDEFFB_0%,#FFFFFF_50%,#FDEECB_100%)] min-h-[220px]">
                  <span className="text-sm font-medium uppercase tracking-wide text-purple_blue dark:text-blue">
                    Experience that counts
                  </span>
                  <p className="text-dark_black/80 dark:text-white text-base leading-relaxed">
                    Our team combines years of experience in software development, product management, and business strategy. We&apos;ve worked with startups launching their first product, scale-ups looking to expand, and enterprises seeking digital transformation.
                  </p>
                </div>
                <div className="about-story-card flex flex-col gap-3 p-8 rounded-2xl border border-dark_black/10 dark:border-white/10 bg-[linear-gradient(135deg,#CDEFFB_0%,#FFFFFF_50%,#FDEECB_100%)] min-h-[220px]">
                  <span className="text-sm font-medium uppercase tracking-wide text-purple_blue dark:text-blue">
                    Today &amp; ahead
                  </span>
                  <p className="text-dark_black/80 dark:text-white text-base leading-relaxed">
                    Today, Curvvtech continues to grow, helping more businesses achieve their technology goals while continuously improving our own products and services. We&apos;re committed to staying at the forefront of technology trends and best practices, ensuring our clients always have access to cutting-edge solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission - cards */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
              <div className="bg-blue/20 flex flex-col p-8 md:p-10 rounded-2xl gap-6">
                <h2 className="text-3xl text-blue">Our Vision</h2>
                <p className="text-dark_black/70 dark:text-white/70 text-base lg:text-lg leading-relaxed">
                  To be the leading technology partner for businesses worldwide, empowering them to achieve their digital transformation goals through innovative software solutions and intelligent products.
                </p>
              </div>
              <div className="bg-purple/20 flex flex-col p-8 md:p-10 rounded-2xl gap-6">
                <h2 className="text-3xl text-purple">Our Mission</h2>
                <p className="text-dark_black/70 dark:text-white/70 text-base lg:text-lg leading-relaxed">
                  To deliver exceptional software solutions that drive business growth, enhance productivity, and create lasting value for our clients. We combine technical expertise with strategic thinking to solve complex challenges.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values - same card style as Services (innovation) section */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="flex flex-col gap-12">
              <div className="flex flex-col justify-center items-center gap-3">
                <h2 className="text-center max-w-2xl mx-auto">Our Values</h2>
                <p className="text-dark_black/60 dark:text-white/60 text-center max-w-xl">
                  The principles that guide everything we do at Curvvtech.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                <div className="bg-purple/20 flex flex-col p-8 rounded-2xl gap-6">
                  <h3 className="text-2xl text-purple">Excellence</h3>
                  <p className="text-dark_black/60 dark:text-white/60 text-base">
                    We strive for excellence in everything we do, from code quality to client communication.
                  </p>
                </div>
                <div className="bg-blue/20 flex flex-col p-8 rounded-2xl gap-6">
                  <h3 className="text-2xl text-blue">Innovation</h3>
                  <p className="text-dark_black/60 dark:text-white/60 text-base">
                    We embrace new technologies and methodologies to deliver cutting-edge solutions.
                  </p>
                </div>
                <div className="bg-orange/20 flex flex-col p-8 rounded-2xl gap-6">
                  <h3 className="text-2xl text-orange">Transparency</h3>
                  <p className="text-dark_black/60 dark:text-white/60 text-base">
                    We believe in open communication, honest feedback, and transparent processes.
                  </p>
                </div>
                <div className="bg-green/20 flex flex-col p-8 rounded-2xl gap-6">
                  <h3 className="text-2xl text-green">Partnership</h3>
                  <p className="text-dark_black/60 dark:text-white/60 text-base">
                    We view our clients as partners, investing in their long-term success.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Curvvtech is Different - dark bar style like innovation CTA */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="max-w-2xl text-center mx-auto mb-12">
              <h2>Why Curvvtech is Different</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-2xl bg-dark_black/5 dark:bg-white/5 border border-dark_black/10 dark:border-white/10">
                <h4 className="mb-2">Not Just an Agency</h4>
                <p className="text-dark_black/60 dark:text-white/60 text-base">
                  Unlike traditional agencies, we&apos;re a technology company that owns and operates SaaS products. This gives us unique insights into product development, scalability, and user experience.
                </p>
              </div>
              <div className="p-8 rounded-2xl bg-dark_black/5 dark:bg-white/5 border border-dark_black/10 dark:border-white/10">
                <h4 className="mb-2">Dual Expertise</h4>
                <p className="text-dark_black/60 dark:text-white/60 text-base">
                  We excel at both custom software development and SaaS product creation. This dual expertise means we understand the full product lifecycle from concept to scale.
                </p>
              </div>
              <div className="p-8 rounded-2xl bg-dark_black/5 dark:bg-white/5 border border-dark_black/10 dark:border-white/10">
                <h4 className="mb-2">Startup to Enterprise</h4>
                <p className="text-dark_black/60 dark:text-white/60 text-base">
                  We work with startups, scale-ups, and enterprises. Our solutions are designed to grow with your business, from MVP to enterprise-scale applications.
                </p>
              </div>
              <div className="p-8 rounded-2xl bg-dark_black/5 dark:bg-white/5 border border-dark_black/10 dark:border-white/10">
                <h4 className="mb-2">Long-term Partnership</h4>
                <p className="text-dark_black/60 dark:text-white/60 text-base">
                  We&apos;re not just vendors—we&apos;re partners. We invest in your success and provide ongoing support, maintenance, and enhancements to ensure your software continues to deliver value.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - same button as home hero */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="flex flex-col gap-6 items-center justify-center text-center max-w-2xl mx-auto">
              <h2>Ready to Work Together?</h2>
              <p className="text-dark_black/60 dark:text-white/60">
                Let&apos;s discuss how Curvvtech can help transform your business with custom software or our SaaS products.
              </p>
              <Link
                href="/contact"
                className="group bg-purple_blue text-white font-medium flex flex-row justify-between items-center py-2 px-5 rounded-full max-w-64 w-full md:py-3 border border-purple_blue transition-all duration-200 ease-in-out hover:bg-transparent hover:text-purple_blue"
              >
                <span className="flex text-start transform transition-transform duration-200 ease-in-out group-hover:translate-x-28">
                  Get in Touch
                </span>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="transform transition-transform duration-200 ease-in-out group-hover:-translate-x-44 group-hover:rotate-45"
                >
                  <rect
                    width="40"
                    height="40"
                    rx="20"
                    className="fill-white transition-colors duration-200 ease-in-out group-hover:fill-purple_blue"
                  />
                  <path
                    d="M15.832 15.3334H24.1654V23.6667"
                    className="stroke-[#1B1D1E] transition-colors duration-200 ease-in-out group-hover:stroke-white"
                    strokeWidth="1.66667"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15.832 23.6667L24.1654 15.3334"
                    className="stroke-[#1B1D1E] transition-colors duration-500 ease-in-out group-hover:stroke-white"
                    strokeWidth="1.66667"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
