"use client";

import { INITIAL_PAYROLL_MONTH_KEY } from "@/lib/payroll/constants";

export { INITIAL_PAYROLL_MONTH_KEY } from "@/lib/payroll/constants";

export type PayrollDashboardStats = {
  salaryEmployees: number;
  totalEmployees: number;
  employeeTypes: { monthly: number; daily: number; partTime: number; contract: number };
  newEmployees: number;
  terminatedEmployees: number;
  birthdays: number;
};

export type PayrollPageSnapshot = {
  dashboard: PayrollDashboardStats;
  closePeriod: {
    paymentDate: string;
    taxPaymentDate: string;
    isClosed: boolean;
    closedAt: string | null;
    employeeCount: number;
  };
};

export const EMPTY_PAYROLL_DASHBOARD_STATS: PayrollDashboardStats = {
  salaryEmployees: 0,
  totalEmployees: 0,
  employeeTypes: { monthly: 0, daily: 0, partTime: 0, contract: 0 },
  newEmployees: 0,
  terminatedEmployees: 0,
  birthdays: 0,
};

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { stats: PayrollDashboardStats; expiresAt: number }>();
const requests = new Map<string, Promise<PayrollDashboardStats>>();
const snapshotCache = new Map<string, { snapshot: PayrollPageSnapshot; expiresAt: number }>();
const snapshotRequests = new Map<string, Promise<PayrollPageSnapshot>>();
let sessionGeneration = 0;

/** A new login must never reuse another session's company-scoped payroll data. */
export function resetPayrollDashboardCache() {
  sessionGeneration += 1;
  cache.clear();
  requests.clear();
  snapshotCache.clear();
  snapshotRequests.clear();
}

export function getPreloadedPayrollDashboard(monthKey: string) {
  const cached = cache.get(monthKey);
  return cached && cached.expiresAt > Date.now() ? cached.stats : null;
}

export function storePreloadedPayrollSnapshot(monthKey: string, snapshot: PayrollPageSnapshot) {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  snapshotCache.set(monthKey, { snapshot, expiresAt });
  cache.set(monthKey, { stats: snapshot.dashboard, expiresAt });
}

export function getPreloadedPayrollSnapshot(monthKey: string) {
  const cached = snapshotCache.get(monthKey);
  return cached && cached.expiresAt > Date.now() ? cached.snapshot : null;
}

/** Loads dashboard aggregates and close-period state through one BFF request. */
export function preloadPayrollSnapshot(monthKey = INITIAL_PAYROLL_MONTH_KEY) {
  const cached = getPreloadedPayrollSnapshot(monthKey);
  if (cached) return Promise.resolve(cached);
  const active = snapshotRequests.get(monthKey);
  if (active) return active;

  const requestedGeneration = sessionGeneration;
  const request = fetch(`/api/payroll/snapshot?month=${encodeURIComponent(monthKey)}`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const snapshot = (await response.json()) as PayrollPageSnapshot;
      if (requestedGeneration !== sessionGeneration) throw new Error("Payroll session changed");
      storePreloadedPayrollSnapshot(monthKey, snapshot);
      return snapshot;
    })
    .finally(() => {
      if (snapshotRequests.get(monthKey) === request) snapshotRequests.delete(monthKey);
    });
  snapshotRequests.set(monthKey, request);
  return request;
}

/** Starts one shared dashboard request before the payroll route mounts. */
export function preloadPayrollDashboard(monthKey = INITIAL_PAYROLL_MONTH_KEY) {
  const snapshot = getPreloadedPayrollSnapshot(monthKey);
  if (snapshot) return Promise.resolve(snapshot.dashboard);
  const cached = getPreloadedPayrollDashboard(monthKey);
  if (cached) return Promise.resolve(cached);

  const active = requests.get(monthKey);
  if (active) return active;

  const requestedGeneration = sessionGeneration;
  const request = fetch(`/api/payroll/dashboard?month=${encodeURIComponent(monthKey)}`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const stats = (await response.json()) as PayrollDashboardStats;
      if (requestedGeneration !== sessionGeneration) throw new Error("Payroll session changed");
      cache.set(monthKey, { stats, expiresAt: Date.now() + CACHE_TTL_MS });
      return stats;
    })
    .finally(() => {
      if (requests.get(monthKey) === request) requests.delete(monthKey);
    });
  requests.set(monthKey, request);
  return request;
}
