-- Mirror the configured MIC seat allocation from the managed-company view.
UPDATE "Company"
SET "employeeLimit" = 53
WHERE "companyCode" = 'MIC'
  AND "deletedAt" IS NULL;
