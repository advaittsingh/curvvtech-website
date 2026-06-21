import Link from "next/link";
import { Metadata } from "next";
import { fetchCmsBlogs } from "@/lib/cms-api";

export const metadata: Metadata = {
  title: "Blog | Curvvtech",
  description: "Insights on software, design, and digital products from Curvvtech.",
};

export const revalidate = 60;

export default async function BlogIndexPage() {
  const posts = await fetchCmsBlogs();

  return (
    <main className="container py-32">
      <h1 className="text-4xl font-semibold mb-4">Blog</h1>
      <p className="text-dark_black/60 dark:text-white/60 mb-12 max-w-2xl">
        Articles on building products, shipping software, and growing service businesses.
      </p>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No published posts yet.</p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-border pb-8">
              <Link href={`/blog/${post.slug}`} className="group block">
                <h2 className="text-2xl font-medium group-hover:text-purple_blue transition-colors">{post.title}</h2>
                {post.excerpt && <p className="mt-2 text-dark_black/60 dark:text-white/60">{post.excerpt}</p>}
                {post.category_name && <p className="text-xs mt-2 uppercase tracking-wide text-muted-foreground">{post.category_name}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
