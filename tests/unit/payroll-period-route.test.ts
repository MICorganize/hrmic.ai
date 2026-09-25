import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveCompany: vi.fn(),
  getResolvedPayrollPeriod: vi.fn(),
}));

vi.mock("@/lib/active-company", () => ({ getActiveCompany: mocks.getActiveCompany }));
vi.mock("@/lib/payroll/resolved-period", () => ({ getResolvedPayrollPeriod: mocks.getResolvedPayrollPeriod }));
vi.mock("@/lib/cache/read-model-version", () => ({ invalidateReadModel: vi.fn() }));
vi.mock("@/lib/payroll/period-lock", () => ({
  CLOSED_PAYROLL_PERIOD_MESSAGE: "closed",
  isPayrollPeriodClosed: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    payrollRun: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/payroll/period/route";

const company = { id: "11111111-1111-4111-8111-111111111111", name: "MIC", code: "MIC", employeeLimit: 100 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getActiveCompany.mockResolvedValue(company);
  mocks.getResolvedPayrollPeriod.mockResolvedValue({
    startDate: "2026-08-08",
    endDate: "2026-09-07",
    isConfigured: false,
  });
});

describe("payroll period route", () => {
  it("returns the active company cutoff-derived period", async () => {
    const response = await GET(new Request("http://local/api/payroll/period?month=2026-08"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      startDate: "2026-08-08",
      endDate: "2026-09-07",
      isConfigured: false,
    });
    expect(mocks.getResolvedPayrollPeriod).toHaveBeenCalledWith("2026-08", company.id);
  });
});
