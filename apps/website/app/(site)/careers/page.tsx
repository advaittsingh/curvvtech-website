import Link from "next/link";
import { AnimatedHero } from "@/components/ui/animated-hero";
import { AnimatedSection } from "@/components/ui/animated-section";
import {
  CAREER_TEAMS,
  getAllCareers,
  getCareersByTeam,
  openingsLabel,
  type CareerRole,
  type CareerTeam,
} from "@/lib/careers-data";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Careers | Curvvtech",
  description:
    "Join Curvvtech in Bangalore — internship openings across Technology and Growth. Real client work, founder mentorship, and a path to full-time.",
  path: "/careers",
});

const heroGradient =
  "relative w-full pt-44 2xl:pb-20 pb-10 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-blue_gradient before:via-white before:to-yellow_gradient before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-dark_blue_gradient dark:before:via-black dark:before:to-dark_yellow_gradient dark:before:rounded-full dark:before:blur-3xl dark:before:-z-10";

const whyIntern = [
  {
    title: "Live client work",
    body: "Work on live projects for real, paying clients — not hypotheticals.",
    bg: "bg-purple/20",
    titleClass: "text-purple",
  },
  {
    title: "Founder mentorship",
    body: "Direct mentorship from Curvvtech's founder — real ownership from day one.",
    bg: "bg-blue/20",
    titleClass: "text-blue",
  },
  {
    title: "Path to full-time",
    body: "Performance-based conversion — our best interns get first consideration as we grow.",
    bg: "bg-orange/20",
    titleClass: "text-orange",
  },
  {
    title: "Front-row seat",
    body: "See how a growing company is built across both tech and marketing.",
    bg: "bg-green/20",
    titleClass: "text-green",
  },
] as const;

const teamMeta: Record<
  CareerTeam,
  { blurb: string; accent: string; chip: string }
> = {
  Technology: {
    blurb: "Websites, apps, custom software, AI automation, and cloud.",
    accent: "bg-blue/20",
    chip: "bg-blue/20 text-blue",
  },
  Growth: {
    blurb: "Social media, performance ads, content, and branding.",
    accent: "bg-purple/20",
    chip: "bg-purple/20 text-purple",
  },
};

function ArrowCta({ label }: { label: string }) {
  return (
    <span className="group/cta inline-flex max-w-64 items-center justify-between gap-3 rounded-full border border-purple_blue bg-purple_blue py-2 pl-5 pr-2 font-medium text-white transition-all duration-200 ease-in-out group-hover:bg-transparent group-hover:text-purple_blue">
      <span className="transform transition-transform duration-200 ease-in-out group-hover:translate-x-2">
        {label}
      </span>
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform transition-transform duration-200 ease-in-out group-hover:rotate-45"
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
    </span>
  );
}

