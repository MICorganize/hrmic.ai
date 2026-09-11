"use client";

import { useEffect } from "react";

import type { ActiveCompany } from "@/lib/active-company";

export const PORTAL_ACTIVE_COMPANY_EVENT = "portal-active-company";
let latestActiveCompany: ActiveCompany | null | undefined;
let clientSelectionVersion = 0;
let latestServerSyncId = 0;

export function getLatestPortalActiveCompany() {
  return latestActiveCompany;
}

export function resetPortalActiveCompany() {
  clientSelectionVersion += 1;
  latestActiveCompany = undefined;
}

function publishActiveCompany(company: ActiveCompany | null) {
  latestActiveCompany = company;
  window.dispatchEvent(new CustomEvent(PORTAL_ACTIVE_COMPANY_EVENT, { detail: company }));
}

/**
 * Commits a company selected in the browser. Pending server snapshots that
 * started before this selection must not be allowed to restore the old label.
 */
export function selectPortalActiveCompany(company: ActiveCompany) {
  clientSelectionVersion += 1;
  publishActiveCompany(company);
}

/** Bridges the streamed server authorization result into the interactive shell. */
export function PortalActiveCompanySync({ company }: { company: Promise<ActiveCompany | null> }) {
  useEffect(() => {
    let cancelled = false;
    const syncId = ++latestServerSyncId;
    const selectionVersion = clientSelectionVersion;
    void company.then(
      (value) => {
        if (
          !cancelled &&
          syncId === latestServerSyncId &&
          selectionVersion === clientSelectionVersion
        ) {
          publishActiveCompany(value);
        }
      },
      () => {
        if (
          !cancelled &&
          syncId === latestServerSyncId &&
          selectionVersion === clientSelectionVersion
        ) {
          publishActiveCompany(null);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [company]);

  return null;
}
