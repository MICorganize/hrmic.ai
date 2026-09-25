import { describe, expect, it } from "vitest";

import {
  getDefaultPayrollBounds,
  getDefaultPayrollPeriod,
  normalizePayrollCutoffDay,
} from "@/lib/payroll/period-default";

describe("payroll cutoff default period mapping", () => {
  it("maps day 1 to the selected month end", () => {
    expect(getDefaultPayrollPeriod("2026-08", 1)).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
  });

  it("maps a mid-month cutoff across the following month", () => {
    expect(getDefaultPayrollPeriod("2026-08", 8)).toEqual({
      startDate: "2026-08-08",
      endDate: "2026-09-07",
    });
  });

  it("maps the highest supported cutoff", () => {
    expect(getDefaultPayrollPeriod("2026-08", 16)).toEqual({
      startDate: "2026-08-16",
      endDate: "2026-09-15",
    });
  });

  it("handles leap-year February without invalid dates", () => {
    expect(getDefaultPayrollPeriod("2024-02", 16)).toEqual({
      startDate: "2024-02-16",
      endDate: "2024-03-15",
    });
  });

  it("returns an exclusive boundary for attendance queries", () => {
    const bounds = getDefaultPayrollBounds("2026-08", 8);
    expect(bounds.start.toISOString()).toBe("2026-08-08T00:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });

  it("normalizes only supported integer cutoff values", () => {
    expect(normalizePayrollCutoffDay(1)).toBe(1);
    expect(normalizePayrollCutoffDay("8")).toBe(8);
    expect(normalizePayrollCutoffDay(0)).toBeNull();
    expect(normalizePayrollCutoffDay(17)).toBeNull();
    expect(normalizePayrollCutoffDay(8.5)).toBeNull();
    expect(normalizePayrollCutoffDay("8x")).toBeNull();
  });
});
