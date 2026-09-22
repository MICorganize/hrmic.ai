import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Thai date UI policy", () => {
  const uiFiles = ["app", "components"].flatMap((folder) => sourceFiles(join(process.cwd(), folder)));

  it("does not use native browser date controls that expose Gregorian years", () => {
    const violations = uiFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return /type=["'](?:date|month|datetime-local|week)["']/.test(source)
        ? [relative(process.cwd(), file)]
        : [];
    });
    expect(violations).toEqual([]);
  });

  it("does not hard-code Gregorian years in date-like UI labels", () => {
    const datePattern = /\d{1,2}\/\d{1,2}\/20\d{2}|(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+20\d{2}/;
    const violations = uiFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return datePattern.test(source) ? [relative(process.cwd(), file)] : [];
    });
    expect(violations).toEqual([]);
  });
});

