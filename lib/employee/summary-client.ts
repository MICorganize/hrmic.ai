"use client";

export type EmployeeSummaryData = {
  total: number;
  company: { id: string; name: string; code: string | null; employeeLimit: number | null } | null;
  byGender: { male: number; female: number; other: number; unknown: number };
  byEmploymentType: Record<string, number>;
  byBranch: { name: string; count: number }[];
  byNationality: { nationality: string; count: number }[];
  history: { id: string; subject: string; by: string; date: string; note: string }[];
  historyTotal: number;
};

const summaries = new Map<string, StoredSummary>();
const summaryRequests = new Map<string, Promise<EmployeeSummaryData>>();
let sessionGeneration = 0;
const SESSION_STORAGE_PREFIX = "hrmic:employee-summary:";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1_000;
const MAX_SESSION_COMPANY_SUMMARIES = 8;

function summaryKey(companyId?: string) {
  return companyId || "active";
}

type StoredSummary = { expiresAt: number; value: EmployeeSummaryData };

function readSessionSummary(key: string) {
  // A persisted "active" alias cannot identify the httpOnly cookie's company
  // after a reload. Only explicit company IDs may restore a browser snapshot.
  if (key === "active") return null;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<StoredSummary>;
    if (typeof stored.expiresAt !== "number" || stored.expiresAt <= Date.now() || !stored.value) {
      window.sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${key}`);
      return null;
    }
    return stored.value;
  } catch {
    return null;
  }
}

function writeSessionSummary(key: string, value: EmployeeSummaryData) {
  if (key === "active") return;
  if (typeof window === "undefined") return;
  try {
    // Keep the browser cache bounded even for administrators who can switch
    // among many companies. The active snapshot is always retained.
    const companyKeys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const storageKey = window.sessionStorage.key(index);
      if (storageKey?.startsWith(SESSION_STORAGE_PREFIX) && storageKey !== `${SESSION_STORAGE_PREFIX}active`) {
        companyKeys.push(storageKey);
      }
    }
    const targetStorageKey = `${SESSION_STORAGE_PREFIX}${key}`;
    while (key !== "active" && !companyKeys.includes(targetStorageKey) && companyKeys.length >= MAX_SESSION_COMPANY_SUMMARIES) {
      const evictedKey = companyKeys.shift();
      if (evictedKey) window.sessionStorage.removeItem(evictedKey);
    }
    const stored: StoredSummary = { expiresAt: Date.now() + SESSION_CACHE_TTL_MS, value };
    window.sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${key}`, JSON.stringify(stored));
  } catch {
    // Private browsing or storage restrictions only disable this warm start.
  }
}

function clearSessionSummary(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${key}`);
  } catch {
    // Nothing else is required when session storage is unavailable.
  }
}

/** Starts the normal dashboard request before the route is opened. */
export function preloadEmployeeSummary(companyId?: string) {
  const key = summaryKey(companyId);
  const cached = getPreloadedEmployeeSummary(companyId);
  if (cached) return Promise.resolve(cached);
  const activeRequest = summaryRequests.get(key);
  if (activeRequest) return activeRequest;

  const params = new URLSearchParams({ view: "summary", historyPage: "1" });
  if (companyId) params.set("companyId", companyId);
  const requestedGeneration = sessionGeneration;
  const request = fetch(`/api/employee?${params.toString()}`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const summary = (await response.json()) as EmployeeSummaryData;
      if (requestedGeneration !== sessionGeneration || summaryRequests.get(key) !== request) {
        throw new Error("Employee summary scope changed");
      }
      if (companyId && summary.company?.id !== companyId) throw new Error("Employee summary company mismatch");
      storePreloadedEmployeeSummary(summary, companyId);
      if (summary.company?.id) storePreloadedEmployeeSummary(summary, summary.company.id);
      return summary;
    });
  summaryRequests.set(key, request);
  void request.then(
    () => { if (summaryRequests.get(key) === request) summaryRequests.delete(key); },
    () => { if (summaryRequests.get(key) === request) summaryRequests.delete(key); }
  );
  return request;
}

export function getPreloadedEmployeeSummary(companyId?: string) {
  const key = summaryKey(companyId);
  const inMemory = summaries.get(key);
  if (inMemory && inMemory.expiresAt > Date.now()) return inMemory.value;
  summaries.delete(key);
  const stored = readSessionSummary(key);
  if (stored?.company?.id !== key) return null;
  return stored;
}

export function storePreloadedEmployeeSummary(value: EmployeeSummaryData, companyId?: string) {
  const key = summaryKey(companyId);
  summaries.set(key, { expiresAt: Date.now() + SESSION_CACHE_TTL_MS, value });
  writeSessionSummary(key, value);
}

/**
 * Makes a company-specific prefetch usable by the active-company Dashboard
 * after its cookie has changed. This keeps one in-flight request instead of
 * starting a second summary request under the new active-company key.
 */
export function promotePreloadedEmployeeSummary(companyId: string) {
  const companyKey = summaryKey(companyId);
  const activeKey = summaryKey();
  // Clear the previous company's alias before consumers request active data.
  invalidatePreloadedEmployeeSummary();
  const cached = getPreloadedEmployeeSummary(companyId);
  if (cached) {
    storePreloadedEmployeeSummary(cached);
    return cached;
  }

  const pending = summaryRequests.get(companyKey);
  if (!pending) return null;

  const promoted = pending.then((summary) => {
    if (summaryRequests.get(activeKey) !== promoted) throw new Error("Active company changed");
    storePreloadedEmployeeSummary(summary);
    return summary;
  });
  summaryRequests.set(activeKey, promoted);
  void promoted.then(
    () => { if (summaryRequests.get(activeKey) === promoted) summaryRequests.delete(activeKey); },
    () => { if (summaryRequests.get(activeKey) === promoted) summaryRequests.delete(activeKey); }
  );
  return null;
}

/**
 * Mutations already advance the server read-model version and rebuild the
 * dashboard snapshot. Drop only this browser copy so the next render reads
 * that ready, authoritative server snapshot instead of bypassing it.
 */
export function invalidatePreloadedEmployeeSummary(companyId?: string) {
  const key = summaryKey(companyId);
  summaries.delete(key);
  summaryRequests.delete(key);
  clearSessionSummary(key);
  if (companyId && summaries.get("active")?.value.company?.id === companyId) {
    invalidatePreloadedEmployeeSummary();
  }
}

/** A new authenticated login must never reuse another login's private data. */
export function resetEmployeeSummaryCache() {
  sessionGeneration += 1;
  summaries.clear();
  summaryRequests.clear();
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(SESSION_STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.sessionStorage.removeItem(key);
  } catch {
    // Memory is still reset when browser storage is unavailable.
  }
}
