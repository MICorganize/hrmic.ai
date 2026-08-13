import { PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@hrmic.ai" },
    update: {},
    create: {
      email: "admin@hrmic.ai",
      name: "HRMic Admin",
      role: "ADMIN",
      profile: {
        create: { fullName: "HRMic Admin" },
      },
    },
  });

  console.log(`Seeded admin user: ${admin.email} (${admin.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
