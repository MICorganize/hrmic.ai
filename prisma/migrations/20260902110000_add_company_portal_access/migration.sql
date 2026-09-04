ALTER TABLE "Company"
ADD COLUMN "portalUrl" TEXT,
ADD COLUMN "planName" TEXT NOT NULL DEFAULT 'Standard',
ADD COLUMN "employeeLimit" INTEGER;

CREATE TYPE "CompanyAccessRole" AS ENUM ('owner', 'admin', 'member');

CREATE TABLE "UserCompanyAccess" (
  "userId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "role" "CompanyAccessRole" NOT NULL DEFAULT 'owner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserCompanyAccess_pkey" PRIMARY KEY ("userId", "companyId")
);

CREATE INDEX "UserCompanyAccess_companyId_idx" ON "UserCompanyAccess"("companyId");

ALTER TABLE "UserCompanyAccess"
ADD CONSTRAINT "UserCompanyAccess_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCompanyAccess"
ADD CONSTRAINT "UserCompanyAccess_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
