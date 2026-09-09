"use client";

export type PayrollDashboardStats = {
  salaryEmployees: number;
  totalEmployees: number;
  employeeTypes: { monthly: number; daily: number; partTime: number; contract: number };
  newEmployees: number;
  terminatedEmployees: number;
  birthdays: number;
};

export const EMPTY_PAYROLL_DASHBOARD_STATS: PayrollDashboardStats = {
  salaryEmployees: 0,
  totalEmployees: 0,
  employeeTypes: { monthly: 0, daily: 0, partTime: 0, contract: 0 },
  newEmployees: 0,
  terminatedEmployees: 0,
  birthdays: 0,
};

export const INITIAL_PAYROLL_MONTH_KEY = "2026-08";

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { stats: PayrollDashboardStats; expiresAt: number }>();
const requests = new Map<string, Promise<PayrollDashboardStats>>();

export function getPreloadedPayrollDashboard(monthKey: string) {
  const cached = cache.get(monthKey);
  return cached && cached.expiresAt > Date.now() ? cached.stats : null;
}

/** Starts one shared dashboard request before the payroll route mounts. */
export function preloadPayrollDashboard(monthKey = INITIAL_PAYROLL_MONTH_KEY) {
  const cached = getPreloadedPayrollDashboard(monthKey);
  if (cached) return Promise.resolve(cached);

  const active = requests.get(monthKey);
  if (active) return active;

  const request = fetch(`/api/payroll/dashboard?month=${encodeURIComponent(monthKey)}`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const stats = (await response.json()) as PayrollDashboardStats;
      cache.set(monthKey, { stats, expiresAt: Date.now() + CACHE_TTL_MS });
      return stats;
    })
    .finally(() => requests.delete(monthKey));
  requests.set(monthKey, request);
  return request;
}
