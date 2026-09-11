import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPreloadedPayrollSnapshot,
  preloadPayrollSnapshot,
  resetPayrollDashboardCache,
  type PayrollPageSnapshot,
} from "@/lib/payroll/dashboard-client";

const snapshot: PayrollPageSnapshot = {
  dashboard: {
    salaryEmployees: 10,
    totalEmployees: 12,
    employeeTypes: { monthly: 8, daily: 2, partTime: 1, contract: 1 },
    newEmployees: 1,
    terminatedEmployees: 0,
    birthdays: 2,
  },
  closePeriod: {
    paymentDate: "2026-08-31",
    taxPaymentDate: "2026-09-07",
    isClosed: false,
    closedAt: null,
    employeeCount: 12,
  },
};

const response = (value: unknown) => ({ ok: true, json: async () => value }) as Response;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  resetPayrollDashboardCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("payroll page snapshot cache", () => {
  it("deduplicates dashboard and close-period data into one request", async () => {
    fetchMock.mockResolvedValueOnce(response(snapshot));
    const first = preloadPayrollSnapshot("2026-08");
    const second = preloadPayrollSnapshot("2026-08");
    expect(typeof first.then).toBe("function");
    expect(typeof second.then).toBe("function");
    expect(await first).toEqual(snapshot);
    expect(await second).toEqual(snapshot);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(getPreloadedPayrollSnapshot("2026-08")).toEqual(snapshot);

    const cached = preloadPayrollSnapshot("2026-08");
    expect(typeof cached.then).toBe("function");
    expect(await cached).toEqual(snapshot);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not restore a snapshot from an earlier login", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const oldRequest = preloadPayrollSnapshot("2026-08");
    const rejected = expect(oldRequest).rejects.toThrow("session changed");
    resetPayrollDashboardCache();
    resolve(response(snapshot));
    await rejected;
    expect(getPreloadedPayrollSnapshot("2026-08")).toBeNull();
  });
});
