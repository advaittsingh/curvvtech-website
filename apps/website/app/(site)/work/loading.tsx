export default function WorkLoading() {
  return (
    <main>
      <section>
        <div className="relative w-full pt-44 pb-10">
          <div className="container flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-48 rounded-lg bg-white/10 animate-pulse" />
            <div className="h-4 w-full max-w-md rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      </section>
      <section>
        <div className="py-11 2xl:py-20">
          <div className="container grid gap-x-6 gap-y-8 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-6">
                <div className="aspect-[625/410] w-full rounded-2xl bg-white/8 animate-pulse" />
                <div className="h-7 w-44 rounded bg-white/8 animate-pulse" />
                <div className="flex gap-3">
                  <div className="h-8 w-24 rounded-full bg-white/5 animate-pulse" />
                  <div className="h-8 w-28 rounded-full bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
