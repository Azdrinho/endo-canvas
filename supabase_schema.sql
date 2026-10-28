-- Create the employees table
create table public.employees (
  id text not null primary key, -- Using text to support existing ID formats or UUIDs
  name text not null,
  role text,
  previous_role text,
  photo_url text,
  date_str text, -- Birthday 'DD/MM'
  admission_date text,
  game_thumbnails text[], -- Array of strings for game thumbnails
  photo_scale numeric default 1,
  photo_position_x numeric default 0,
  photo_position_y numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.employees enable row level security;

-- Create a policy that allows all operations for now (since we don't have auth setup yet)
-- IN PRODUCTION: You should restrict this to authenticated users only!
create policy "Allow public access" on public.employees
  for all using (true);

-- ---------------------------------------------------------------------------
-- LOCKING THE TABLE DOWN
-- ---------------------------------------------------------------------------
-- The policy above is `using (true)`, which means RLS is enabled but permits
-- everything. The anon key is necessarily public (it ships inside the browser
-- bundle), so in practice anyone who has the app's URL can read, edit and
-- delete every employee record -- straight from the API, without opening the
-- page at all.
--
-- Run this ONLY after creating the accounts, or the app locks everyone out:
--
--   1. Supabase dashboard -> Authentication -> Users -> Add user, one per
--      person who should have access (email + password, "Auto Confirm").
--   2. Set VITE_REQUIRE_AUTH=true in .env and in the Vercel project, and
--      redeploy. The app now shows the sign-in screen (components/AuthGate).
--   3. Sign in and confirm the cards still load.
--   4. Then, and only then, run the statements below.
--
-- Step 4 is last on purpose: until it runs the data is still open, but if it
-- runs first the app stops working for everyone, including you.

-- drop policy "Allow public access" on public.employees;
--
-- create policy "Authenticated users have full access" on public.employees
--   for all
--   to authenticated
--   using (true)
--   with check (true);

-- The image libraries live in Storage, which has its own policies. Check
-- Storage -> Policies for each bucket and restrict them to `authenticated`
-- the same way; tightening this table alone still leaves the uploaded images
-- world-readable and world-deletable.

-- ---------------------------------------------------------------------------
-- MIGRATION: template_settings
-- ---------------------------------------------------------------------------
-- Run this once, in Supabase -> SQL Editor. It is additive and safe on a live
-- database: nothing is dropped and no existing row changes.
--
-- Why: this table has a column per field only for the ones it was designed
-- around. Every control built since then -- the whole New Provider panel
-- (sphere blur, per-sphere offsets, background asset, Gator logo transform,
-- composition scale, logo box radius...), the HR Feedback text and image
-- settings, the Hiring titles -- had no column, so it was never written
-- anywhere. Configure a card, open the app on another machine, and the work
-- is gone. Those fields now round-trip through this one jsonb column, so a
-- control added later needs no further migration.

alter table public.employees
  add column if not exists template_settings jsonb default '{}'::jsonb;

-- Until this runs, the app detects the missing column, keeps saving
-- everything it saved before, and warns once in the console. After it runs,
-- the template settings start persisting on the next edit.
