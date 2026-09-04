import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function hasTenantManagementRole(roles: Array<{ code: string; name: string }>) {
  return roles.some(({ code, name }) => {
    const normalizedCode = code.toLowerCase();
    const normalizedName = name.toLowerCase();
    return ["admin", "administrator", "owner", "super_admin", "superadmin"].includes(normalizedCode)
      || ["admin", "administrator", "owner", "ผู้ดูแลระบบ"].includes(normalizedName);
  });
}

export async function GET(request: Request, context: RouteContext<"/api/companies/[companyId]/portal">) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const { companyId } = await context.params;
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, status: "active", deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      UserRole: { select: { Role: { select: { code: true, name: true } } } },
    },
  });
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const isTenantAdmin = hasTenantManagementRole(user.UserRole.map(({ Role }) => Role));
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      tenantId: user.tenantId,
      deletedAt: null,
      ...(isTenantAdmin ? {} : { UserCompanyAccess: { some: { userId: user.id } } }),
    },
    select: { id: true, portalUrl: true },
  });
  if (!company) return NextResponse.json({ error: "คุณไม่มีสิทธิ์เข้าสู่บริษัทนี้" }, { status: 403 });
  if (!company.portalUrl) return NextResponse.json({ error: "บริษัทยังไม่ได้ตั้งค่าปลายทาง portal" }, { status: 422 });

  const portal = new URL(company.portalUrl);
  if (portal.protocol !== "https:" && portal.protocol !== "http:") {
    return NextResponse.json({ error: "ปลายทาง portal ไม่ถูกต้อง" }, { status: 422 });
  }

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      tenantId: user.tenantId,
      companyId: company.id,
      userId: user.id,
      action: "login",
      entityType: "company_portal",
      entityId: company.id,
      metadata: { portalUrl: company.portalUrl },
    },
  });

  return NextResponse.redirect(portal, { status: 302 });
}
