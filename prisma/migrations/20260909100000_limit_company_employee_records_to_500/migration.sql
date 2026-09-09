-- Keep configured company quotas within the supported 500-record capacity.
-- Existing employee data is left intact; this only prevents future growth
-- beyond the supported limit.
UPDATE "Company"
SET "employeeLimit" = 500
WHERE "employeeLimit" IS NULL OR "employeeLimit" > 500;
