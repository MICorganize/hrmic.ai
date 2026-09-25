import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("close-period header", () => {
  it("does not render the explanatory copy or leading calendar icon", async () => {
    const source = await readFile(
      path.join(process.cwd(), "app", "(portal)", "salary", "calculate", "normal", "PayrollCalculationClient.tsx"),
      "utf8",
    );

    expect(source).not.toContain("กำหนดวันจ่ายและสถานะงวดบัญชี");
    expect(source).not.toContain("ตรวจสอบวันที่ให้เรียบร้อยก่อนปิดงวดเงินเดือน");
    expect(source).not.toContain('<Calendar className="size-5" strokeWidth={1.8} />');
    expect(source).not.toContain("งวดกำลังเปิด");
    expect(source).toContain('<div className="border-t border-[#edf0f4]" />');

    const closePeriodSection = source.slice(
      source.indexOf("function ReportDownloadButton"),
      source.indexOf("/* ------------------------- Tab: สรุปตั้งค่าทั้งองค์กร */"),
    );
    expect(closePeriodSection).not.toContain("h-10 w-full");
    expect(closePeriodSection).not.toContain("inline-flex h-8 items-center");
    expect(closePeriodSection).toContain("<DetailedDatePicker");
    expect(closePeriodSection).toContain("h-9 w-[276px]");
  });
});
