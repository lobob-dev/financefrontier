# Finance Frontier

A personal blog on stock picking. The home page is a 3D book that floats in space: each page is a post,
newest first. Behind it is a private admin area where you write and publish posts.

- **Public site:** the book (`/`), every post with search and tags (`/blog`), tag pages, About, Contact,
  an RSS feed, a sitemap and share images for social media.
- **Admin area:** `/login` and `/admin`. Only one email address can get in. Write with a rich text editor,
  drop images straight into the page, save drafts automatically, preview, publish now or schedule for later.
- **Hosting:** Vercel (free Hobby plan) for the website, Supabase (free plan) for the database,
  sign-in and image storage.

To write and publish posts once everything is set up, see [docs/WRITING.md](docs/WRITING.md).

---

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. Until Supabase is connected, the site shows three sample posts and the login
page explains that Supabase is not connected yet. Everything public works this way, so you can try the
book straight away.

---

## 2. Set up Supabase (free)

Supabase holds the posts, signs you in and stores your images.

### Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a new project. Pick the free plan and the
   region closest to you. Save the database password somewhere safe (the site does not need it).
2. Wait a minute or two for the project to start.

### Create the tables and security rules

1. In the project, open **SQL Editor** and start a new query.
2. Open `supabase/migrations/20261116000000_init.sql` from this project, copy everything, paste it
   into the editor and press **Run**. It creates the posts table, the admin list (already holding
   `eeshankarra@gmail.com`), login rate limiting, the image bucket and all the row level security rules.
3. Optional: run `supabase/seed.sql` the same way to add the three sample posts. You can delete them
   later from the admin area.

### Lock down sign-in

1. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". Nobody can
   create an account, so the only account is the one you make in the next step.
2. Still under Authentication, find the password settings and set the minimum length to 12 or more.
3. **Authentication → Users → Add user → Create new user:** enter `eeshankarra@gmail.com`, choose a strong
   password and tick **Auto Confirm User**.
4. **Authentication → URL Configuration:**
   - **Site URL:** your live address, for example `https://financefrontier.vercel.app`
     (use `http://localhost:3000` until the site is live).
   - **Redirect URLs:** add `http://localhost:3000/auth/confirm` and `https://YOUR-LIVE-ADDRESS/auth/confirm`.
     Magic links only work for addresses on this list.

### Copy the keys

1. **Project Settings → Data API:** copy the **Project URL**.
2. **Project Settings → API Keys:** copy the **publishable** key (it starts with `sb_publishable_`).
   Do not copy the secret key; the site does not need it.
3. Copy `.env.example` to a new file called `.env.local` and fill it in (see the next section).
4. Stop `npm run dev` (Ctrl+C) and start it again. Go to http://localhost:3000/login and sign in.

> Supabase's free plan pauses a project after a week with no visits. The live site pings the database
> once a day (see "Daily ping" below) so this does not happen.

> Supabase's built-in email sender only sends a few emails an hour. That is plenty for magic links to one
> person. If you ever want more, add your own SMTP provider under Authentication → Emails.

---

## 3. Environment variables

All secrets live in environment variables, never in the code. `.env.example` lists them with notes.

| Name | What it is | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | The site's public address, no trailing slash. `http://localhost:3000` locally. | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL. | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. Safe in the browser: row level security protects the data. | No |
| `ADMIN_EMAIL` | The one email allowed into `/admin`. Must match the `admins` table. | No |
| `RATE_LIMIT_SECRET` | Random string used to hash login attempts. Make one with `openssl rand -hex 32`. | **Yes** |
| `CRON_SECRET` | Random string Vercel sends with the daily ping. Make one the same way. | **Yes** |

On a Mac or Linux, `openssl rand -hex 32` in a terminal prints a suitable random string. On Windows,
any password manager's "generate password" (40+ characters, letters and numbers) works too.

---

## 4. Put it online with Vercel (free)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account (the Hobby plan is free for
   personal, non-commercial sites).
2. **Add New → Project**, choose the `financefrontier` repository and press **Import**.
3. Open **Environment Variables** and add every variable from the table above.
   Set `NEXT_PUBLIC_SITE_URL` to the address Vercel gives you (for example
   `https://financefrontier.vercel.app`), or your own domain if you add one later.
4. Press **Deploy**. After a minute or two the site is live.
5. Back in Supabase, put the live address into **Site URL** and add `https://YOUR-LIVE-ADDRESS/auth/confirm`
   to **Redirect URLs** (section 2).
