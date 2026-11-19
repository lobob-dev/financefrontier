import { getPublishedPostsWithContent } from "@/lib/posts";
import { renderDoc } from "@/lib/content/render";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/env";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
/** Feed readers need full addresses, so site-relative links and images get the domain added. */
const absolutise = (html: string) => html.replace(/(href|src)="\/(?!\/)/g, `$1="${siteUrl}/`);

export async function GET() {
  const posts = (await getPublishedPostsWithContent()).slice(0, 50);
  const items = posts
    .map((p) => {
      const url = `${siteUrl}/blog/${p.slug}`;
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${esc(p.excerpt)}</description>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join("\n")}
      <content:encoded>${cdata(absolutise(renderDoc(p.content, { explainTerms: false })))}</content:encoded>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(site.name)}</title>
    <link>${siteUrl}</link>
    <description>${esc(site.description)}</description>
    <language>en-gb</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${posts[0] ? `    <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
