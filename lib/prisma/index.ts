import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

// Prisma's generated client gains new model delegates when the schema changes.
// During `next dev`, discard an older globally cached client that does not have
// a newly generated delegate, so a schema update works without restarting the
// developer's running server.
const cachedPrisma = globalForPrisma.prisma;
const hasEmployeeTypeDefinition = Boolean(cachedPrisma && "employeeTypeDefinition" in cachedPrisma);
const cachedRuntimeModel = cachedPrisma as unknown as {
  _runtimeDataModel?: {
    models?: Record<string, { fields?: Array<{ name: string }> }>;
  };
};
const hasEmploymentTypeDefinitionField = Boolean(
  cachedRuntimeModel?._runtimeDataModel?.models?.Employment?.fields?.some(
    (field) => field.name === "employeeTypeDefinitionId"
  )
);
const hasAttendanceDayTypeField = Boolean(
  cachedRuntimeModel?._runtimeDataModel?.models?.AttendanceRecord?.fields?.some(
    (field) => field.name === "dayType"
  )
);
const hasIndividualGeneralSetting = Boolean(cachedPrisma && "individualGeneralSetting" in cachedPrisma);
const hasIndividualOvertimeSetting = Boolean(cachedPrisma && "individualOvertimeSetting" in cachedPrisma);
const hasIndividualShiftHolidaySetting = Boolean(cachedPrisma && "individualShiftHolidaySetting" in cachedPrisma);
const hasIndividualWorkTimeSetting = Boolean(cachedPrisma && "individualWorkTimeSetting" in cachedPrisma);
const hasPayrollRunPeriodFields = Boolean(
  cachedRuntimeModel?._runtimeDataModel?.models?.PayrollRun?.fields?.some(
    (field) => field.name === "periodStart"
  ) && cachedRuntimeModel?._runtimeDataModel?.models?.PayrollRun?.fields?.some(
    (field) => field.name === "periodEnd"
  )
);
const hasPayrollRunClosePeriodFields = Boolean(
  cachedRuntimeModel?._runtimeDataModel?.models?.PayrollRun?.fields?.some(
    (field) => field.name === "paymentDate"
  ) && cachedRuntimeModel?._runtimeDataModel?.models?.PayrollRun?.fields?.some(
    (field) => field.name === "taxPaymentDate"
  ) && cachedRuntimeModel?._runtimeDataModel?.models?.PayrollRun?.fields?.some(
    (field) => field.name === "closedAt"
  )
);
const hasCompanyPortalFields = ["portalUrl", "planName", "employeeLimit"].every((fieldName) =>
  cachedRuntimeModel?._runtimeDataModel?.models?.Company?.fields?.some(
    (field) => field.name === fieldName
  )
);
const hasUserCompanyAccess = Boolean(cachedPrisma && "userCompanyAccess" in cachedPrisma);

export const prisma =
  cachedPrisma && hasEmployeeTypeDefinition && hasEmploymentTypeDefinitionField && hasAttendanceDayTypeField && hasIndividualGeneralSetting && hasIndividualOvertimeSetting && hasIndividualShiftHolidaySetting && hasIndividualWorkTimeSetting && hasPayrollRunPeriodFields && hasPayrollRunClosePeriodFields && hasCompanyPortalFields && hasUserCompanyAccess
    ? cachedPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
