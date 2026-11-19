import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPostForEditing, listKnownSeries, listKnownTags } from "@/lib/admin/posts";
import { PostEditor } from "@/components/admin/PostEditor";

export default function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  return (
    <Suspense fallback={<p className="p-10 text-sm text-muted">Opening the editor…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/posts/[id]">["params"] }) {
  const { id } = await params;
  const [post, tags, series] = await Promise.all([getPostForEditing(id), listKnownTags(), listKnownSeries()]);
  if (!post) notFound();
  return <PostEditor key={post.id} initial={post} knownTags={tags} knownSeries={series} />;
}
