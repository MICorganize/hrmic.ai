import { PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hashPassword } from "../lib/encryption/password";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "admin@hrmic.ai";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@1234";

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.warn(
      "No tenant found in the database — seed requires at least one tenant to attach the user."
    );
    return;
  }

  const adminRole = await prisma.role.findFirst({ where: { name: "ผู้ดูแลระบบ" } });
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, status: "active" },
    create: {
      email: ADMIN_EMAIL,
      name: "HRMic Admin",
      tenantId: tenant.id,
      status: "active",
      passwordHash,
      UserRole: adminRole
        ? { create: [{ roleId: adminRole.id }] }
        : undefined,
    },
  });

  console.log(`Seeded admin user: ${admin.email} (${admin.status})`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("Change it in production via ADMIN_PASSWORD env or the database.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
