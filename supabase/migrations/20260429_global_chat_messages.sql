-- Global chat messages (not project-scoped)
-- The existing messages table requires project_id NOT NULL,
-- so we create a separate table for global AI assistant conversations.

create table if not exists global_chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now() not null
);

create index idx_global_chat_messages_user on global_chat_messages(user_id, created_at);

-- RLS
alter table global_chat_messages enable row level security;

create policy "Users can read own global chat messages"
  on global_chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own global chat messages"
  on global_chat_messages for insert
  with check (auth.uid() = user_id);

