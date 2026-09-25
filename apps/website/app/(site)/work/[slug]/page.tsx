import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ProjectImage } from "@/components/ui/ProjectImage";
import { fetchCmsPortfolio, fetchCmsPortfolioBySlug } from "@/lib/cms-api";
import { createPageMetadata, creativeWorkJsonLd } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const portfolio = await fetchCmsPortfolio();
  return portfolio
    .filter((item) => item.slug)
    .map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchCmsPortfolioBySlug(slug);
  if (!project) return { title: "Case study not found" };

  return createPageMetadata({
    title: project.seo_title ?? `${project.title} | Curvvtech Work`,
    description:
      project.seo_description ??
      project.description ??
      `Case study: ${project.title} — a project delivered by Curvvtech.`,
    path: `/work/${slug}`,
    image: project.image_url,
    imageAlt: project.title,
  });
}

function MetricsGrid({
  metrics,
}: {
  metrics: Record<string, string | number> | null | undefined;
}) {
  if (!metrics || Object.keys(metrics).length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(metrics).map(([label, value]) => (
        <div
          key={label}
          className="rounded-2xl border border-dark_black/10 dark:border-white/10 bg-dark_black/5 dark:bg-white/5 p-6 text-center"
        >
          <p className="text-2xl font-semibold text-purple_blue">{String(value)}</p>
          <p className="text-sm text-dark_black/60 dark:text-white/60 mt-1 capitalize">
            {label.replace(/_/g, " ")}
          </p>
        </div>
      ))}
    </div>
  );
}

export default async function WorkCaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const project = await fetchCmsPortfolioBySlug(slug);
  if (!project) notFound();

  const tags = Array.isArray(project.tags) ? project.tags : [];

  return (
    <main>
      <JsonLd data={creativeWorkJsonLd(project)} />

      <section>
        <div className="relative w-full pt-44 2xl:pb-20 pb-10 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-blue_gradient before:via-white before:to-yellow_gradient before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-dark_blue_gradient dark:before:via-black dark:before:to-dark_yellow_gradient dark:before:rounded-full dark:before:blur-3xl dark:before:-z-10">
          <div className="container relative z-10 max-w-4xl">
            <Link href="/work" className="text-sm text-purple_blue hover:underline mb-6 inline-block">
              ← Back to work
            </Link>
            <h1 className="text-4xl md:text-5xl font-semibold mb-4">{project.title}</h1>
            {project.description && (
              <p className="text-lg text-dark_black/60 dark:text-white/60 max-w-2xl">
                {project.description}
              </p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm border border-dark_black/10 dark:border-white/50 py-1.5 px-4 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {project.image_url && (
        <section>
          <div className="container max-w-5xl pb-12">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-dark_black/10 dark:border-white/10">
              <ProjectImage
                src={project.image_url}
                alt={project.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority
              />
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="2xl:py-16 py-10">
          <div className="container max-w-4xl flex flex-col gap-12">
            <MetricsGrid metrics={project.metrics_json} />

            {project.case_study_body && (
              <article className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
                {project.case_study_body}
              </article>
            )}

            {(project.before_image_url || project.after_image_url) && (
              <div className="grid md:grid-cols-2 gap-6">
                {project.before_image_url && (
                  <div>
                    <p className="text-sm font-medium mb-3 text-dark_black/60 dark:text-white/60">
                      Before
                    </p>
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-dark_black/10 dark:border-white/10">
                      <Image
                        src={project.before_image_url}
                        alt={`${project.title} before`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized={project.before_image_url.startsWith("http")}
                      />
                    </div>
                  </div>
                )}
                {project.after_image_url && (
                  <div>
                    <p className="text-sm font-medium mb-3 text-dark_black/60 dark:text-white/60">
                      After
                    </p>
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-dark_black/10 dark:border-white/10">
                      <Image
                        src={project.after_image_url}
                        alt={`${project.title} after`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized={project.after_image_url.startsWith("http")}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {project.project_url && project.project_url !== "#" && (
              <div className="flex flex-wrap gap-4">
                <Link
                  href={project.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-purple_blue text-white font-medium flex flex-row justify-between items-center py-2 px-5 rounded-full max-w-72 w-full md:py-3 border border-purple_blue transition-all duration-200 ease-in-out hover:bg-transparent hover:text-purple_blue"
                >
                  <span>View live project</span>
                </Link>
                <Link
                  href="/contact"
                  className="font-medium py-2 px-5 rounded-full border border-dark_black/10 dark:border-white/20 hover:border-purple_blue transition-colors"
                >
                  Start a similar project
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
