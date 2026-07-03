-- ======================================================
-- Migration: إعدادات واجهة تسجيل الدخول (يتحكم فيها المطوّر فقط)
-- تُقرأ هذه الإعدادات من صفحة تسجيل الدخول العامة قبل أي تسجيل دخول،
-- فهي مخزّنة في قاعدة البيانات (وليس localStorage) عشان تظهر
-- لأي حد يفتح لينك التطبيق، مش بس على جهاز المطوّر.
-- شغّل هذا الملف كاملاً في Supabase SQL Editor
-- ======================================================

create table if not exists login_settings (
  id text primary key default 'default',
  icon text default '',
  title text default 'تسجيل الدخول',
  subtitle text default 'قم بتسجيل الدخول للوصول إلى لوحة التحكم',
  bg_image text default '',
  updated_at timestamptz default now()
);

insert into login_settings (id) values ('default')
on conflict (id) do nothing;
