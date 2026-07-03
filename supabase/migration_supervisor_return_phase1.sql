-- ============================================================
-- Migration: نظام مرتجع المشرف - المرحلة الأولى
-- ============================================================

-- 1. إضافة حقل frozen_qty لجدول inventory (لتجميد كميات بعينها)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS frozen_qty numeric DEFAULT 0;

-- 2. إنشاء جدول return_requests (طلبات مرتجع المشرف للمدير)
CREATE TABLE IF NOT EXISTS return_requests (
  id text PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,12),
  supervisor_id text NOT NULL REFERENCES users(id),
  admin_id text DEFAULT '',
  status text DEFAULT 'pending', -- pending, approved, rejected
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by text DEFAULT '',
  rejected_at timestamptz,
  rejected_by text DEFAULT ''
);
