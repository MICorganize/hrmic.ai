/**
 * Establish the Prisma/Neon connection before the server accepts traffic.
 * Without this, the first tenant dashboard request pays the connection setup
 * cost and can appear stalled even though the aggregate queries themselves
 * are fast once the pool is ready.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const [{ prisma }, { getPublicCompanies }] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/public-companies"),
    ]);
    await prisma.$connect();
    // Populate the small public directory before the instance serves its
    // first Login request. Redis shares this warm result across instances.
    await getPublicCompanies();
  } catch (error) {
    // Keep the application available; the request path retains Prisma's normal
    // error handling and can reconnect after a temporary database outage.
    console.error("Unable to warm the database connection:", error);
  }
}
