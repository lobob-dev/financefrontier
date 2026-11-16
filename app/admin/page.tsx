import { Suspense } from "react";
import { listAllPosts } from "@/lib/admin/posts";
import { createPost } from "./actions";
import { PostList } from "@/components/admin/PostList";

export default function AdminHome() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Posts</h1>
          <p className="mt-2 text-ink-soft">Drafts are private. Published posts appear on the site and in the book.</p>
        </div>
        <form action={createPost}>
          <button type="submit" className="btn-primary px-5 py-2.5">
            <span aria-hidden="true">+</span> New post
          </button>
        </form>
      </div>
      <Suspense fallback={<p className="mt-10 text-sm text-muted">Loading posts…</p>}>
        <Posts />
      </Suspense>
    </div>
  );
}

async function Posts() {
  const posts = await listAllPosts();
  return <PostList posts={posts} />;
}
