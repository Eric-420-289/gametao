create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  guest_name text not null,
  created_at timestamptz default now()
);

create table if not exists rooms (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  host_id uuid not null,
  name text not null,
  game text not null default 'liars-dice',
  status text not null default 'lobby',
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references users(id),
  name text not null,
  is_host boolean default false,
  status text not null default 'connected',
  joined_at timestamptz default now()
);

create table if not exists game_states (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade,
  game text not null default 'liars-dice',
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade,
  player_id uuid references players(id),
  content text not null,
  type text not null default 'message',
  created_at timestamptz default now()
);

create table if not exists settings (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade,
  dice_count int not null default 5,
  turn_time_seconds int not null default 30,
  wild_mode boolean not null default false,
  rule_set text not null default 'standard',
  created_at timestamptz default now()
);

create table if not exists statistics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  games_played int default 0,
  wins int default 0,
  losses int default 0,
  created_at timestamptz default now()
);
