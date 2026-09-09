-- The directory uses substring matching across employee identifiers and names.
-- These partial trigram indexes keep that lookup bounded to active records.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Employee_employeeCode_trgm_active_idx"
ON "Employee" USING GIN ("employeeCode" gin_trgm_ops)
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Employee_employeeNumber_trgm_active_idx"
ON "Employee" USING GIN ("employeeNumber" gin_trgm_ops)
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Employee_firstNameTH_trgm_active_idx"
ON "Employee" USING GIN ("firstNameTH" gin_trgm_ops)
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Employee_lastNameTH_trgm_active_idx"
ON "Employee" USING GIN ("lastNameTH" gin_trgm_ops)
WHERE "deletedAt" IS NULL;
