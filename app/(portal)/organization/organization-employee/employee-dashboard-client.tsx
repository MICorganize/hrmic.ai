"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { OrgNode } from "@/components/employee/EmployeeSelectPanel";

import {
  preloadEmployeeSummary,
  invalidatePreloadedEmployeeSummary,
  storePreloadedEmployeeSummary,
  type EmployeeSummaryData,
} from "@/lib/employee/summary-client";

import { DashboardContent as EmployeeDashboardContent } from "./employee-dashboard-content";
import { EmployeeDashboardSkeleton } from "./employee-dashboard-skeleton";
import { EmployeePageHeadingCard } from "./employee-page-heading-card";

const EmployeeDetailPage = dynamic(() => import("./[id]/page"), {
  ssr: false,
  loading: () => <div role="status" className="p-6 text-sm text-muted-foreground">กำลังโหลดข้อมูลพนักงาน...</div>,
});

const EmployeeCreatePage = dynamic(() => import("./create/page"), {
  ssr: false,
  loading: () => <div role="status" className="p-6 text-sm text-muted-foreground">กำลังเปิดหน้าเพิ่มข้อมูลพนักงาน...</div>,
});

function EmployeeDashboardErrorContent({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-xl border border-[#f1d8dd] bg-white px-6 py-14 text-center shadow-sm">
    <p className="text-sm text-foreground">ไม่สามารถโหลดข้อมูลพนักงานได้</p>
    <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center rounded-md bg-[#2563eb] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8]">ลองใหม่</button>
  </div>;
}

function OrganizationEmployeePageShell({
  stats,
  historyPage,
  onHistoryPageChange,
  onAddEmployee,
  loadError = false,
  onRetry,
  onEmployeeSelect,
}: {
  stats: EmployeeSummaryData | null;
  historyPage: number;
  onHistoryPageChange: (page: number) => void;
  onAddEmployee: () => void;
  loadError?: boolean;
  onRetry?: () => void;
  onEmployeeSelect?: (employee: OrgNode) => void;
}) {
  return (
    <div data-employee-page className="min-h-[calc(100vh-70px)] bg-[#f3f6fb] font-sans">
      <h2 className="sr-only">เมนูย่อย</h2>
      <button type="button" className="sr-only">Dashboard</button>
      {stats ? <span className="sr-only">{stats.total}/{stats.company?.employeeLimit ?? 500} คน</span> : null}
      <div className="mx-auto max-w-[1600px] p-3 sm:p-4">
        <EmployeePageHeadingCard />

        <div className="mt-3">{loadError && !stats && onRetry ? <EmployeeDashboardErrorContent onRetry={onRetry} /> : stats ? <EmployeeDashboardContent stats={stats} historyPage={historyPage} onHistoryPageChange={onHistoryPageChange} onEmployeeSelect={onEmployeeSelect} onAddEmployee={onAddEmployee} /> : <EmployeeDashboardSkeleton />}</div>
      </div>
    </div>
  );
}

function OrganizationEmployeeCreateShell({
  stats,
  onCancel,
  onComplete,
}: {
  stats: EmployeeSummaryData | null;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const employeeCount = stats?.total ?? 0;
  const employeeLimit = stats?.company?.employeeLimit ?? 10;
  const progressPercent = Math.min(100, (employeeCount / employeeLimit) * 100);

  return (
    <div data-employee-page className="min-h-[calc(100vh-70px)] bg-[#f3f6fb] font-sans">
      <div className="mx-auto max-w-[1600px] p-3 sm:p-4">
        <section className="h-[123px] w-full overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-[0_3px_12px_rgba(29,52,93,0.07)]">
          <div className="flex flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 self-start">
              <p className="flex items-center gap-0 text-sm font-normal leading-[22.001px] text-[#7b8798]"><span>พนักงาน</span><ChevronRight className="size-4" /><span>ข้อมูลพนักงาน</span></p>
              <div className="mt-0.5 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight text-[#172348]">เพิ่มพนักงาน</h1>{stats?.company?.name && <span className="rounded-md bg-[#eaf4ff] px-2 py-1 text-xs font-medium text-[#126fd5]">{stats.company.name}</span>}</div>
            </div>
            <div className="flex min-w-[260px] flex-col gap-2 self-start">
              <div className="flex items-center justify-between text-sm font-normal leading-[22.001px] text-[#7b8798]"><span>จำนวนพนักงานในระบบ</span><strong className="text-[#172348]">{employeeCount} / {employeeLimit} คน</strong></div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e8edf5]"><div className="h-full rounded-full bg-gradient-to-r from-[#ff9418] to-[#ffb126]" style={{ width: `${progressPercent}%` }} /></div>
              <button type="button" onClick={onCancel} className="inline-flex h-9 items-center justify-center self-end rounded-lg border border-[#cfd9e8] bg-white px-4 text-sm font-medium text-[#29466f] hover:bg-[#f6f8fc]">ยกเลิก</button>
            </div>
          </div>
        </section>

        <div className="mt-3">
          <EmployeeCreatePage embedded employeeCount={stats?.total ?? null} employeeLimit={stats?.company?.employeeLimit ?? null} onCancel={onCancel} onComplete={onComplete} />
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboardClient({
  initialStats,
}: {
  initialStats?: Promise<EmployeeSummaryData | null>;
}) {
  // Match the server shell during hydration. The effect below reuses cached
  // or in-flight data without holding up rendering or reading browser storage
  // during the first render.
  const [stats, setStats] = useState<EmployeeSummaryData | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [openCreatePage, setOpenCreatePage] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgNode | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

  const loadStats = useCallback(async (page: number, version: number) => {
    if (page === 1 && version === 0 && initialStats) {
      const streamed = await initialStats;
      if (!streamed) throw new Error("No active company");
      storePreloadedEmployeeSummary(streamed);
      if (streamed.company?.id) storePreloadedEmployeeSummary(streamed, streamed.company.id);
      return streamed;
    }
    if (page === 1) return preloadEmployeeSummary();
    const response = await fetch(`/api/employee?view=summary&historyPage=${page}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as EmployeeSummaryData;
  }, [initialStats]);

  useEffect(() => {
    let cancelled = false;
    void loadStats(historyPage, requestVersion).then((value) => {
      if (!cancelled) {
        setStats(value);
        setLoadError(false);
      }
    }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [historyPage, loadStats, requestVersion]);

  useEffect(() => {
    const onActiveCompanyChanged = (event: Event) => {
      const summary = (event as CustomEvent<{ summary?: EmployeeSummaryData | null }>).detail?.summary ?? null;
      setStats(summary);
      setSelectedEmployee(null);
      setHistoryPage(1);
      setLoadError(false);
      setRequestVersion((version) => version + 1);
    };
    window.addEventListener("active-company-changed", onActiveCompanyChanged);
    return () => window.removeEventListener("active-company-changed", onActiveCompanyChanged);
  }, []);

  if (openCreatePage) return <OrganizationEmployeeCreateShell
    stats={stats}
    onCancel={() => setOpenCreatePage(false)}
    onComplete={() => {
      setOpenCreatePage(false);
      invalidatePreloadedEmployeeSummary();
      setRequestVersion((version) => version + 1);
    }}
  />;
  if (selectedEmployee) return <EmployeeDetailPage key={selectedEmployee.id} employeeId={selectedEmployee.id} selectedEmployee={selectedEmployee} onBack={() => {
    setSelectedEmployee(null);
    invalidatePreloadedEmployeeSummary();
    setRequestVersion((version) => version + 1);
  }} />;
  return <OrganizationEmployeePageShell stats={stats} historyPage={historyPage} onHistoryPageChange={setHistoryPage} onAddEmployee={() => setOpenCreatePage(true)} onEmployeeSelect={setSelectedEmployee} loadError={loadError} onRetry={() => { setLoadError(false); setRequestVersion((version) => version + 1); }} />;
}
