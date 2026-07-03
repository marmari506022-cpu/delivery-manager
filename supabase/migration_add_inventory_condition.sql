-- إضافة عمود الحالة لجدول المخزن
alter table inventory add column if not exists condition text default 'new';
