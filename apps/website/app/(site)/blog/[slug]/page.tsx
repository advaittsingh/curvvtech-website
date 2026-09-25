import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { fetchCmsBlogBySlug } from "@/lib/cms-api";
import { articleJsonLd, createPageMetadata } from "@/lib/seo";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchCmsBlogBySlug(slug);
  if (!post) return { title: "Blog post not found" };

  return createPageMetadata({
    title: post.meta_title ?? post.title,
    description:
      post.meta_description ?? post.excerpt ?? `Read ${post.title} on the Curvvtech blog.`,
    path: `/blog/${slug}`,
    image: post.featured_image_url,
    imageAlt: post.title,
    type: "article",
    modifiedTime: post.updatedAt,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchCmsBlogBySlug(slug);
  if (!post) notFound();

  return (
    <main className="container py-32 max-w-3xl">
      <JsonLd data={articleJsonLd(post)} />
      <Link href="/blog" className="text-sm text-purple_blue hover:underline mb-6 inline-block">
        ← Back to blog
      </Link>
      <h1 className="text-4xl font-semibold mb-4">{post.title}</h1>
      {post.category_name && <p className="text-xs uppercase tracking-wide text-muted-foreground mb-8">{post.category_name}</p>}
      <article className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
        {post.body ?? post.excerpt ?? ""}
      </article>
    </main>
  );
}
