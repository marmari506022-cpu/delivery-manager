-- ============================================================
-- Migration: نظام المرتجعات الجديد
-- ============================================================

-- 1. إضافة حقل frozen لجدول uniforms
ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS frozen boolean DEFAULT false;
ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS company_id text DEFAULT '';
ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS company_name text DEFAULT '';

-- 2. تعديل جدول returns ليدعم النظام الجديد
ALTER TABLE returns ADD COLUMN IF NOT EXISTS admin_id text DEFAULT '';
ALTER TABLE returns ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS rejected_by text DEFAULT '';
ALTER TABLE returns ADD COLUMN IF NOT EXISTS pilot_name text DEFAULT '';
ALTER TABLE returns ADD COLUMN IF NOT EXISTS supervisor_name text DEFAULT '';

-- 3. حقل price لجدول inventory (المخزن) إن لم يكن موجوداً
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS condition text DEFAULT 'new';

