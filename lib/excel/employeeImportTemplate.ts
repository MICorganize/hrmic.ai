import { deflateRawSync, inflateRawSync } from "node:zlib";

type ZipEntry = {
  name: string;
  data: Buffer;
  method: number;
};

export type EmployeeImportRow = {
  employeeCode: string;
  title: string;
  firstNameTH: string;
  lastNameTH: string;
  fingerprintCode: string;
  gender: string;
  foreigner: string;
  nationality: string;
  citizenId: string;
  alienIdNumber: string;
  passportNo: string;
  workPermitNo: string;
  socialSecurityNumber: string;
  socialSecurityStartDate: Date | null;
  employeeType: string;
  employeeTypeGroup: string;
  payrollRound: string;
  nickname: string;
  firstNameEN: string;
  lastNameEN: string;
  nicknameEN: string;
  phone: string;
  email: string;
  birthDate: Date | null;
  hireDate: Date | null;
  confirmationDate: Date | null;
  taxStartDate: Date | null;
  signedOut: string;
  signoutDate: Date | null;
  signoutRemark: string;
  salary: number | null;
  advanceLimit: number | null;
  paymentMethod: string;
  companyPayoutAccount: string;
  bankCode: string;
  bankBranchCode: string;
  bankAccountNumber: string;
  permanentAddress: string;
  permanentSubdistrict: string;
  permanentDistrict: string;
  permanentProvince: string;
  currentAddress: string;
  currentSubdistrict: string;
  currentDistrict: string;
  currentProvince: string;
  departmentCode: string;
  departmentName: string;
  divisionCode: string;
  divisionName: string;
  sectionCode: string;
  sectionName: string;
  positionCode: string;
  positionName: string;
  onboarding: string;
  salaryCalculation: string;
  overtimeRound: string;
  worktimeRound: string;
};

export type EmployeeImportUploadRow = {
  sourceRow: number;
  values: Record<string, string>;
};

const COLUMN_NAMES = Array.from({ length: 64 }, (_, index) => {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
});

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let value = 0xffffffff;
  for (const byte of data) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(input: Buffer): number {
  for (let index = input.length - 22; index >= Math.max(0, input.length - 65_557); index -= 1) {
    if (input.readUInt32LE(index) === 0x06054b50) return index;
  }
  throw new Error("ไฟล์เทมเพลต Excel ไม่สมบูรณ์");
}

function readZip(input: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(input);
  const entries: ZipEntry[] = [];
  const count = input.readUInt16LE(eocdOffset + 10);
  let offset = input.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < count; index += 1) {
    if (input.readUInt32LE(offset) !== 0x02014b50) throw new Error("ไม่พบข้อมูลไฟล์ในเทมเพลต Excel");
    const method = input.readUInt16LE(offset + 10);
    const compressedSize = input.readUInt32LE(offset + 20);
    const fileNameLength = input.readUInt16LE(offset + 28);
    const extraLength = input.readUInt16LE(offset + 30);
    const commentLength = input.readUInt16LE(offset + 32);
    const localOffset = input.readUInt32LE(offset + 42);
    const name = input.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    const localNameLength = input.readUInt16LE(localOffset + 26);
    const localExtraLength = input.readUInt16LE(localOffset + 28);
    const compressed = input.subarray(
      localOffset + 30 + localNameLength + localExtraLength,
      localOffset + 30 + localNameLength + localExtraLength + compressedSize
    );

    entries.push({
      name,
      method,
      data: method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed) : (() => {
        throw new Error(`ไม่รองรับการบีบอัดเทมเพลต Excel แบบ ${method}`);
      })(),
    });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlText(value: string): string {
  return decodeXml([...value.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => match[1]).join(""));
}

