export const MONTHS_TH = [
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
];

/** Formats an ISO "yyyy-mm" key as a Thai month label, e.g. "สิงหาคม 2026". */
export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTHS_TH[month - 1] ?? ""} ${year}`;
}

/** Formats ISO dates as "ตั้งแต่วันที่ dd/mm/yyyy จนถึงวันที่ dd/mm/yyyy". */
export function formatPayrollPeriod(startDate: string, endDate: string) {
  const compactDate = (value: string) => {
    const [year = "", month = "", day = ""] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : "";
  };
  return `ตั้งแต่วันที่ ${compactDate(startDate)} จนถึงวันที่ ${compactDate(endDate)}`;
}