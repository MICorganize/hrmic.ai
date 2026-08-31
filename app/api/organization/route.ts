import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type OrganizationKind = "company" | "branch" | "department";

type OrganizationRequest = {
  id?: unknown;
  kind?: unknown;
  name?: unknown;
  code?: unknown;
  companyId?: unknown;
  branchId?: unknown;
  parentId?: unknown;
  englishName?: unknown;
};

type OrganizationNode = {
  id: string;
  kind: OrganizationKind;
  name: string;
  code: string;
  companyId: string;
  branchId?: string | null;
  parentId?: string | null;
  companyName?: string | null;
  englishName?: string | null;
  children: OrganizationNode[];
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function bodyKind(value: unknown): OrganizationKind | null {
  return value === "company" || value === "branch" || value === "department" ? value : null;
}

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function auditOrganization(
  action: "insert" | "update" | "delete",
  kind: OrganizationKind,
  id: string,
  companyId: string,
  metadata: Record<string, string | null>
) {
  const company = await prisma.company.findFirst({ where: { id: companyId }, select: { tenantId: true } });
  if (!company) return;
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      tenantId: company.tenantId,
      companyId,
      action,
      entityType: `organization_${kind}`,
      entityId: id,
      metadata,
    },
  });
}

async function organizationTree(): Promise<OrganizationNode[]> {
  const [companies, branches, departments] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, companyCode: true, companyNameTH: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { deletedAt: null },
      select: { id: true, companyId: true, name: true, code: true },
      orderBy: [{ name: "asc" }, { code: "asc" }],
    }),
    prisma.department.findMany({
      where: { deletedAt: null },
      select: { id: true, companyId: true, branchId: true, parentId: true, name: true, code: true },
      orderBy: [{ name: "asc" }, { code: "asc" }],
    }),
  ]);

  const departmentsByParent = new Map<string | null, typeof departments>();
  for (const department of departments) {
    const key = department.parentId;
    departmentsByParent.set(key, [...(departmentsByParent.get(key) ?? []), department]);
  }

  const toDepartment = (department: (typeof departments)[number], ancestry = new Set<string>()): OrganizationNode => {
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(department.id);
    const children = (departmentsByParent.get(department.id) ?? [])
      .filter((child) => !nextAncestry.has(child.id))
      .map((child) => toDepartment(child, nextAncestry));
    return {
      id: department.id,
      kind: "department",
      name: department.name,
      code: department.code,
      companyId: department.companyId,
      branchId: department.branchId,
      parentId: department.parentId,
      children,
    };
  };

  return companies.map((company) => {
    const companyBranches = branches.filter((branch) => branch.companyId === company.id);
    const companyDepartments = departments.filter((department) => department.companyId === company.id);
    const validDepartmentIds = new Set(companyDepartments.map((department) => department.id));
    const rootsFor = (branchId: string | null) =>
      companyDepartments
        .filter(
          (department) =>
            department.branchId === branchId &&
            (!department.parentId || !validDepartmentIds.has(department.parentId))
        )
        .map((department) => toDepartment(department));

    return {
      id: company.id,
      kind: "company" as const,
      name: company.name,
      code: company.companyCode ?? "",
      companyId: company.id,
      companyName: company.companyNameTH ?? company.name,
      englishName: company.name,
      children: [
        ...companyBranches.map((branch) => ({
          id: branch.id,
          kind: "branch" as const,
          name: branch.name,
          code: branch.code,
          companyId: branch.companyId,
          branchId: branch.id,
          children: rootsFor(branch.id),
        })),
        ...rootsFor(null),
      ],
    };
  });
}

