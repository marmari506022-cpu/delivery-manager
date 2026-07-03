-- ======================================================
-- Migration: دعم أكثر من أدمن (Multi-Tenant)
-- شغّل هذا الملف كاملاً في Supabase SQL Editor
-- ======================================================

-- 1) إضافة admin_id للجداول المرتبطة بالأدمن مباشرة
ALTER TABLE users           ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE pilots          ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE regions         ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE companies       ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE equipment_types ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE balance         ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE inventory       ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE inventory_log   ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE funding         ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE requests        ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE returns         ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE notifications   ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
-- إضافة admin_id للجداول المرتبطة بالطيار/المشرف (لضمان العزل الكامل بين الأدمنز)
ALTER TABLE advances        ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE deductions      ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE bonuses         ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE uniforms        ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE settled         ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE manager_salary  ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';

-- 2) تحديث الـ Session: إضافة admin_id لجدول users (المشرفون والطيارون)
--    نربط كل مشرف/طيار بالمدير اللي أنشأه
--    (للبيانات القديمة: نربطها بأول مدير موجود)
DO $$
DECLARE
  first_admin_id text;
BEGIN
  SELECT id INTO first_admin_id FROM users WHERE role = 'manager' LIMIT 1;
  IF first_admin_id IS NOT NULL THEN
    -- تحديث المشرفين القدامى
    UPDATE users SET admin_id = first_admin_id
      WHERE role = 'supervisor' AND (admin_id IS NULL OR admin_id = '');
    -- تحديث الطيارين القدامى
    UPDATE pilots SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث المناطق
    UPDATE regions SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث الشركات
    UPDATE companies SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث أنواع المعدات
    UPDATE equipment_types SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث الرصيد
    UPDATE balance SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث المخزن
    UPDATE inventory SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث سجل المخزن
    UPDATE inventory_log SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث التمويل
    UPDATE funding SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث الطلبات
    UPDATE requests SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث المرتجعات
    UPDATE returns SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث الإشعارات
    UPDATE notifications SET admin_id = first_admin_id
      WHERE admin_id IS NULL OR admin_id = '';
    -- تحديث السجلات المرتبطة بالطيار/المشرف (ربطها عبر pilot_id → pilots.admin_id)
    UPDATE advances a SET admin_id = p.admin_id
      FROM pilots p WHERE a.pilot_id = p.id AND (a.admin_id IS NULL OR a.admin_id = '');
    UPDATE deductions a SET admin_id = p.admin_id
      FROM pilots p WHERE a.pilot_id = p.id AND (a.admin_id IS NULL OR a.admin_id = '');
    UPDATE bonuses a SET admin_id = p.admin_id
      FROM pilots p WHERE a.pilot_id = p.id AND (a.admin_id IS NULL OR a.admin_id = '');
    UPDATE uniforms a SET admin_id = p.admin_id
      FROM pilots p WHERE a.pilot_id = p.id AND (a.admin_id IS NULL OR a.admin_id = '');
    UPDATE settled a SET admin_id = u.admin_id
      FROM users u WHERE a.supervisor_id = u.id AND (a.admin_id IS NULL OR a.admin_id = '');
    UPDATE manager_salary a SET admin_id = u.admin_id
      FROM users u WHERE a.supervisor_id = u.id AND (a.admin_id IS NULL OR a.admin_id = '');
    -- fallback: أي سجل لم يُربط يأخذ الأدمن الأول
    UPDATE advances     SET admin_id = first_admin_id WHERE admin_id IS NULL OR admin_id = '';
    UPDATE deductions   SET admin_id = first_admin_id WHERE admin_id IS NULL OR admin_id = '';
    UPDATE bonuses      SET admin_id = first_admin_id WHERE admin_id IS NULL OR admin_id = '';
    UPDATE uniforms     SET admin_id = first_admin_id WHERE admin_id IS NULL OR admin_id = '';
    UPDATE settled      SET admin_id = first_admin_id WHERE admin_id IS NULL OR admin_id = '';
    UPDATE manager_salary SET admin_id = first_admin_id WHERE admin_id IS NULL OR admin_id = '';
  END IF;
END $$;

-- 3) إنشاء Indexes لتسريع الفلترة بـ admin_id
CREATE INDEX IF NOT EXISTS idx_users_admin_id           ON users(admin_id);
CREATE INDEX IF NOT EXISTS idx_pilots_admin_id          ON pilots(admin_id);
CREATE INDEX IF NOT EXISTS idx_regions_admin_id         ON regions(admin_id);
CREATE INDEX IF NOT EXISTS idx_companies_admin_id       ON companies(admin_id);
CREATE INDEX IF NOT EXISTS idx_equipment_types_admin_id ON equipment_types(admin_id);
CREATE INDEX IF NOT EXISTS idx_balance_admin_id         ON balance(admin_id);
CREATE INDEX IF NOT EXISTS idx_inventory_admin_id       ON inventory(admin_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_admin_id   ON inventory_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_funding_admin_id         ON funding(admin_id);
CREATE INDEX IF NOT EXISTS idx_requests_admin_id        ON requests(admin_id);
CREATE INDEX IF NOT EXISTS idx_returns_admin_id         ON returns(admin_id);
CREATE INDEX IF NOT EXISTS idx_advances_admin_id        ON advances(admin_id);
CREATE INDEX IF NOT EXISTS idx_deductions_admin_id      ON deductions(admin_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_admin_id         ON bonuses(admin_id);
CREATE INDEX IF NOT EXISTS idx_uniforms_admin_id        ON uniforms(admin_id);
CREATE INDEX IF NOT EXISTS idx_settled_admin_id         ON settled(admin_id);
CREATE INDEX IF NOT EXISTS idx_manager_salary_admin_id  ON manager_salary(admin_id);

-- 4) RPC لحجم البيانات (اختياري - للحجم الحقيقي)
CREATE OR REPLACE FUNCTION get_tables_size()
RETURNS TABLE(table_name TEXT, total_bytes BIGINT)
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT relname::TEXT, pg_total_relation_size(oid)::BIGINT
  FROM pg_class
  WHERE relkind = 'r'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ORDER BY 2 DESC;
$$;
GRANT EXECUTE ON FUNCTION get_tables_size() TO service_role;
GRANT EXECUTE ON FUNCTION get_tables_size() TO authenticated;

-- ======================================================
-- الملاحظة: بعد تشغيل هذا الملف، شغّل التطبيق وكل
-- بيانات جديدة ستُحفظ بـ admin_id تلقائياً
-- ======================================================
