-- The employee dashboard filters timeline entries through the tenant's
-- employees and then sorts each employee's entries by most-recent first.
-- This keeps the lookup index-backed without altering any data or UI.
CREATE INDEX IF NOT EXISTS "EmployeeTimeline_employeeId_eventDate_desc_idx"
  ON "EmployeeTimeline"("employeeId", "eventDate" DESC);
