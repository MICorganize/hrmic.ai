import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * The login form needs a small, public company directory so users can identify
 * their organization before authenticating. Do not add plan, contact, or
 * tenant details to this response.
 */
export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      where: { status: "active", deletedAt: null },
      orderBy: [{ companyCode: "asc" }, { name: "asc" }],
      select: {
        id: true,
        companyCode: true,
        companyNameTH: true,
        name: true,
      },
    });

    return NextResponse.json({
      companies: companies.map((company) => ({
        id: company.id,
        code: company.companyCode ?? company.name,
        name: company.companyNameTH ?? company.name,
      })),
    });
  } catch (error) {
    console.error("GET /public-company-data failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดรายชื่อบริษัทได้" }, { status: 500 });
  }
}
