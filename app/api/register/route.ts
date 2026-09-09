import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/encryption/password";
import { prisma } from "@/lib/prisma";

const registrationInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const parsed = registrationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalidInput" }, { status: 400 });
  }

  const input = parsed.data;

  try {
    // A public registration may only attach to an active company. The selected
    // company's tenant becomes the new user's tenant boundary.
    const company = await prisma.company.findFirst({
      where: { id: input.companyId, status: "active", deletedAt: null },
      select: { id: true, tenantId: true },
    });
    if (!company) {
      return NextResponse.json({ error: "companyUnavailable" }, { status: 400 });
    }

    const passwordHash = await hashPassword(input.password);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          status: "active",
          tenantId: company.tenantId,
          companyId: company.id,
          UserCompanyAccess: { create: { companyId: company.id, role: "member" } },
        },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: company.tenantId,
          companyId: company.id,
          userId: user.id,
          action: "insert",
          entityType: "user",
          entityId: user.id,
          metadata: { source: "public-registration" },
        },
      });
    });

    return NextResponse.json({ registered: true }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "emailExists" }, { status: 409 });
    }

    console.error("POST /api/register failed:", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
