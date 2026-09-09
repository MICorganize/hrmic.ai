import { NextResponse } from "next/server";
import { Prisma, type Status } from "@/generated/prisma/client";

import { getActiveCompany } from "@/lib/active-company";
import { prisma } from "@/lib/prisma";

const MAX_PAGE_SIZE = 100;

type DirectoryCursor = {
  employeeCode: string | null;
  employeeNumber: string;
  id: string;
};

function decodeCursor(value: string | null): DirectoryCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<DirectoryCursor>;
    return typeof parsed.employeeNumber === "string" && typeof parsed.id === "string" && (typeof parsed.employeeCode === "string" || parsed.employeeCode === null)
      ? { employeeCode: parsed.employeeCode, employeeNumber: parsed.employeeNumber, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}

function encodeCursor(value: DirectoryCursor) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function parsePageSize(value: string | null) {
  const parsed = Number.parseInt(value ?? "50", 10);
  return Number.isFinite(parsed) ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsed)) : 50;
}

/**
 * A deliberately small, cursor-paginated employee directory for pickers.
 * Never use the organization tree endpoint for a searchable employee list:
 * at large tenants that would serialize and hydrate every employee at once.
 */
export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    const { searchParams } = new URL(request.url);
    const company = await getActiveCompany();
    if (!company) {
      return NextResponse.json({ error: "กรุณาเลือกบริษัทก่อนใช้งาน" }, { status: 403 });
    }
    const query = searchParams.get("q")?.trim() ?? "";
    const organizationId = searchParams.get("organizationId")?.trim() ?? "";
    const cursor = decodeCursor(searchParams.get("cursor")?.trim() || null);
    const pageSize = parsePageSize(searchParams.get("pageSize"));
    const requestedStatus = searchParams.get("status");

    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      companyId: company.id,
    };

    if (requestedStatus === "active" || requestedStatus === "inactive") {
      where.status = requestedStatus as Status;
    }

    // The tree picker expands one organization node at a time. The supplied
    // id can be a company, branch, or department; the active-company scope
    // above still constrains every branch of this OR.
    const conditions: Prisma.EmployeeWhereInput[] = [];
    if (organizationId) {
      conditions.push({
        OR: [
          { companyId: organizationId },
          { branchId: organizationId },
          { departmentId: organizationId },
        ],
      });
    }

    if (query) {
      where.OR = [
        { employeeCode: { contains: query } },
        { employeeNumber: { contains: query } },
        { firstNameTH: { contains: query } },
        { lastNameTH: { contains: query } },
      ];
    }

    if (cursor) {
      // Match the display order exactly. This turns page N into an index
      // range scan on (companyId, deletedAt, employeeCode, employeeNumber,
      // id), rather than looking up an id and scanning forward from it.
      conditions.push(cursor.employeeCode === null
        ? {
            OR: [
              { employeeCode: null, employeeNumber: { gt: cursor.employeeNumber } },
              { employeeCode: null, employeeNumber: cursor.employeeNumber, id: { gt: cursor.id } },
            ],
          }
        : {
            OR: [
              { employeeCode: { gt: cursor.employeeCode } },
              { employeeCode: cursor.employeeCode, employeeNumber: { gt: cursor.employeeNumber } },
              { employeeCode: cursor.employeeCode, employeeNumber: cursor.employeeNumber, id: { gt: cursor.id } },
              // PostgreSQL orders NULL last for ASC. Include un-coded
              // employees only after the final non-null employee code.
              { employeeCode: null },
            ],
          });
    }
    if (conditions.length) where.AND = conditions;

    // Fetch one extra row to determine whether a next page exists without a
    // COUNT(*) over a tenant with up to 500 employee records on each keystroke.
    const rows = await prisma.employee.findMany({
      where,
      take: pageSize + 1,
      orderBy: [{ employeeCode: "asc" }, { employeeNumber: "asc" }, { id: "asc" }],
      select: {
        id: true,
        employeeCode: true,
        employeeNumber: true,
        firstNameTH: true,
        lastNameTH: true,
        nickname: true,
        status: true,
        Position: { select: { id: true, name: true } },
        Employment: { select: { employmentType: true } },
      },
    });

    const hasMore = rows.length > pageSize;
    const items = (hasMore ? rows.slice(0, pageSize) : rows).map((employee) => ({
      id: employee.id,
      code: employee.employeeCode ?? employee.employeeNumber,
      name: `${employee.firstNameTH} ${employee.lastNameTH}${employee.nickname ? ` (${employee.nickname})` : ""}`.trim(),
      status: employee.status === "active" ? "active" : "inactive",
      positionId: employee.Position?.id,
      positionName: employee.Position?.name,
      type: employee.Employment?.employmentType,
    }));

    return NextResponse.json(
      {
        items,
        nextCursor: hasMore
          ? encodeCursor({
              employeeCode: rows[pageSize - 1].employeeCode,
              employeeNumber: rows[pageSize - 1].employeeNumber,
              id: rows[pageSize - 1].id,
            })
          : null,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Cookie",
          "Server-Timing": `employee-directory;dur=${(performance.now() - startedAt).toFixed(1)}`,
        },
      }
    );
  } catch (error) {
    console.error("GET /api/employee/directory failed:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดรายชื่อพนักงานได้" }, { status: 500 });
  }
}
