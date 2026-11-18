import { site } from "@/lib/site";
import { LinkedInIcon } from "./AuthorCard";

/** A LinkedIn button that stays in the bottom-right corner of every public page. */
export function LinkedInBadge() {
  return (
    <a
      href={site.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${site.author} on LinkedIn`}
      className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-[#0A66C2] p-3 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:brightness-110 sm:bottom-6 sm:right-6 sm:py-2.5 sm:pl-3 sm:pr-4"
    >
      <LinkedInIcon size={18} />
      <span className="hidden sm:inline">LinkedIn</span>
    </a>
  );
}
