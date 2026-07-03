-- تفعيل UUID
create extension if not exists "uuid-ossp";

-- جدول المستخدمين
create table if not exists users (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  username text unique not null,
  password text not null,
  role text not null check (role in ('manager','supervisor','pilot')),
  name text not null,
  region text default '',
  phone text default '',
  supervisor_id text default '',
  active boolean default true,
  base_salary numeric default 0,
  created_at timestamptz default now()
);

-- جدول الطيارين
create table if not exists pilots (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  name text not null,
  region text default '',
  phone text default '',
  whatsapp text default '',
  supervisor_id text default '',
  base_salary numeric default 0,
  pilot_code text unique,
  active boolean default true,
  created_at timestamptz default now()
);

-- جدول السلف
create table if not exists advances (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  pilot_id text not null,
  amount numeric not null,
  date timestamptz default now(),
  reason text default '',
  settled boolean default false,
  settled_at timestamptz,
  deleted boolean default false,
  deleted_at timestamptz,
  supervisor_id text default '',
  added_by text default '',
  added_by_role text default ''
);

-- جدول الخصومات
create table if not exists deductions (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  pilot_id text not null,
  amount numeric not null,
  date timestamptz default now(),
  reason text default '',
  deleted boolean default false,
  deleted_at timestamptz,
  settled boolean default false,
  settled_at timestamptz,
  supervisor_id text default '',
  added_by text default '',
  added_by_role text default ''
);

-- جدول المكافآت
create table if not exists bonuses (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  pilot_id text not null,
  amount numeric not null,
  date timestamptz default now(),
  reason text default '',
  deleted boolean default false,
  deleted_at timestamptz,
  settled boolean default false,
  settled_at timestamptz,
  supervisor_id text default '',
  added_by text default '',
  added_by_role text default ''
);

-- جدول الزي الرسمي
create table if not exists uniforms (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  pilot_id text not null,
  type text not null,
  qty numeric default 0,
  date timestamptz default now(),
  price numeric default 0,
  settled boolean default false,
  settled_at timestamptz,
  supervisor_id text default '',
  condition text default 'new',
  transferred_from text default ''
);

-- جدول التمويل
create table if not exists funding (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  supervisor_id text not null,
  amount numeric not null,
  date timestamptz default now(),
  sent_by text default '',
  note text default '',
  is_request boolean default false,
  request_id text default '',
  original_amount numeric default 0
);

-- جدول الطلبات
create table if not exists requests (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  supervisor_id text not null,
  type text not null,
  qty numeric default 0,
  amount numeric default 0,
  status text default 'pending',
  date timestamptz default now(),
  note text default '',
  discount numeric default 0,
  discount_type text default 'fixed',
  company_id text default ''
);

-- إضافة عمود الشركة لجدول الطلبات (لو الجدول موجود من قبل)
alter table requests add column if not exists company_id text default '';

-- جدول المُسوّى
create table if not exists settled (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  pilot_id text not null,
  supervisor_id text not null,
  type text not null,
  ref_id text default '',
  amount numeric default 0,
  date timestamptz default now(),
  item_date timestamptz,
  details text default ''
);

-- جدول المخزن
create table if not exists inventory (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  supervisor_id text default '',
  amount numeric default 0,
  date timestamptz default now(),
  type text not null,
  qty numeric default 0,
  price numeric default 0,
  profit_margin numeric default 0,
  profit_type text default 'percent',
  direction text not null,
  batch_id text default ''
);

-- جدول راتب المشرف
create table if not exists manager_salary (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  supervisor_id text not null,
  type text not null,
  amount numeric not null,
  date timestamptz default now(),
  reason text default '',
  settled boolean default false,
  settled_at timestamptz
);

-- جدول أكواد إعادة التعيين
create table if not exists reset_codes (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  user_id text not null,
  code text not null,
  phone text default '',
  used boolean default false,
  created_at timestamptz default now()
);

