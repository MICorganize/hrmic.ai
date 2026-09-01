-- Serves the active-employee list/tree query: filter soft-deleted records,
-- then return the UI's employee-code ordering without a separate sort.
CREATE INDEX "Employee_deletedAt_employeeCode_employeeNumber_idx"
ON "Employee"("deletedAt", "employeeCode", "employeeNumber");
