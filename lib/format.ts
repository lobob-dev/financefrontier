export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** "Stock Picking" becomes "stock-picking", for tag page addresses. */
export function tagSlug(tag: string) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Turns a title into a web address, such as "Margin of Safety" into "margin-of-safety". */
export function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2018\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= 80) return slug;
  // cut long addresses at a whole word
  const cut = slug.slice(0, 81);
  return cut.slice(0, cut.lastIndexOf("-")).replace(/-+$/g, "");
}
