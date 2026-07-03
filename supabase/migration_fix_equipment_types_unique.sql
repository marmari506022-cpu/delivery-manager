-- ======================================================
-- Migration: تصحيح فريدية معرف نوع المعدة (key) في equipment_types
-- المشكلة: العمود key كان "unique" بشكل عام على مستوى الجدول كله
-- (من schema.sql الأصلي)، فلو فيه أكثر من أدمن (admin_id)، أي أدمن
-- يحاول يضيف نوع معدة بمعرف (key) استخدمه أدمن آخر قبل كذا، يفشل
-- الإضافة برسالة "هذا المعرف مستخدم بالفعل" حتى لو هو فعلاً أول
-- مرة يستخدم هذا المعرف عنده. الحل: نلغي القيد العام، ونستبدله
-- بقيد فريد مركّب على (admin_id, key) بحيث كل أدمن له مساحة
-- أسماء (namespace) مستقلة لمعرفات المعدات.
-- شغّل هذا الملف كاملاً في Supabase SQL Editor بعد migration_multi_admin.sql
-- ======================================================

-- 1) إلغاء القيد القديم العام على key (لو موجود)
DO $$
DECLARE
  c text;
BEGIN
  SELECT con.conname INTO c
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'equipment_types'
    AND con.contype = 'u'
    AND con.conkey = (
      SELECT array_agg(attnum) FROM pg_attribute
      WHERE attrelid = rel.oid AND attname = 'key'
    );
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE equipment_types DROP CONSTRAINT %I', c);
  END IF;
END $$;

-- 2) التأكد من عدم وجود admin_id فاضي قبل إضافة القيد الجديد
--    (لو فيه صفوف admin_id فيها فاضي من قبل تشغيل migration_multi_admin.sql)
DO $$
DECLARE
  first_admin_id text;
BEGIN
  SELECT id INTO first_admin_id FROM users WHERE role = 'manager' LIMIT 1;
  IF first_admin_id IS NOT NULL THEN
    UPDATE equipment_types SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
  END IF;
END $$;

-- 3) إضافة قيد فريد مركّب: نفس الـ key مسموح يتكرر بين أدمنز مختلفين،
--    لكن ممنوع يتكرر عند الأدمن نفسه
ALTER TABLE equipment_types
  ADD CONSTRAINT equipment_types_admin_key_unique UNIQUE (admin_id, key);

-- 4) فهرس لتسريع الإضافة وحساب الترتيب (sort_order) بشكل صحيح لكل أدمن
CREATE INDEX IF NOT EXISTS idx_equipment_types_admin_sort
  ON equipment_types(admin_id, sort_order);

-- ======================================================
-- بعد تشغيل هذا الملف: إضافة معدات جديدة بنفس المعرف (key) المستخدم
-- عند أدمن آخر ستعمل بشكل طبيعي، وستظهر فوراً في مخزن الشركة
-- ومخزن الشركات للأدمن الذي أضافها.
-- ======================================================
