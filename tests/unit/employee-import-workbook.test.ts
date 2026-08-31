import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildEmployeeImportTemplate,
  parseEmployeeImportWorkbook,
  type EmployeeImportRow,
} from "@/lib/excel/employeeImportTemplate";

describe("employee import workbook", () => {
  it("reads employee rows produced from the supported import template", async () => {
    const template = await readFile(
      path.join(process.cwd(), "public", "templates", ".employee-import-populated-base.xlsx")
    );
    const employee = {
      employeeCode: "MIC001",
      firstNameTH: "สมชาย",
      lastNameTH: "ใจดี",
      employeeType: "01-พนักงานรายเดือน",
      employeeTypeGroup: "ET0001-พนักงานรายเดือน",
      hireDate: new Date(Date.UTC(2026, 0, 1)),
      socialSecurityStartDate: null,
      birthDate: null,
      confirmationDate: null,
      taxStartDate: null,
      signoutDate: null,
      salary: 25_000,
      advanceLimit: null,
    } as EmployeeImportRow;

    const rows = parseEmployeeImportWorkbook(buildEmployeeImportTemplate(template, [employee]));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      sourceRow: 4,
      values: expect.objectContaining({ B: "MIC001", D: "สมชาย", E: "ใจดี", AL: "25000" }),
    });
  });
});
