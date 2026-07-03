-- إضافة عمود company_id لجدول equipment_types
-- يسمح بربط نوع المعدة بشركة معينة

ALTER TABLE equipment_types ADD COLUMN IF NOT EXISTS company_id text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_types_company_id ON equipment_types(company_id);
