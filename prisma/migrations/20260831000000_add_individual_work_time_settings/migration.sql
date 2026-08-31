CREATE TABLE "IndividualWorkTimeSetting" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "workTimeType" VARCHAR(32) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "countMin" INTEGER NOT NULL DEFAULT 0,
    "countMax" INTEGER NOT NULL DEFAULT 0,
    "countMethod" TEXT NOT NULL,
    "moneyMin" INTEGER,
    "moneyMax" INTEGER,
    "moneyMethod" TEXT,
    "calculationMethod" TEXT,
    "roundingMethod" TEXT,
    "calculationTargets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "calculationDayTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualWorkTimeSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndividualWorkTimeSetting_employeeId_workTimeType_key"
    ON "IndividualWorkTimeSetting"("employeeId", "workTimeType");

CREATE INDEX "IndividualWorkTimeSetting_employeeId_idx"
    ON "IndividualWorkTimeSetting"("employeeId");

ALTER TABLE "IndividualWorkTimeSetting"
    ADD CONSTRAINT "IndividualWorkTimeSetting_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