/** Parses the 64-column employee template without adding a browser-only Excel dependency. */
export function parseEmployeeImportWorkbook(workbook: Buffer): EmployeeImportUploadRow[] {
  const entries = readZip(workbook);
  const sheet = entries.find((entry) => entry.name === "xl/worksheets/sheet1.xml")?.data.toString("utf8");
  const sharedStrings = entries.find((entry) => entry.name === "xl/sharedStrings.xml")?.data.toString("utf8");
  if (!sheet || !sharedStrings) throw new Error("ไฟล์ต้องเป็นเทมเพลตนำเข้าข้อมูลพนักงาน (.xlsx)");

  const strings = [...sharedStrings.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => xmlText(match[1]));
  const rows: EmployeeImportUploadRow[] = [];
  let hasEmployeeCodeHeader = false;

  for (const rowMatch of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const sourceRow = Number(rowMatch[1].match(/\br="(\d+)"/)?.[1] ?? "0");
    if (!sourceRow) continue;
    const values: Record<string, string> = {};
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1] || cellMatch[2] || "";
      const column = attributes.match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!column) continue;
      const type = attributes.match(/\bt="([^"]+)"/)?.[1];
      const content = cellMatch[3] ?? "";
      const raw = content.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
      const value = type === "s" ? strings[Number(raw)] ?? "" : type === "inlineStr" ? xmlText(content) : decodeXml(raw);
      values[column] = value.trim();
    }
    if (sourceRow <= 3) {
      hasEmployeeCodeHeader ||= Object.values(values).some((value) => value.includes("รหัสพนักงาน"));
      continue;
    }
    if (Object.values(values).some((value) => value !== "")) rows.push({ sourceRow, values });
  }

  if (!hasEmployeeCodeHeader) throw new Error("รูปแบบหัวตารางไม่ตรงกับเทมเพลตนำเข้าข้อมูลพนักงาน");
  if (rows.length === 0) throw new Error("ไม่พบข้อมูลพนักงานในไฟล์ที่เลือก");
  return rows;
}

function writeZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const method = entry.method === 0 ? 0 : 8;
    const compressed = method === 0 ? entry.data : deflateRawSync(entry.data);
    const checksum = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);

    localParts.push(local, name, compressed);
    centralParts.push(central, name);
    localOffset += local.length + name.length + compressed.length;
  }

  const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]!);
}

function excelDate(value: Date): number {
  return Math.floor(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / 86_400_000) + 25_569;
}

