import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CompanyRouteContext = { params: Promise<{ companyId: string }> };

const companyUpdate = z.object({
  code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/, "รหัสบริษัทใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข _ และ -"),
  planName: z.enum(["Free-Try", "Free-Forever", "PaySlip", "Lite", "Basic", "Standard", "Advanced", "Professional"]),
  employeeLimit: z.coerce.number().int().positive().max(1_000_000),
});

function hasTenantManagementRole(roles: Array<{ code: string; name: string }>) {
  return roles.some(({ code, name }) => {
    const normalizedCode = code.toLowerCase();
    const normalizedName = name.toLowerCase();
    return ["admin", "administrator", "owner", "super_admin", "superadmin"].includes(normalizedCode)
      || ["admin", "administrator", "owner", "ผู้ดูแลระบบ"].includes(normalizedName);
  });
}

export async function PATCH(request: Request, context: CompanyRouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

    const input = companyUpdate.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message ?? "ข้อมูลบริษัทไม่ถูกต้อง" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, status: "active", deletedAt: null },
      select: { id: true, tenantId: true, UserRole: { select: { Role: { select: { code: true, name: true } } } } },
    });
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

    const { companyId } = await context.params;
    const isTenantAdmin = hasTenantManagementRole(user.UserRole.map(({ Role }) => Role));
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId: user.tenantId,
        deletedAt: null,
        ...(isTenantAdmin ? {} : { UserCompanyAccess: { some: { userId: user.id, role: { in: ["owner", "admin"] } } } }),
      },
      select: { id: true, companyCode: true, planName: true, employeeLimit: true, _count: { select: { Employee: { where: { status: "active", deletedAt: null } } } } },
    });
    if (!company) return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการบริษัทนี้" }, { status: 403 });
    if (input.data.employeeLimit < company._count.Employee) {
      return NextResponse.json({ error: "จำนวนที่นั่งต้องไม่น้อยกว่าจำนวนพนักงานปัจจุบัน" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.company.update({
        where: { id: company.id },
        data: {
          companyCode: input.data.code.toUpperCase(),
          planName: input.data.planName,
          employeeLimit: input.data.employeeLimit,
          updatedAt: new Date(),
          updatedBy: user.id,
        },
        select: { id: true, companyCode: true, planName: true, employeeLimit: true },
      });
      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: user.tenantId,
          companyId: company.id,
          userId: user.id,
          action: "update",
          entityType: "company",
          entityId: company.id,
          metadata: {
            before: { code: company.companyCode, planName: company.planName, employeeLimit: company.employeeLimit },
            after: { code: result.companyCode, planName: result.planName, employeeLimit: result.employeeLimit },
          },
        },
      });
      return result;
    });

    return NextResponse.json({ company: updated });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "รหัสบริษัทนี้มีอยู่ในระบบแล้ว" }, { status: 409 });
    }
    console.error("PATCH /api/companies/[companyId] failed:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการจัดการบริษัทได้" }, { status: 500 });
  }
}
