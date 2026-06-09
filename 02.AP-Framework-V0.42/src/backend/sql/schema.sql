-- 안심연결 DB 스키마 (데이터베이스설계서.md v1.0 기준, PostgreSQL/Supabase)
-- 멱등 실행 가능. Supabase SQL Editor 또는 db:push 스크립트로 적용.

create extension if not exists "pgcrypto";

-- 1. users
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  login_id      varchar(100) unique not null,
  password_hash varchar(255) not null,
  name          varchar(100) not null,
  role          varchar(20)  not null check (role in ('parent','family','admin')),
  phone         varchar(20),
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);
create index if not exists idx_users_role on users(role);

-- 2. parent_family_mappings
create table if not exists parent_family_mappings (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references users(id) on delete cascade,
  family_id  uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_mapping_parent_family unique (parent_id, family_id)
);
create index if not exists idx_mapping_family on parent_family_mappings(family_id);

-- 3. location_logs
create table if not exists location_logs (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references users(id) on delete cascade,
  latitude    numeric(10,7) not null,
  longitude   numeric(10,7) not null,
  accuracy    numeric(8,2),
  captured_at timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_loc_parent_captured on location_logs(parent_id, captured_at desc);

-- 4. emergency_alerts
create table if not exists emergency_alerts (
  id        uuid primary key default gen_random_uuid(),
  parent_id uuid not null references users(id) on delete cascade,
  latitude  numeric(10,7),
  longitude numeric(10,7),
  status    varchar(20) not null default 'sent' check (status in ('sent','failed')),
  sent_at   timestamptz not null default now()
);
create index if not exists idx_alert_parent_sent on emergency_alerts(parent_id, sent_at desc);

-- 5. chat_rooms / chat_room_members
create table if not exists chat_rooms (
  id         uuid primary key default gen_random_uuid(),
  name       varchar(100),
  created_at timestamptz not null default now()
);
create table if not exists chat_room_members (
  room_id   uuid not null references chat_rooms(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- 6. chat_messages
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references chat_rooms(id) on delete cascade,
  sender_id  uuid not null references users(id) on delete cascade,
  content    text not null check (length(content) > 0),
  status     varchar(20) not null default 'sent' check (status in ('sent','failed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_msg_room_created on chat_messages(room_id, created_at desc);

-- 7. message_dispatches
create table if not exists message_dispatches (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references users(id) on delete cascade,
  channel       varchar(20) not null check (channel in ('sms','kakao')),
  template_code varchar(100),
  content       text,
  status        varchar(20) not null check (status in ('success','failed')),
  fail_reason   text,
  sent_by       uuid not null references users(id),
  created_at    timestamptz not null default now()
);
create index if not exists idx_dispatch_recipient on message_dispatches(recipient_id, created_at desc);

-- 8. access_logs
create table if not exists access_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id) on delete set null,
  method      varchar(10) not null,
  path        varchar(255) not null,
  status_code integer not null,
  result      varchar(20) not null check (result in ('allowed','denied')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_access_actor_created on access_logs(actor_id, created_at desc);
