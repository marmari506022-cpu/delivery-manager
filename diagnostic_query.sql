-- استعلام تشخيصي: يوضح كل تسليمات الـ "كيس" لنفس المشرف
-- وبيوضح هل company_id فاضي أو خطأ في أي صف
SELECT id, pilot_id, type, qty, date, company_id, company_name, supervisor_id
FROM uniforms
WHERE type = 'pouch'
ORDER BY date DESC;

-- وكمان شوف حركات المخزون نفسها لنفس النوع
SELECT id, supervisor_id, type, qty, direction, company_id, batch_id, date
FROM inventory
WHERE type = 'pouch'
ORDER BY date DESC;
