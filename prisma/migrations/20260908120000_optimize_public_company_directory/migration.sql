-- Covers the public login directory's active/soft-delete filter and its
-- deterministic company-code/name ordering in a single index scan.
CREATE INDEX IF NOT EXISTS "Company_status_deletedAt_companyCode_name_idx"
ON "Company"("status", "deletedAt", "companyCode", "name");
