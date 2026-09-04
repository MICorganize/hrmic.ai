/**
 * PayrollRun predates company-level payroll fields. Keep its existing unique
 * period column while namespacing new company-specific runs, so companies can
 * maintain independent periods without a destructive data migration.
 */
export function companyPeriodKey(month: string, companyId?: string) {
  return companyId && !month.includes(":") ? `${companyId}:${month}` : month;
}
