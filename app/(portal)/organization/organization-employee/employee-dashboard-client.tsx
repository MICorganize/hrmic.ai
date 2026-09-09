"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { CompanyEmployeeSelectPanel } from "@/components/employee/CompanyEmployeeSelectPanel";
import type { OrgNode } from "@/components/employee/EmployeeSelectPanel";

import {
  preloadEmployeeSummary,
  invalidatePreloadedEmployeeSummary,
  type EmployeeSummaryData,
} from "@/lib/employee/summary-client";

import { DashboardContent as EmployeeDashboardContent } from "./employee-dashboard-content";
import { EmployeeDashboardSkeleton } from "./employee-dashboard-skeleton";

const FullOrganizationEmployeePage = dynamic(() => import("./page-client"), {
  ssr: false,
  loading: () => <OrganizationEmployeePageShell stats={null} historyPage={1} onHistoryPageChange={() => {}} onOpenFullPage={() => {}} />,
});

const EmployeeDetailPage = dynamic(() => import("./[id]/page"), {
  ssr: false,
  loading: () => <div role="status" className="p-6 text-sm text-muted-foreground">กำลังโหลดข้อมูลพนักงาน...</div>,
});

const SUBMENU_ITEMS = [
  "Dashboard", "นำเข้าข้อมูลพนักงาน", "รูปพนักงาน", "ข้อมูลพื้นฐาน", "ข้อมูลเงินเดือน", "ข้อมูลผู้ใช้", "ข้อมูลใบหน้า",
  "กำหนดผู้อนุมัติรายบุคคล", "ช่องทางการรับเงิน", "ตั้งค่ากะการทำงาน", "ตั้งค่าการมองเห็นกะการทำงาน",
  "ตั้งค่าวันทำงาน-วันหยุด", "ตั้งค่ากะการทำงาน-วันหยุด", "ตั้งค่าทั่วไป", "รายรับรายจ่ายคงที่", "รายรับรายจ่ายอัตโนมัติ",
  "กองทุน", "เงินสะสมย้อนหลัง", "เงินประกันการทำงาน", "ตั้งค่าการแก้ไขข้อมูล", "ตั้งค่า Hashtag", "ตั้งค่าสวัสดิการ",
  "ตั้งค่าการมองเห็นประเภทโอที", "ตั้งค่าการมองเห็นประเภทการลา", "ตั้งค่า Cost Distribution", "ตั้งค่าคำนวณโควตาการลา",
  "ลดหย่อนภาษี", "นำเข้าฝึกอบรม", "นำเข้าสินทรัพย์ถือครอง", "นำเข้าประวัติส่วนตัว", "ลบข้อมูลพนักงาน",
];

