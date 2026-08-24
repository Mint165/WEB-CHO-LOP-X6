create table public.classroom_settings (
  id text primary key,
  title text not null,
  teacher_info text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_settings_id_check check (id = 'lop-x6'),
  constraint classroom_settings_title_length check (char_length(title) between 1 and 200),
  constraint classroom_settings_teacher_length check (char_length(teacher_info) between 1 and 300)
);

create table public.classroom_students (
  id text primary key,
  classroom_id text not null default 'lop-x6' references public.classroom_settings(id) on delete cascade,
  name text not null,
  role text not null default '',
  seat_id text,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_students_name_length check (char_length(name) between 1 and 120),
  constraint classroom_students_role_length check (char_length(role) <= 120)
);

create unique index classroom_students_unique_seat
  on public.classroom_students (classroom_id, seat_id)
  where seat_id is not null;

insert into public.classroom_settings (id, title, teacher_info)
values ('lop-x6', 'SƠ ĐỒ LỚP 12/6 – Năm học 2026 - 2027', 'Giáo viên chủ nhiệm: Trần Dương Anh Tú (0983 456 457)');

grant select, insert, update, delete on public.classroom_settings to authenticated;
grant select, insert, update, delete on public.classroom_students to authenticated;
alter table public.classroom_settings enable row level security;
alter table public.classroom_students enable row level security;
create policy "Authenticated users read classroom settings" on public.classroom_settings for select to authenticated using (true);
create policy "Authenticated users update classroom settings" on public.classroom_settings for update to authenticated using (id = 'lop-x6') with check (id = 'lop-x6');
create policy "Authenticated users read classroom students" on public.classroom_students for select to authenticated using (classroom_id = 'lop-x6');
create policy "Authenticated users create classroom students" on public.classroom_students for insert to authenticated with check (classroom_id = 'lop-x6');
create policy "Authenticated users update classroom students" on public.classroom_students for update to authenticated using (classroom_id = 'lop-x6') with check (classroom_id = 'lop-x6');
create policy "Authenticated users delete classroom students" on public.classroom_students for delete to authenticated using (classroom_id = 'lop-x6');
alter publication supabase_realtime add table public.classroom_settings;
alter publication supabase_realtime add table public.classroom_students;
