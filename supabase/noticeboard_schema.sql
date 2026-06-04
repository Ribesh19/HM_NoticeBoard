create schema if not exists app_private;

create table if not exists public.noticeboard_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.noticeboard_admins enable row level security;

create or replace function app_private.is_noticeboard_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.noticeboard_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function app_private.is_noticeboard_admin() from public;
grant usage on schema app_private to anon, authenticated;
grant execute on function app_private.is_noticeboard_admin() to anon, authenticated;

drop policy if exists "Admins can read admin list" on public.noticeboard_admins;
create policy "Admins can read admin list"
on public.noticeboard_admins
for select
to authenticated
using (app_private.is_noticeboard_admin());

create table if not exists public.noticeboard_slides (
  id text primary key,
  enabled boolean not null default true,
  sort_order integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.noticeboard_slides enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_noticeboard_slides_updated_at on public.noticeboard_slides;
create trigger set_noticeboard_slides_updated_at
before update on public.noticeboard_slides
for each row execute function public.set_updated_at();

drop policy if exists "Anyone can read enabled noticeboard slides" on public.noticeboard_slides;
create policy "Anyone can read enabled noticeboard slides"
on public.noticeboard_slides
for select
to anon, authenticated
using (enabled = true or app_private.is_noticeboard_admin());

drop policy if exists "Noticeboard admins can insert slides" on public.noticeboard_slides;
create policy "Noticeboard admins can insert slides"
on public.noticeboard_slides
for insert
to authenticated
with check (app_private.is_noticeboard_admin());

drop policy if exists "Noticeboard admins can update slides" on public.noticeboard_slides;
create policy "Noticeboard admins can update slides"
on public.noticeboard_slides
for update
to authenticated
using (app_private.is_noticeboard_admin())
with check (app_private.is_noticeboard_admin());

drop policy if exists "Noticeboard admins can delete slides" on public.noticeboard_slides;
create policy "Noticeboard admins can delete slides"
on public.noticeboard_slides
for delete
to authenticated
using (app_private.is_noticeboard_admin());

grant select on public.noticeboard_slides to anon, authenticated;
grant insert, update, delete on public.noticeboard_slides to authenticated;
grant select on public.noticeboard_admins to authenticated;

create table if not exists public.noticeboard_publish_events (
  id text primary key default 'current' check (id = 'current'),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.noticeboard_publish_events enable row level security;

drop policy if exists "Anyone can listen for noticeboard publishes" on public.noticeboard_publish_events;
create policy "Anyone can listen for noticeboard publishes"
on public.noticeboard_publish_events
for select
to anon, authenticated
using (id = 'current');

drop policy if exists "Noticeboard admins can create publish event" on public.noticeboard_publish_events;
create policy "Noticeboard admins can create publish event"
on public.noticeboard_publish_events
for insert
to authenticated
with check (id = 'current' and app_private.is_noticeboard_admin());

drop policy if exists "Noticeboard admins can update publish event" on public.noticeboard_publish_events;
create policy "Noticeboard admins can update publish event"
on public.noticeboard_publish_events
for update
to authenticated
using (id = 'current' and app_private.is_noticeboard_admin())
with check (id = 'current' and app_private.is_noticeboard_admin());

grant select on public.noticeboard_publish_events to anon, authenticated;
grant insert, update on public.noticeboard_publish_events to authenticated;

insert into public.noticeboard_publish_events (id)
values ('current')
on conflict (id) do nothing;

insert into public.noticeboard_slides (id, enabled, sort_order, payload)
values
('welcome', true, 1, '{"id":"welcome","enabled":true,"sort_order":1,"template":"hero","label":"Welcome","eyebrow":"Today at Hockley Mint","title":"Good morning, co-owners","body":"A quick look at the notices, events, birthdays, values and useful updates for the workshop today.","accent":"green","meta_label":"Workshop hours","meta_value":"07:30-17:00","media_url":"assets/logo-full.png","media_type":"image","items":[]}'::jsonb),
('announcements', true, 2, '{"id":"announcements","enabled":true,"sort_order":2,"template":"notice","label":"Announcements","eyebrow":"Announcements","title":"Annual co-owners meeting","body":"All co-owners are invited to the main workshop. Agenda: FY results, Aurora collection, sustainability update and open Q&A.","accent":"dark","meta_label":"When","meta_value":"Friday 16 May, 15:00","media_url":"","media_type":"","items":["Refreshments from 14:30","RSVP on the kitchen sign-up sheet","Questions welcome in advance"]}'::jsonb),
('birthdays', true, 3, '{"id":"birthdays","enabled":true,"sort_order":3,"template":"birthday","label":"Birthday","eyebrow":"Birthday celebration","title":"Happy Birthday, Aisha","body":"Wishing you a wonderful day from everyone at Hockley Mint. Thank you for the care and craft you bring to the workshop.","accent":"mint","meta_label":"From","meta_value":"Your Hockley Mint team","media_url":"","media_type":"image","expires_at":"","items":[]}'::jsonb),
('events', true, 4, '{"id":"events","enabled":true,"sort_order":4,"template":"events","label":"Events","eyebrow":"Upcoming events","title":"This fortnight at the workshop","body":"Key dates and useful reminders for everyone on site.","accent":"green","meta_label":"","meta_value":"","media_url":"","media_type":"","items":["08 May - Co-owners coffee, Kitchen, 09:00","13 May - Fire drill, whole building, 11:30","22 May - Aurora press preview, Showroom, 10:00"]}'::jsonb),
('values', true, 5, '{"id":"values","enabled":true,"sort_order":5,"template":"image","label":"Company Values","eyebrow":"Our values","title":"What we stand for","body":"Kind to our environment. Delighted customers. Honest British craftsmanship. Happy co-owners.","accent":"dark","meta_label":"","meta_value":"","media_url":"assets/Values (Desktop Wallpaper).jpg","media_type":"image","items":[]}'::jsonb),
('safety', true, 6, '{"id":"safety","enabled":true,"sort_order":6,"template":"notice","label":"Health & Safety","eyebrow":"Safety","title":"Fire drill on Tuesday","body":"Scheduled drill for all departments. Please leave by your nearest route and meet at the east car park assembly point.","accent":"amber","meta_label":"Time","meta_value":"Tuesday, 11:30","media_url":"","media_type":"","items":["Do not use lifts","Take visitors with you","Return only when cleared by Facilities"]}'::jsonb),
('kudos', true, 7, '{"id":"kudos","enabled":true,"sort_order":7,"template":"people","label":"Kudos","eyebrow":"Shout-outs","title":"Kudos from the workshop","body":"Small notes of appreciation from around the business.","accent":"mint","meta_label":"","meta_value":"","media_url":"","media_type":"","items":["Casting team - Q1 wedding band run shipped a day early","CAD team - bespoke commission turned around in 48 hours","Despatch - every next-day parcel out before cut-off"]}'::jsonb),
('document', true, 8, '{"id":"document","enabled":true,"sort_order":8,"template":"document","label":"Document","eyebrow":"Useful document","title":"Brand Guidelines V2","body":"The latest brand guidelines are available for anyone preparing internal or customer-facing materials.","accent":"green","meta_label":"PDF","meta_value":"P4707 Hockley Mint Brand Guidelines V2","media_url":"assets/P4707 Hockley Mint Brand Guidelines V2 SINGLE.pdf","media_type":"pdf","items":[]}'::jsonb)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'noticeboard-media',
  'noticeboard-media',
  true,
  52428800,
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read noticeboard media" on storage.objects;

drop policy if exists "Noticeboard admins can upload media" on storage.objects;
create policy "Noticeboard admins can upload media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'noticeboard-media' and app_private.is_noticeboard_admin());

drop policy if exists "Noticeboard admins can update media" on storage.objects;
create policy "Noticeboard admins can update media"
on storage.objects
for update
to authenticated
using (bucket_id = 'noticeboard-media' and app_private.is_noticeboard_admin())
with check (bucket_id = 'noticeboard-media' and app_private.is_noticeboard_admin());

drop policy if exists "Noticeboard admins can delete media" on storage.objects;
create policy "Noticeboard admins can delete media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'noticeboard-media' and app_private.is_noticeboard_admin());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'noticeboard_slides'
  ) then
    alter publication supabase_realtime add table public.noticeboard_slides;
  end if;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'noticeboard_publish_events'
  ) then
    alter publication supabase_realtime add table public.noticeboard_publish_events;
  end if;
end $$;

-- After creating the first Supabase Auth user in the dashboard, bootstrap them as an admin:
-- insert into public.noticeboard_admins (user_id, email)
-- select id, email from auth.users where email = 'admin@example.com';
