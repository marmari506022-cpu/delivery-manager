-- إضافة عمود لتتبع حالة تقفيل راتب الطيار بشكل دائم في قاعدة البيانات
-- بدلاً من الاعتماد على حالة مؤقتة في الواجهة فقط
alter table pilots add column if not exists salary_closed boolean not null default false;
