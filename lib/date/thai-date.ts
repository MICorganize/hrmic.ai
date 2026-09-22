export const BUDDHIST_YEAR_OFFSET = 543;

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

export type DateValue = Date | string | null | undefined;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/;
const DISPLAY_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;

function validParts(year: number, month: number, day: number): DateParts | null {
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** Parses a date without applying a timezone shift to date-only ISO values. */
export function getDateParts(value: DateValue): DateParts | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const isoMatch = value.match(ISO_DATE_PATTERN);
  if (isoMatch) {
    return validParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const displayMatch = value.match(DISPLAY_DATE_PATTERN);
  if (displayMatch) {
    const inputYear = Number(displayMatch[3]);
    const year = inputYear >= 2400 ? inputYear - BUDDHIST_YEAR_OFFSET : inputYear;
    return validParts(year, Number(displayMatch[2]), Number(displayMatch[1]));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

export function gregorianToBuddhistYear(year: number) {
  return year + BUDDHIST_YEAR_OFFSET;
}

export function buddhistToGregorianYear(year: number) {
  return year - BUDDHIST_YEAR_OFFSET;
}

export function parseIsoDate(value: string | null | undefined): Date | undefined {
  const parts = getDateParts(value);
  if (!parts) return undefined;
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function toIsoDate(value: DateValue): string {
  const parts = getDateParts(value);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function formatThaiDate(value: DateValue): string {
  const parts = getDateParts(value);
  if (!parts) return "";
  return `${parts.day} ${THAI_MONTHS[parts.month - 1]} ${gregorianToBuddhistYear(parts.year)}`;
}

export function formatThaiDateShort(value: DateValue): string {
  const parts = getDateParts(value);
  if (!parts) return "";
  return `${parts.day} ${THAI_MONTHS_SHORT[parts.month - 1]} ${gregorianToBuddhistYear(parts.year)}`;
}

export function formatThaiDateNumeric(value: DateValue): string {
  const parts = getDateParts(value);
  if (!parts) return "";
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${gregorianToBuddhistYear(parts.year)}`;
}

export function formatThaiMonthYear(value: DateValue | string, short = false): string {
  if (typeof value === "string" && /^(\d{4})-(\d{2})$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    const monthName = (short ? THAI_MONTHS_SHORT : THAI_MONTHS)[month - 1];
    return monthName ? `${monthName} ${gregorianToBuddhistYear(year)}` : "";
  }
  const parts = getDateParts(value);
  if (!parts) return "";
  const monthName = (short ? THAI_MONTHS_SHORT : THAI_MONTHS)[parts.month - 1];
  return `${monthName} ${gregorianToBuddhistYear(parts.year)}`;
}

export function formatThaiYear(value: number | string | Date): string {
  if (value instanceof Date) return String(gregorianToBuddhistYear(value.getFullYear()));
  const year = Number(value);
  if (!Number.isFinite(year)) return "";
  return String(year >= 2400 ? year : gregorianToBuddhistYear(year));
}

export function formatThaiDateTime(value: DateValue, includeSeconds = true): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dateText = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(date);
  const timeText = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hourCycle: "h23",
    timeZone: "Asia/Bangkok",
  }).format(date);
  return `${dateText} ${timeText}`;
}

/** Converts a legacy dd/MM/yyyy time label to Buddhist year without changing its time text. */
export function formatThaiDateTimeText(value: string): string {
  return value.replace(/^(\d{1,2}\/\d{1,2}\/)(\d{4})(?=\s|$)/, (_match, prefix: string, yearText: string) => {
    const year = Number(yearText);
    return `${prefix}${year >= 2400 ? year : gregorianToBuddhistYear(year)}`;
  });
}
