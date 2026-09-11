"use client";

/**
 * Fired when a sidebar "ข้อมูลพนักงาน" entry is clicked. The employee page
 * listens for it so every click lands on its Dashboard submenu, even when the
 * page is already mounted at the same URL.
 */
export const EMPLOYEE_DASHBOARD_RESET_EVENT = "employee-dashboard-reset";

export function notifyEmployeeDashboardReset() {
  window.dispatchEvent(new Event(EMPLOYEE_DASHBOARD_RESET_EVENT));
}