"use client";

import { useCallback, useEffect, useState } from "react";

type PageResponse<T> = { employees: T[]; nextCursor: string | null };

/**
 * Keeps a single bounded employee page in memory. Every tab using the broad
 * employee projection shares this instead of accidentally hydrating a whole
 * tenant into React state.
 */
export function useBasicEmployeePage<T extends { id: string }>(companyId: string, pageSize = 100) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async (requestedCursor: string | null = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic", pageSize: String(pageSize) });
      if (companyId) params.set("companyId", companyId);
      if (requestedCursor) params.set("cursor", requestedCursor);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as PageResponse<T>;
      setRows(data.employees);
      setNextCursor(data.nextCursor);
      return data.employees;
    } finally {
      setLoading(false);
    }
  }, [companyId, pageSize]);

  const reset = useCallback(async () => {
    setCursor(null);
    setPreviousCursors([]);
    setPage(1);
    return load(null);
  }, [load]);

  const next = useCallback(async () => {
    if (!nextCursor) return;
    setPreviousCursors((current) => [...current, cursor ?? ""]);
    setCursor(nextCursor);
    setPage((current) => current + 1);
    return load(nextCursor);
  }, [cursor, load, nextCursor]);

  const previous = useCallback(async () => {
    if (previousCursors.length === 0) return;
    const previousCursor = previousCursors.at(-1) ?? null;
    setPreviousCursors((current) => current.slice(0, -1));
    setCursor(previousCursor);
    setPage((current) => Math.max(1, current - 1));
    return load(previousCursor);
  }, [load, previousCursors]);

  useEffect(() => {
    void reset();
  }, [reset]);

  return {
    rows,
    setRows,
    loading,
    page,
    hasNextPage: Boolean(nextCursor),
    hasPreviousPage: previousCursors.length > 0,
    next,
    previous,
    reload: reset,
  };
}
