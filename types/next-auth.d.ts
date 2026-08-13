import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

// next-auth/jwt re-exports from @auth/core/jwt, so augment the origin module.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
  }
}