function EmployeeDashboardErrorContent({ onRetry }: { onRetry: () => void }) {
  return <div className="ml-4 rounded-lg bg-white px-6 py-14 text-center">
    <p className="text-sm text-foreground">ไม่สามารถโหลดข้อมูลพนักงานได้</p>
    <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center rounded-md bg-[#2563eb] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8]">ลองใหม่</button>
  </div>;
}

function OrganizationEmployeePageShell({
  stats,
  historyPage,
  onHistoryPageChange,
  onOpenFullPage,
  loadError = false,
  onRetry,
  onEmployeeSelect,
}: {
  stats: EmployeeSummaryData | null;
  historyPage: number;
  onHistoryPageChange: (page: number) => void;
  onOpenFullPage: () => void;
  loadError?: boolean;
  onRetry?: () => void;
  onEmployeeSelect?: (employee: OrgNode) => void;
}) {
  const [selectOpen, setSelectOpen] = useState(false);
  const closeSelect = useCallback(() => setSelectOpen(false), []);
  useEffect(() => {
    window.addEventListener("employee-list-close", closeSelect);
    return () => window.removeEventListener("employee-list-close", closeSelect);
  }, [closeSelect]);
  const maxDisplay = stats?.company?.employeeLimit ?? 500;
  const loaded = stats?.total ?? 0;
  const progressPct = Math.min(100, (loaded / maxDisplay) * 100);
  return (
    <div data-employee-page onClick={(event) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-employee-select-panel]") && !target.closest("[data-employee-select-trigger]")) closeSelect();
    }}>
      <CompanyEmployeeSelectPanel open={selectOpen} onClose={closeSelect} onEmployeeSelect={onEmployeeSelect ?? (() => {})} />
      <section className="relative flex h-40 items-center justify-between overflow-hidden border-b border-white/20 bg-[#61a8ff] p-6 tracking-[-0.1px] text-white">
        <div className="flex min-w-0 flex-col items-start">
          <div className="hidden items-center text-sm leading-[22.001px] text-white/70 md:flex"><span>ข้อมูลองค์กร</span><ChevronRight className="size-4" /><span>ข้อมูลพนักงาน</span></div>
          <div className="flex items-center"><h1 className="w-fit pr-[30px] text-2xl font-normal leading-[37.716px] text-white">ข้อมูลพนักงาน</h1></div>
          <div className="hidden md:block"><button type="button" onClick={() => setSelectOpen((open) => !open)} aria-expanded={selectOpen} data-employee-select-trigger className="inline-flex h-[36.65px] w-[170.8px] items-center justify-center rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)]"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-6 shrink-0" fill="currentColor"><path d="M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z" /></svg>เลือกพนักงาน</button></div>
        </div>
        <div className="mx-16 hidden flex-1 flex-col items-center justify-center md:flex"><div className="h-2 w-full overflow-hidden rounded-[4px] bg-[#c5c6cb]"><div className="h-full origin-left bg-[#ffa000] transition-[transform]" style={{ transform: `scale3d(${progressPct / 100}, 1, 1)` }} /></div><span className="w-full text-right text-sm font-normal leading-[22.001px] text-white">{stats ? `${loaded}/${maxDisplay} คน` : "กำลังโหลดจำนวนพนักงาน…"}</span></div>
        <button type="button" onClick={onOpenFullPage} className="mt-4 hidden h-[36.65px] shrink-0 items-center justify-center rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)] md:flex">เพิ่มพนักงาน</button>
      </section>

      <div className="relative min-h-[calc(100vh-10rem)] bg-[#f1f7fc] px-3 pb-8 pt-10 sm:px-4 lg:px-0 lg:pt-0"><div className="grid items-start gap-3 lg:grid-cols-[226.3375px_minmax(0,1fr)] lg:gap-0"><aside className="z-10 flex flex-col overflow-x-hidden overflow-y-auto border-none bg-[#fafafa] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)] lg:mt-10 lg:w-fit" style={{ boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.35)" }}><div className="border-none px-4 py-2"><h2 className="m-0 border-none text-xl font-normal leading-[31.425px] tracking-[-0.1px] text-[rgba(0,0,0,0.85)]">เมนูย่อย</h2></div><div className="border-none p-2 px-4 text-sm font-normal leading-[22.001px] tracking-[-0.1px]">{SUBMENU_ITEMS.map((item) => <button key={item} type="button" onClick={item === "Dashboard" ? undefined : onOpenFullPage} className={`mb-3 block h-[41.2px] w-full rounded-[8px] border-[1.6px] px-2 py-2 text-center text-sm font-normal leading-[22.001px] tracking-[-0.1px] ${item === "Dashboard" ? "border-[#2299ff] bg-[#2299ff] text-white" : "border-[#2299ff] bg-transparent text-[rgba(0,0,0,0.87)]"}`}>{item}</button>)}</div></aside><div className="min-w-0 lg:-mt-[15px]">{loadError && !stats && onRetry ? <EmployeeDashboardErrorContent onRetry={onRetry} /> : stats ? <EmployeeDashboardContent stats={stats} historyPage={historyPage} onHistoryPageChange={onHistoryPageChange} /> : <EmployeeDashboardSkeleton />}</div></div></div>
    </div>
  );
}

export default function EmployeeDashboardClient() {
  // Match the server shell during hydration. The effect below reuses cached
  // or in-flight data without holding up rendering or reading browser storage
  // during the first render.
  const [stats, setStats] = useState<EmployeeSummaryData | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [openFullPage, setOpenFullPage] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgNode | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

  const loadStats = useCallback(async (page: number) => {
    if (page === 1) return preloadEmployeeSummary();
    const response = await fetch(`/api/employee?view=summary&historyPage=${page}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as EmployeeSummaryData;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadStats(historyPage).then((value) => { if (!cancelled) setStats(value); }).catch(() => { if (!cancelled) setLoadError(true); });
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

  if (openFullPage) return <FullOrganizationEmployeePage />;
  if (selectedEmployee) return <EmployeeDetailPage key={selectedEmployee.id} employeeId={selectedEmployee.id} selectedEmployee={selectedEmployee} onEmployeeChange={setSelectedEmployee} onBack={() => {
    setSelectedEmployee(null);
    invalidatePreloadedEmployeeSummary();
    setRequestVersion((version) => version + 1);
  }} />;
  return <OrganizationEmployeePageShell stats={stats} historyPage={historyPage} onHistoryPageChange={setHistoryPage} onOpenFullPage={() => setOpenFullPage(true)} onEmployeeSelect={setSelectedEmployee} loadError={loadError} onRetry={() => { setLoadError(false); setRequestVersion((version) => version + 1); }} />;
}
