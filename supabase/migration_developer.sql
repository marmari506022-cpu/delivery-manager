-- ======================================================
-- Migration: حساب المطوّر (Developer Super-Admin)
-- شغّل هذا الملف كاملاً في Supabase SQL Editor
-- ======================================================

-- جدول حسابات المطورين (منفصل عن users لأنه فوق كل المديرين)
create table if not exists developers (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  username text unique not null,
  password text not null,
  name text not null default 'المطوّر',
  created_at timestamptz default now()
);

-- إنشاء حساب مطوّر افتراضي — غيّر اليوزر والباسورد فوراً بعد أول دخول
insert into developers (id, username, password, name)
values (substr(replace(gen_random_uuid()::text,'-',''),1,12), 'developer', 'developer123', 'المطوّر')
on conflict (username) do nothing;
