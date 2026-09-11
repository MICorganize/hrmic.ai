import { connection } from "next/server";

import { PortalActiveCompanySync } from "@/components/layouts/PortalActiveCompanySync";
import { getActiveCompany } from "@/lib/active-company";

/** Start authorization once per navigation and stream it without a browser API hop. */
export default async function PortalTemplate({ children }: { children: React.ReactNode }) {
  await connection();
  const company = getActiveCompany();
  return (
    <>
      <PortalActiveCompanySync company={company} />
      {children}
    </>
  );
}
