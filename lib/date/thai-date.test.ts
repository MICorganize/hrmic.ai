import { describe, expect, it } from "vitest";

import {
  buddhistToGregorianYear,
  formatThaiDate,
  formatThaiDateNumeric,
  formatThaiMonthYear,
  formatThaiYear,
  parseIsoDate,
  toIsoDate,
} from "@/lib/date/thai-date";

describe("Thai Buddhist calendar formatting", () => {
  it("formats a date-only ISO value without a timezone shift", () => {
    expect(formatThaiDate("1976-03-14")).toBe("14 มีนาคม 2519");
    expect(formatThaiDateNumeric("1976-03-14")).toBe("14/03/2519");
  });

  it("formats month and year while preserving the Gregorian storage key", () => {
    expect(formatThaiMonthYear("2026-08")).toBe("สิงหาคม 2569");
    expect(formatThaiYear(2026)).toBe("2569");
    expect(buddhistToGregorianYear(2569)).toBe(2026);
  });

  it("round-trips a leap-day ISO form value", () => {
    expect(toIsoDate(parseIsoDate("2024-02-29"))).toBe("2024-02-29");
  });

  it("accepts a Buddhist-year date entered by a Thai user", () => {
    expect(toIsoDate(parseIsoDate("14/03/2519"))).toBe("1976-03-14");
  });
});
