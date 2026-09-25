import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findRun: vi.fn(),
  findCompany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payrollRun: { findUnique: mocks.findRun },
    company: { findUnique: mocks.findCompany },
  },
}));
vi.mock("server-only", () => ({}));

import { getResolvedPayrollBounds, getResolvedPayrollPeriod } from "@/lib/payroll/resolved-period";

const companyId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findRun.mockResolvedValue(null);
  mocks.findCompany.mockResolvedValue({ payrollCutoffDay: 8 });
});

describe("resolved payroll period", () => {
  it("uses the active company cutoff when the month has no explicit period", async () => {
    await expect(getResolvedPayrollPeriod("2026-08", companyId)).resolves.toEqual({
      startDate: "2026-08-08",
      endDate: "2026-09-07",
      isConfigured: false,
    });

    await expect(getResolvedPayrollBounds("2026-08", companyId)).resolves.toEqual({
      start: new Date("2026-08-08T00:00:00.000Z"),
      end: new Date("2026-09-08T00:00:00.000Z"),
    });
  });

  it("preserves an explicitly configured monthly period", async () => {
    mocks.findRun.mockResolvedValue({
      periodStart: new Date("2026-08-03T00:00:00.000Z"),
      periodEnd: new Date("2026-09-02T00:00:00.000Z"),
    });

    await expect(getResolvedPayrollPeriod("2026-08", companyId)).resolves.toEqual({
      startDate: "2026-08-03",
      endDate: "2026-09-02",
      isConfigured: true,
    });
    await expect(getResolvedPayrollBounds("2026-08", companyId)).resolves.toEqual({
      start: new Date("2026-08-03T00:00:00.000Z"),
      end: new Date("2026-09-03T00:00:00.000Z"),
    });
  });
});
