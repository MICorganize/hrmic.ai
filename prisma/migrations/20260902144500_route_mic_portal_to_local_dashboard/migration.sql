-- MIC uses the local HRMic portal after the access check completes.
UPDATE "Company"
SET "portalUrl" = 'http://localhost:3000/dashboard'
WHERE "companyCode" = 'MIC'
  AND "deletedAt" IS NULL;
