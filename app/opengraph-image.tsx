import { ogCard, ogSize } from "@/lib/og/card";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ title: site.tagline, kicker: "A notebook on stock picking" });
}
