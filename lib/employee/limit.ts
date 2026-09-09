/** The maximum number of non-deleted employee records a company may hold. */
export const MAX_EMPLOYEE_RECORDS = 500;

/**
 * Company Management may assign a smaller quota, but it must never expand
 * the application's record capacity beyond the supported maximum.
 */
export function effectiveEmployeeLimit(configuredLimit: number | null | undefined) {
  return Math.min(configuredLimit ?? MAX_EMPLOYEE_RECORDS, MAX_EMPLOYEE_RECORDS);
}

export function employeeCapacityMessage(limit: number) {
  return `บริษัทสามารถมีข้อมูลพนักงานได้สูงสุด ${limit} รายการ`;
}
