# Finance Frontier

A personal blog on stock picking, presented as a floating 3D book.

**Current stage: book prototype.** The book, page turns, reading view and the simple 2D fallback
work with three sample posts. The database, login, admin editor and the full public pages come next.

## Run it

You need Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

## What to try

- Scroll, press the arrow keys, swipe sideways on a phone, or use the arrows at the bottom to turn pages.
- Click the cover or "Open the book" to open it.
- Click a line on the contents page to jump to that post.
- Click a post page, or "Read this post", to zoom in and open the full article.
- Use the moon button for dark mode.
- "Switch to simple view" (bottom left) shows the 2D fallback that low-power devices and
  visitors with reduced-motion settings get automatically. Adding `?view=2d` or `?view=3d` to the address forces either one.

## Where things live

| Path | What it is |
|---|---|
| `lib/site.ts` | Blog name, tagline, about text, contact email |
| `lib/posts.ts` | The three sample posts (replaced by the database later) |
| `components/book/Book.tsx` | The book model: covers, spine, page stacks, ribbon |
| `components/book/pageMaterial.ts` | The shader that bends a page as it turns |
| `components/book/textures.ts` | Draws every page and cover from post data |
| `components/book/BookScene.tsx` | Lighting, camera and particles |
| `components/book/BookExperience.tsx` | Scroll, keyboard, swipe and the on-screen controls |
| `components/book/FlipBook2D.tsx` | The simple 2D fallback |
| `app/blog` | Post list and reading view |

Everything on this site is personal opinion and education, not financial advice.
