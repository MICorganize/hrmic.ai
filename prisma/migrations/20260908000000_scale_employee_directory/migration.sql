-- Supports the cursor-based employee directory. The left-most fields match
-- every request's tenant and soft-delete scope; the remaining fields match
-- the deterministic display order.
CREATE INDEX IF NOT EXISTS "Employee_companyId_deletedAt_employeeCode_employeeNumber_id_idx"
ON "Employee"("companyId", "deletedAt", "employeeCode", "employeeNumber", "id");

-- Employee-number allocation used to scan the entire Employee table. Seed a
-- database sequence from existing EMP-* values once, then allocate in O(1).
CREATE SEQUENCE IF NOT EXISTS "Employee_employeeNumber_seq";

SELECT setval(
  '"Employee_employeeNumber_seq"',
  COALESCE(
    (
      SELECT MAX(NULLIF(regexp_replace("employeeNumber", '[^0-9]', '', 'g'), '')::bigint)
      FROM "Employee"
      WHERE "employeeNumber" ~ '^EMP-[0-9]+$'
    ),
    0
  ) + 1,
  false
);
