CREATE TABLE "IndividualOvertimeSetting" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "ruleNumber" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "startMinutes" INTEGER NOT NULL DEFAULT 0,
    "countingChoice" VARCHAR(16) NOT NULL,
    "payMethod" VARCHAR(32) NOT NULL,
    "wageRate" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "roundMoney" VARCHAR(16) NOT NULL,
    "maxHours" VARCHAR(16) NOT NULL,
    "roundHours" VARCHAR(16) NOT NULL,
    "calculationTargets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualOvertimeSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndividualOvertimeSetting_employeeId_ruleNumber_key"
ON "IndividualOvertimeSetting"("employeeId", "ruleNumber");

CREATE INDEX "IndividualOvertimeSetting_employeeId_idx"
ON "IndividualOvertimeSetting"("employeeId");

ALTER TABLE "IndividualOvertimeSetting"
ADD CONSTRAINT "IndividualOvertimeSetting_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
