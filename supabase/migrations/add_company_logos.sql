create table if not exists company_logos (
  company_key text primary key,
  logo_url text,
  domain text,
  resolved_at timestamptz not null default now()
);

create index if not exists company_logos_resolved_at_idx on company_logos (resolved_at);

alter table company_logos enable row level security;
