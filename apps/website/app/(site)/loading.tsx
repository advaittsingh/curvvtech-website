export default function SiteLoading() {
  return (
    <main className="pt-44 pb-20">
      <div className="container flex flex-col items-center gap-4">
        <div className="h-12 w-56 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-4 w-full max-w-lg rounded bg-white/5 animate-pulse" />
        <div className="mt-12 grid w-full gap-8 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="aspect-[3/2] w-full rounded-2xl bg-white/8 animate-pulse" />
              <div className="h-6 w-40 rounded bg-white/8 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
