import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("employee title options", () => {
  it("matches the title list from the original employee form", async () => {
    const source = await readFile(
      path.join(process.cwd(), "app", "(portal)", "organization", "organization-employee", "create", "page.tsx"),
      "utf8",
    );
    const expectedTitles = [
      "นาย",
      "นาง",
      "นางสาว",
      "หม่อมราชวงศ์",
      "หม่อมหลวง",
      "คุณหญิง",
      "ว่าที่ร้อยตรี",
      "ร้อยตรี",
      "ร้อยโท",
      "ร้อยเอก",
      "พลทหารอากาศ",
      "จ่าโท",
      "นายดาบตำรวจ",
      "ว่าที่ ร.ต.",
      "พันตรี",
      "พันโท",
    ];

    for (const title of expectedTitles) {
      expect(source).toContain(`"${title}"`);
    }
  });
});
