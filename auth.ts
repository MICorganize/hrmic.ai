import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/auth/credentials";
import { verifyPassword } from "@/lib/encryption/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        companyId: { label: "Company", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            status: true,
            tenantId: true,
            UserRole: { select: { Role: { select: { code: true, name: true } } } },
          },
        });
        if (!user?.passwordHash || user.status !== "active") return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        const roles = user.UserRole.map(({ Role }) => Role);
        const isTenantAdmin = roles.some(({ code, name }) => {
          const normalizedCode = code.toLowerCase();
          const normalizedName = name.toLowerCase();
          return ["admin", "administrator", "owner", "super_admin", "superadmin"].includes(normalizedCode)
            || ["admin", "administrator", "owner", "ผู้ดูแลระบบ"].includes(normalizedName);
        });

        // Do this only after password verification. It removes the former
        // follow-up `/api/active-company` round trip without exposing whether
        // a company exists or is accessible to an unauthenticated caller.
        let activeCompanyId: string | undefined;
        if (parsed.data.companyId) {
          const company = await prisma.company.findFirst({
            where: {
              id: parsed.data.companyId,
              tenantId: user.tenantId,
              deletedAt: null,
              ...(isTenantAdmin ? {} : { UserCompanyAccess: { some: { userId: user.id } } }),
            },
            select: { id: true },
          });
          if (!company) return null;
          activeCompanyId = company.id;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: roles[0]?.name ?? null,
          activeCompanyId,
        };
      },
    }),
    // Add OAuth providers here, e.g.:
    // Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
  ],
  callbacks: {
    // Attach the role from the DB to the JWT/session for authorization.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.activeCompanyId = user.activeCompanyId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
        session.user.activeCompanyId = token.activeCompanyId;
      }
      return session;
    },
  },
});
