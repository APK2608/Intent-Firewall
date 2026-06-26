create table if not exists public.plans (
  id text primary key,
  user_id text,
  goal text not null,
  intent_hash text not null,
  merkle_root text not null,
  signature text not null,
  agent_id text,
  intent jsonb not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.executions (
  id text primary key,
  plan_id text not null references public.plans(id) on delete cascade,
  tool_name text not null,
  status text not null default 'allowed',
  risk_score integer not null check (risk_score between 0 and 10),
  result text,
  timestamp timestamptz not null default now()
);

create table if not exists public.blocked_actions (
  id text primary key,
  plan_id text not null references public.plans(id) on delete cascade,
  tool_name text not null,
  status text not null check (status in ('blocked', 'pending_approval', 'approved', 'rejected')),
  risk_score integer not null check (risk_score between 0 and 10),
  reason text,
  approved boolean,
  reviewed_by text,
  reviewed_at timestamptz,
  timestamp timestamptz not null default now()
);

create table if not exists public.approvals (
  id text primary key,
  action_id text not null,
  decision text not null check (decision in ('approved', 'rejected')),
  reviewed_by text not null,
  reviewed_at timestamptz not null default now()
);

create index if not exists idx_executions_plan_timestamp
  on public.executions(plan_id, timestamp);

create index if not exists idx_blocked_actions_plan_timestamp
  on public.blocked_actions(plan_id, timestamp);

create index if not exists idx_approvals_action_id
  on public.approvals(action_id);

create or replace view public.actions as
select
  id,
  plan_id,
  tool_name as action_name,
  status,
  risk_score,
  timestamp
from public.executions
union all
select
  id,
  plan_id,
  tool_name as action_name,
  status,
  risk_score,
  timestamp
from public.blocked_actions;
