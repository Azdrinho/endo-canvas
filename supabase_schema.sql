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
