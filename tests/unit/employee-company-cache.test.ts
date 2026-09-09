import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPreloadedEmployeeSummary, preloadEmployeeSummary, promotePreloadedEmployeeSummary,
  resetEmployeeSummaryCache, storePreloadedEmployeeSummary, type EmployeeSummaryData,
} from "@/lib/employee/summary-client";
import {
  preloadDashboardEmployeeSummary, resetDashboardEmployeeSummary,
} from "@/lib/employee/dashboard-summary-client";

const mic: EmployeeSummaryData = {
  company: { id: "mic", code: "MIC", name: "MIC", employeeLimit: 50 }, total: 12,
  byGender: { male: 7, female: 5, other: 0, unknown: 0 },
  byEmploymentType: {}, byBranch: [], byNationality: [], history: [], historyTotal: 0,
};
const pecth = { ...mic, company: { ...mic.company!, id: "pecth", code: "PECTH" }, total: 38 };
const response = (value: unknown) => ({ ok: true, json: async () => value }) as Response;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  resetEmployeeSummaryCache();
  resetDashboardEmployeeSummary();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("MIC login to Dashboard to Employee Dashboard", () => {
  it("drops PECTH in both caches and fetches MIC after a fresh login", async () => {
    storePreloadedEmployeeSummary(pecth);
    storePreloadedEmployeeSummary(pecth, "pecth");
    fetchMock.mockResolvedValueOnce(response({ company: pecth.company, summary: pecth }));
    await preloadDashboardEmployeeSummary();
    resetEmployeeSummaryCache();
    resetDashboardEmployeeSummary();
    expect(getPreloadedEmployeeSummary("pecth")).toBeNull();
    fetchMock.mockResolvedValueOnce(response({ company: mic.company, summary: mic }));
    expect((await preloadDashboardEmployeeSummary()).company.code).toBe("MIC");
    fetchMock.mockResolvedValueOnce(response(mic));
    expect((await preloadEmployeeSummary()).company?.code).toBe("MIC");
    expect(getPreloadedEmployeeSummary("mic")?.total).toBe(12);
  });
  it("ignores the legacy persisted active-company snapshot on a fresh page", async () => {
    window.sessionStorage.setItem("hrmic:employee-summary:active", JSON.stringify({ expiresAt: Date.now() + 60000, value: pecth }));
    expect(getPreloadedEmployeeSummary()).toBeNull();
    fetchMock.mockResolvedValueOnce(response(mic));
    expect((await preloadEmployeeSummary()).company?.code).toBe("MIC");
  });
  it("uses the pending MIC request instead of the old active PECTH snapshot", async () => {
    storePreloadedEmployeeSummary(pecth);
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const preload = preloadEmployeeSummary("mic");
    expect(promotePreloadedEmployeeSummary("mic")).toBeNull();
    expect(getPreloadedEmployeeSummary()).toBeNull();
    const active = preloadEmployeeSummary();
    resolve(response(mic));
    await preload;
    expect((await active).company?.code).toBe("MIC");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("prevents a request from an earlier login restoring the old employee cache", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const old = preloadEmployeeSummary();
    const rejected = expect(old).rejects.toThrow("scope changed");
    resetEmployeeSummaryCache();
    fetchMock.mockResolvedValueOnce(response(mic));
    await preloadEmployeeSummary();
    resolve(response(pecth));
    await rejected;
    expect(getPreloadedEmployeeSummary()?.company?.code).toBe("MIC");
  });
  it("prevents an old Dashboard response restoring the earlier login's company", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const old = preloadDashboardEmployeeSummary();
    const rejected = expect(old).rejects.toThrow("session changed");
    resetDashboardEmployeeSummary();
    fetchMock.mockResolvedValueOnce(response({ company: mic.company, summary: mic }));
    await preloadDashboardEmployeeSummary();
    resolve(response({ company: pecth.company, summary: pecth }));
    await rejected;
    expect((await preloadDashboardEmployeeSummary()).company.code).toBe("MIC");
  });
});
