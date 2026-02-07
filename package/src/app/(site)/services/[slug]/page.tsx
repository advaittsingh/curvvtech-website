import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getServiceBySlug,
  getAllServiceSlugs,
  getProjectsForService,
} from "@/lib/services-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllServiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: "Service | Curvvtech" };
  return {
    title: `${service.title} | Curvvtech`,
    description: service.description,
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const projects = getProjectsForService(slug);

  return (
    <main>
      {/* Hero */}
      <section>
        <div className="relative w-full pt-44 2xl:pb-20 pb-10 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-blue_gradient before:via-white before:to-yellow_gradient before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-dark_blue_gradient dark:before:via-black dark:before:to-dark_yellow_gradient dark:before:rounded-full dark:before:blur-3xl dark:before:-z-10">
          <div className="container relative z-10">
            <div className="flex flex-col gap-6 items-center text-center">
              <h1>{service.title}</h1>
              <p className="max-w-2xl text-dark_black/60 dark:text-white/60 text-lg">
                {service.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="flex flex-col gap-12">
              <div className="flex flex-col justify-center items-center gap-3">
                <h2 className="text-center max-w-2xl mx-auto">About this service</h2>
              </div>
              <div className="max-w-3xl mx-auto text-center">
                <p className="text-dark_black/60 dark:text-white/60 text-lg leading-relaxed">
                  {service.longDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights - colored cards like Values */}
      {service.highlights && service.highlights.length > 0 && (
        <section>
          <div className="2xl:py-20 py-11">
            <div className="container">
              <div className="flex flex-col gap-12">
                <div className="flex flex-col justify-center items-center gap-3">
                  <h2 className="text-center max-w-2xl mx-auto">Why choose us</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {service.highlights.map((item, i) => {
                    const colors = ['bg-purple/20 text-purple', 'bg-blue/20 text-blue', 'bg-green/20 text-green'] as const;
                    const c = colors[i % colors.length];
                    return (
                      <div key={i} className={`${c.split(' ')[0]} flex flex-col p-8 rounded-2xl gap-4`}>
                        <h3 className={`text-2xl font-medium ${c.split(' ')[1]}`}>{item}</h3>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* What we build - card grid like Why Curvvtech is Different */}
      {service.whatWeBuild && service.whatWeBuild.length > 0 && (
        <section>
          <div className="2xl:py-20 py-11">
            <div className="container">
              <div className="flex flex-col gap-12">
                <div className="flex flex-col justify-center items-center gap-3">
                  <h2 className="text-center max-w-2xl mx-auto">What we build</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {service.whatWeBuild.map((item, i) => (
                    <div
                      key={i}
                      className="p-8 rounded-2xl bg-dark_black/5 dark:bg-white/5 border border-dark_black/10 dark:border-white/10"
                    >
                      <p className="text-dark_black/80 dark:text-white/80 text-base flex items-start gap-3">
                        <span className="text-purple_blue shrink-0">•</span>
                        <span>{item}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How it works - numbered cards */}
      {service.howItWorks && service.howItWorks.length > 0 && (
        <section>
          <div className="2xl:py-20 py-11">
            <div className="container">
              <div className="flex flex-col gap-12">
                <div className="flex flex-col justify-center items-center gap-3">
                  <h2 className="text-center max-w-2xl mx-auto">How it works</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 w-full">
                  {service.howItWorks.map((item, i) => (
                    <div
                      key={i}
                      className="p-8 rounded-2xl bg-dark_black/5 dark:bg-white/5 border border-dark_black/10 dark:border-white/10 flex flex-col gap-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple_blue text-white text-lg font-medium">
                        {i + 1}
                      </span>
                      <p className="text-dark_black/60 dark:text-white/60 text-base leading-relaxed">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Technologies we use - same card style as About */}
      {service.technologies && service.technologies.length > 0 && (
        <section>
          <div className="2xl:py-20 py-11">
            <div className="container">
              <div className="flex flex-col gap-12">
                <div className="flex flex-col justify-center items-center gap-3">
                  <h2 className="text-center max-w-2xl mx-auto">Technologies we use</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                  {service.technologies.map((tech, i) => (
                    <div
                      key={i}
                      className="p-8 rounded-2xl bg-dark_black/5 dark:bg-white/5 border border-dark_black/10 dark:border-white/10"
                    >
                      <h4 className="mb-2">{tech.category}</h4>
                      <p className="text-dark_black/60 dark:text-white/60 text-base">
                        {tech.items}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Images */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="flex flex-col gap-12">
              <div className="flex flex-col justify-center items-center gap-3">
                <h2 className="text-center max-w-2xl mx-auto">In action</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {service.images.map((src, i) => (
                  <div
                    key={i}
                    className="relative aspect-video rounded-2xl overflow-hidden border border-dark_black/10 dark:border-white/10 bg-dark_black/5 dark:bg-white/5"
                  >
                    <Image
                      src={src}
                      alt={`${service.title} - image ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects showcase */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="flex flex-col gap-12">
              <div className="flex flex-col justify-center items-center gap-3">
                <h2 className="text-center max-w-2xl mx-auto">Projects we&apos;ve delivered</h2>
                <p className="text-dark_black/60 dark:text-white/60 text-center max-w-xl">
                  A selection of work delivered for this service.
                </p>
              </div>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-2xl overflow-hidden border border-dark_black/10 dark:border-white/10 hover:border-purple_blue/30 transition-colors"
                  >
                    <div className="aspect-4/3 relative bg-dark_black/5 dark:bg-white/5">
                      <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-medium text-dark_black dark:text-white group-hover:text-purple_blue transition-colors">
                        {project.title}
                      </h3>
                      {project.tag?.length > 0 && (
                        <p className="text-sm text-dark_black/60 dark:text-white/60 mt-1">
                          {project.tag.join(" · ")}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-dark_black/60 dark:text-white/60">
                Case studies for this service are coming soon.
              </p>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Avail this service */}
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <div className="rounded-3xl border border-dark_black/10 dark:border-white/10 bg-dark_black/5 dark:bg-white/5 p-8 md:p-12 flex flex-col items-center text-center max-w-2xl mx-auto">
              <h2 className="mb-3">Ready to get started?</h2>
              <p className="text-dark_black/60 dark:text-white/60 mb-8">
                Tell us about your project and we&apos;ll tailor our {service.shortTitle} offering to your needs.
              </p>
              <Link
                href={`/contact?service=${encodeURIComponent(service.title)}`}
                className="group bg-purple_blue text-white font-medium flex flex-row justify-between items-center py-2 px-5 rounded-full max-w-64 w-full md:py-3 border border-purple_blue transition-all duration-200 ease-in-out hover:bg-transparent hover:text-purple_blue"
              >
                <span className="flex text-start transform transition-transform duration-200 ease-in-out group-hover:translate-x-28">
                  Avail {service.shortTitle}
                </span>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform transition-transform duration-200 ease-in-out group-hover:-translate-x-44 group-hover:rotate-45">
                  <rect width="40" height="40" rx="20" className="fill-white transition-colors duration-200 ease-in-out group-hover:fill-purple_blue" />
                  <path d="M15.832 15.3334H24.1654V23.6667" className="stroke-[#1B1D1E] transition-colors duration-200 ease-in-out group-hover:stroke-white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15.832 23.6667L24.1654 15.3334" className="stroke-[#1B1D1E] transition-colors duration-500 ease-in-out group-hover:stroke-white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
