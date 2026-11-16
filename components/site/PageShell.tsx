import { SiteFooter, SiteHeader } from "./SiteHeader";

export function PageShell({ children, width = "max-w-3xl" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="stage-bg flex min-h-[100svh] flex-col">
      <SiteHeader />
      <main id="main" className={`mx-auto w-full ${width} px-5 pb-20 pt-10 sm:px-8 sm:pt-14`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