function RoleCard({ role }: { role: CareerRole }) {
  const meta = teamMeta[role.team];
  return (
    <Link
      href={`/careers/${role.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-dark_black/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-purple_blue/30 hover:shadow-[0_20px_50px_-28px_rgba(73,40,253,0.45)] dark:border-white/10 dark:bg-dark_black dark:hover:border-purple_blue/40"
    >
      <div className={`h-2 w-full ${meta.accent}`} />
      <div className="flex flex-1 flex-col gap-5 p-7 md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 font-medium ${meta.chip}`}>
            {openingsLabel(role.openings)}
          </span>
          <span className="rounded-full bg-dark_black/5 px-3 py-1 text-dark_black/70 dark:bg-white/10 dark:text-white/70">
            {role.duration}
          </span>
          <span className="rounded-full bg-dark_black/5 px-3 py-1 text-dark_black/70 dark:bg-white/10 dark:text-white/70">
            {role.stipend}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-medium text-dark_black transition-colors group-hover:text-purple_blue dark:text-white">
            {role.title}
          </h3>
          <p className="text-sm text-dark_black/55 dark:text-white/55">{role.location}</p>
        </div>
        <p className="flex-1 text-base leading-relaxed text-dark_black/70 dark:text-white/70">
          {role.summary}
        </p>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-purple_blue">
          View role &amp; apply
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

export default function CareersPage() {
  const allRoles = getAllCareers();
  const totalOpenings = allRoles.reduce((sum, role) => sum + role.openings, 0);

  return (
    <main>
      {/* Hero */}
      <section>
        <div className={heroGradient}>
          <div className="container relative z-10">
            <AnimatedHero className="flex flex-col items-center gap-10">
              <div className="flex max-w-3xl flex-col items-center gap-5 text-center">
                <span className="rounded-full border border-dark_black/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-dark_black/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  Bangalore · Internships open now
                </span>
                <h1 className="leading-tight">
                  Careers at{" "}
                  <span className="italic font-normal instrument-font">Curvvtech</span>
                </h1>
                <p className="max-w-2xl text-lg text-dark_black/60 dark:text-white/60">
                  A Digital Growth &amp; Technology company. Join a small, fast-moving team —
                  real client work, founder mentorship, and a front-row seat to how we Build,
                  Grow, and Automate.
                </p>
              </div>

              <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-dark_black/10 bg-white/80 p-6 text-center backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-3xl font-medium text-purple_blue">{totalOpenings}</p>
                  <p className="mt-1 text-sm text-dark_black/60 dark:text-white/60">Open seats</p>
                </div>
                <div className="rounded-2xl border border-dark_black/10 bg-white/80 p-6 text-center backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-3xl font-medium text-blue">2</p>
                  <p className="mt-1 text-sm text-dark_black/60 dark:text-white/60">Teams hiring</p>
                </div>
                <div className="rounded-2xl border border-dark_black/10 bg-white/80 p-6 text-center backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-3xl font-medium text-orange">3–6</p>
                  <p className="mt-1 text-sm text-dark_black/60 dark:text-white/60">Month programs</p>
                </div>
              </div>
            </AnimatedHero>
          </div>
        </div>
      </section>

      {/* Why intern */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <AnimatedSection className="flex flex-col gap-12">
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
                <h2>Why intern at Curvvtech</h2>
                <p className="text-lg text-dark_black/60 dark:text-white/60">
                  We&apos;re early in our growth story — that means ownership, not coffee runs
                  or simulated projects.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {whyIntern.map((item) => (
                  <div
                    key={item.title}
                    className={`${item.bg} flex flex-col gap-4 rounded-2xl p-8`}
                  >
                    <h3 className={`text-2xl ${item.titleClass}`}>{item.title}</h3>
                    <p className="text-base leading-relaxed text-dark_black/70 dark:text-white/70">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Two divisions */}
      <section>
        <div className="2xl:pb-20 pb-11">
          <div className="container">
            <AnimatedSection className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-2xl bg-blue/20 p-8 md:p-10">
                <span className="text-sm font-medium uppercase tracking-wide text-blue">
                  Technology
                </span>
                <h3 className="text-3xl text-blue">Build the product</h3>
                <p className="text-base leading-relaxed text-dark_black/70 dark:text-white/70 lg:text-lg">
                  Websites, apps, custom software, AI automation, and cloud — ship interfaces and
                  systems clients actually use.
                </p>
              </div>
              <div className="flex flex-col gap-4 rounded-2xl bg-purple/20 p-8 md:p-10">
                <span className="text-sm font-medium uppercase tracking-wide text-purple">
                  Growth
                </span>
                <h3 className="text-3xl text-purple">Grow the brand</h3>
                <p className="text-base leading-relaxed text-dark_black/70 dark:text-white/70 lg:text-lg">
                  Social media, performance ads, content, and branding — run the channels that
                  move the needle for real client budgets.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Open roles by team */}
      <section>
        <div className="2xl:pb-20 pb-11">
          <div className="container flex flex-col gap-16">
            <AnimatedSection className="mx-auto max-w-2xl text-center">
              <h2 className="mb-2">Open positions</h2>
              <p className="text-lg text-dark_black/60 dark:text-white/60">
                We&apos;re hiring across Technology and Growth. Pick a role and apply.
              </p>
            </AnimatedSection>

            {CAREER_TEAMS.map((team) => {
              const roles = getCareersByTeam(team);
              if (roles.length === 0) return null;
              const meta = teamMeta[team];
              return (
                <AnimatedSection key={team} className="flex flex-col gap-8" staggerDelay={0.08}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${meta.chip}`}>
                          {team} Team
                        </span>
                        <span className="text-sm text-dark_black/50 dark:text-white/50">
                          {roles.length} roles
                        </span>
                      </div>
                      <h3 className="text-3xl font-medium text-dark_black dark:text-white">
                        {team}
                      </h3>
                      <p className="mt-2 max-w-xl text-dark_black/60 dark:text-white/60">
                        {meta.blurb}
                      </p>
                    </div>
                  </div>
                  <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                      <li key={role.slug}>
                        <RoleCard role={role} />
                      </li>
                    ))}
                  </ul>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="2xl:pb-20 pb-11">
          <div className="container" id="general">
            <AnimatedSection className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-dark_black px-7 py-10 text-center sm:px-12 md:flex-row md:text-left dark:bg-white/5">
              <div className="max-w-xl">
                <h3 className="text-2xl font-medium text-white md:text-3xl">
                  Don&apos;t see a fit?
                </h3>
                <p className="mt-3 text-white/65">
                  Tell us what you want to work on — we&apos;re always interested in sharp people
                  who want to Build, Grow, and Automate with us.
                </p>
              </div>
              <Link href="/contact" className="group shrink-0">
                <ArrowCta label="Get in touch" />
              </Link>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </main>
  );
}
