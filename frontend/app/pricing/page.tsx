export default function PricingPage() {
  return (
    <main className="min-h-screen text-[#111111]">
      <div className="mx-auto max-w-5xl px-6 pb-12 md:pb-20">
        <header className="mb-16 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">
            ElVakt Pricing
          </p>
          <h1 className="mt-4 text-4xl font-light text-gray-900 md:text-5xl">
            Free now, premium when you need more.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
            Start with free postcode lookup and upgrade later for a more personal
            electricity tracking experience.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
              Free
            </p>
            <p className="mt-3 text-3xl font-light text-gray-900">0 SEK</p>
            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <p>Live postcode lookup</p>
              <p>Today&apos;s hourly electricity chart</p>
              <p>Region-based electricity pricing</p>
              <p>No account required</p>
            </div>
          </div>

          <div className="rounded-3xl bg-black p-8 text-white shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">
              Premium
            </p>
            <p className="mt-3 text-3xl font-light">Coming soon..</p>
            <div className="mt-6 space-y-3 text-sm text-white/80">
              <p>Saved default postcode</p>
              <p>Electricity price alerts</p>
              <p>Email notifications</p>
              <p>Profile-based experience</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
