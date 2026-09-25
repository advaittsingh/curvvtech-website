import Link from "next/link";
import { notFound } from "next/navigation";
import CareersApplyForm from "@/components/careers/CareersApplyForm";
import { AnimatedHero } from "@/components/ui/animated-hero";
import { AnimatedSection } from "@/components/ui/animated-section";
import {
  getAllCareerSlugs,
  getAllCareers,
  getCareerBySlug,
  openingsLabel,
} from "@/lib/careers-data";
import { createPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllCareerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const role = getCareerBySlug(slug);
  if (!role) {
    return createPageMetadata({
      title: "Role not found | Curvvtech",
      path: `/careers/${slug}`,
      noIndex: true,
    });
  }
  return createPageMetadata({
    title: `${role.title} | Careers | Curvvtech`,
    description: role.summary,
    path: `/careers/${role.slug}`,
  });
}

const heroGradient =
  "relative w-full pt-44 2xl:pb-16 pb-8 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-blue_gradient before:via-white before:to-yellow_gradient before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-dark_blue_gradient dark:before:via-black dark:before:to-dark_yellow_gradient dark:before:rounded-full dark:before:blur-3xl dark:before:-z-10";

function BulletList({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, index) => (
        <li key={item} className="flex gap-4 text-dark_black/80 dark:text-white/80">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${accent}`}
          >
            {index + 1}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function CareerRolePage({ params }: PageProps) {
  const { slug } = await params;
  const role = getCareerBySlug(slug);
  if (!role) notFound();

  const isTech = role.team === "Technology";
  const teamChip = isTech ? "bg-blue/20 text-blue" : "bg-purple/20 text-purple";
  const accentBar = isTech ? "bg-blue/20" : "bg-purple/20";
  const otherRoles = getAllCareers()
    .filter((r) => r.slug !== role.slug)
    .slice(0, 3);

  return (
    <main>
      {/* Hero */}
      <section>
        <div className={heroGradient}>
          <div className="container relative z-10">
            <AnimatedHero className="flex flex-col gap-8">
              <Link
                href="/careers"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-dark_black/10 bg-white/70 px-4 py-2 text-sm font-medium text-dark_black/70 backdrop-blur transition-colors hover:border-purple_blue/30 hover:text-purple_blue dark:border-white/10 dark:bg-white/5 dark:text-white/70"
              >
                ← All careers
              </Link>

              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
                <div className="flex flex-col gap-6 lg:col-span-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${teamChip}`}>
                      {role.team} Team
                    </span>
                    <span className="rounded-full bg-purple_blue/10 px-3 py-1 text-sm font-medium text-purple_blue">
                      {openingsLabel(role.openings)}
                    </span>
                    <span className="rounded-full bg-dark_black/5 px-3 py-1 text-sm text-dark_black/70 dark:bg-white/10 dark:text-white/70">
                      {role.type}
                    </span>
                  </div>

                  <h1 className="max-w-xl text-balance text-4xl leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
                    {role.title.replace(/ Intern$/, "")}{" "}
                    <span className="italic font-normal instrument-font">Intern</span>
                  </h1>

                  <p className="max-w-xl text-lg leading-relaxed text-dark_black/60 dark:text-white/60">
                    {role.summary}
                  </p>

                  <a
                    href="#apply"
                    className="group inline-flex w-fit max-w-72 items-center justify-between gap-3 rounded-full border border-purple_blue bg-purple_blue py-2 pl-5 pr-2 font-medium text-white transition-all duration-200 ease-in-out hover:bg-transparent hover:text-purple_blue md:py-3"
                  >
                    <span>Apply for this role</span>
                    <svg
                      width="40"
                      height="40"
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
                  </a>
                </div>

                <div className="overflow-hidden rounded-3xl border border-dark_black/10 bg-white/80 shadow-[0_24px_60px_-36px_rgba(73,40,253,0.35)] backdrop-blur dark:border-white/10 dark:bg-dark_black/80 lg:col-span-5">
                  <div className={`h-2 w-full ${accentBar}`} />
                  <div className="flex flex-col gap-0 divide-y divide-dark_black/10 dark:divide-white/10">
                    <div className="p-6">
                      <p className="text-xs font-medium uppercase tracking-wide text-dark_black/45 dark:text-white/45">
                        Duration
                      </p>
                      <p className="mt-2 text-xl font-medium text-dark_black dark:text-white">
                        {role.duration}
                      </p>
                    </div>
                    <div className="p-6">
                      <p className="text-xs font-medium uppercase tracking-wide text-dark_black/45 dark:text-white/45">
                        Stipend
                      </p>
                      <p className="mt-2 text-xl font-medium text-dark_black dark:text-white">
                        {role.stipend}
                      </p>
                    </div>
                    <div className="p-6">
                      <p className="text-xs font-medium uppercase tracking-wide text-dark_black/45 dark:text-white/45">
                        Location
                      </p>
                      <p className="mt-2 text-xl font-medium text-dark_black dark:text-white">
                        {role.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedHero>
          </div>
        </div>
      </section>

      {/* Details + form */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <AnimatedSection className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="flex flex-col gap-6 lg:col-span-7">
                <div className="rounded-3xl bg-blue/20 p-8 md:p-10">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="text-2xl text-blue md:text-3xl">Responsibilities</h2>
                    <span className="rounded-full bg-blue/20 px-3 py-1 text-xs font-medium text-blue">
                      What you&apos;ll do
                    </span>
                  </div>
                  <BulletList
                    items={role.responsibilities}
                    accent="bg-blue/25 text-blue"
                  />
                </div>

                <div className="rounded-3xl bg-purple/20 p-8 md:p-10">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="text-2xl text-purple md:text-3xl">Requirements</h2>
                    <span className="rounded-full bg-purple/20 px-3 py-1 text-xs font-medium text-purple">
                      Must have
                    </span>
                  </div>
                  <BulletList
                    items={role.requirements}
                    accent="bg-purple/25 text-purple"
                  />
                </div>

                {role.niceToHave && role.niceToHave.length > 0 ? (
                  <div className="rounded-3xl bg-green/20 p-8 md:p-10">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <h2 className="text-2xl text-green md:text-3xl">Nice to have</h2>
                      <span className="rounded-full bg-green/20 px-3 py-1 text-xs font-medium text-green">
                        Bonus
                      </span>
                    </div>
                    <BulletList
                      items={role.niceToHave}
                      accent="bg-green/25 text-green"
                    />
                  </div>
                ) : null}
              </div>

              <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
                <CareersApplyForm
                  roleTitle={role.title}
                  roleSlug={role.slug}
                  team={role.team}
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* More roles */}
      {otherRoles.length > 0 ? (
        <section>
          <div className="2xl:pb-20 pb-11">
            <div className="container">
              <AnimatedSection className="flex flex-col gap-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-3xl">Explore other roles</h2>
                    <p className="mt-2 text-dark_black/60 dark:text-white/60">
                      More openings across Technology and Growth.
                    </p>
                  </div>
                  <Link
                    href="/careers"
                    className="text-sm font-medium text-purple_blue hover:underline"
                  >
                    View all careers →
                  </Link>
                </div>
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {otherRoles.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/careers/${item.slug}`}
                        className="group flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-dark_black/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-purple_blue/30 dark:border-white/10 dark:bg-dark_black"
                      >
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                            item.team === "Technology"
                              ? "bg-blue/20 text-blue"
                              : "bg-purple/20 text-purple"
                          }`}
                        >
                          {item.team}
                        </span>
                        <h3 className="text-lg font-medium text-dark_black transition-colors group-hover:text-purple_blue dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-sm text-dark_black/55 dark:text-white/55">
                          {item.stipend} · {item.location}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </AnimatedSection>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