function formatDate(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

function formatMonth(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getCellStyles(sheetData: string): Map<string, string> {
  const row = sheetData.match(/<row r="4"[\s\S]*?<\/row>/)?.[0];
  if (!row) throw new Error("ไม่พบรูปแบบแถวข้อมูลในเทมเพลต Excel");
  const styles = new Map<string, string>();
  for (const match of row.matchAll(/<c r="([A-Z]+)4"(?: s="(\d+)")?[^>]*\/?>(?:[\s\S]*?<\/c>)?/g)) {
    styles.set(match[1], match[2] ?? "0");
  }
  return styles;
}

function renderTemplate(baseSheet: string, sharedStrings: string, employees: EmployeeImportRow[]): { sheet: string; strings: string } {
  const sheetDataMatch = baseSheet.match(/<sheetData>([\s\S]*?)<\/sheetData>/);
  if (!sheetDataMatch) throw new Error("ไม่พบข้อมูลชีตในเทมเพลต Excel");
  const headerRows = sheetDataMatch[1].match(/<row r="[123]"[\s\S]*?<\/row>/g);
  if (!headerRows || headerRows.length !== 3) throw new Error("โครงสร้างหัวตารางเทมเพลต Excel ไม่ครบถ้วน");
  const styles = getCellStyles(sheetDataMatch[1]);
  const baseItems = [...sharedStrings.matchAll(/<si>[\s\S]*?<\/si>/g)].map((match) => match[0]).slice(0, 114);
  if (baseItems.length !== 114) throw new Error("โครงสร้างข้อความเทมเพลต Excel ไม่ครบถ้วน");

  const dataItems: string[] = [];
  const stringIndex = new Map<string, number>();
  const addString = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return null;
    const existing = stringIndex.get(normalized);
    if (existing !== undefined) return existing;
    const index = 114 + dataItems.length;
    stringIndex.set(normalized, index);
    dataItems.push(`<si><t>${escapeXml(normalized)}</t></si>`);
    return index;
  };
  const style = (column: string) => styles.get(column) ?? "7";
  const stringCell = (column: string, row: number, value: string) => {
    const index = addString(value);
    return index === null
      ? `<c r="${column}${row}" s="${style(column)}"/>`
      : `<c r="${column}${row}" s="${style(column)}" t="s"><v>${index}</v></c>`;
  };
  const numberCell = (column: string, row: number, value: number | null) =>
    value === null
      ? `<c r="${column}${row}" s="${style(column)}"/>`
      : `<c r="${column}${row}" s="${style(column)}"><v>${value}</v></c>`;
  const datePair = (source: string, output: string, row: number, value: Date | null, monthOnly = false) => {
    const formula = `IF(${source}${row}&lt;&gt;&quot;&quot;,TEXT(${source}${row},&quot;YYYY-MM${monthOnly ? "" : "-DD"}&quot;),&quot;&quot;)`;
    return [
      value === null
        ? `<c r="${source}${row}" s="${style(source)}"/>`
        : `<c r="${source}${row}" s="${style(source)}"><v>${excelDate(value)}</v></c>`,
      `<c r="${output}${row}" s="${style(output)}" t="str"><f>${formula}</f><v>${value ? (monthOnly ? formatMonth(value) : formatDate(value)) : ""}</v></c>`,
    ];
  };

  const employeeRows = employees.map((employee, index) => {
    const row = index + 4;
    const values: Record<string, string> = {
      A: String(index + 1), B: employee.employeeCode, C: employee.title, D: employee.firstNameTH,
      E: employee.lastNameTH, F: employee.fingerprintCode, G: employee.gender, H: employee.foreigner,
      I: employee.nationality, J: employee.citizenId, K: employee.alienIdNumber, L: employee.passportNo,
      M: employee.workPermitNo, N: employee.socialSecurityNumber, Q: employee.employeeType,
      R: employee.employeeTypeGroup, S: employee.payrollRound, T: employee.nickname, U: employee.firstNameEN,
      V: employee.lastNameEN, W: employee.nicknameEN, X: employee.phone, Y: employee.email,
      AH: employee.signedOut, AK: employee.signoutRemark, AN: employee.paymentMethod,
      AO: employee.companyPayoutAccount, AP: employee.bankCode, AQ: employee.bankBranchCode,
      AR: employee.bankAccountNumber, AS: employee.permanentAddress, AT: employee.permanentSubdistrict,
      AU: employee.permanentDistrict, AV: employee.permanentProvince, AW: employee.currentAddress,
      AX: employee.currentSubdistrict, AY: employee.currentDistrict, AZ: employee.currentProvince,
      BA: employee.departmentCode, BB: employee.departmentName, BC: employee.divisionCode,
      BD: employee.divisionName, BE: employee.sectionCode, BF: employee.sectionName,
      BG: employee.positionCode, BH: employee.positionName, BI: employee.onboarding,
      BJ: employee.salaryCalculation, BK: employee.overtimeRound, BL: employee.worktimeRound,
    };
    const dateColumns = new Set(["O", "P", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG", "AI", "AJ"]);
    const numberColumns = new Map<string, number | null>([["AL", employee.salary], ["AM", employee.advanceLimit]]);
    const cells = COLUMN_NAMES.filter((column) => !dateColumns.has(column) && !numberColumns.has(column)).map((column) => stringCell(column, row, values[column] ?? ""));
    cells.push(...datePair("O", "P", row, employee.socialSecurityStartDate, true));
    cells.push(...datePair("Z", "AA", row, employee.birthDate));
    cells.push(...datePair("AB", "AC", row, employee.hireDate));
    cells.push(...datePair("AD", "AE", row, employee.confirmationDate));
    cells.push(...datePair("AF", "AG", row, employee.taxStartDate, true));
    cells.push(...datePair("AI", "AJ", row, employee.signoutDate));
    cells.push(numberCell("AL", row, employee.salary), numberCell("AM", row, employee.advanceLimit));
    return `<row r="${row}" spans="1:64">${cells.join("")}</row>`;
  });

  const lastRow = Math.max(3, employees.length + 3);
  const sheet = baseSheet
    .replace(/<dimension ref="[^"]+"\/>/, `<dimension ref="A1:BL${lastRow}"/>`)
    .replace(/<selection activeCell="[^"]+" sqref="[^"]+"\/>/, `<selection activeCell="BL${lastRow}" sqref="BL${lastRow}"/>`)
    .replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${headerRows.join("")}${employeeRows.join("")}</sheetData>`);
  const strings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${baseItems.length + dataItems.length}" uniqueCount="${baseItems.length + dataItems.length}">${baseItems.join("")}${dataItems.join("")}</sst>`;
  return { sheet, strings };
}

/** Preserves the original HumanSoft workbook formatting, formulas, validation lists and 64 import columns. */
export function buildEmployeeImportTemplate(baseWorkbook: Buffer, employees: EmployeeImportRow[]): Buffer {
  const entries = readZip(baseWorkbook);
  const sheetEntry = entries.find((entry) => entry.name === "xl/worksheets/sheet1.xml");
  const stringsEntry = entries.find((entry) => entry.name === "xl/sharedStrings.xml");
  if (!sheetEntry || !stringsEntry) throw new Error("ไม่พบชีตหรือข้อความในเทมเพลต Excel");
  const rendered = renderTemplate(sheetEntry.data.toString("utf8"), stringsEntry.data.toString("utf8"), employees);
  sheetEntry.data = Buffer.from(rendered.sheet, "utf8");
  stringsEntry.data = Buffer.from(rendered.strings, "utf8");
  return writeZip(entries);
}