-- جدول المناطق
create table if not exists regions (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- جدول الرصيد
create table if not exists balance (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  amount numeric not null,
  date timestamptz default now(),
  note text default '',
  direction text not null check (direction in ('in','out')),
  created_by text default ''
);

-- جدول المرتجعات
create table if not exists returns (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  supervisor_id text not null,
  pilot_id text not null,
  type text not null,
  qty numeric default 0,
  condition text default '',
  date timestamptz default now(),
  status text default 'pending',
  note text default '',
  approved_at timestamptz,
  approved_by text default ''
);

-- جدول الإشعارات
create table if not exists notifications (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  target_id text not null,
  type text not null,
  ref_id text default '',
  from_id text default '',
  status text default 'pending',
  date timestamptz default now(),
  note text default ''
);

-- إنشاء حساب المدير الافتراضي (غيّر الباسورد بعدين)
insert into users (id, username, password, role, name, active)
values (substr(replace(gen_random_uuid()::text,'-',''),1,12), 'admin', 'admin123', 'manager', 'المدير', true)
on conflict (username) do nothing;

-- جدول الشركات
create table if not exists companies (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- إضافة عمود company_id لجدول users (المشرفون)
alter table users add column if not exists company_id text default '';

-- إضافة عمود company_id لجدول pilots (الطيارون)
alter table pilots add column if not exists company_id text default '';

-- ======================================================
-- تحديث المخزن: إضافة company_id وسجل المخزن
-- ======================================================

-- إضافة عمود الشركة لجدول المخزن
alter table inventory add column if not exists company_id text default '';

-- جدول سجل المخزن (لوج كل العمليات)
create table if not exists inventory_log (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  action text not null check (action in ('add','send','accept_request','company_return')),
  company_id text default '',
  company_name text default '',
  type text not null,
  qty numeric default 0,
  price numeric default 0,
  supervisor_id text default '',
  supervisor_name text default '',
  batch_id text default '',
  performed_by text default '',
  note text default '',
  date timestamptz default now()
);

-- تحديث constraint على inventory_log لإضافة company_return
-- شغّل الأمر ده في Supabase SQL Editor:
-- ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_action_check;
-- ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_action_check CHECK (action IN ('add','send','accept_request','company_return'));

-- إضافة direction جديد للمرتجع من الشركة (لا يحتاج constraint تعديل — direction عمود text حر)

-- ======================================================
-- Migration: دعم أكثر من منطقة وأكثر من شركة للمشرف
-- يتم تخزين المناطق والشركات كـ comma-separated في الأعمدة الموجودة
-- لا يوجد تعديل على هيكل قاعدة البيانات مطلوب
-- الأعمدة region و company_id تدعم الآن قيم متعددة مفصولة بفاصلة
-- مثال: region = 'القاهرة,الجيزة' | company_id = 'id1,id2'
-- ======================================================
-- جدول أنواع المعدات الديناميكي
create table if not exists equipment_types (
  id text primary key default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  key text not null unique,
  icon text not null default '📦',
  label text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- إدراج الأنواع الأصلية
insert into equipment_types (key, icon, label, sort_order) values
  ('pouch',  '👜', 'كيس',      1),
  ('tshirt', '👕', 'تيشيرت',   2),
  ('jacket', '🧥', 'جاكيت',    3),
  ('cap',    '🧢', 'كاب',      4),
  ('helmet', '⛑️', 'خوذة',     5)
on conflict (key) do nothing;

-- إضافة عمود whatsapp لجدول pilots
alter table pilots add column if not exists whatsapp text default '';

-- إضافة حقول الحذف وأضيف_بواسطة لجدول السلف
alter table advances add column if not exists deleted boolean default false;
alter table advances add column if not exists deleted_at timestamptz;
alter table advances add column if not exists added_by text default '';
alter table advances add column if not exists added_by_role text default '';
