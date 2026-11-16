-- Finance Frontier: posts, the admin allowlist, login rate limiting and image storage.
-- Every table has row level security switched on. Public visitors can only read
-- published posts whose publish date has passed. Only an email on the admins list
-- can create, edit or delete anything.

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- ---------------------------------------------------------------------------

create table public.admins (
  email text primary key check (email = lower(email))
);

alter table public.admins enable row level security;
-- No policies: nobody can read or change this table through the API.
-- Add or remove admins in the SQL editor of the Supabase dashboard.

insert into public.admins (email) values ('eeshankarra@gmail.com');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from public.admins a
      where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null default '' check (char_length(title) <= 200),
  excerpt text not null default '' check (char_length(excerpt) <= 600),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  cover_image_url text check (cover_image_url is null or char_length(cover_image_url) <= 1000),
  cover_image_alt text not null default '' check (char_length(cover_image_alt) <= 300),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  seo_description text not null default '' check (char_length(seo_description) <= 300),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  reading_minutes integer not null default 1 check (reading_minutes between 1 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_needs_date check (status = 'draft' or published_at is not null)
);

create index posts_public_idx on public.posts (published_at desc) where status = 'published';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

alter table public.posts enable row level security;

create policy "Anyone can read published posts"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());

create policy "Admins can read every post"
  on public.posts for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can create posts"
  on public.posts for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can edit posts"
  on public.posts for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete posts"
  on public.posts for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Login rate limiting
-- ---------------------------------------------------------------------------
-- The website records each login attempt under a hashed key (one for the visitor's
-- network address and one for the email typed). The keys are hashed on the server
-- with a secret, so nobody can tell from the table who tried to log in.

create table public.login_attempts (
  id bigint generated always as identity primary key,
  key text not null check (char_length(key) <= 128),
  attempted_at timestamptz not null default now()
);

create index login_attempts_key_idx on public.login_attempts (key, attempted_at desc);

alter table public.login_attempts enable row level security;
-- No policies: the table is only touched through the function below.

create or replace function public.register_login_attempt(p_keys text[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  k text;
  recent integer;
  allowed boolean := true;
begin
  if p_keys is null or cardinality(p_keys) = 0 or cardinality(p_keys) > 4 then
    return false;
  end if;

  delete from public.login_attempts where attempted_at < now() - interval '1 day';

  foreach k in array p_keys loop
    if k is null or char_length(k) > 128 then
      return false;
    end if;
    select count(*) into recent
      from public.login_attempts
      where key = k and attempted_at > now() - interval '15 minutes';
    -- Ten tries in fifteen minutes per network address or per email.
    if recent >= 10 then
      allowed := false;
    end if;
  end loop;

  if allowed then
    insert into public.login_attempts (key) select unnest(p_keys);
  end if;
  return allowed;
end;
$$;

revoke all on function public.register_login_attempt(text[]) from public;
grant execute on function public.register_login_attempt(text[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Image storage
-- ---------------------------------------------------------------------------
-- A public bucket, so readers can load images by their address, but only an
-- admin can upload, replace or delete files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif']
)
on conflict (id) do nothing;

create policy "Admins can list post images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'post-images' and (select public.is_admin()));

create policy "Admins can upload post images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images' and (select public.is_admin()));

create policy "Admins can replace post images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-images' and (select public.is_admin()))
  with check (bucket_id = 'post-images' and (select public.is_admin()));

create policy "Admins can delete post images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images' and (select public.is_admin()));
