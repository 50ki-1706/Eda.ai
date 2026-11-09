-- Eda.ai データベーススキーマ（reylo はこのスキーマをライブDBから読み取る）
-- Prisma の camelCase カラムから、標準的な snake_case カラムへ移行した
-- アプリ層との整合はクエリ側のエイリアス（as "promptText" など）で保つ

-- Better Auth 用テーブル（better-auth/adapters/pg の命名規約: snake_case）

create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists session (
  id text primary key,
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  user_id text not null references "user" (id) on delete cascade
);

create table if not exists account (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references "user" (id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- アプリケーション用テーブル

create table if not exists chat (
  id uuid primary key default gen_random_uuid(),
  summary text not null,
  is_pinned boolean not null default false,
  user_id text not null references "user" (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branch (
  id uuid primary key default gen_random_uuid(),
  summary text not null,
  parent_branch_id uuid references branch (id) on delete set null,
  chat_id uuid not null references chat (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists message (
  id uuid primary key default gen_random_uuid(),
  prompt_text text not null,
  prompt_file text,
  parent_id uuid references message (id) on delete set null,
  response text not null,
  branch_id uuid not null references branch (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ユーザーが登録した LLM プロバイダーの API キー
-- キー本体は AES-256-GCM で暗号化して保存する（平文は保存しない）
-- provider は 'openrouter' | 'opencode' | 'google' のいずれか
create table if not exists user_api_key (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  provider text not null,
  encrypted_key text not null,
  key_hint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- ユーザーごとの設定（現在選択中のモデル）
create table if not exists user_setting (
  user_id text primary key references "user" (id) on delete cascade,
  model_id text not null,
  updated_at timestamptz not null default now()
);

create index if not exists on chat (user_id);
create index if not exists on branch (chat_id);
create index if not exists on message (branch_id);