export async function GET() {
  try {
    return NextResponse.json({ companies: await organizationTree() });
  } catch (error) {
    console.error("GET /api/organization failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดโครงสร้างองค์กรได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as OrganizationRequest | null;
    const kind = bodyKind(body?.kind);
    const name = text(body?.name);
    const code = text(body?.code);
    const companyId = text(body?.companyId);
    const englishName = text(body?.englishName);

    if (!kind || !name || !code) return invalid("กรุณากรอกชื่อและรหัสให้ครบถ้วน");
    const now = new Date();

    if (kind === "company") {
      const existingCompany = await prisma.company.findFirst({
        where: { deletedAt: null },
        select: { tenantId: true },
      });
      const tenant = existingCompany ?? (await prisma.tenant.findFirst({ select: { id: true } }));
      if (!tenant) return invalid("ไม่พบข้อมูลองค์กรสำหรับสร้างบริษัท");
      const company = await prisma.company.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: "tenantId" in tenant ? tenant.tenantId : tenant.id,
          name: englishName || name,
          companyCode: code,
          companyNameTH: name,
          updatedAt: now,
        },
      });
      await auditOrganization("insert", kind, company.id, company.id, { name, code });
    } else if (kind === "branch") {
      const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
      if (!company) return invalid("ไม่พบบริษัทที่เลือก");
      const branch = await prisma.branch.create({
        data: { id: crypto.randomUUID(), companyId, name, code, updatedAt: now },
      });
      await auditOrganization("insert", kind, branch.id, companyId, { name, code });
    } else {
      const branchId = text(body?.branchId) || null;
      const parentId = text(body?.parentId) || null;
      const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
      if (!company) return invalid("ไม่พบบริษัทที่เลือก");
      if (branchId) {
        const branch = await prisma.branch.findFirst({ where: { id: branchId, companyId, deletedAt: null } });
        if (!branch) return invalid("ไม่พบสำนักงานสาขาที่เลือก");
      }
      if (parentId) {
        const parent = await prisma.department.findFirst({ where: { id: parentId, companyId, deletedAt: null } });
        if (!parent) return invalid("ไม่พบแผนกแม่ที่เลือก");
        if (parent.branchId !== branchId) return invalid("แผนกแม่ต้องอยู่ในสำนักงานสาขาเดียวกัน");
      }
      const department = await prisma.department.create({
        data: { id: crypto.randomUUID(), companyId, branchId, parentId, name, code, updatedAt: now },
      });
      await auditOrganization("insert", kind, department.id, companyId, { name, code });
    }

    return NextResponse.json({ companies: await organizationTree() }, { status: 201 });
  } catch (error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === "P2002") return NextResponse.json({ error: "รหัสนี้มีอยู่แล้วในระบบ" }, { status: 409 });
    console.error("POST /api/organization failed:", error);
    return NextResponse.json({ error: "บันทึกโครงสร้างองค์กรไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as OrganizationRequest | null;
    const kind = bodyKind(body?.kind);
    const id = text(body?.id);
    const name = text(body?.name);
    const code = text(body?.code);
    const englishName = text(body?.englishName);
    if (!kind || !id || !name || !code) return invalid("กรุณากรอกชื่อและรหัสให้ครบถ้วน");

    const updatedAt = new Date();
    if (kind === "company") {
      const company = await prisma.company.update({
        where: { id },
        data: { name: englishName || name, companyNameTH: name, companyCode: code, updatedAt },
      });
      await auditOrganization("update", kind, id, company.id, { name, code });
    } else if (kind === "branch") {
      const branch = await prisma.branch.update({ where: { id }, data: { name, code, updatedAt } });
      await auditOrganization("update", kind, id, branch.companyId, { name, code });
    } else {
      const department = await prisma.department.update({ where: { id }, data: { name, code, updatedAt } });
      await auditOrganization("update", kind, id, department.companyId, { name, code });
    }
    return NextResponse.json({ companies: await organizationTree() });
  } catch (error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === "P2002") return NextResponse.json({ error: "รหัสนี้มีอยู่แล้วในระบบ" }, { status: 409 });
    if (prismaCode === "P2025") return NextResponse.json({ error: "ไม่พบข้อมูลที่ต้องการแก้ไข" }, { status: 404 });
    console.error("PATCH /api/organization failed:", error);
    return NextResponse.json({ error: "แก้ไขโครงสร้างองค์กรไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as OrganizationRequest | null;
    const kind = bodyKind(body?.kind);
    const id = text(body?.id);
    if ((kind !== "department" && kind !== "branch") || !id) {
      return invalid("สามารถลบได้เฉพาะสำนักงานสาขาหรือแผนกเท่านั้น");
    }

    const [departments, employees] = await Promise.all([
      kind === "branch"
        ? prisma.department.count({ where: { branchId: id, deletedAt: null } })
        : prisma.department.count({ where: { parentId: id, deletedAt: null } }),
      kind === "branch"
        ? prisma.employee.count({ where: { branchId: id, deletedAt: null } })
        : prisma.employee.count({ where: { departmentId: id, deletedAt: null } }),
    ]);
    if (departments || employees) {
      return NextResponse.json(
        { error: kind === "branch" ? "ไม่สามารถลบสาขาที่ยังมีแผนกหรือพนักงานอยู่ได้" : "ไม่สามารถลบแผนกที่มีแผนกย่อยหรือพนักงานอยู่ได้" },
        { status: 409 }
      );
    }
    const deletedAt = new Date();
    if (kind === "branch") {
      const branch = await prisma.branch.update({ where: { id }, data: { deletedAt } });
      await auditOrganization("delete", kind, id, branch.companyId, { name: branch.name, code: branch.code });
    } else {
      const department = await prisma.department.update({ where: { id }, data: { deletedAt } });
      await auditOrganization("delete", kind, id, department.companyId, { name: department.name, code: department.code });
    }
    return NextResponse.json({ companies: await organizationTree() });
  } catch (error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === "P2025") return NextResponse.json({ error: "ไม่พบข้อมูลที่ต้องการลบ" }, { status: 404 });
    if (prismaCode === "P2003") return NextResponse.json({ error: "ไม่สามารถลบข้อมูลที่ยังเชื่อมโยงกับข้อมูลอื่นอยู่ได้" }, { status: 409 });
    console.error("DELETE /api/organization failed:", error);
    return NextResponse.json({ error: "ลบแผนกไม่สำเร็จ" }, { status: 500 });
  }
}
