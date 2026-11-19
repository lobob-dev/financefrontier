# Writing and publishing a post

A step-by-step guide to the admin area. It assumes the site is already set up (see the README).

## Sign in

1. Go to `https://YOUR-SITE/login`.
2. Either type your email and password, or choose **Email me a link**, enter your email and click the
   link in the email you receive. The link works once and expires after an hour.
3. You land on **Posts**, the list of everything you have written.

After ten wrong attempts in fifteen minutes the login pauses for fifteen minutes. That is the protection
against password guessing, not a fault.

## Start a post

Press **New post**. A blank draft opens in the editor. Drafts are private: nobody else can see them.

### Title and web address

Type the title at the top. The **Web address** box on the right fills itself in from the title, for
example "Why Dividends Are Not Free Money" becomes `/blog/why-dividends-are-not-free-money`. You can
change it by hand. Try not to change it after publishing, because old links to the post would stop working.

### Writing

Click into the page and write. The toolbar above the page has:

| Button | What it does | Keyboard |
| --- | --- | --- |
| Heading, Subheading | Section headings | type `## ` or `### ` at the start of a line |
| **B**, *I* | Bold and italic | Ctrl+B, Ctrl+I (Cmd on a Mac) |
| Link | Turn the selected words into a link | paste a web address over selected text |
| Lists | Bulleted or numbered list | type `- ` or `1. ` at the start of a line |
| Quote | A pull quote | type `> ` at the start of a line |
| Code block | For formulas or code, coloured automatically | type three backticks |
| Image | Add a picture | or drag a picture onto the page, or paste one |
| Table | A table of figures, with buttons to add or remove rows and columns | |
| Snapshot | A company snapshot box (see below) | |
| Undo, Redo | | Ctrl+Z, Ctrl+Shift+Z |

### Pictures

Drag a photo or chart from your computer onto the page, paste one, or press the picture button. It is
shrunk and compressed before uploading (a 5 MB phone photo usually ends up around 200 to 400 KB), so you
do not need to resize anything yourself.

Then **click the picture** and fill in the two boxes that appear under the toolbar:

- **Alt text:** a short description for people who use screen readers, for example
  "Line chart of Apple's free cash flow from 2015 to 2025, rising from 70 to 110 billion dollars".
- **Caption (optional):** shown in small text under the picture on the site.

### Writing about a company: the snapshot box

For any post about a particular share, press **Snapshot** in the toolbar (best at the very top of the
post) and fill in the form:

- **Company name, ticker and exchange**, for example Microsoft, MSFT, NASDAQ, or Commonwealth Bank, CBA, ASX.
- **Share price when written** and its currency. Use the price on the day you publish.
- **My verdict:** Buy, Hold, Watch or Avoid.
- **Key numbers:** up to six, such as P/E, market cap or dividend yield. Leave a value empty to hide it.
- **One-line summary** (optional).

This does three things at once: it shows a summary card at the top of the post with a live chart under it,
it adds the call to the **Track record** page (which compares it with the market from then on), and it
gives the post a share picture with the ticker, verdict and move since the call.

Click **Edit snapshot** on the box to change it later.

### Finance terms are explained automatically

The first time a post uses a term such as P/E, free cash flow, moat or margin of safety, it gets a dotted
underline, and readers can hover or tap to see a plain-English definition. You do not need to do anything.
The list of terms is in `lib/content/glossary.ts`; ask for new ones to be added at any time.

### The boxes on the right

- **Excerpt:** two or three sentences that sum up the post. Shown on the book page, in the post list and
  in the RSS feed. Worth writing well: it is what makes people open the post.
- **Tags:** type a tag and press Enter (or type a comma). Tags you have used before are suggested as you
  type. Each tag gets its own page on the site. Up to 12 per post; two or three is usually right.
- **Cover image:** drop a picture onto the box or click it to choose one, then describe it. It appears on
  the book page and at the top of the post. Wide pictures (about 16:9) look best.
- **Series (optional):** give posts in a run the same series name, such as "Weekly Market Inspection",
  and they are linked together as Part 1, Part 2 and so on.
- **Guest author (optional):** only for a post someone else wrote. Their name replaces yours on it.
- **Search engine description:** what Google shows under the title, and what appears when someone shares
  the link. Leave it empty to use the excerpt. Around 150 characters is ideal.

### Saving

You do not need to save. A second and a half after you stop typing, the post saves itself, and the top
right shows **Saved** with the time. Ctrl+S (Cmd+S) saves straight away. If you try to close the tab
with unsaved changes, the browser asks first.

### Preview

Press **Preview** at the top to see the post the way readers will, with headings, quotes, pictures and
captions. Press **Write** to carry on.

## Publish

The **Ready to publish?** checklist on the right shows anything still missing (title, excerpt, cover,
picture descriptions, a tag). Only the title is required.

Press **Publish** at the top of the page, or use the **Publishing** box:

- **Publish now:** the post goes live immediately. It appears at the front of the book, at the top of the
  post list, in the RSS feed and in the sitemap for search engines.
- **Schedule for later:** pick a date and time (in your own time zone) and press **Schedule**. The post
  stays hidden until then and appears within about fifteen minutes of that time.
- **Unpublish:** takes a live or scheduled post off the site and turns it back into a draft. Nothing is
  lost; publish it again whenever you like.

Edits to a live post appear on the site as soon as they are saved.

## The post list

**Posts** shows everything, newest edits first. The buttons at the top filter by Drafts, Scheduled and
Published. Each row has **Edit**, **View** (live posts), **Publish** or **Unpublish**, and **Delete**.

Deleting asks you to confirm and cannot be undone. If you might want a post back, unpublish it instead.

## Good habits

- Write the excerpt last, once you know what the post actually says.
- Add alt text to every picture. It helps readers who cannot see it and helps search engines too.
- Keep the disclaimer in mind: every post already ends with "Everything on this site is personal opinion
  and education, not financial advice."
- Sign out on shared computers (top right).
