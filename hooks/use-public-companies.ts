"use client";

import { useEffect, useState } from "react";

export type PublicCompany = {
  id: string;
  code: string;
  name: string;
};

type PublicCompaniesResponse = {
  companies?: PublicCompany[];
};

export function usePublicCompanies() {
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetch("/public-company-data", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { companies: [] } satisfies PublicCompaniesResponse;
        return (await response.json()) as PublicCompaniesResponse;
      })
      .then(({ companies: companyList = [] }) => {
        if (!cancelled) setCompanies(companyList);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { companies, loading };
}
