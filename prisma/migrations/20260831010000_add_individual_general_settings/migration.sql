CREATE TABLE "IndividualGeneralSetting" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "workDays" VARCHAR(32) NOT NULL,
    "workHours" VARCHAR(32) NOT NULL,
    "payrollCalculation" VARCHAR(32) NOT NULL,
    "allowHolidayWork" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualGeneralSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndividualGeneralSetting_employeeId_key"
    ON "IndividualGeneralSetting"("employeeId");

ALTER TABLE "IndividualGeneralSetting"
    ADD CONSTRAINT "IndividualGeneralSetting_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
