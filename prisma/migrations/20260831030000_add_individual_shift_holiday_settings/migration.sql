CREATE TABLE "IndividualShiftHolidaySetting" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "selectedShift" VARCHAR(32) NOT NULL,
    "weeklyShifts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "selectedDayType" VARCHAR(32) NOT NULL,
    "weeklyDayTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualShiftHolidaySetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndividualShiftHolidaySetting_employeeId_key"
ON "IndividualShiftHolidaySetting"("employeeId");

ALTER TABLE "IndividualShiftHolidaySetting"
ADD CONSTRAINT "IndividualShiftHolidaySetting_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
