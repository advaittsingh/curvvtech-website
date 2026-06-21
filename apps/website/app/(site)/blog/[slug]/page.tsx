import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCmsBlogBySlug } from "@/lib/cms-api";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchCmsBlogBySlug(slug);
  if (!post) notFound();

  return (
    <main className="container py-32 max-w-3xl">
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
