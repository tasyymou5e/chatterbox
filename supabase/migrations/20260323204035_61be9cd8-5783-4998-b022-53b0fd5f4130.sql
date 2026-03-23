create table public.test_run_results (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  total_tests int default 0,
  passed int default 0,
  failed int default 0,
  skipped int default 0,
  duration_ms int,
  results jsonb,
  triggered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.test_run_results enable row level security;

create policy "Admins can manage test results"
  on public.test_run_results for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));