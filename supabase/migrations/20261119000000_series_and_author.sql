-- Posts can belong to a series, such as "Weekly Market Inspection".
alter table public.posts
  add column if not exists series text
  check (series is null or char_length(series) <= 80);

-- Posts written by a guest carry their name. Empty means the site's own author.
alter table public.posts
  add column if not exists author text
  check (author is null or char_length(author) <= 80);
