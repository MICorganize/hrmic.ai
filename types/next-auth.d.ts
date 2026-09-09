import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      /** Initial company selected during the signed-in Credentials request. */
      activeCompanyId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    activeCompanyId?: string;
  }
}

// next-auth/jwt re-exports from @auth/core/jwt, so augment the origin module.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: string;
    activeCompanyId?: string;
  }
}
