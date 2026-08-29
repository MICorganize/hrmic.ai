import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function withPrefix(value: string, prefix: string) {
  return value.startsWith(prefix) ? value : `${prefix}${value}`;
}

function formatLocationLabel({
  subdistrict,
  district,
  province,
  postalCode,
}: {
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string | null;
}) {
  const isBangkok = province === "กรุงเทพมหานคร";
  const subdistrictLabel = withPrefix(subdistrict, isBangkok ? "แขวง" : "ตำบล");
  const districtLabel = withPrefix(district, isBangkok ? "เขต" : "อำเภอ");
  const provinceLabel = isBangkok ? province : withPrefix(province, "จังหวัด");
  return [subdistrictLabel, districtLabel, provinceLabel, postalCode].filter(Boolean).join(" ");
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json([]);

  const locations = await prisma.subdistrict.findMany({
    where: {
      OR: [
        { nameTH: { contains: query, mode: "insensitive" } },
        { postalCode: { contains: query } },
      ],
    },
    include: {
      District: {
        include: { Province: true },
      },
    },
    orderBy: [
      { postalCode: "asc" },
      { nameTH: "asc" },
    ],
    take: 20,
  });

  return NextResponse.json(
    locations.map((location) => ({
      id: location.id,
      subdistrictId: location.id,
      districtId: location.District.id,
      provinceId: location.District.Province.id,
      subdistrict: location.nameTH,
      district: location.District.nameTH,
      province: location.District.Province.nameTH,
      postalCode: location.postalCode,
      label: formatLocationLabel({
        subdistrict: location.nameTH,
        district: location.District.nameTH,
        province: location.District.Province.nameTH,
        postalCode: location.postalCode,
      }),
    }))
  );
}
