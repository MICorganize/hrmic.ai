import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const companyInput = z.object({
  code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/, "รหัสบริษัทใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข _ และ -"),
  nameTH: z.string().trim().min(2).max(255),
  nameEN: z.string().trim().min(2).max(255),
  portalUrl: z.string().trim().url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "URL portal ต้องเป็น http หรือ https"),
  planName: z.string().trim().min(2).max(64).default("Standard"),
  employeeLimit: z.coerce.number().int().positive().max(1_000_000).nullable().optional(),
});

type Actor = {
  id: string;
  tenantId: string;
  isTenantAdmin: boolean;
};

function hasTenantManagementRole(roles: Array<{ code: string; name: string }>) {
  return roles.some(({ code, name }) => {
    const normalizedCode = code.toLowerCase();
    const normalizedName = name.toLowerCase();
    return ["admin", "administrator", "owner", "super_admin", "superadmin"].includes(normalizedCode)
      || ["admin", "administrator", "owner", "ผู้ดูแลระบบ"].includes(normalizedName);
  });
}

async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, status: "active", deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      UserRole: { select: { Role: { select: { code: true, name: true } } } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    tenantId: user.tenantId,
    isTenantAdmin: hasTenantManagementRole(user.UserRole.map(({ Role }) => Role)),
  };
}

function unauthorized() {
  return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการบริษัท" }, { status: 403 });
}

function companyResponse(company: {
  id: string;
  companyCode: string | null;
  name: string;
  companyNameTH: string | null;
  portalUrl: string | null;
  planName: string;
  employeeLimit: number | null;
  _count: { Employee: number };
}) {
  return {
    id: company.id,
    code: company.companyCode ?? "-",
    nameTH: company.companyNameTH ?? company.name,
    nameEN: company.name,
    portalUrl: company.portalUrl,
    planName: company.planName,
    employeeCount: company._count.Employee,
    employeeLimit: company.employeeLimit,
  };
}

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor) return unauthorized();

    const companies = await prisma.company.findMany({
      where: {
        tenantId: actor.tenantId,
        deletedAt: null,
        ...(actor.isTenantAdmin ? {} : { UserCompanyAccess: { some: { userId: actor.id } } }),
      },
      orderBy: { companyCode: "asc" },
      select: {
        id: true,
        companyCode: true,
        name: true,
        companyNameTH: true,
        portalUrl: true,
        planName: true,
        employeeLimit: true,
        _count: { select: { Employee: { where: { status: "active", deletedAt: null } } } },
      },
    });

    return NextResponse.json({ companies: companies.map(companyResponse), canCreate: actor.isTenantAdmin });
  } catch (error) {
    console.error("GET /api/companies failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลบริษัทได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    if (!actor) return unauthorized();
    if (!actor.isTenantAdmin) return forbidden();

    const parsed = companyInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลบริษัทไม่ถูกต้อง" }, { status: 400 });
    }

    const input = parsed.data;
    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: actor.tenantId,
          companyCode: input.code.toUpperCase(),
          name: input.nameEN,
          companyNameTH: input.nameTH,
          portalUrl: input.portalUrl,
          planName: input.planName,
          employeeLimit: input.employeeLimit ?? null,
          updatedAt: new Date(),
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });

      await tx.userCompanyAccess.create({
        data: { userId: actor.id, companyId: created.id, role: "owner" },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: actor.tenantId,
          companyId: created.id,
          userId: actor.id,
          action: "insert",
          entityType: "company",
          entityId: created.id,
          metadata: { code: created.companyCode, portalUrl: created.portalUrl, grantedRole: "owner" },
        },
      });

      return created;
    });

    return NextResponse.json({ company: { ...companyResponse({ ...company, _count: { Employee: 0 } }), accessRole: "owner" } }, { status: 201 });
  } catch (error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === "P2002") {
      return NextResponse.json({ error: "รหัสบริษัทนี้มีอยู่ในระบบแล้ว" }, { status: 409 });
    }
    console.error("POST /api/companies failed:", error);
    return NextResponse.json({ error: "ไม่สามารถสร้างบริษัทได้" }, { status: 500 });
  }
}
