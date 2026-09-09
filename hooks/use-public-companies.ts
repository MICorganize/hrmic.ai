"use client";

import { useEffect, useState } from "react";

export type { PublicCompany } from "@/lib/public-company-types";
import type { PublicCompany } from "@/lib/public-company-types";

type PublicCompaniesResponse = {
  companies?: PublicCompany[];
};

type BrowserDirectoryCache = {
  cachedAt: number;
  companies: PublicCompany[];
};

const BROWSER_DIRECTORY_CACHE_KEY = "hrmic:public-company-directory:v1";
const BROWSER_DIRECTORY_CACHE_TTL_MS = 10 * 60 * 1_000;

function readBrowserDirectoryCache(): PublicCompany[] | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(BROWSER_DIRECTORY_CACHE_KEY) ?? "null") as BrowserDirectoryCache | null;
    if (!cached || !Array.isArray(cached.companies) || Date.now() - cached.cachedAt >= BROWSER_DIRECTORY_CACHE_TTL_MS) return null;
    return cached.companies;
  } catch {
    return null;
  }
}

function writeBrowserDirectoryCache(companies: PublicCompany[]) {
  try {
    window.localStorage.setItem(BROWSER_DIRECTORY_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), companies } satisfies BrowserDirectoryCache));
  } catch {
    // Browser storage is only an optional speed layer; the network response remains authoritative.
  }
}

export function usePublicCompanies(initialCompanies?: PublicCompany[]) {
  const [companies, setCompanies] = useState<PublicCompany[]>(initialCompanies ?? []);
  const [loading, setLoading] = useState(initialCompanies === undefined);

  useEffect(() => {
    if (initialCompanies !== undefined) return;

    let cancelled = false;
    const cached = readBrowserDirectoryCache();
    if (cached) {
      setCompanies(cached);
      setLoading(false);
    }

    // The route supplies a short browser/CDN cache lifetime. Let the browser
    // reuse that response when the user returns to the login page instead of
    // requesting the same company codes again.
    void fetch("/public-company-data")
      .then(async (response) => {
        if (!response.ok) return { companies: [] } satisfies PublicCompaniesResponse;
        return (await response.json()) as PublicCompaniesResponse;
      })
      .then(({ companies: companyList = [] }) => {
        if (!cancelled) {
          setCompanies(companyList);
          writeBrowserDirectoryCache(companyList);
        }
      })
      .catch(() => {
        // Retain a valid browser snapshot when a transient network failure occurs.
        if (!cancelled && !cached) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialCompanies]);

  return { companies, loading };
}
