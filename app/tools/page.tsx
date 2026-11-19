import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { DividendCalculator, FairValueCalculator, GrowthCalculator } from "@/components/tools/Calculators";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Investor tools",
  description: "Free calculators: estimate a share's fair value, see what an investment would have become, and plan dividend income.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  return (
    <PageShell width="max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">Tools</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Investor tools</h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        Three simple calculators for thinking about shares. Change any number and the answer updates straight away.
      </p>
      <nav aria-label="Calculators" className="mt-6 flex flex-wrap gap-2">
        {[
          ["#fair-value", "Fair value"],
          ["#what-if", "What would $1,000 have become?"],
          ["#dividends", "Dividend income"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-soft ring-1 ring-line hover:text-accent-strong">
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-10 space-y-10">
        <FairValueCalculator />
        <GrowthCalculator />
        <DividendCalculator />
      </div>
      <p className="mt-10 text-xs text-muted">{site.disclaimer} These calculators are for learning, not for making decisions on their own.</p>
    </PageShell>
  );
}
