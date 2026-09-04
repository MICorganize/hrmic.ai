import { readFile } from "node:fs/promises";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";

type GeographyRow = {
  provinceCode: number;
  provinceNameEn: string;
  provinceNameTh: string;
  districtCode: number;
  districtNameEn: string;
  districtNameTh: string;
  subdistrictCode: number;
  subdistrictNameEn: string;
  subdistrictNameTh: string;
  postalCode: number | null;
};

async function main() {
  const inputPath = process.argv[2] ?? `${process.env.TEMP ?? process.env.TMP ?? "."}/thailand-geography.json`;
  const rows = JSON.parse(await readFile(inputPath, "utf8")) as GeographyRow[];
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

  const provinceIds = new Map<number, string>();
  const districtIds = new Map<number, string>();
  const provinces = new Map<number, GeographyRow>();
  const districts = new Map<number, GeographyRow>();
  for (const row of rows) {
    provinces.set(row.provinceCode, row);
    districts.set(row.districtCode, row);
  }

  try {
  for (const row of provinces.values()) {
    const province = await prisma.province.upsert({
      where: { code: String(row.provinceCode).padStart(2, "0") },
      update: { nameTH: row.provinceNameTh, nameEN: row.provinceNameEn },
      create: { id: crypto.randomUUID(), code: String(row.provinceCode).padStart(2, "0"), nameTH: row.provinceNameTh, nameEN: row.provinceNameEn },
      select: { id: true },
    });
    provinceIds.set(row.provinceCode, province.id);
  }

  for (const row of districts.values()) {
    const provinceId = provinceIds.get(row.provinceCode);
    if (!provinceId) throw new Error(`ไม่พบจังหวัดสำหรับอำเภอ ${row.districtNameTh}`);
    const district = await prisma.district.upsert({
      where: { provinceId_code: { provinceId, code: String(row.districtCode).padStart(4, "0") } },
      update: { nameTH: row.districtNameTh, nameEN: row.districtNameEn },
      create: { id: crypto.randomUUID(), provinceId, code: String(row.districtCode).padStart(4, "0"), nameTH: row.districtNameTh, nameEN: row.districtNameEn },
      select: { id: true },
    });
    districtIds.set(row.districtCode, district.id);
  }

  for (const row of rows) {
    const districtId = districtIds.get(row.districtCode);
    if (!districtId) throw new Error(`ไม่พบอำเภอสำหรับตำบล ${row.subdistrictNameTh}`);
    await prisma.subdistrict.upsert({
      where: { districtId_code: { districtId, code: String(row.subdistrictCode).padStart(6, "0") } },
      update: { nameTH: row.subdistrictNameTh, nameEN: row.subdistrictNameEn, postalCode: row.postalCode == null ? null : String(row.postalCode).padStart(5, "0") },
      create: { id: crypto.randomUUID(), districtId, code: String(row.subdistrictCode).padStart(6, "0"), nameTH: row.subdistrictNameTh, nameEN: row.subdistrictNameEn, postalCode: row.postalCode == null ? null : String(row.postalCode).padStart(5, "0") },
    });
  }

  const [provinceCount, districtCount, subdistrictCount] = await Promise.all([
    prisma.province.count(),
    prisma.district.count(),
    prisma.subdistrict.count(),
  ]);
  console.log(JSON.stringify({ importedRows: rows.length, provinceCount, districtCount, subdistrictCount }));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
