import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { getActiveCompany } from "@/lib/active-company";
import { prisma } from "@/lib/prisma";

type PositionRequest = {
  id?: unknown;
  companyId?: unknown;
  parentId?: unknown;
  name?: unknown;
  code?: unknown;
};

type PositionNode = {
  id: string;
  companyId: string;
  parentId: string | null;
  name: string;
  code: string;
  children: PositionNode[];
};

type PositionRecord = Omit<PositionNode, "children"> & { level: number | null };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const validPositionCode = (value: string) => /^[A-Za-z0-9]+$/.test(value);

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function auditPosition(
  action: "insert" | "update" | "delete",
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
      entityType: "organization_position",
      entityId: id,
      metadata,
    },
  });
}

async function activeCompanyId() {
  const selectedCompany = await getActiveCompany();
  if (selectedCompany) return selectedCompany.id;
  const company = await prisma.company.findFirst({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  return company?.id ?? null;
}

async function positionTree(companyId?: string | null): Promise<PositionNode[]> {
  // Raw SQL is used here so a running development server can immediately use
  // the new hierarchy column after `prisma generate`, without retaining an
  // older generated model definition in its module cache.
  const positions = await prisma.$queryRaw<PositionRecord[]>(Prisma.sql`
    SELECT "id", "companyId", "parentId", "name", "code", "level"
    FROM "Position"
    WHERE "deletedAt" IS NULL
    ${companyId ? Prisma.sql`AND "companyId" = ${companyId}::uuid` : Prisma.empty}
    ORDER BY "name" ASC, "code" ASC
  `);
  const positionIds = new Set(positions.map((position) => position.id));
  const childrenByParent = new Map<string, typeof positions>();
  for (const position of positions) {
    if (!position.parentId || !positionIds.has(position.parentId)) continue;
    childrenByParent.set(position.parentId, [...(childrenByParent.get(position.parentId) ?? []), position]);
  }
  const toNode = (position: (typeof positions)[number], ancestry = new Set<string>()): PositionNode => {
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(position.id);
    return {
      ...position,
      children: (childrenByParent.get(position.id) ?? [])
        .filter((child) => !nextAncestry.has(child.id))
        .map((child) => toNode(child, nextAncestry)),
    };
  };
  return positions
    .filter((position) => !position.parentId || !positionIds.has(position.parentId))
    .map((position) => toNode(position));
}

async function response(companyId?: string | null) {
  const selectedCompanyId = companyId ?? (await activeCompanyId());
  return { companyId: selectedCompanyId, positions: await positionTree(selectedCompanyId) };
}

export async function GET() {
  try {
    return NextResponse.json(await response());
  } catch (error) {
    console.error("GET /api/organization-position failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดโครงสร้างตำแหน่งได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as PositionRequest | null;
    const companyId = (await activeCompanyId()) || text(body?.companyId);
    const parentId = text(body?.parentId) || null;
    const name = text(body?.name);
    const code = text(body?.code);
    if (!companyId) return invalid("ไม่พบบริษัทสำหรับสร้างตำแหน่ง");
    if (!name || !code) return invalid("กรุณากรอกชื่อตำแหน่งและรหัสให้ครบถ้วน");
    if (!validPositionCode(code)) return invalid("รหัสตำแหน่งต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้น");

    const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null }, select: { id: true } });
    if (!company) return invalid("ไม่พบบริษัทที่เลือก");
    const [parent, existing] = await Promise.all([
      parentId
        ? prisma.$queryRaw<Pick<PositionRecord, "level">[]>(Prisma.sql`SELECT "level" FROM "Position" WHERE "id" = ${parentId}::uuid AND "companyId" = ${companyId}::uuid AND "deletedAt" IS NULL LIMIT 1`)
        : Promise.resolve([]),
      prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "Position" WHERE "companyId" = ${companyId}::uuid AND "code" = ${code} AND "deletedAt" IS NULL LIMIT 1`),
    ]);
    if (parentId && !parent[0]) return invalid("ไม่พบตำแหน่งแม่ที่เลือก");
    if (existing[0]) return NextResponse.json({ error: "รหัสนี้มีอยู่แล้วในระบบ" }, { status: 409 });
    const id = crypto.randomUUID();
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Position" ("id", "companyId", "parentId", "name", "code", "level", "createdAt", "updatedAt")
      VALUES (${id}::uuid, ${companyId}::uuid, ${parentId}::uuid, ${name}, ${code}, ${(parent[0]?.level ?? 0) + 1}, NOW(), NOW())
    `);
    await auditPosition("insert", id, companyId, { name, code, parentId });
    return NextResponse.json(await response(companyId), { status: 201 });
  } catch (error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === "P2002") return NextResponse.json({ error: "รหัสนี้มีอยู่แล้วในระบบ" }, { status: 409 });
    console.error("POST /api/organization-position failed:", error);
    return NextResponse.json({ error: "บันทึกตำแหน่งไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as PositionRequest | null;
    const id = text(body?.id);
    const name = text(body?.name);
    const code = text(body?.code);
    if (!id || !name || !code) return invalid("กรุณากรอกชื่อตำแหน่งและรหัสให้ครบถ้วน");
    if (!validPositionCode(code)) return invalid("รหัสตำแหน่งต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้น");
    const position = await prisma.$queryRaw<Pick<PositionRecord, "companyId">[]>(Prisma.sql`SELECT "companyId" FROM "Position" WHERE "id" = ${id}::uuid AND "deletedAt" IS NULL LIMIT 1`);
    if (!position[0]) return NextResponse.json({ error: "ไม่พบข้อมูลที่ต้องการแก้ไข" }, { status: 404 });
    const companyId = await activeCompanyId();
    if (companyId && position[0].companyId !== companyId) return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขตำแหน่งนี้" }, { status: 403 });
    const existing = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "Position" WHERE "companyId" = ${position[0].companyId}::uuid AND "code" = ${code} AND "id" <> ${id}::uuid AND "deletedAt" IS NULL LIMIT 1`);
    if (existing[0]) return NextResponse.json({ error: "รหัสนี้มีอยู่แล้วในระบบ" }, { status: 409 });
    await prisma.$executeRaw(Prisma.sql`UPDATE "Position" SET "name" = ${name}, "code" = ${code}, "updatedAt" = NOW() WHERE "id" = ${id}::uuid`);
    await auditPosition("update", id, position[0].companyId, { name, code });
    return NextResponse.json(await response(position[0].companyId));
  } catch (error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === "P2002") return NextResponse.json({ error: "รหัสนี้มีอยู่แล้วในระบบ" }, { status: 409 });
    console.error("PATCH /api/organization-position failed:", error);
    return NextResponse.json({ error: "แก้ไขตำแหน่งไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as PositionRequest | null;
    const id = text(body?.id);
    if (!id) return invalid("ไม่พบตำแหน่งที่ต้องการลบ");
    const position = await prisma.$queryRaw<Pick<PositionRecord, "companyId" | "name" | "code">[]>(Prisma.sql`SELECT "companyId", "name", "code" FROM "Position" WHERE "id" = ${id}::uuid AND "deletedAt" IS NULL LIMIT 1`);
    if (!position[0]) return NextResponse.json({ error: "ไม่พบข้อมูลที่ต้องการลบ" }, { status: 404 });
    const companyId = await activeCompanyId();
    if (companyId && position[0].companyId !== companyId) return NextResponse.json({ error: "คุณไม่มีสิทธิ์ลบตำแหน่งนี้" }, { status: 403 });
    const [children, employees, assignments] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*)::bigint AS "count" FROM "Position" WHERE "parentId" = ${id}::uuid AND "deletedAt" IS NULL`),
      prisma.employee.count({ where: { positionId: id, deletedAt: null } }),
      prisma.assignment.count({ where: { positionId: id } }),
    ]);
    if (Number(children[0]?.count ?? 0) || employees || assignments) {
      return NextResponse.json({ error: "ไม่สามารถลบตำแหน่งที่มีตำแหน่งย่อย พนักงาน หรือข้อมูลที่เชื่อมโยงอยู่ได้" }, { status: 409 });
    }
    await prisma.$executeRaw(Prisma.sql`UPDATE "Position" SET "deletedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = ${id}::uuid`);
    await auditPosition("delete", id, position[0].companyId, { name: position[0].name, code: position[0].code });
    return NextResponse.json(await response(position[0].companyId));
  } catch (error) {
    const prismaCode = (error as { code?: string }).code;
    if (prismaCode === "P2003") return NextResponse.json({ error: "ไม่สามารถลบข้อมูลที่ยังเชื่อมโยงกับข้อมูลอื่นอยู่ได้" }, { status: 409 });
    console.error("DELETE /api/organization-position failed:", error);
    return NextResponse.json({ error: "ลบตำแหน่งไม่สำเร็จ" }, { status: 500 });
  }
}
