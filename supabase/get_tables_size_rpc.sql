-- ======================================================
-- RPC Function: get_tables_size
-- تشغّل هذا في Supabase SQL Editor لتفعيل حجم البيانات الحقيقي
-- ======================================================

CREATE OR REPLACE FUNCTION get_tables_size()
RETURNS TABLE(table_name TEXT, total_bytes BIGINT, table_bytes BIGINT, index_bytes BIGINT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    relname::TEXT                          AS table_name,
    pg_total_relation_size(oid)::BIGINT    AS total_bytes,
    pg_relation_size(oid)::BIGINT          AS table_bytes,
    (pg_total_relation_size(oid) - pg_relation_size(oid))::BIGINT AS index_bytes
  FROM pg_class
  WHERE relkind = 'r'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ORDER BY total_bytes DESC;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_tables_size() TO service_role;
GRANT EXECUTE ON FUNCTION get_tables_size() TO authenticated;
