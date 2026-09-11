import { Suspense } from "react";

import PortalLayoutClient from "@/components/layouts/PortalLayoutClient";

function PortalShellFallback() {
  return <div className="min-h-screen animate-pulse bg-[#f5f7fa]" aria-busy="true" />;
}

/** Keep URL-dependent client navigation behind a shell boundary for PPR. */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PortalShellFallback />}><PortalLayoutClient>{children}</PortalLayoutClient></Suspense>;
}
