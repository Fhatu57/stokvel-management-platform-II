-- Stokvel Management Platform — reproducible initial schema
-- Run this migration on a new Supabase project before enabling the application.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'treasurer', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'member'
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_roles where user_id = auth.uid()),
    'member'::public.app_role
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  ) on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  contribution_amount numeric(12,2) not null check (contribution_amount > 0),
  frequency text not null check (frequency in ('weekly', 'bi-weekly', 'monthly')),
  max_members integer not null default 20 check (max_members > 1),
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive', 'closed')),
  next_payout date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create or replace function public.is_group_member(_group_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = _user_id
  );
$$;

create or replace function public.can_manage_group(_group_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_group_member(_group_id, _user_id)
    and (
      public.has_role(_user_id, 'admin')
      or public.has_role(_user_id, 'treasurer')
    );
$$;

create or replace function public.add_group_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id)
    values (new.id, new.created_by)
    on conflict (group_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_group_created_add_owner
  after insert on public.groups
  for each row execute function public.add_group_creator_as_member();

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  token uuid unique not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'late', 'missed')),
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payout_schedule (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position > 0),
  scheduled_date date,
  amount numeric(12,2) check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'skipped')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, user_id),
  unique (group_id, position)
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  location text,
  agenda text,
  minutes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interest_rates (
  id bigint generated by default as identity primary key,
  repo_rate numeric(5,2) not null,
  prime_rate numeric(5,2) not null,
  source text not null default 'SARB',
  fetched_at timestamptz not null default now()
);

create or replace function public.accept_invitation(_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  _inv public.invitations%rowtype;
  _current_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  select * into _inv
  from public.invitations
  where token = _token
    and status = 'pending'
    and expires_at > now()
    and lower(email) = _current_email;

  if not found then
    return json_build_object('success', false, 'message', 'Invalid, expired or mismatched invitation');
  end if;

  insert into public.group_members (group_id, user_id)
  values (_inv.group_id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), _inv.role)
  on conflict (user_id) do update set role = excluded.role;

  update public.invitations set status = 'accepted' where id = _inv.id;

  return json_build_object(
    'success', true,
    'group_id', _inv.group_id,
    'role', _inv.role
  );
end;
$$;

create or replace function public.set_user_role(_target_user_id uuid, _new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can assign roles';
  end if;

  insert into public.user_roles (user_id, role)
  values (_target_user_id, _new_role)
  on conflict (user_id) do update set role = excluded.role;
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invitations enable row level security;
alter table public.contributions enable row level security;
alter table public.payout_schedule enable row level security;
alter table public.meetings enable row level security;
alter table public.interest_rates enable row level security;

create policy "Profiles are visible to owner and admins" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Roles are visible to owner and admins" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Members view their groups" on public.groups
  for select to authenticated
  using (public.is_group_member(id));
create policy "Admins create groups" on public.groups
  for insert to authenticated
  with check (created_by = auth.uid() and public.has_role(auth.uid(), 'admin'));
create policy "Managers update their groups" on public.groups
  for update to authenticated
  using (public.can_manage_group(id)) with check (public.can_manage_group(id));
create policy "Admins delete their groups" on public.groups
  for delete to authenticated
  using (created_by = auth.uid() and public.has_role(auth.uid(), 'admin'));

create policy "Members view group memberships" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy "Managers manage group memberships" on public.group_members
  for all to authenticated
  using (public.can_manage_group(group_id))
  with check (public.can_manage_group(group_id));

create policy "Managers manage invitations" on public.invitations
  for all to authenticated
  using (public.can_manage_group(group_id))
  with check (public.can_manage_group(group_id));
create policy "Invitees view their invitations" on public.invitations
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

create policy "Members view permitted contributions" on public.contributions
  for select to authenticated
  using (user_id = auth.uid() or public.can_manage_group(group_id));
create policy "Managers create contributions" on public.contributions
  for insert to authenticated with check (public.can_manage_group(group_id));
create policy "Managers update contributions" on public.contributions
  for update to authenticated
  using (public.can_manage_group(group_id))
  with check (public.can_manage_group(group_id));

create policy "Members view payout schedules" on public.payout_schedule
  for select to authenticated using (public.is_group_member(group_id));
create policy "Managers manage payout schedules" on public.payout_schedule
  for all to authenticated
  using (public.can_manage_group(group_id))
  with check (public.can_manage_group(group_id));

create policy "Members view meetings" on public.meetings
  for select to authenticated using (public.is_group_member(group_id));
create policy "Managers manage meetings" on public.meetings
  for all to authenticated
  using (public.can_manage_group(group_id))
  with check (public.can_manage_group(group_id));

create policy "Authenticated users view interest rates" on public.interest_rates
  for select to authenticated using (true);

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
