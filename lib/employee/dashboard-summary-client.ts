"use client";

export type DashboardEmployeeSummary = {
  total: number;
  byGender: { male: number; female: number; other: number };
  byEmploymentType: Record<string, number>;
  byNationality: { nationality: string; count: number }[];
};

export type DashboardCompany = {
  id: string;
  name: string;
  code: string | null;
};

export type DashboardSnapshot = {
  company: DashboardCompany;
  summary: DashboardEmployeeSummary;
};

let snapshot: DashboardSnapshot | null = null;
let request: Promise<DashboardSnapshot> | null = null;
let generation = 0;

export function resetDashboardEmployeeSummary() {
  generation += 1;
  snapshot = null;
  request = null;
}

/** Starts one shared, small dashboard request while navigation is in progress. */
export function preloadDashboardEmployeeSummary() {
  if (snapshot) return Promise.resolve(snapshot);
  if (request) return request;

  const requestedGeneration = generation;
  const pending = fetch("/api/dashboard/summary", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as DashboardSnapshot;
      if (requestedGeneration !== generation) throw new Error("Dashboard session changed");
      snapshot = data;
      return snapshot;
    })
    .finally(() => {
      if (request === pending) request = null;
    });

  request = pending;
  return pending;
}

export function getPreloadedDashboardEmployeeSummary() {
  return snapshot?.summary ?? null;
}

/** Returns the company identity authorized with the preloaded dashboard data. */
export function getPreloadedDashboardCompany() {
  return snapshot?.company ?? null;
}