6. In Vercel, open the project's **Analytics** tab and press **Enable** for free visitor statistics.

From now on, every push to the `main` branch on GitHub redeploys the site automatically. Publishing a
post does **not** need a redeploy: it appears straight away.

### Daily ping

`vercel.json` asks Vercel to call `/api/keepalive` once a day. It reads one row from the database so the
free Supabase project never pauses, and it refreshes the post cache. Vercel adds the `CRON_SECRET` to the
request, so nobody else can trigger it. You can see each run under the project's **Settings → Cron Jobs**.

### Your own domain (optional)

Buy a domain from any registrar, then in Vercel open **Settings → Domains** and follow the steps. Afterwards
update `NEXT_PUBLIC_SITE_URL` in Vercel and the Site URL and Redirect URLs in Supabase, then redeploy.

---

## 5. Changing the admin email

The address is stored in two places, and both must agree:

1. In Supabase SQL Editor:
   ```sql
   update public.admins set email = 'new@example.com' where email = 'eeshankarra@gmail.com';
   ```
2. In Vercel (and `.env.local`), change `ADMIN_EMAIL`, then redeploy.
3. Create the new user under Authentication → Users as in section 2.

---

## How it is kept safe

- **One admin.** Public sign-up is switched off in Supabase. The login only accepts the address in
  `ADMIN_EMAIL`, every admin page checks the signed-in account with Supabase on each request, and the
  database checks it again.
- **Row level security.** Visitors can only read posts that are published and whose publish time has
  passed. Only the email in the `admins` table can create, edit or delete posts or upload images, even
  when talking to the database directly.
- **Safe content.** Posts are stored as structured editor data and turned into HTML by our own renderer,
  which escapes all text and only allows normal web and email links. The result then passes through an
  allowlist sanitiser. Typing `<script>` into a post just shows the text.
- **Forms.** All admin actions are Next.js Server Actions, which only run as POST requests from this site's
  own pages (they check the Origin header), so other sites cannot submit them (CSRF protection). The login
  form has a hidden field that catches spam bots.
- **Rate limiting.** Ten login attempts per fifteen minutes per network address and per email address.
  Magic links and wrong passwords give the same message, so the login never reveals which emails exist.
- **Headers.** The site cannot be framed by other sites, and admin pages are hidden from search engines.

---

## Working on the code

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` | Production build (also checks types) |
| `npm run lint` | Lint |
| `npm run typecheck` | Type check |
| `npm run db:start` | Optional: a full local Supabase in Docker, for testing login and the editor offline |
| `npm run db:reset` | Recreate the local database from the migration and seed |
| `npm run seed:sql` | Rewrite `supabase/seed.sql` from `lib/samplePosts.ts` |

For the local Supabase, run `npm run db:start`, then put the URL and publishable key it prints into
`.env.local`. Its test mailbox (for magic links) is at http://127.0.0.1:54324.

### Where things are

```
app/
  page.tsx                 the book (home page)
  blog/                    all posts, and each post at /blog/[slug]
  tags/[tag]/              posts with one tag
  about/, contact/         About and Contact
  login/                   sign-in page and its server actions
  auth/confirm/            where magic links land
  admin/                   admin dashboard, editor and their server actions
  rss.xml/, sitemap.ts, robots.ts, opengraph-image.tsx
  api/keepalive/           the daily ping
components/
  book/                    the 3D book and its 2D fallback
  admin/                   editor, post list, image and tag fields
  site/                    header, footer, post cards, search
lib/
  posts.ts                 reading published posts (cached)
  content/                 editor documents and the safe HTML renderer
  auth.ts, rateLimit.ts    admin check and login rate limiting
  supabase/                Supabase clients
  admin/                   admin queries and image upload
supabase/
  migrations/              database tables and security rules
  seed.sql                 the three sample posts
proxy.ts                   refreshes the sign-in session and guards /admin
```

### The book

The book reads the newest 12 published posts (`bookPostLimit` in `lib/site.ts`). Each page is drawn
onto a canvas and used as a texture on a bending sheet (`components/book/pageMaterial.ts`). Only the
current and neighbouring pages exist at any moment. Visitors with reduced motion, low-power devices or
no WebGL get the HTML page-flip version instead; `?view=2d` or `?view=3d` forces either one.
