import BookExperience from "@/components/book/BookExperience";
import { SiteHeader } from "@/components/site/SiteHeader";
import { LinkedInPopup } from "@/components/site/LinkedInPopup";
import { getBookPosts } from "@/lib/posts";

export default async function Home() {
  const posts = await getBookPosts();
  return (
    <>
      <SiteHeader floating />
      <main id="main">
        <BookExperience posts={posts} />
      </main>
      <LinkedInPopup />
    </>
  );
}
