"use client";

import { useEffect, useRef, useState } from "react";
import { EmployeeSelectPanel, type OrgNode } from "./EmployeeSelectPanel";

/** Keep the shell interactive while the authorized, active-company read runs. */
export function CompanyEmployeeSelectPanel({ open, onClose, onEmployeeSelect }: {
  open: boolean;
  onClose: () => void;
  onEmployeeSelect: (employee: OrgNode) => void;
}) {
  const [tree, setTree] = useState<OrgNode[] | null>(null);
  const [error, setError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || tree !== null) return;
    const controller = new AbortController();
    request.current = controller;
    void fetch("/api/employee?view=tree&includeEmployees=1", {
      cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as { orgTree: OrgNode[] };
    }).then((data) => {
      if (!controller.signal.aborted) { setTree(data.orgTree); setError(false); }
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [open, tree, requestVersion]);

  useEffect(() => {
    const invalidate = () => {
      // Cancel immediately so a previous company's late response cannot win.
      request.current?.abort();
      setTree(null);
      setError(false);
      setRequestVersion((version) => version + 1);
    };
    const changeCompany = () => { invalidate(); onClose(); };
    window.addEventListener("active-company-changed", changeCompany);
    window.addEventListener("employee-data-changed", invalidate);
    return () => {
      window.removeEventListener("active-company-changed", changeCompany);
      window.removeEventListener("employee-data-changed", invalidate);
    };
  }, [onClose]);

  if (!open) return null;
  return <EmployeeSelectPanel orgTree={tree ?? []} loading={tree === null && !error}
    error={error} onRetry={() => { setError(false); setRequestVersion((version) => version + 1); }}
    onClose={onClose} onEmployeeSelect={onEmployeeSelect} />;
}
