alter table public.classroom_students
  add column dob date,
  add column phone text not null default '',
  add column parent_phone text not null default '',
  add constraint classroom_students_phone_length check (char_length(phone) <= 40),
  add constraint classroom_students_parent_phone_length check (char_length(parent_phone) <= 40);
