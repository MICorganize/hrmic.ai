"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";

import { EmployeeCursorPagination } from "@/components/employee/EmployeeCursorPagination";
import { EmployeeSelectPanel, type OrgNode } from "@/components/employee/EmployeeSelectPanel";
import { EMPLOYEE_DASHBOARD_RESET_EVENT } from "@/components/layouts/portalEvents";
import type { EmployeeDetail } from "./[id]/page";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThaiDatePicker, ThaiMonthPicker } from "@/components/ui/thai-date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { USER_IMAGE_ORIGIN } from "@/lib/external-assets";
import { useBasicEmployeePage } from "@/hooks/use-basic-employee-page";
import {
  getPreloadedEmployeeSummary,
  invalidatePreloadedEmployeeSummary,
  preloadEmployeeSummary,
  storePreloadedEmployeeSummary,
  type EmployeeSummaryData,
} from "@/lib/employee/summary-client";
import { DashboardContent } from "./employee-dashboard-content";

// These flows are mutually exclusive with the employee dashboard. Loading
// them on demand preserves the existing UI while keeping their form logic and
// dependencies out of the initial employee-page bundle.
const OrganizationEmployeeCreatePage = dynamic(() => import("./create/page"), { ssr: false });
const OrganizationEmployeeDetailPage = dynamic(() => import("./[id]/page"), { ssr: false });
const DeleteEmployeeContent = dynamic(
  () => import("@/components/employee/DeleteEmployeeContent").then((module) => module.DeleteEmployeeContent),
  { ssr: false }
);

/* ---------------------------------- Types --------------------------------- */

type EmployeeStats = EmployeeSummaryData;

type OrganizationRecord = {
  id: string;
  kind: "company" | "branch" | "department";
  name: string;
  code: string;
  children?: OrganizationRecord[];
};

type OrganizationOption = {
  id: string;
  name: string;
  code: string;
  kind: OrganizationRecord["kind"];
};

function flattenOrganizationRecords(nodes: OrganizationRecord[], depth = 0): OrganizationOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: `${"\u00a0\u00a0".repeat(depth)}${node.name}`, code: node.code, kind: node.kind },
    ...flattenOrganizationRecords(node.children ?? [], depth + 1),
  ]);
}

function OrganizationTreeDropdown({ companies, value, loading, onChange }: { companies: OrganizationRecord[]; value: string; loading: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(companies.map((company) => company.id)));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExpanded((current) => new Set([...current, ...companies.map((company) => company.id)]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [companies]);
  const findNode = (nodes: OrganizationRecord[]): OrganizationRecord | undefined => { for (const node of nodes) { if (node.id === value) return node; const child = findNode(node.children ?? []); if (child) return child; } return undefined; };
  const selectedNode = findNode(companies);
  const renderNode = (node: OrganizationRecord, depth = 0): React.ReactNode => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expanded.has(node.id);
    return <li key={`${node.kind}-${node.id}`} role="treeitem" aria-level={depth + 1} aria-expanded={hasChildren ? isExpanded : undefined}><div className="flex min-h-6 items-center rounded-none pr-1 hover:bg-[#f5f5f5]"><span aria-hidden className="h-6 shrink-0" style={{ width: `${depth * 18}px` }} />{hasChildren ? <button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); next.has(node.id) ? next.delete(node.id) : next.add(node.id); return next; })} className="flex size-6 shrink-0 items-center justify-center text-[#666] hover:text-[#1677ff]" aria-label={isExpanded ? `ยุบ ${node.name}` : `ขยาย ${node.name}`}>{isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</button> : <span className="size-6 shrink-0" />}<button type="button" disabled={hasChildren} onClick={() => { onChange(node.id); setOpen(false); }} className={cn("min-w-0 flex-1 rounded-none px-1 py-0 text-left text-sm leading-6", hasChildren ? "cursor-not-allowed text-black/25" : "text-black/85 hover:bg-[#e6f7ff]", value === node.id && "bg-[#e6f7ff] text-[#1677ff]")} title={node.name}>{node.name}</button></div>{hasChildren && isExpanded && <ul role="group" className="m-0 list-none p-0">{(node.children ?? []).map((child) => renderNode(child, depth + 1))}</ul>}</li>;
  };
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" disabled={loading || companies.length === 0} className="flex h-8 w-full items-center justify-between rounded-[2px] border border-[#d9d9d9] bg-white px-[11px] text-left text-sm leading-[22px] text-black/85 shadow-none transition-colors focus-visible:outline-none focus-visible:border-[#40a9ff] focus-visible:shadow-[0_0_0_2px_rgba(24,144,255,0.2)] disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-black/25"><span className={cn("truncate", !selectedNode && "text-black/25")}>{loading ? "กำลังโหลดโครงสร้างองค์กร..." : selectedNode?.name ?? "ข้อมูลองค์กร"}</span><ChevronDown className="ml-2 size-4 shrink-0 text-black/25" /></button></PopoverTrigger><PopoverContent align="start" sideOffset={0} className="max-h-[280px] w-[var(--radix-popover-trigger-width)] overflow-auto rounded-[2px] bg-white p-1 shadow-[0_3px_6px_-4px_rgba(0,0,0,0.12),0_6px_16px_0_rgba(0,0,0,0.08),0_9px_28px_8px_rgba(0,0,0,0.05)] ring-0"><ul role="tree" aria-label="ข้อมูลองค์กร" className="m-0 list-none p-0">{companies.map((company) => renderNode(company))}</ul></PopoverContent></Popover>;
}

type ImportEmployee = { id: string; code: string; name: string };
type ImportHistory = { id: string; date: string; total: number; inserted: number; updated: number; deleted: number; errors: number };

function AssignmentTable({ employees, selected, onChange }: { employees: ImportEmployee[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="mt-4 overflow-x-auto border border-[#f0f0f0]">
      <Table className="min-w-[590px] table-fixed text-sm">
        <colgroup><col className="w-[60px]" /><col className="w-[80px]" /><col className="w-[120px]" /><col className="w-[250px]" /><col className="w-[80px]" /></colgroup>
        <TableHeader><TableRow className="h-[54.8px] hover:bg-transparent">
          <TableHead className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white"><input aria-label="เลือกทั้งหมด" type="checkbox" checked={employees.length > 0 && selected.length === employees.length} onChange={(event) => onChange(event.target.checked ? employees.map((employee) => employee.id) : [])} /></TableHead>
          <TableHead className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">ลำดับ</TableHead><TableHead className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">รหัสพนักงาน</TableHead><TableHead className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">ชื่อพนักงาน</TableHead><TableHead className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white" />
        </TableRow></TableHeader>
        <TableBody>{employees.length === 0 ? <TableRow className="h-36 hover:bg-transparent"><TableCell colSpan={5} className="border border-[#f0f0f0] p-0"><div className="flex h-36 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"><svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" className="ant-empty-img-simple"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fillRule="nonzero" stroke="#d9d9d9"><path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" /></g></g></svg><span>ไม่มีข้อมูล</span></div></TableCell></TableRow> : employees.map((employee, index) => <TableRow key={employee.id} className="h-[54.8px] hover:bg-transparent"><TableCell className="border border-[#f0f0f0] p-4 text-center"><input aria-label={`เลือก ${employee.name}`} type="checkbox" checked={selected.includes(employee.id)} onChange={(event) => onChange(event.target.checked ? [...selected, employee.id] : selected.filter((id) => id !== employee.id))} /></TableCell><TableCell className="border border-[#f0f0f0] p-4 text-center">{index + 1}</TableCell><TableCell className="border border-[#f0f0f0] p-4 text-center">{employee.code}</TableCell><TableCell className="border border-[#f0f0f0] p-4">{employee.code}: {employee.name}</TableCell><TableCell className="border border-[#f0f0f0] p-4" /></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

/* ---------------------------------- Data ---------------------------------- */

const SUBMENU_ITEMS = [
  "Dashboard",
  "นำเข้าข้อมูลพนักงาน",
  "รูปพนักงาน",
  "ข้อมูลพื้นฐาน",
  "ข้อมูลเงินเดือน",
  "ข้อมูลผู้ใช้",
  "ข้อมูลใบหน้า",
  "กำหนดผู้อนุมัติรายบุคคล",
  "ช่องทางการรับเงิน",
  "ตั้งค่ากะการทำงาน",
  "ตั้งค่าการมองเห็นกะการทำงาน",
  "ตั้งค่าวันทำงาน-วันหยุด",
  "ตั้งค่ากะการทำงาน-วันหยุด",
  "ตั้งค่าทั่วไป",
  "รายรับรายจ่ายคงที่",
  "รายรับรายจ่ายอัตโนมัติ",
  "กองทุน",
  "เงินสะสมย้อนหลัง",
  "เงินประกันการทำงาน",
  "ตั้งค่าการแก้ไขข้อมูล",
  "ตั้งค่า Hashtag",
  "ตั้งค่าสวัสดิการ",
  "ตั้งค่าการมองเห็นประเภทโอที",
  "ตั้งค่าการมองเห็นประเภทการลา",
  "ตั้งค่า Cost Distribution",
  "ตั้งค่าคำนวณโควตาการลา",
  "ลดหย่อนภาษี",
  "นำเข้าฝึกอบรม",
  "นำเข้าสินทรัพย์ถือครอง",
  "นำเข้าประวัติส่วนตัว",
  "ลบข้อมูลพนักงาน",
];

type GenderIcon = ComponentType<{ className?: string }>;

function MaleGenderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 19 18" fill="none" className={className} aria-hidden="true">
      <path d="M15.1667 3.66675V7.66675H13.8333V5.95008L11.1833 8.58342C11.3944 8.89453 11.5556 9.22508 11.6667 9.57508C11.7778 9.92508 11.8333 10.289 11.8333 10.6667C11.8333 11.689 11.4778 12.5556 10.7667 13.2667C10.0556 13.9779 9.18889 14.3334 8.16667 14.3334C7.14444 14.3334 6.27778 13.9779 5.56667 13.2667C4.85556 12.5556 4.5 11.689 4.5 10.6667C4.5 9.64453 4.85556 8.77786 5.56667 8.06675C6.27778 7.35564 7.14444 7.00008 8.16667 7.00008C8.53333 7.00008 8.89444 7.05286 9.25 7.15841C9.60556 7.26397 9.93333 7.42786 10.2333 7.65008L12.8833 5.00008H11.1667V3.66675H15.1667ZM8.16667 8.33342C7.52222 8.33342 6.97222 8.56119 6.51667 9.01675C6.06111 9.4723 5.83333 10.0223 5.83333 10.6667C5.83333 11.3112 6.06111 11.8612 6.51667 12.3167C6.97222 12.7723 7.52222 13.0001 8.16667 13.0001C8.81111 13.0001 9.36111 12.7723 9.81667 12.3167C10.2722 11.8612 10.5 11.3112 10.5 10.6667C10.5 10.0223 10.2722 9.4723 9.81667 9.01675C9.36111 8.56119 8.81111 8.33342 8.16667 8.33342Z" fill="currentColor" fillOpacity="0.65" />
    </svg>
  );
}

function FemaleGenderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path d="M8.33203 14.6666V13.3333H6.9987V11.9999H8.33203V10.5999C7.45425 10.4444 6.73481 10.0249 6.1737 9.34158C5.61259 8.65825 5.33203 7.86659 5.33203 6.96659C5.33203 5.95547 5.69036 5.09714 6.40703 4.39159C7.1237 3.68603 7.98759 3.33325 8.9987 3.33325C10.0098 3.33325 10.8737 3.68603 11.5904 4.39159C12.307 5.09714 12.6654 5.95547 12.6654 6.96659C12.6654 7.86659 12.3848 8.65825 11.8237 9.34158C11.2626 10.0249 10.5431 10.4444 9.66536 10.5999V11.9999H10.9987V13.3333H9.66536V14.6666H8.33203ZM8.9987 9.33325C9.64314 9.33325 10.1931 9.10547 10.6487 8.64992C11.1043 8.19436 11.332 7.64436 11.332 6.99992C11.332 6.35547 11.1043 5.80547 10.6487 5.34992C10.1931 4.89436 9.64314 4.66659 8.9987 4.66659C8.35425 4.66659 7.80425 4.89436 7.3487 5.34992C6.89314 5.80547 6.66536 6.35547 6.66536 6.99992C6.66536 7.64436 6.89314 8.19436 7.3487 8.64992C7.80425 9.10547 8.35425 9.33325 8.9987 9.33325Z" fill="currentColor" fillOpacity="0.65" />
    </svg>
  );
}

function OtherGenderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 19 18" fill="none" className={className} aria-hidden="true">
      <path d="M13.8359 2.66675L10.5026 6.00008M13.8359 2.66675H11.1693M13.8359 2.66675V5.33341M8.5026 11.3334V15.3334M6.5026 13.3334H10.5026M5.83594 8.00008C5.83594 8.70733 6.11689 9.3856 6.61699 9.8857C7.11708 10.3858 7.79536 10.6667 8.5026 10.6667C9.20985 10.6667 9.88813 10.3858 10.3882 9.8857C10.8883 9.3856 11.1693 8.70733 11.1693 8.00008C11.1693 7.29284 10.8883 6.61456 10.3882 6.11446C9.88813 5.61437 9.20985 5.33341 8.5026 5.33341C7.79536 5.33341 7.11708 5.61437 6.61699 6.11446C6.11689 6.61456 5.83594 7.29284 5.83594 8.00008Z" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GENDERS: { label: string; key: keyof EmployeeStats["byGender"]; icon: GenderIcon; iconClass: string; countClass: string }[] = [
  { label: "ชาย", key: "male", icon: MaleGenderIcon, iconClass: "text-[#61a8ff]", countClass: "text-[#61a8ff]" },
  { label: "หญิง", key: "female", icon: FemaleGenderIcon, iconClass: "text-[#d87093]", countClass: "text-[#d87093]" },
  { label: "อื่นๆ", key: "other", icon: OtherGenderIcon, iconClass: "text-[#757575]", countClass: "text-[#757575]" },
];

const EMPLOYEE_TYPES: { label: string; key: string }[] = [
  { label: "พนักงานรายเดือน", key: "permanent" },
  { label: "พนักงานรายวัน", key: "dailyWage" },
  { label: "พนักงานพาร์ตไทม์", key: "partTime" },
  // เหมาจ่าย = contract + temporary (ไม่มีแยกในฟอร์ม)
  { label: "พนักงานเหมาจ่าย", key: "contract" },
];

/** Count for a type bucket; contract merges contract + temporary. */
function typeCount(stats: EmployeeStats, key: string): number {
  if (key === "contract") {
    return (stats.byEmploymentType.contract ?? 0) + (stats.byEmploymentType.temporary ?? 0);
  }
  return stats.byEmploymentType[key] ?? 0;
}

/* ------------------------------- Components -------------------------------- */

function PageBanner({
  onAddEmployee,
  total,
  companyCode,
  employeeLimit,
}: {
  onAddEmployee: () => void;
  total: number | null;
  companyCode: string | null;
  employeeLimit: number | null;
}) {
  // The seat allocation is configured in Company Management. Retain the
  // legacy display only for companies that have not been assigned a limit.
  const maxDisplay = employeeLimit ?? 2;
  const loaded = total ?? 0;
  const progressPct = Math.min(100, (loaded / maxDisplay) * 100);

  return (
    <section className="relative flex h-40 items-center justify-between overflow-hidden border-b border-white/20 bg-[#61a8ff] p-6 tracking-[-0.1px] text-white">
      {/* Left column: breadcrumb and title */}
      <div className="flex min-w-0 flex-col items-start">
        {/* Breadcrumb — the reference hides this context trail on compact screens. */}
        <div className="hidden items-center text-sm leading-[22.001px] text-white/70 md:flex">
          <span>ข้อมูลองค์กร</span>
          <ChevronRight className="size-4" />
          <span>ข้อมูลพนักงาน</span>
        </div>

        {/* Title + help */}
        <div className="flex items-center">
          <h1 className="w-fit pr-[30px] text-2xl font-normal leading-[37.716px] text-white">ข้อมูลพนักงาน</h1>
          <button
            type="button"
            className="hidden"
            aria-label="ข้อมูลเพิ่มเติมเกี่ยวกับหน้าข้อมูลพนักงาน"
          >
            ?
          </button>
        </div>

      </div>

      {/* Center column: progress bar */}
      <div className="mx-16 hidden flex-1 flex-col items-center justify-center md:flex">
        <div className="h-2 w-full overflow-hidden rounded-[4px] bg-[#c5c6cb]">
          <div className="h-full origin-left bg-[#ffa000] transition-[transform]" style={{ transform: `scale3d(${progressPct / 100}, 1, 1)` }} />
        </div>
        <label className="w-full text-right text-sm font-normal leading-[22.001px] text-white">
          {loaded}/{maxDisplay}{"\u00A0\u00A0"}คน
        </label>
      </div>

      {/* Right: add employee button */}
      <button
        type="button"
        onClick={onAddEmployee}
        className="mt-4 hidden h-[36.65px] shrink-0 items-center justify-center rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.2),0px_2px_2px_0px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)] transition-colors hover:bg-slate-100 md:flex"
      >
        เพิ่มพนักงาน
      </button>
    </section>
  );
}

function LoadingContent() {
  return (
    <Card className="ml-4 overflow-hidden rounded-lg border-none bg-white" aria-busy="true" aria-label="กำลังเตรียม Dashboard พนักงาน">
      <div className="flex h-[59.3625px] items-center border-b border-black/[0.12] p-3 text-[22px]">Dashboard</div>
      <CardContent className="space-y-10 px-8 py-10">
        <div className="grid gap-8 xl:grid-cols-[1.3fr_.7fr_1fr]">
          {["h-64", "h-64", "h-64"].map((height, index) => (
            <div key={index} className={cn("rounded-lg bg-[#f5f5f5]", height)}>
              <div className="m-5 h-5 w-28 animate-pulse rounded bg-[#e8e8e8]" />
              <div className="mx-5 h-4 animate-pulse rounded bg-[#ededed]" />
            </div>
          ))}
        </div>
        <div className="grid gap-8 xl:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-[#f5f5f5]" />
          <div className="h-64 animate-pulse rounded-lg bg-[#f5f5f5]" />
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorContent({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <p className="text-sm text-foreground">ไม่สามารถโหลดข้อมูลพนักงานได้</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#2563eb] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8]"
        >
          <RefreshCw className="size-4" />
          ลองใหม่
        </button>
      </CardContent>
    </Card>
  );
}

function ImportEmployeeContent({ organizations }: { organizations: OrgNode[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importEmployees, setImportEmployees] = useState<ImportEmployee[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [selectedDepartmentEmployees, setSelectedDepartmentEmployees] = useState<string[]>([]);
  const [selectedPositionEmployees, setSelectedPositionEmployees] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [organization, setOrganization] = useState("");
  const [databaseOrganizationTree, setDatabaseOrganizationTree] = useState<OrganizationRecord[]>([]);
  const [position, setPosition] = useState("");
  const [databaseOrganizations, setDatabaseOrganizations] = useState<OrganizationOption[]>([]);
  const allOrganizationNodes: OrgNode[] = [];
  const collectOrganizationNodes = (nodes: OrgNode[]) => {
    nodes.forEach((node) => {
      allOrganizationNodes.push(node);
      collectOrganizationNodes(node.children ?? []);
    });
  };
  collectOrganizationNodes(organizations);
  const legacyOrganizationOptions = allOrganizationNodes
    .filter((node) => node.count !== undefined || (node.children?.length ?? 0) > 0)
    .map((node) => ({ id: node.id, name: node.name, code: node.code, kind: "department" as const }));
  const organizationOptions = databaseOrganizations.length > 0 ? databaseOrganizations : legacyOrganizationOptions;
  const positionOptions = Array.from(
    new Map(
      allOrganizationNodes
        .filter((node) => node.positionId && node.positionName)
        .map((node) => [node.positionId!, { id: node.positionId!, name: node.positionName! }])
    ).values()
  );
  const populatedTemplateHref = templateOrganizationId
    ? `/api/employee/import-template?organizationId=${encodeURIComponent(templateOrganizationId)}`
    : "/api/employee/import-template";

  const loadImportData = useCallback(async () => {
    const response = await fetch("/api/employee/import", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { employees: ImportEmployee[]; history: ImportHistory[] };
    setImportEmployees(data.employees);
    setImportHistory(data.history);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOrganizations = async () => {
      try {
        const response = await fetch("/api/organization", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { companies?: OrganizationRecord[] };
        if (!cancelled) {
          setDatabaseOrganizationTree(data.companies ?? []);
          setDatabaseOrganizations(flattenOrganizationRecords(data.companies ?? []));
        }
      } catch {
        // The employee tree remains a safe fallback while the organization API is unavailable.
      }
    };
    void loadOrganizations();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadImportData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadImportData]);

  const uploadFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setImportError(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      const response = await fetch("/api/employee/import", { method: "POST", body: formData });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "นำเข้าข้อมูลพนักงานไม่สำเร็จ");
      await loadImportData();
      window.dispatchEvent(new Event("employee-data-changed"));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "นำเข้าข้อมูลพนักงานไม่สำเร็จ");
    } finally {
      setImporting(false);
    }
  };

  const saveAssignments = async (scope: "department" | "position", employeeIds: string[], targetId: string) => {
    if (!targetId || employeeIds.length === 0) return;
    const response = await fetch("/api/employee/import", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, employeeIds, targetId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setImportError(result.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      return;
    }
    setImportError(null);
    await loadImportData();
    window.dispatchEvent(new Event("employee-data-changed"));
  };

  return (
    <Card
      className="relative -translate-y-[15px] mx-4 mb-3 w-full overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
    >
      <div className="flex min-h-[58.573px] items-center gap-2 border-b border-black/[0.12] px-3 py-3 text-[22px] font-normal leading-[34.573px] text-foreground">
        <span>นำเข้าข้อมูลพนักงาน</span>
        <button
          type="button"
          className="flex size-4 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-bold text-muted-foreground"
          aria-label="ข้อมูลเพิ่มเติม"
        >
          ?
        </button>
      </div>
      <CardContent className="px-2 py-4">
        <p className="sr-only" aria-live="polite">{importError ?? ""}</p>
        {/* Step 1 & 2: Download template & Import */}
        <section>
          <div className="flex flex-col lg:flex-row">
            <div className="m-6 flex-1">
              <div className="flex">
                <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span>
                <div className="m-2 min-w-0 flex-1">
                  <div className="h-10 text-lg font-bold leading-[40px] text-foreground">ดาวน์โหลดเทมเพลต (*.xlsx)</div>
                  <a href="/templates/employee-import-template.xlsx" download="Template Employee.xlsx" className="mb-2 inline-flex h-9 max-w-max items-center rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#029702]">เทมเพลตเปล่า</a>
                  <div className="my-2 flex w-full gap-2">
                    <div className="mr-2 flex flex-1 items-center justify-center">
                      <select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} aria-label="โครงสร้างองค์กร" className="h-8 w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 text-sm text-muted-foreground outline-none focus:border-[#2299ff] focus:ring-1 focus:ring-[#2299ff]">
                        <option value="" disabled>โครงสร้างองค์กร</option>
                        {organizationOptions.map((organization) => (
                          <option key={organization.id} value={organization.id}>{organization.code}: {organization.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <a href={populatedTemplateHref} download="Template Employee.xlsx" className="inline-flex h-9 max-w-max items-center justify-center rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#029702]">เทมเพลตมีรายชื่อพนักงาน</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden w-px self-stretch bg-black/[0.12] lg:block" />

            <div className="m-6 flex-1">
              <div className="flex">
                <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span>
                <div className="m-2 min-w-0 flex-1">
                  <div className="h-10 text-lg font-bold leading-[40px] text-foreground">นำเข้าข้อมูล (Import)</div>
                  <input ref={inputRef} id="fileImport" type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => { const selectedFile = event.target.files?.[0]; if (selectedFile) void uploadFile(selectedFile); }} />
                  <div className="flex items-center">
                    <button type="button" disabled={importing} onClick={() => inputRef.current?.click()} className="h-9 rounded-[4px] bg-[#2299ff] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d85e0] disabled:cursor-not-allowed disabled:opacity-60">เลือกไฟล์</button>
                    <span className="ml-2 text-sm text-muted-foreground">{importing ? "กำลังนำเข้าข้อมูล..." : file ? file.name : "\u00A0ยังไม่ได้เลือกไฟล์"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="my-6 border-t border-[#f0f0f0]" />

        {/* Step 3: กำหนดหน่วยงาน */}
        <section>
          <div className="flex">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">3</span>
            <div className="m-2 min-w-0 flex-1">
              <span className="h-10 text-lg font-bold leading-[40px] text-foreground">กำหนดหน่วยงาน</span>
            </div>
          </div>
          <div className="mx-8 mt-2">
            <div className="mb-4">
              <label className="mb-1 block font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-[rgba(0,0,0,0.65)]">ข้อมูลองค์กร</label>
              <OrganizationTreeDropdown companies={databaseOrganizationTree} value={organization} loading={databaseOrganizationTree.length === 0 && organizationOptions.length === 0} onChange={setOrganization} />
            </div>
            <AssignmentTable employees={importEmployees} selected={selectedDepartmentEmployees} onChange={setSelectedDepartmentEmployees} />
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => void saveAssignments("department", selectedDepartmentEmployees, organization)} className="m-1 h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#029702]">บันทึก</button></div>
          </div>
        </section>

        <div className="my-6 border-t border-[#f0f0f0]" />

        {/* Step 4: กำหนดตำแหน่ง */}
        <section>
          <div className="flex">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">4</span>
            <div className="m-2 min-w-0 flex-1">
              <span className="h-10 text-lg font-bold leading-[40px] text-foreground">กำหนดตำแหน่ง</span>
            </div>
          </div>
          <div className="mx-8 mt-2">
            <div className="mb-4">
              <label className="mb-1 block text-sm leading-[22px] text-foreground">ตำแหน่ง</label>
              <select value={position} onChange={(event) => setPosition(event.target.value)} className="h-8 w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 text-sm leading-[22px] text-foreground outline-none focus:border-[#2299ff] focus:ring-1 focus:ring-[#2299ff]">
                <option value="">ตำแหน่ง</option>
                {positionOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <AssignmentTable employees={importEmployees} selected={selectedPositionEmployees} onChange={setSelectedPositionEmployees} />
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => void saveAssignments("position", selectedPositionEmployees, position)} className="m-1 h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#029702]">บันทึก</button></div>
          </div>
        </section>

        <div className="my-6 border-t border-[#f0f0f0]" />

        {/* Import History */}
        <section className="flex-1 p-6">
          <div className="sub-header text-lg font-bold text-foreground">ประวัติการนำเข้าข้อมูลพนักงาน</div>
          <div className="overflow-x-auto border border-[#f0f0f0]">
            <Table className="min-w-[720px] table-fixed text-sm">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="h-[54.8px] hover:bg-transparent">
                  {["วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ลบข้อมูล", "ข้อมูลผิดพลาด", ""].map((header) => (
                    <TableHead key={header} className="body-center border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="border border-[#f0f0f0] p-0">
                      <div className="my-8 flex flex-col items-center text-center text-sm leading-[22px] text-black/25">
                      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" className="ant-empty-img-simple mb-2">
                        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                          <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                          <g fill="#fafafa" fillRule="nonzero" stroke="#d9d9d9">
                            <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                          </g>
                        </g>
                      </svg>
                        <p className="m-0">ไม่มีข้อมูล</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : importHistory.map((entry) => (
                  <TableRow key={entry.id} className="h-[54.8px] hover:bg-transparent">
                    <TableCell className="body-center border border-[#f0f0f0] p-4 text-center">{entry.date}</TableCell>
                    <TableCell className="body-center border border-[#f0f0f0] p-4 text-center">{entry.total}</TableCell>
                    <TableCell className="body-center border border-[#f0f0f0] p-4 text-center">{entry.inserted}</TableCell>
                    <TableCell className="body-center border border-[#f0f0f0] p-4 text-center">{entry.updated}</TableCell>
                    <TableCell className="body-center border border-[#f0f0f0] p-4 text-center">{entry.deleted}</TableCell>
                    <TableCell className="body-center border border-[#f0f0f0] p-4 text-center">{entry.errors}</TableCell>
                    <TableCell className="body-center border border-[#f0f0f0] p-4 text-center" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

type EmployeePhotoRow = {
  id: string;
  code: string;
  name: string;
  department: string;
  division: string;
  unit: string;
  position: string;
  organizationIds: string[];
  hashtag: string;
};

type BasicEmployeeRow = {
  id: string;
  organizationIds: string[];
  title: string;
  name: string;
  branch: string;
  department: string;
  division: string;
  unit: string;
  position: string;
  employeeCode: string;
  fingerprintCode: string;
  gender: string;
  maritalStatus: string;
  citizenId: string;
  alienIdNumber: string;
  passportNo: string;
  workPermitNo: string;
  socialSecurityNumber: string;
  birthDate: string;
  phone: string;
  email: string;
  hashtag: string;
  employeeType: string;
  baseSalary: string;
  advanceType: string;
  advanceLimit: string;
  hireDate: string;
  confirmationDate: string;
  probationDays: string;
  socialSecurityCalc: string;
  socialSecurityFixed: string;
  taxCalc: string;
  taxFixed: string;
  paymentChannel: string;
  companyPayoutAccount: string;
  bankName: string;
  bankBranchCode: string;
  bankAccountNumber: string;
};

async function saveEmployeeBatch(rows: BasicEmployeeRow[], fields: readonly (keyof BasicEmployeeRow)[]) {
  const response = await fetch("/api/employee/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      updates: rows.map((row) => ({
        id: row.id,
        changes: Object.fromEntries(fields.map((field) => [field, row[field]])),
      })),
    }),
  });
  if (!response.ok) throw new Error("save failed");
}

function CardInputHeader({ title }: { title: string }) {
  return (
    <div className="card-input-header tooltip-header-hover group box-border flex flex-row items-center justify-start border-b-[0.8px] border-black/[0.12] px-3 py-3 text-[22px] font-normal leading-[34.573px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]">
      <div className="flex flex-row items-center justify-start">
        {title}
        <button
          type="button"
          className="tooltip-header ml-[10px] mr-[-30px] hidden rounded-full bg-[#f0f0f0] px-[6px] py-px text-[22px] font-normal leading-[25.3px] tracking-normal text-[rgba(0,0,0,0.87)] shadow-[0_2px_3px_rgba(0,0,0,0.5)] group-hover:inline-block"
          aria-label={`ข้อมูลเพิ่มเติมเกี่ยวกับ${title}`}
          title={`ข้อมูลเพิ่มเติมเกี่ยวกับ${title}`}
        >
          <span className="text block bg-[#ffa500] px-2 text-base font-normal tracking-normal text-white" style={{ lineHeight: "normal" }} aria-hidden="true">?</span>
        </button>
      </div>
    </div>
  );
}

function PaymentTableSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full appearance-none rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white py-0 pl-[11px] pr-8 text-left text-sm font-normal leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
      >
        {children}
      </select>
      <svg aria-hidden="true" viewBox="64 64 896 896" className="pointer-events-none absolute right-[11px] top-1/2 size-3 -translate-y-1/2 fill-current text-black/25">
        <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z" />
      </svg>
    </div>
  );
}

const BASIC_COLUMNS = [
  "ลำดับ", "คำนำหน้าชื่อ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง",
  "รหัสพนักงาน", "รหัสลายนิ้วมือ", "เพศ", "สถานะ", "เลขประจำตัวประชาชน / ผู้เสียภาษี",
  "เลขประจำตัวคนซึ่งไม่มีสัญชาติไทย", "เลขหนังสือเดินทาง", "เลขใบอนุญาตทำงาน",
  "เลขประจำตัวประกันสังคม", "วันเกิด", "เบอร์โทรศัพท์", "อีเมล",
] as const;

const SALARY_COLUMNS = [
  "ลำดับ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง", "ประเภทพนักงาน", "ค่าจ้าง",
  "เงินเบิกล่วงหน้า", "วงเงินเบิกล่วงหน้า", "วันที่เริ่มงาน", "วันที่บรรจุ", "ระยะเวลาทดลองงาน",
  "ประกันสังคม", "ค่าคงที่ของประกันสังคม", "ภาษี", "จำนวนภาษีคงที่ต่อเดือน/ % ภาษีของรายได้", "",
] as const;

const USER_COLUMNS = [
  "ลำดับ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง", "ชื่อผู้ใช้", "กลุ่มผู้ใช้งาน",
  "กำหนดสิทธิผู้ใช้", "เคยเปลี่ยนรหัสผ่าน", "เข้าใช้งานผ่าน Application", "เข้าใช้งานผ่าน LineOA",
  "เชื่อมต่อบัญชี HumanSoft ID", "",
] as const;

function EmployeeBasicContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) ids.set(node.id, node.organizationIds ?? []);
      else visit(node.children ?? []);
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);

  const loadRows = useCallback(async (requestedCursor: string | null = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic", pageSize: "100" });
      if (companyId) params.set("companyId", companyId);
      if (requestedCursor) params.set("cursor", requestedCursor);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[]; nextCursor: string | null };
      setRows(data.employees);
      setNextCursor(data.nextCursor);
      setDirtyIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const updateRow = (id: string, field: keyof BasicEmployeeRow, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
    setDirtyIds((current) => new Set(current).add(id));
    setSaveState("idle");
  };

  const save = async () => {
    setSaveState("saving");
    try {
      await saveEmployeeBatch(rows.filter(({ id }) => dirtyIds.has(id)), [
        "title", "employeeCode", "fingerprintCode", "gender", "maritalStatus", "citizenId", "alienIdNumber",
        "passportNo", "workPermitNo", "socialSecurityNumber", "birthDate", "phone", "email",
      ]);
      setDirtyIds(new Set());
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  };

  const filterControlClass = "h-[31.6px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const tableInputClass = "h-[30px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[16.1px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const tableSelectClass = "h-8 w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";

  return (
    <Card className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}>
      <style>{`.card-input-container .fix-column-table thead th { letter-spacing: -0.1px; text-transform: none; } .card-input-container .fix-column-table thead th svg { width: 12px; height: 12px; color: rgba(0,0,0,0.54); fill: currentColor; vertical-align: -1px; }`}</style>
      <CardInputHeader title="ข้อมูลพื้นฐาน" />
      <CardContent className="card-input-body px-2 py-4">
        <div className="m-6">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={filterControlClass}>
                <option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag
              <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={filterControlClass} />
            </label>
            <button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button>
          </div>

          <div className="fix-column-table overflow-hidden rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]">
            <div className="max-h-[80vh] overflow-auto">
            <Table className="min-w-full table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
              <colgroup>{[80, 160, 250, 150, 150, 150, 150, 150, 150, 100, 160, 180, 180, 180, 180, 180, 180, 160, 250].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[76.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{BASIC_COLUMNS.map((column) => <TableHead key={column} className={cn("border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white", column === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{column}{column === "ชื่อพนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-3.5 fill-current align-[-2px]"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" /></svg>}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={BASIC_COLUMNS.length} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={BASIC_COLUMNS.length} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[50.4px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}>
                  <TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell>
                  <TableCell className={cellClass}><select value={row.title} onChange={(event) => updateRow(row.id, "title", event.target.value)} className={tableSelectClass}><option value="">-</option>{["นาย", "นาง", "นางสาว", "ดร."].map((title) => <option key={title}>{title}</option>)}</select></TableCell>
                  <TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>
                  {(["employeeCode", "fingerprintCode"] as const).map((field) => <TableCell key={field} className={cellClass}><input value={row[field]} onChange={(event) => updateRow(row.id, field, event.target.value)} className={tableInputClass} /></TableCell>)}
                  <TableCell className={cellClass}><select value={row.gender} onChange={(event) => updateRow(row.id, "gender", event.target.value)} className={tableSelectClass}>{["ชาย", "หญิง", "ไม่ระบุ"].map((value) => <option key={value}>{value}</option>)}</select></TableCell>
                  <TableCell className={cellClass}><select value={row.maritalStatus} onChange={(event) => updateRow(row.id, "maritalStatus", event.target.value)} className={tableSelectClass}><option value="">-</option>{["โสด", "สมรส", "หย่าร้าง", "หม้าย"].map((value) => <option key={value}>{value}</option>)}</select></TableCell>
                  {(["citizenId", "alienIdNumber", "passportNo", "workPermitNo", "socialSecurityNumber"] as const).map((field) => <TableCell key={field} className={cellClass}><input value={row[field]} onChange={(event) => updateRow(row.id, field, event.target.value)} className={tableInputClass} /></TableCell>)}
          <TableCell className={cellClass}><ThaiDatePicker value={row.birthDate} onChange={(value) => updateRow(row.id, "birthDate", value)} className={tableInputClass} /></TableCell>
                  {(["phone", "email"] as const).map((field) => <TableCell key={field} className={cellClass}><input type={field === "email" ? "email" : "text"} value={row[field]} onChange={(event) => updateRow(row.id, field, event.target.value)} className={tableInputClass} /></TableCell>)}
                </TableRow>)}
              </TableBody>
            </Table>
            </div>
            {!loading && <nav className="flex h-16 items-center justify-end gap-3 px-4" aria-label="แบ่งหน้าข้อมูลพื้นฐาน"><button type="button" disabled={previousCursors.length === 0} onClick={() => { const previous = previousCursors.at(-1) ?? null; setPreviousCursors((current) => current.slice(0, -1)); setCursor(previous); setPage((current) => Math.max(1, current - 1)); void loadRows(previous); }} className="inline-flex size-8 items-center justify-center rounded border border-[#d9d9d9] disabled:text-black/25" aria-label="หน้าก่อนหน้า"><ChevronLeft className="size-4" /></button><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">{page}</span><button type="button" disabled={!nextCursor} onClick={() => { if (!nextCursor) return; setPreviousCursors((current) => [...current, cursor ?? ""]); setCursor(nextCursor); setPage((current) => current + 1); void loadRows(nextCursor); }} className="inline-flex size-8 items-center justify-center rounded border border-[#d9d9d9] disabled:text-black/25" aria-label="หน้าถัดไป"><ChevronRight className="size-4" /></button></nav>}
          </div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => void save()} disabled={saveState === "saving" || dirtyIds.size === 0} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0px_rgba(0,0,0,0.14),0_1px_5px_0px_rgba(0,0,0,0.12)] disabled:opacity-60">{saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก"}</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeePhotoContent({ orgTree, loading }: { orgTree: OrgNode[]; loading: boolean }) {
  const [organizationId, setOrganizationId] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });

  const { organizationOptions, employees } = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const rows: EmployeePhotoRow[] = [];
    const visit = (nodes: OrgNode[], ancestors: OrgNode[] = []) => {
      nodes.forEach((node) => {
        const isEmployee = node.count === undefined && (node.children?.length ?? 0) === 0;
        if (isEmployee) {
          const organizationNames = ancestors.map((ancestor) => ancestor.name);
          rows.push({
            id: node.id,
            code: node.code,
            name: node.name,
            department: organizationNames.at(-1) ?? "",
            division: organizationNames.at(-2) ?? "",
            unit: organizationNames.at(-3) ?? "",
            position: node.positionName ?? "",
            organizationIds: node.organizationIds ?? ancestors.map((ancestor) => ancestor.id),
            hashtag: node.hashtag ?? "",
          });
          return;
        }
        options.push({ id: node.id, label: `${"  ".repeat(ancestors.length)}${node.code}: ${node.name}` });
        visit(node.children ?? [], [...ancestors, node]);
      });
    };
    visit(orgTree);
    return { organizationOptions: options, employees: rows };
  }, [orgTree]);

  const displayedEmployees = employees.filter((employee) => {
    const selectedOrganization = !filters.organizationId || employee.organizationIds.includes(filters.organizationId);
    const selectedHashtag = !filters.hashtag || employee.hashtag.toLocaleLowerCase().includes(filters.hashtag.toLocaleLowerCase().replace(/^#/, ""));
    return selectedOrganization && selectedHashtag;
  });

  return (
    <Card
      className="relative -translate-y-[15px] mx-4 mb-3 w-full overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
    >
      <div className="group flex h-[59.3625px] items-center border-b-[0.8px] border-black/[0.12] px-3 py-3 text-[22px] font-normal leading-[34.573px] text-[rgba(0,0,0,0.87)]">
        <div className="flex items-center">
          รูปพนักงาน
          <button
            type="button"
            className="ml-[10px] mr-[-30px] hidden size-5 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f0] px-[6px] py-px text-[10px] font-bold leading-none text-black/65 shadow-[0_2px_3px_rgba(0,0,0,0.5)] group-hover:flex"
            aria-label="ข้อมูลเพิ่มเติมเกี่ยวกับรูปพนักงาน"
          >
            ?
          </button>
        </div>
      </div>

      <CardContent className="px-2 py-4">
        <div className="m-6">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">
              โครงสร้างองค์กร
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22px] text-[rgba(0,0,0,0.65)] outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
              >
                <option value="">โครงสร้างองค์กร</option>
                {organizationOptions.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.label}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">
              Hashtag
              <input
                value={hashtagInput}
                onChange={(event) => setHashtagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setFilters({ organizationId, hashtag: hashtagInput });
                }}
                placeholder="#Hashtag"
                className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22px] text-[rgba(0,0,0,0.65)] outline-none placeholder:text-black/25 focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
              />
            </label>
            <button
              type="button"
              onClick={() => setFilters({ organizationId, hashtag: hashtagInput })}
              className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]"
            >
              ค้นหา
            </button>
          </div>

          <div className="h-[586px] overflow-auto rounded-[8px] bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
            <Table className="min-w-[1280px] table-fixed text-sm">
              <colgroup>
                <col className="w-20" />
                <col className="w-[240px]" />
                <col className="w-[320px]" />
                <col className="w-40" />
                <col className="w-40" />
                <col className="w-40" />
                <col className="w-40" />
              </colgroup>
              <TableHeader>
                <TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                  <TableHead className="bg-transparent p-4 text-center text-sm font-medium text-white">ลำดับ</TableHead>
                  <TableHead className="bg-transparent p-4 text-center text-sm font-medium text-white"><span className="inline-flex items-center gap-1">ชื่อพนักงาน <Search className="size-3.5" /></span></TableHead>
                  <TableHead className="bg-transparent p-4 text-center text-sm font-medium text-white">รูปพนักงาน</TableHead>
                  <TableHead className="bg-transparent p-4 text-center text-sm font-medium text-white">แผนก</TableHead>
                  <TableHead className="bg-transparent p-4 text-center text-sm font-medium text-white">ฝ่ายงาน</TableHead>
                  <TableHead className="bg-transparent p-4 text-center text-sm font-medium text-white">หน่วยงาน</TableHead>
                  <TableHead className="bg-transparent p-4 text-center text-sm font-medium text-white">ตำแหน่ง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="h-24 hover:bg-transparent"><TableCell colSpan={7} className="border border-[#f0f0f0] text-center text-sm text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow>
                ) : displayedEmployees.length === 0 ? (
                  <TableRow className="h-24 hover:bg-transparent"><TableCell colSpan={7} className="border border-[#f0f0f0] text-center text-sm text-black/45">ไม่มีข้อมูล</TableCell></TableRow>
                ) : displayedEmployees.map((employee, index) => (
                  <TableRow key={employee.id} className={cn("h-[56.8px] hover:bg-transparent", index % 2 === 0 ? "bg-[#f2fafe]" : "bg-white")}>
                    <TableCell className="p-2 text-center text-black/65">{index + 1}</TableCell>
                    <TableCell className="p-2 text-black/65">{employee.code}: {employee.name}</TableCell>
                    <TableCell className="p-2 text-center text-black/65">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${USER_IMAGE_ORIGIN}/images/userPlaceHolder.png`} alt="" className="mx-auto size-10 cursor-pointer rounded-full object-cover" />
                    </TableCell>
                    <TableCell className="p-2 text-black/65">{employee.department}</TableCell>
                    <TableCell className="p-2 text-black/65">{employee.division}</TableCell>
                    <TableCell className="p-2 text-black/65">{employee.unit}</TableCell>
                    <TableCell className="p-2 text-black/65">{employee.position}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SalaryInformationContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const { rows, setRows, loading, page, hasNextPage, hasPreviousPage, next, previous } = useBasicEmployeePage<BasicEmployeeRow>(companyId);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) ids.set(node.id, node.organizationIds ?? []);
      else visit(node.children ?? []);
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const updateRow = (id: string, field: keyof BasicEmployeeRow, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
    setDirtyIds((current) => new Set(current).add(id));
    setSaveState("idle");
  };

  const save = async () => {
    setSaveState("saving");
    try {
      await saveEmployeeBatch(rows.filter(({ id }) => dirtyIds.has(id)), [
        "baseSalary", "advanceType", "advanceLimit", "hireDate", "confirmationDate", "probationDays",
        "socialSecurityCalc", "socialSecurityFixed", "taxCalc", "taxFixed",
      ]);
      setDirtyIds(new Set());
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  };

  const filterControlClass = "h-[31.6px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const tableInputClass = "h-[30px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[16.1px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)] disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-black/25";
  const tableSelectClass = "h-8 w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";
  const columnWidths = [80, 260, 165, 165, 165, 165, 250, 130, 200, 170, 170, 170, 150, 260, 260, 250, 180, 80];

  return (
    <Card className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}>
      <CardInputHeader title="ข้อมูลเงินเดือน" />
      <CardContent className="card-input-body px-2 py-4">
        <div className="m-6">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={filterControlClass}>
                <option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag
              <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={filterControlClass} />
            </label>
            <button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button>
          </div>

          <div className="fix-column-table max-h-[600px] overflow-auto rounded-[8px] bg-white">
            <Table className="min-w-[3270px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
              <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]">
                <TableRow className="h-[76.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                  {SALARY_COLUMNS.map((column, index) => <TableHead key={`${column}-${index}`} className={cn("border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white", column === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>
                    {column === "จำนวนภาษีคงที่ต่อเดือน/ % ภาษีของรายได้" ? <>จำนวนภาษีคงที่ต่อเดือน/<br />% ภาษีของรายได้</> : column}
                    {column === "ชื่อพนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-3.5 fill-current align-[-2px]"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" /></svg>}
                  </TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={SALARY_COLUMNS.length} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={SALARY_COLUMNS.length} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[50.4px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}>
                  <TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell>
                  <TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell>
                  <TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>
                  <TableCell className={cellClass}><select value={row.employeeType} onChange={(event) => updateRow(row.id, "employeeType", event.target.value)} className={tableSelectClass} aria-label={`ประเภทพนักงานของ ${row.name}`}><option value={row.employeeType}>{row.employeeType ? `ET0001: ${row.employeeType}` : ""}</option></select></TableCell>
                  <TableCell className={cellClass}><input type="number" min="0" value={row.baseSalary} onChange={(event) => updateRow(row.id, "baseSalary", event.target.value)} className={tableInputClass} /></TableCell>
                  <TableCell className={cellClass}><select value={row.advanceType} onChange={(event) => updateRow(row.id, "advanceType", event.target.value)} className={tableSelectClass}><option value="">-</option>{["กำหนดวงเงินเบิกล่วงหน้า", "ไม่กำหนดวงเงินเบิกล่วงหน้า"].map((value) => <option key={value}>{value}</option>)}</select></TableCell>
                  <TableCell className={cellClass}><input type="number" min="0" value={row.advanceLimit} onChange={(event) => updateRow(row.id, "advanceLimit", event.target.value)} className={tableInputClass} /></TableCell>
          <TableCell className={cellClass}><ThaiDatePicker value={row.hireDate} onChange={(value) => updateRow(row.id, "hireDate", value)} className={tableInputClass} /></TableCell>
          <TableCell className={cellClass}><ThaiDatePicker required value={row.confirmationDate} onChange={(value) => updateRow(row.id, "confirmationDate", value)} className={tableInputClass} /></TableCell>
                  <TableCell className={cellClass}><input type="number" min="0" max="999" value={row.probationDays} onChange={(event) => updateRow(row.id, "probationDays", event.target.value)} className={tableInputClass} /></TableCell>
                  <TableCell className={cellClass}><select value={row.socialSecurityCalc} onChange={(event) => updateRow(row.id, "socialSecurityCalc", event.target.value)} className={tableSelectClass}><option value="">-</option>{["ไม่คิดประกันสังคม", "คิดประกันสังคม", "กำหนดค่าคงที่"].map((value) => <option key={value}>{value}</option>)}</select></TableCell>
                  <TableCell className={`${cellClass} text-right`}><input type="number" min="0" value={row.socialSecurityFixed} className={tableInputClass} disabled /></TableCell>
                  <TableCell className={cellClass}><select value={row.taxCalc} onChange={(event) => updateRow(row.id, "taxCalc", event.target.value)} className={tableSelectClass}><option value="">-</option>{["คิดภาษี ภงด.1 ใหม่ทุกเดือน", "คิดตามฐานเงินเดือนจริงที่ได้รับ", "ไม่คิดภาษี"].map((value) => <option key={value}>{value}</option>)}</select></TableCell>
                  <TableCell className={`${cellClass} text-right`}><input type="number" min="0" value={row.taxFixed} className={tableInputClass} disabled /></TableCell>
                  <TableCell className={`${cellClass} text-center`} />
                </TableRow>)}
              </TableBody>
            </Table>
            {!loading && <EmployeeCursorPagination
              page={page}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              onNext={() => {
                setDirtyIds(new Set());
                setSaveState("idle");
                void next();
              }}
              onPrevious={() => {
                setDirtyIds(new Set());
                setSaveState("idle");
                void previous();
              }}
            />}
          </div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => void save()} disabled={saveState === "saving" || dirtyIds.size === 0} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:opacity-60">{saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก"}</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserInformationContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const [userGroup, setUserGroup] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", userGroup: "", hashtag: "" });
  const { rows, loading, page, hasNextPage, hasPreviousPage, next, previous } = useBasicEmployeePage<BasicEmployeeRow>(companyId);

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) ids.set(node.id, node.organizationIds ?? []);
      else visit(node.children ?? []);
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);

  const groupsFor = (row: BasicEmployeeRow) => row.employeeType === "พนักงานรายเดือน" ? ["EMPLOYEE"] : ["EMPLOYEE"];
  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
    const matchesGroup = !filters.userGroup || groupsFor(row).includes(filters.userGroup);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && matchesGroup && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const filterControlClass = "h-[31.6px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";
  const columnWidths = [80, 250, 150, 150, 150, 150, 150, 120, 120, 100, 120, 120, 120, 100];
  const submitFilters = () => setFilters({ organizationId, userGroup, hashtag });
  const CheckIcon = ({ enabled }: { enabled: boolean }) => enabled ? (
    <svg aria-label="ใช้งาน" viewBox="0 0 24 24" className="inline-block size-[15px] fill-[#008000] align-middle"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
  ) : (
    <svg aria-label="ไม่ใช้งาน" viewBox="0 0 24 24" className="inline-block size-[15px] fill-[#ff0000] align-middle"><path d="M18.3 5.71 16.89 4.29 12 9.17 7.11 4.29 5.7 5.71 10.59 10.59 5.7 15.48l1.41 1.41L12 12l4.89 4.89 1.41-1.41-4.89-4.89z" /></svg>
  );

  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="ข้อมูลผู้ใช้" />
      <CardContent className="card-input-body px-2 py-4">
        <div>
          <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end">
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={filterControlClass}>
                <option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">กลุ่มผู้ใช้งาน
              <select value={userGroup} onChange={(event) => setUserGroup(event.target.value)} className={filterControlClass}>
                <option value="">กลุ่มผู้ใช้งาน</option><option value="EMPLOYEE">EMPLOYEE</option><option value="SAL">SAL</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag
              <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitFilters(); }} placeholder="#Hashtag" className={filterControlClass} />
            </label>
            <button type="button" onClick={submitFilters} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button>
          </div>

          <div className="mb-2 mt-2 flex justify-end gap-2">
            <button type="button" title="Generate Password" className="h-9 min-w-[183.625px] rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-slate-50">Generate Password <span aria-hidden="true" className="ml-1 inline-block text-lg leading-none align-[-1px]">↻</span></button>
            <button type="button" title="Download รายชื่อผู้ใช้งาน(.pdf)" className="h-9 min-w-[86.087px] rounded-[4px] bg-[#3c4252] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#303542]">PDF <span aria-hidden="true" className="ml-1">▣</span></button>
            <button type="button" title="Download รายชื่อผู้ใช้งาน(.xlsx)" className="h-9 min-w-[95.075px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">Excel <span aria-hidden="true" className="ml-1">▦</span></button>
          </div>

          <div className="fix-column-table max-h-[650px] overflow-auto rounded-[8px] bg-white">
            <Table className="min-w-[1880px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
              <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[76.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                {USER_COLUMNS.map((column, index) => <TableHead key={`${column}-${index}`} className={cn("h-[76.8px] max-h-[76.8px] overflow-hidden border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white", column === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}><span className="line-clamp-2">{column}</span>{column === "ชื่อพนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-3.5 fill-current align-[-2px]"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" /></svg>}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={USER_COLUMNS.length} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={USER_COLUMNS.length} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[52.8px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}>
                  <TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell>
                  <TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode} : {row.name}</TableCell>
                  <TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>
                  <TableCell className={cellClass}>{row.employeeCode.toLocaleLowerCase()}</TableCell>
                  <TableCell className={`${cellClass} text-center`}>{groupsFor(row).map((group) => <div key={group}>{group}</div>)}</TableCell>
                  <TableCell className={`${cellClass} text-center`}>{index % 3 === 2 && <button type="button" aria-label={`กำหนดสิทธิผู้ใช้ ${row.name}`} className="inline-flex size-8 items-center justify-center rounded-full bg-[#2ebc2e] text-white" title="กำหนดสิทธิผู้ใช้"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-[15px] fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5A5 5 0 1 1 12 7a5 5 0 0 1 0 10zm0-8A3 3 0 1 0 12 15a3 3 0 0 0 0-6z" /></svg></button>}</TableCell>
                  <TableCell className={`${cellClass} text-center`}><CheckIcon enabled={index % 4 !== 3} /></TableCell>
                  <TableCell className={`${cellClass} text-center`}><CheckIcon enabled /></TableCell>
                  <TableCell className={`${cellClass} text-center`}><CheckIcon enabled={index % 4 === 0} /></TableCell>
                  <TableCell className={`${cellClass} text-center`}><CheckIcon enabled={false} /></TableCell>
                  <TableCell className={`${cellClass} text-center`}><button type="button" aria-label={`แก้ไขผู้ใช้ ${row.name}`} title="แก้ไข" className="inline-flex size-8 items-center justify-center rounded-full bg-[#87c3eb] text-white shadow-[0_2px_3px_rgba(0,0,0,0.28)] hover:bg-[#74b7e4]"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-[15px] fill-current"><path d="M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z" /></svg></button></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
            {!loading && <EmployeeCursorPagination page={page} hasNextPage={hasNextPage} hasPreviousPage={hasPreviousPage} onNext={() => void next()} onPrevious={() => void previous()} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FaceInformationContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const { rows, loading, page, hasNextPage, hasPreviousPage, next, previous } = useBasicEmployeePage<BasicEmployeeRow>(companyId);
  const [images, setImages] = useState<Record<string, string[]>>({});

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) ids.set(node.id, node.organizationIds ?? []);
      else visit(node.children ?? []);
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const addImages = (employeeId: string, files: FileList | null) => {
    if (!files?.length) return;
    setImages((current) => {
      const existing = current[employeeId] ?? [];
      const next = [...existing, ...Array.from(files).slice(0, Math.max(0, 10 - existing.length)).map((file) => URL.createObjectURL(file))];
      return { ...current, [employeeId]: next };
    });
  };
  const removeImage = (employeeId: string, image: string) => setImages((current) => ({ ...current, [employeeId]: (current[employeeId] ?? []).filter((item) => item !== image) }));

  const filterControlClass = "h-[31.6px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)]";
  const columnWidths = [80, 200, 120, 120, 120, 120, 565];
  const headers = ["ลำดับ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง", "ใบหน้า"];

  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="ข้อมูลใบหน้า" />
      <CardContent className="card-input-body px-2 py-4">
        <div>
          <div className="tooltip-container flex h-[22.001px] items-center justify-end text-sm leading-[22.001px] text-[rgba(0,0,0,0.87)]">
            <span className="tooltip-text">จัดเก็บรูปภาพใบหน้าได้สูงสุด 10 รูปภาพ ต่อพนักงาน 1 คน</span>
            <button type="button" title="คำแนะนำการจัดเก็บรูปภาพใบหน้า" className="facial-tooltip-icon ml-1 inline-flex size-[18px] items-center justify-center text-[rgba(0,0,0,0.65)]" aria-label="คำแนะนำการจัดเก็บรูปภาพใบหน้า">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] fill-current"><path d="M11 18h2v-2h-2v2Zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 2 2c-1.1 0-2 .9-2 2v1h2v-1a4 4 0 0 0 0-8Z" /></svg>
            </button>
          </div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={filterControlClass}>
                <option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag
              <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={filterControlClass} />
            </label>
            <button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button>
          </div>

          <div className="overflow-x-auto bg-white">
            <div className="h-[705.2px] min-w-[1325px] overflow-y-auto">
              <Table className="min-w-[1325px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
                <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
                <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                {headers.map((header) => <TableHead key={header} className={cn("h-[54.8px] border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white", header === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{header}{header === "ชื่อพนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-3.5 fill-current align-[-2px]"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" /></svg>}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={headers.length} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={headers.length} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => {
                  const rowImages = images[row.id] ?? [];
                  return <TableRow key={row.id} className={cn("!h-[76.8px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}>
                    <TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell>
                    <TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode} : {row.name}</TableCell>
                    <TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>
                    <TableCell className={cellClass}>
                      <div className="face-image-row flex min-h-[60px] items-center gap-0 overflow-x-auto">
                        {rowImages.length < 10 && <div className="flex size-[60px] shrink-0 items-center justify-center"><label className="-ml-[15px] inline-flex size-[22px] cursor-pointer items-center justify-center rounded-full text-[#039be5]" title="เพิ่มรูปใบหน้า"><input type="file" accept="image/png,image/jpeg" multiple className="sr-only" onChange={(event) => { addImages(row.id, event.target.files); event.currentTarget.value = ""; }} /><svg aria-hidden="true" viewBox="0 0 24 24" className="size-[30px] overflow-visible fill-current"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2Z" /></svg></label></div>}
                        {rowImages.map((image) => <div key={image} className="relative size-[60px] shrink-0"><button type="button" onClick={() => removeImage(row.id, image)} aria-label="ลบรูปใบหน้า" className="absolute right-0 top-0 z-10 inline-flex size-5 items-center justify-center rounded-full bg-[#f44336] pt-[5px] text-sm font-semibold leading-[22.001px] text-white"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-[15px] fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM8 9h8v10H8V9Zm7.5-5-1-1h-5l-1 1H5v2h14V4h-3.5Z" /></svg></button>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={image} alt="รูปใบหน้า" className="mx-[7.5px] h-[60px] w-[45px] object-cover" /></div>)}
                      </div>
                    </TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
            </div>
            {!loading && <EmployeeCursorPagination page={page} hasNextPage={hasNextPage} hasPreviousPage={hasPreviousPage} onNext={() => void next()} onPrevious={() => void previous()} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IndividualApproverContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [position, setPosition] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", position: "", hashtag: "" });
  const [file, setFile] = useState<File | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("MIC_ORGANIZE");
  const [newApprover, setNewApprover] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);
  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) ids.set(node.id, node.organizationIds ?? []);
      else visit(node.children ?? []);
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);
  const positions = useMemo(() => [...new Set(rows.map((row) => row.position).filter(Boolean))], [rows]);
  const approvers = useMemo(() => rows.map((row) => ({ id: row.id, label: `${row.employeeCode}: ${row.name}` })), [rows]);
  const visibleRows = rows.filter((row) => {
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return (!filters.organizationId || row.organizationIds.includes(filters.organizationId))
      && (!filters.position || row.position === filters.position)
      && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic" });
      if (companyId) params.set("companyId", companyId);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[] };
      setRows(data.employees);
      setDirtyIds(new Set());
      setSaveState("idle");
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const setApprover = (employeeId: string, level: number, approverId: string) => {
    setAssignments((current) => {
      const next = [...(current[employeeId] ?? Array(5).fill(""))];
      next[level] = approverId;
      return { ...current, [employeeId]: next };
    });
    setSaveState("idle");
  };
  const changeApprover = () => {
    if (!newApprover) return;
    setAssignments((current) => Object.fromEntries(visibleRows.map((row) => {
      const levels = [...(current[row.id] ?? Array(5).fill(""))];
      levels[0] = newApprover;
      return [row.id, levels];
    })));
    setSaveState("idle");
  };

  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)] outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)]";
  const tableWidths = [80, 250, 200, 200, 200, 200, 250, 250, 250, 250, 250];
  const headers = ["ลำดับ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง", "อนุมัติขั้น 1", "อนุมัติขั้น 2", "อนุมัติขั้น 3", "อนุมัติขั้น 4", "อนุมัติขั้น 5"];

  return (
    <Card className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}>
      <CardInputHeader title="กำหนดผู้อนุมัติรายบุคคล" />
      <CardContent className="card-input-body px-2 py-4">
        <div className="flex flex-col gap-2">
          <section className="mb-2 grid gap-2 lg:grid-cols-3">
            <div className="mr-2 flex min-w-0 flex-col">
              <span className="import-no m-2 flex size-10 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span>
              <h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">ดาวน์โหลดเทมเพลต (*.xlsx)</h2>
              <label className="text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">โครงสร้างองค์กร</label>
              <div className="flex gap-2"><select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={cn(controlClass, "max-w-[70%]")}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><a href="/templates/employee-import-template.xlsx" download="Template Individual Approver.xlsx" className="inline-flex h-9 max-w-max items-center rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#029702]">ดาวน์โหลด</a></div>
            </div>
            <div className="mr-2 flex min-w-0 flex-col">
              <span className="import-no m-2 flex size-10 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span>
              <h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">นำเข้าข้อมูล (Import)</h2>
              <input ref={fileInputRef} id="individual-approver-file" type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <div className="flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-[rgba(0,0,0,0.87)] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">{file?.name ?? "ยังไม่ได้เลือกไฟล์"}</span></div>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="import-no m-2 flex size-10 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">3</span>
              <h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">ประเภท</h2>
              <div className="max-h-[200px] overflow-y-auto"><Table className="table-fixed"><TableHeader><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]"><TableHead className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">ชื่อย่อบริษัท</TableHead></TableRow></TableHeader><TableBody>{["MIC", "PSTH_ADMIN", "SVOA", "MIC_ORGANIZE", "PECTH"].map((item) => <TableRow key={item} className="h-[52.8px] hover:bg-transparent"><TableCell className="border border-[#f0f0f0] p-2 text-center text-sm text-[rgba(0,0,0,0.65)]">{item}</TableCell></TableRow>)}</TableBody></Table></div>
            </div>
          </section>

          <div className="mb-2 grid gap-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <label className="flex flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            <label className="flex flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">ตำแหน่ง<select value={position} onChange={(event) => setPosition(event.target.value)} className={controlClass}><option value="">ตำแหน่ง</option>{positions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="flex flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, position, hashtag }); }} placeholder="#Hashtag" className={controlClass} /></label>
            <button type="button" onClick={() => setFilters({ organizationId, position, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button>
          </div>
          <div className="mb-2 flex justify-end"><button type="button" onClick={changeApprover} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-[rgba(0,0,0,0.87)] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เปลี่ยนผู้อนุมัติ</button></div>
          <div className="mb-2 grid gap-2 lg:grid-cols-3">
            <label className="flex flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">บริษัท<select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)} className={controlClass}>{["MIC_ORGANIZE", "MIC", "PSTH_ADMIN", "SVOA", "PECTH"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="flex flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            <label className="flex flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">ผู้อนุมัติ<select value={newApprover} onChange={(event) => setNewApprover(event.target.value)} className={controlClass}><option value="">ผู้อนุมัติ</option>{approvers.map((approver) => <option key={approver.id} value={approver.id}>{approver.label}</option>)}</select></label>
          </div>

          <div className="fix-column-table mb-2 overflow-x-auto rounded-[8px] bg-white"><div className="max-h-[705.2px] min-w-[2380px] overflow-y-auto"><Table className="min-w-[2380px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{tableWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{headers.map((header) => <TableHead key={header} className={cn("h-[54.8px] border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white", header === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{header}{header === "ชื่อพนักงาน" && <Search className="ml-1 inline size-3.5 align-[-2px]" />}</TableHead>)}</TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={headers.length} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[38.8px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell><TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>{Array.from({ length: 5 }, (_, level) => <TableCell key={level} className={cellClass}><button type="button" onClick={() => newApprover && setApprover(row.id, level, newApprover)} aria-label={`ผู้อนุมัติขั้น ${level + 1} ของ ${row.name}`} className="block h-[22.001px] w-full truncate text-left text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)]">{approvers.find((approver) => approver.id === assignments[row.id]?.[level])?.label ?? ""}</button></TableCell>)}</TableRow>)}</TableBody></Table></div><nav className="flex h-[76.8px] items-center justify-end px-4" aria-label="แบ่งหน้าข้อมูลผู้อนุมัติ"><button type="button" disabled aria-label="หน้าก่อนหน้า" className="flex size-8 items-center justify-center text-black/25"><svg aria-hidden="true" viewBox="64 64 896 896" className="size-3 fill-current"><path d="M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8a31.86 31.86 0 0 0 0 50.3l450.8 352.1c5.3 4.1 12.9.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.1-12.6l-360-281 360-281.1c3.8-3 6.1-7.7 6.1-12.6z" /></svg></button><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span><button type="button" disabled aria-label="หน้าถัดไป" className="flex size-8 items-center justify-center text-black/25"><svg aria-hidden="true" viewBox="64 64 896 896" className="size-3 fill-current"><path d="M765.7 486.8 314.9 134.7A7.97 7.97 0 0 0 302 141v77.3c0 4.9 2.3 9.6 6.1 12.6l360 281.1-360 281.1c-3.9 3-6.1 7.7-6.1 12.6V883c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.96 31.96 0 0 0 0-50.4z" /></svg></button></nav></div>
          <span className="relative -top-14 mb-2 flex max-w-[calc(100%_-_160px)] items-center text-sm leading-[22px] text-[rgba(0,0,0,0.7)]"><svg aria-hidden="true" viewBox="0 0 24 24" className="mr-1 size-[15px] shrink-0 fill-current"><path d="M11 18h2v-2h-2v2Zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 2 2c-1.1 0-2 .9-2 2v1h2v-1a4 4 0 0 0 0-8Z" /></svg>การแก้ไขผู้อนุมัติจะส่งผลต่อลำดับขั้นการอนุมัติเอกสาร รวมถึงรอบการประเมินพนักงานทดลองงานที่อ้างอิงตามสายการอนุมัติ</span>
          <div className="mb-2 text-sm leading-[22px] text-red-600">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</div>
          <div className="mb-2 mt-3 flex justify-end"><button type="button" onClick={() => setSaveState("saved")} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#029702]">{saveState === "saved" ? "บันทึกแล้ว" : "บันทึก"}</button></div>
          <div className="border-t border-[#f0f0f0] pt-6"><div className="sub-header text-lg font-bold leading-[28px] text-[rgba(0,0,0,0.87)]">ประวัติการนำเข้าข้อมูลผู้อนุมัติ</div><div className="mt-2 overflow-x-auto"><Table className="min-w-[800px] table-fixed"><TableHeader><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "File", "วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ข้อมูลผิดพลาด", "Log"].map((header) => <TableHead key={header} className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">{header}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-40 border border-[#f0f0f0] text-center text-sm text-black/45">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div></div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) ids.set(node.id, node.organizationIds ?? []);
      else visit(node.children ?? []);
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic" });
      if (companyId) params.set("companyId", companyId);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[] };
      setRows(data.employees);
      setDirtyIds(new Set());
      setSaveState("idle");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const updateRow = (id: string, field: "paymentChannel" | "companyPayoutAccount" | "bankName" | "bankBranchCode" | "bankAccountNumber", value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
    setDirtyIds((current) => new Set(current).add(id));
    setSaveState("idle");
  };

  const save = async () => {
    setSaveState("saving");
    try {
      await saveEmployeeBatch(rows.filter(({ id }) => dirtyIds.has(id)), [
        "paymentChannel", "companyPayoutAccount", "bankName", "bankBranchCode", "bankAccountNumber",
      ]);
      setDirtyIds(new Set());
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  };

  const filterControlClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const tableInputClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm font-normal leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";

  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="ช่องทางการรับเงิน" />
      <CardContent className="card-input-body px-2 py-4">
        <div className="m-6">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={filterControlClass}>
                <option value="">โครงสร้างองค์กร</option>
                {organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag
              <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={filterControlClass} />
            </label>
            <button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button>
          </div>

          <div className="fix-column-table max-h-[650px] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]">
            <Table className="min-w-[1650px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
              <colgroup>{[80, 200, 160, 160, 160, 160, 160, 160, 160, 120, 160].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                {["ลำดับ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง", "ช่องทางการรับเงิน", "บัญชีบริษัทนำจ่าย", "ธนาคาร", "รหัสสาขาธนาคาร", "เลขที่บัญชี"].map((column) => <TableHead key={column} className={cn("border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white", column === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{column}{column === "ชื่อพนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-3.5 fill-current align-[-2px]"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" /></svg>}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={11} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={11} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[48.8px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}>
                  <TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell>
                  <TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell>
                  <TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>
                  <TableCell className={cellClass}><PaymentTableSelect value={row.paymentChannel} onChange={(value) => updateRow(row.id, "paymentChannel", value)}><option value="">เลือกช่องทาง</option>{["โอน", "เงินสด", "เช็ค"].map((value) => <option key={value}>{value}</option>)}</PaymentTableSelect></TableCell>
                  <TableCell className={cellClass}><PaymentTableSelect value={row.companyPayoutAccount} onChange={(value) => updateRow(row.id, "companyPayoutAccount", value)}><option value="">เลือกบัญชีบริษัท</option>{[...new Set([row.companyPayoutAccount, "บริษัท เอ็มไอซี ออแกไนซ์ จำกัด"].filter(Boolean))].map((value) => <option key={value}>{value}</option>)}</PaymentTableSelect></TableCell>
                  <TableCell className={cellClass}><PaymentTableSelect value={row.bankName} onChange={(value) => updateRow(row.id, "bankName", value)}><option value="">เลือกธนาคาร</option>{[...new Set([row.bankName, "SCB - ธนาคารไทยพาณิชย์ จำกัด (มหาชน)", "KBank - ธนาคารกสิกรไทย", "BBL - ธนาคารกรุงเทพ", "KTB - ธนาคารกรุงไทย"].filter(Boolean))].map((value) => <option key={value}>{value}</option>)}</PaymentTableSelect></TableCell>
                  <TableCell className={cellClass}><input value={row.bankBranchCode} onChange={(event) => updateRow(row.id, "bankBranchCode", event.target.value)} className={tableInputClass} /></TableCell>
                  <TableCell className={cellClass}><input value={row.bankAccountNumber} onChange={(event) => updateRow(row.id, "bankAccountNumber", event.target.value)} className={tableInputClass} /></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
            {!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าช่องทางการรับเงิน"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}
          </div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => void save()} disabled={saveState === "saving" || dirtyIds.size === 0} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:opacity-60">{saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก"}</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabPlaceholder({ tab }: { tab: string }) {
  return (
    <Card>
      <CardHeader>
        <p className="font-semibold text-foreground">{tab}</p>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          อยู่ระหว่างการพัฒนา
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveQuotaCalculationContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotaTypes, setQuotaTypes] = useState<Record<string, boolean[]>>({});
  const [saved, setSaved] = useState(false);
  const leaveTypes = ["ลากิจพิเศษ", "ลากิจธุระส่วนตัว", "ลาป่วย", "ลาพักร้อน", "ขาดงาน"];

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic" });
      if (companyId) params.set("companyId", companyId);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[] };
      setRows(data.employees);
      setQuotaTypes((current) => Object.fromEntries(data.employees.map((employee) => [employee.id, current[employee.id] ?? Array(leaveTypes.length).fill(false)])));
    } finally {
      setLoading(false);
    }
  }, [companyId, leaveTypes.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const visibleRows = useMemo(() => {
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return rows.filter((row) => (!filters.organizationId || row.organizationIds.includes(filters.organizationId)) && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag)));
  }, [filters, rows]);
  const setQuota = (id: string, index: number, checked: boolean) => {
    setQuotaTypes((current) => ({ ...current, [id]: (current[id] ?? Array(leaveTypes.length).fill(false)).map((value, valueIndex) => valueIndex === index ? checked : value) }));
    setSaved(false);
  };
  const setQuotaColumn = (index: number, checked: boolean) => {
    setQuotaTypes((current) => ({ ...current, ...Object.fromEntries(visibleRows.map((row) => [row.id, (current[row.id] ?? Array(leaveTypes.length).fill(false)).map((value, valueIndex) => valueIndex === index ? checked : value)])) }));
    setSaved(false);
  };
  const columnChecked = (index: number) => visibleRows.length > 0 && visibleRows.every((row) => quotaTypes[row.id]?.[index]);
  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const headClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";

  return (
    <Card data-leave-quota-calculation className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}>
      <CardInputHeader title="ตั้งค่าคำนวณโควตาการลา" />
      <CardContent className="card-input-body px-2 py-4 text-sm leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]">
        <style>{`
          [data-leave-quota-calculation] .quota-table {
            height: 464px;
            overflow: hidden;
            border: 0;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0px 2px 1px -1px rgba(0,0,0,.2), 0px 1px 1px 0px rgba(0,0,0,.14), 0px 1px 3px 0px rgba(0,0,0,.12);
          }
          [data-leave-quota-calculation] .quota-table-header { height: 76.8px; overflow: hidden; }
          [data-leave-quota-calculation] .quota-table-body { height: 322.4px; overflow: scroll; }
          [data-leave-quota-calculation] .quota-table table {
            width: 2780px;
            min-width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            color: rgba(0,0,0,.65);
            font-family: kanit, sans-serif;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: -0.1px;
            line-height: 22.001px;
          }
          [data-leave-quota-calculation] .quota-table th {
            height: 76.8px;
            border: 0;
            background: #61a8ff;
            padding: 16px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: -0.1px;
            line-height: 22.001px;
            text-align: center;
            text-transform: none;
            vertical-align: middle;
          }
          [data-leave-quota-calculation] .quota-table-header tr { border-bottom: 0; }
          [data-leave-quota-calculation] .quota-table td {
            height: 38.8px;
            border: 0;
            padding: 8px;
            color: rgba(0,0,0,.65);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: -0.1px;
            line-height: 22.001px;
            vertical-align: middle;
          }
          [data-leave-quota-calculation] .quota-checkbox {
            display: block;
            width: 16px;
            height: 16px;
            margin: 0 auto;
            appearance: none;
            border: 1px solid #d9d9d9;
            border-radius: 2px;
            background: #fff;
          }
          [data-leave-quota-calculation] .quota-checkbox:checked {
            border-color: #1890ff;
            background: #1890ff url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.1 6.1 4.7 8.6 9.9 3.4' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
          }
          [data-leave-quota-calculation] .quota-pagination { height: 32px; margin: 16px 0; }
          [data-leave-quota-calculation] .quota-pagination button,
          [data-leave-quota-calculation] .quota-pagination span { width: 32px; height: 32px; border-radius: 2px; font-size: 14px; line-height: 30px; text-align: center; }
        `}</style>
        <div className="m-6">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex min-w-0 flex-1 flex-col">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="flex min-w-0 flex-1 flex-col">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={controlClass} /></label><button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ค้นหา</button></div>
          <div className="fix-column-table quota-table"><div className="quota-table-header"><Table><colgroup>{[80, 250, 180, 180, 180, 180, ...Array(5).fill(346)].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]"><TableHead className={headClass}>ลำดับ</TableHead><TableHead className={cn(headClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.25)]")}>ชื่อพนักงาน <Search className="ml-1 inline size-3 align-[-1px]" /></TableHead>{["แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง"].map((column) => <TableHead key={column} className={headClass}>{column}</TableHead>)}{leaveTypes.map((type, index) => <TableHead key={type} className={headClass}>{type}<br /><input type="checkbox" checked={columnChecked(index)} onChange={(event) => setQuotaColumn(index, event.target.checked)} aria-label={`เลือก${type}ทั้งหมด`} className="quota-checkbox" /></TableHead>)}</TableRow></TableHeader></Table></div><div className="quota-table-body"><Table><colgroup>{[80, 250, 180, 180, 180, 180, ...Array(5).fill(346)].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableBody>{loading ? <TableRow><TableCell colSpan={11} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={11} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell><TableCell className={cn(cellClass, "sticky left-[80px] z-10 shadow-[4px_0_20px_-8px_rgba(0,0,0,0.25)]", index % 2 === 0 ? "bg-[#f2fafe]" : "bg-white")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>{leaveTypes.map((type, quotaIndex) => <TableCell key={type} className={`${cellClass} text-center`}><input type="checkbox" checked={quotaTypes[row.id]?.[quotaIndex] ?? false} onChange={(event) => setQuota(row.id, quotaIndex, event.target.checked)} aria-label={`${type} ${row.name}`} className="quota-checkbox" /></TableCell>)}</TableRow>)}</TableBody></Table></div>{!loading && visibleRows.length > 0 && <nav className="quota-pagination flex justify-end gap-2 pr-4"><button type="button" disabled className="border border-[#d9d9d9] text-black/25">‹</button><span className="border border-[#1890ff] text-[#1890ff]">1</span><button type="button" disabled className="border border-[#d9d9d9] text-black/25">›</button></nav>}</div>
          <p className="mt-0 text-sm leading-[22.001px] text-red-600">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><div className="mt-3 flex justify-end"><button type="button" onClick={() => setSaved(true)} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{saved ? "บันทึกแล้ว" : "บันทึก"}</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxDeductionContent({ orgTree }: { orgTree: OrgNode[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [year, setYear] = useState("");
  const [fileName, setFileName] = useState("");
  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);
  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";

  return (
    <Card
      data-tax-deduction
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{
        boxShadow:
          "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)",
      }}
    >
      <CardInputHeader title="ลดหย่อนภาษี" />
      <CardContent className="card-input-body px-2 py-4 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]">
        <style>{`
          [data-tax-deduction] .tax-deduction-table { height: 206.4px; overflow: hidden; border: 0; border-radius: 8px; background: #fff; box-shadow: 0px 2px 1px -1px rgba(0,0,0,.2), 0px 1px 1px 0px rgba(0,0,0,.14), 0px 1px 3px 0px rgba(0,0,0,.12); }
          [data-tax-deduction] .tax-deduction-table > div { height: 206.4px; overflow-x: hidden; overflow-y: scroll; }
          [data-tax-deduction] .tax-deduction-table th { height: 54.8px; border: 0 !important; background: transparent !important; padding: 16px; color: #fff; font-family: Kanit, sans-serif; font-size: 14px; font-weight: 500; letter-spacing: -0.1px !important; line-height: 22.001px; text-align: center; text-transform: none; vertical-align: middle; }
          [data-tax-deduction] .tax-deduction-table td { border: 0; }
          [data-tax-deduction] .tax-deduction-empty { height: 150.8px; background: #f2fafe; padding: 8px !important; color: rgba(0, 0, 0, .65); font-size: 14px; font-weight: 400; letter-spacing: -0.1px; line-height: 22.001px; text-align: center; vertical-align: middle; }
          @media (max-width: 1023px) { [data-tax-deduction] .tax-deduction-divider { display: none; } }
        `}</style>
        <div className="flex flex-col lg:flex-row">
          <section className="m-6 flex min-w-0 flex-1 flex-col">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span>
            <div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end"><label className="min-w-0 sm:w-[40%]">โครงสร้างองค์กร<select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="min-w-0 flex-1">&nbsp;<span className="sr-only">เลือกปี</span><input type="number" min="1900" max="9999" value={year} onChange={(event) => setYear(event.target.value)} placeholder="เลือกปี" className={controlClass} aria-label="เลือกปี" /></label><button type="button" className="h-9 shrink-0 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลดเทมเพลต</button></div></div>
          </section>
          <div className="tax-deduction-divider hidden w-[17px] shrink-0 lg:flex"><div className="mx-2 h-full border-l border-black/[0.12]" /></div>
          <section className="m-6 flex min-w-0 flex-1 flex-col">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span>
            <div className="m-2 min-w-0"><h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล (Import)</h2><div className="flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 shrink-0 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 truncate text-black/65">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div>
          </section>
        </div>
        <div className="border-t border-black/[0.12]" />
        <section className="m-6"><h2 className="sub-header mb-3 text-lg font-bold leading-10">ประวัติการนำเข้าข้อมูล</h2><div className="tax-deduction-table overflow-x-auto rounded-[2px] border-[0.8px] border-[#f0f0f0]"><Table className="min-w-[760px] table-fixed text-sm leading-[22.001px]"><colgroup>{[15, 15, 15, 15, 15, 15, 10].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup><TableHeader><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ลบข้อมูล", "ข้อมูลผิดพลาด", ""].map((label, index) => <TableHead key={`${label}-${index}`}>{label}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="tax-deduction-empty">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div></section>
      </CardContent>
    </Card>
  );
}

function TrainingImportContent({ orgTree, title = "นำเข้าฝึกอบรม", historyTableHeight = 206.4, showHorizontalScroll = false }: { orgTree: OrgNode[]; title?: string; historyTableHeight?: number; showHorizontalScroll?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [fileName, setFileName] = useState("");
  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);
  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";

  return (
    <Card
      data-training-import
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
    >
      <CardInputHeader title={title} />
      <CardContent className="card-input-body px-2 py-4 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]">
        <style>{`
          [data-training-import] .training-import-table { height: ${historyTableHeight}px; overflow: hidden; border: 0; border-radius: 8px; background: #fff; box-shadow: 0px 2px 1px -1px rgba(0,0,0,.2), 0px 1px 1px 0px rgba(0,0,0,.14), 0px 1px 3px 0px rgba(0,0,0,.12); }
          [data-training-import] .training-import-table > div { height: ${historyTableHeight}px; overflow-x: hidden; overflow-y: scroll; }
          [data-training-import] .training-import-asset-table > div { overflow: scroll; }
          [data-training-import] .training-import-table th { height: 54.8px; border: 0 !important; background: transparent !important; padding: 16px; color: #fff; font-family: Kanit, sans-serif; font-size: 14px; font-weight: 500; letter-spacing: -0.1px !important; line-height: 22.001px; text-align: center; text-transform: none; vertical-align: middle; }
          [data-training-import] .training-import-table th:first-child { border-radius: 2px 0 0; }
          [data-training-import] .training-import-table th:last-child { border-radius: 0 2px 0 0; }
          [data-training-import] .training-import-table td { border: 0; }
          [data-training-import] .training-import-empty { height: 150.8px; background: #f2fafe; padding: 8px !important; color: rgba(0,0,0,.65); font-size: 14px; font-weight: 400; letter-spacing: -0.1px; line-height: 22.001px; text-align: center; vertical-align: middle; }
          @media (max-width: 1023px) { [data-training-import] .training-import-divider { display: none; } }
        `}</style>
        <div className="flex flex-col lg:flex-row">
          <section className="m-6 flex min-w-0 flex-1 flex-col"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><label>โครงสร้างองค์กร</label><div className="my-2 flex w-full flex-col gap-2 sm:flex-row sm:items-center"><select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={`${controlClass} min-w-0 flex-1`}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><button type="button" className="h-9 shrink-0 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]">เทมเพลตมีรายชื่อพนักงาน</button></div></div></section>
          <div className="training-import-divider hidden w-[17px] shrink-0 lg:flex"><div className="mx-2 h-full border-l border-black/[0.12]" /></div>
          <section className="m-6 flex min-w-0 flex-1 flex-col"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span><div className="m-2 min-w-0"><h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล (Import)</h2><div className="flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 shrink-0 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]">เลือกไฟล์</button><span className="ml-2 truncate text-black/65">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div></section>
        </div>
        <div className="border-t border-black/[0.12]" />
        <section className="m-6"><h2 className="sub-header mb-3 text-lg font-bold leading-10">ประวัติการนำเข้าข้อมูลพนักงาน</h2><div className={cn("training-import-table", showHorizontalScroll && "training-import-asset-table")}><Table className="min-w-[760px] table-fixed text-sm leading-[22.001px]"><colgroup>{[15, 15, 15, 15, 15, 15, 10].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup><TableHeader><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ลบข้อมูล", "ข้อมูลผิดพลาด", ""].map((label, index) => <TableHead key={`${label}-${index}`}>{label}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="training-import-empty">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div></section>
      </CardContent>
    </Card>
  );
}

function AssetImportContent({ orgTree }: { orgTree: OrgNode[] }) {
  return <TrainingImportContent orgTree={orgTree} title="นำเข้าสินทรัพย์ถือครอง" historyTableHeight={218.4} showHorizontalScroll />;
}

function PersonalHistoryImportContent({ orgTree }: { orgTree: OrgNode[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadDataType, setDownloadDataType] = useState("ครอบครัว");
  const [importDataType, setImportDataType] = useState("ครอบครัว");
  const [filterDataType, setFilterDataType] = useState("ครอบครัว");
  const [historyDataType, setHistoryDataType] = useState("ครอบครัว");
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [filterOrganizationId, setFilterOrganizationId] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);
  const dataTypes = ["ครอบครัว"];
  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const primaryColumns = ["ลำดับ", "รหัสพนักงาน", "ชื่อ-นามสกุล", "ความสัมพันธ์", "เลขประจำตัวประชาชน / ผู้เสียภาษี", "คำนำหน้าชื่อ", "ชื่อ", "นามสกุล", "วันเกิด", "เบอร์โทรศัพท์", "อีเมล", "ที่อยู่", ""];

  return (
    <Card
      data-personal-history-import
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
    >
      <CardInputHeader title="นำเข้าประวัติส่วนตัว" />
      <CardContent className="card-input-body px-2 py-4 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]">
        <style>{`
          [data-personal-history-import] .personal-main-table { height: 240.4px; overflow: hidden; border: 0; border-radius: 8px; background: #fff; box-shadow: 0px 2px 1px -1px rgba(0,0,0,.2), 0px 1px 1px 0px rgba(0,0,0,.14), 0px 1px 3px 0px rgba(0,0,0,.12); }
          [data-personal-history-import] .personal-main-table > div { height: 240.4px; overflow: scroll; }
          [data-personal-history-import] .personal-main-table table { width: 1650px; min-width: 100%; table-layout: fixed; }
          [data-personal-history-import] .personal-main-table th, [data-personal-history-import] .personal-history-table th { height: 54.8px; border: 0 !important; background: transparent !important; padding: 16px; color: #fff; font-family: Kanit, sans-serif; font-size: 14px; font-weight: 500; letter-spacing: -0.1px !important; line-height: 22.001px; text-align: center; text-transform: none; vertical-align: middle; }
          [data-personal-history-import] .personal-main-table th:first-child, [data-personal-history-import] .personal-history-table th:first-child { border-radius: 2px 0 0; }
          [data-personal-history-import] .personal-main-table th:last-child, [data-personal-history-import] .personal-history-table th:last-child { border-radius: 0 2px 0 0; }
          [data-personal-history-import] .personal-main-table th { height: 76.8px; background: #61a8ff !important; }
          [data-personal-history-import] .personal-main-table td, [data-personal-history-import] .personal-history-table td { border: 0; }
          [data-personal-history-import] .personal-main-empty { height: 150.8px; background: #f2fafe; padding: 8px !important; color: rgba(0,0,0,.65); font-size: 14px; font-weight: 400; letter-spacing: -0.1px; line-height: 22.001px; text-align: center; vertical-align: middle; }
          [data-personal-history-import] .personal-history-table { height: 206.4px; overflow: hidden; border-radius: 8px; background: #fff; box-shadow: 0px 2px 1px -1px rgba(0,0,0,.2), 0px 1px 1px 0px rgba(0,0,0,.14), 0px 1px 3px 0px rgba(0,0,0,.12); }
          [data-personal-history-import] .personal-history-table > div { height: 206.4px; overflow-x: hidden; overflow-y: scroll; }
          [data-personal-history-import] .personal-history-empty { height: 150.8px; background: #f2fafe; padding: 8px !important; color: rgba(0,0,0,.65); font-size: 14px; font-weight: 400; letter-spacing: -0.1px; line-height: 22.001px; text-align: center; vertical-align: middle; }
          @media (max-width: 1023px) { [data-personal-history-import] .personal-import-divider { display: none; } }
        `}</style>
        <div className="flex flex-col lg:flex-row">
          <section className="m-6 flex min-w-0 flex-1 flex-col"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="my-2 flex w-full flex-col gap-2 sm:flex-row sm:items-end"><label className="min-w-0 flex-1">ประเภทข้อมูล*<select value={downloadDataType} onChange={(event) => setDownloadDataType(event.target.value)} className={controlClass}>{dataTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="min-w-0 flex-1">โครงสร้างองค์กร<select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button type="button" className="h-9 shrink-0 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]">ดาวน์โหลด</button></div></div></section>
          <div className="personal-import-divider hidden w-[17px] shrink-0 lg:flex"><div className="mx-2 h-full border-l border-black/[0.12]" /></div>
          <section className="m-6 flex min-w-0 flex-1 flex-col"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span><div className="m-2 min-w-0"><h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล (Import)</h2><div className="my-2"><label>ประเภทข้อมูล*</label><div className="mt-0 flex w-full flex-col gap-[10px] sm:flex-row"><select value={importDataType} onChange={(event) => setImportDataType(event.target.value)} className={`${controlClass} min-w-0 flex-1`}>{dataTypes.map((type) => <option key={type}>{type}</option>)}</select><div className="min-w-0 flex-1"><div className="flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 shrink-0 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]">เลือกไฟล์</button><span className="ml-2 truncate text-black/65">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => { setFileName(event.target.files?.[0]?.name ?? ""); setUploaded(false); }} /></div><button type="button" disabled={!fileName} onClick={() => setUploaded(true)} className="mt-3 h-9 w-[245.2px] max-w-full rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)] disabled:cursor-not-allowed disabled:opacity-50">{uploaded ? "อัพโหลดแล้ว" : "อัพโหลดไฟล์"}</button></div></div></div></div></section>
        </div>
        <div className="border-t border-black/[0.12]" />
        <section className="m-6"><div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end"><label className="min-w-0 flex-1">ประเภทข้อมูล*<select value={filterDataType} onChange={(event) => setFilterDataType(event.target.value)} className={controlClass}>{dataTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="min-w-0 flex-1">โครงสร้างองค์กร<select value={filterOrganizationId} onChange={(event) => setFilterOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><div className="hidden flex-1 lg:block" /><button type="button" className="h-9 shrink-0 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]">ค้นหา</button></div><div className="personal-main-table"><Table><colgroup>{[80,150,250,150,200,150,150,150,150,150,200,200,80].map((width,index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{primaryColumns.map((column,index) => <TableHead key={`${column}-${index}`}>{column}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow className="hover:bg-transparent"><TableCell colSpan={13} className="personal-main-empty">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div><div className="mt-3 flex justify-end"><button type="button" className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]">บันทึก</button></div></section>
        <div className="border-t border-black/[0.12]" />
        <section className="m-6"><h2 className="sub-header mb-3 text-lg font-bold leading-10">ประวัติการนำเข้าประวัติส่วนตัว</h2><div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end"><label className="min-w-0 flex-1">ประเภทข้อมูล*<select value={historyDataType} onChange={(event) => setHistoryDataType(event.target.value)} className={controlClass}>{dataTypes.map((type) => <option key={type}>{type}</option>)}</select></label><div className="hidden flex-1 lg:block" /><div className="hidden flex-1 lg:block" /><button type="button" className="h-9 shrink-0 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]">ค้นหา</button></div><div className="personal-history-table"><Table className="table-fixed"><colgroup>{[22.5,22.5,22.5,22.5,10].map((width,index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup><TableHeader><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "ข้อมูลผิดพลาด", ""].map((column,index) => <TableHead key={`${column}-${index}`}>{column}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="personal-history-empty">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div></section>
      </CardContent>
    </Card>
  );
}

function CostDistributionContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [position, setPosition] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [onlyWithCostCenter, setOnlyWithCostCenter] = useState(false);
  const [onlyWithoutCostCenter, setOnlyWithoutCostCenter] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [costCenters, setCostCenters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ view: "basic" });
        if (companyId) params.set("companyId", companyId);
        const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("load failed");
        const data = (await response.json()) as { employees: BasicEmployeeRow[] };
        if (!cancelled) setRows(data.employees);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId]);

  const positions = useMemo(() => [...new Set(rows.map((row) => row.position).filter(Boolean))].sort(), [rows]);
  const costCenterOptions = useMemo(() => [...new Set(Object.values(costCenters).filter(Boolean))].sort(), [costCenters]);
  const availableEmployees = useMemo(() => rows.filter((row) => !organizationId || row.organizationIds.includes(organizationId)), [organizationId, rows]);
  const visibleRows = useMemo(() => {
    const query = employeeSearch.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const assignedCostCenter = costCenters[row.id] ?? "";
      return (!organizationId || row.organizationIds.includes(organizationId))
        && (!position || row.position === position)
        && (!employeeId || row.id === employeeId)
        && (!costCenter || assignedCostCenter === costCenter)
        && (!onlyWithCostCenter || Boolean(assignedCostCenter))
        && (!onlyWithoutCostCenter || !assignedCostCenter)
        && (!query || `${row.employeeCode} ${row.name}`.toLocaleLowerCase().includes(query));
    });
  }, [costCenter, costCenters, employeeId, employeeSearch, onlyWithCostCenter, onlyWithoutCostCenter, organizationId, position, rows]);

  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const applyFilters = () => { setSearched(true); setSelectedRows(new Set()); };
  const toggleSelection = (id: string) => setSelectedRows((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <Card data-cost-distribution className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}>
      <CardInputHeader title="ตั้งค่า Cost Distribution" />
      <CardContent className="card-input-body p-0 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]">
        <style>{`
          [data-cost-distribution] .cost-distribution-workspace {
            margin: 32px;
            color: rgba(0, 0, 0, 0.87);
            font-family: Kanit, sans-serif;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: -0.1px;
            line-height: 22.001px;
          }
          [data-cost-distribution] .cost-distribution-filters {
            display: flex;
            gap: 10px;
            margin: 0 0 24px;
          }
          [data-cost-distribution] .cost-distribution-filters > label {
            flex: 1 1 0;
            min-width: 0;
            margin: 0;
          }
          [data-cost-distribution] .cost-distribution-filters label,
          [data-cost-distribution] .cost-distribution-checkboxes label {
            color: rgba(0, 0, 0, 0.87);
            font-size: 14px;
            font-weight: 400;
            line-height: 22.001px;
          }
          [data-cost-distribution] .cost-distribution-filters select {
            margin-top: 2px;
            border-radius: 4px;
          }
          [data-cost-distribution] .cost-distribution-filter-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          [data-cost-distribution] .cost-distribution-checkboxes {
            display: flex;
            gap: 12px;
          }
          [data-cost-distribution] .cost-distribution-checkboxes label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(0, 0, 0, 0.65);
          }
          [data-cost-distribution] .cost-distribution-filter-footer > button {
            height: 36px;
            min-width: 63.7px;
            border-radius: 2px;
            background: #008cff;
            padding: 0 16px;
            color: #fff;
            font-size: 14px;
            font-weight: 400;
            line-height: 16.1px;
            box-shadow: none;
          }
          [data-cost-distribution] .cost-distribution-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 0 0 16px;
            border: 0;
            padding: 24px 0 0;
          }
          [data-cost-distribution] .cost-distribution-search-shell {
            height: 40px;
            width: 300px;
            max-width: 100%;
            flex: 0 1 300px;
            border: 0.8px solid #d9d9d9;
            border-radius: 50px;
            padding: 0 12px;
          }
          [data-cost-distribution] .cost-distribution-search-shell input {
            height: 16.1px;
            padding: 0;
            color: rgba(0, 0, 0, 0.65);
            font-family: kanit, sans-serif;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: normal;
            line-height: 16.1px;
          }
          [data-cost-distribution] .cost-distribution-search-shell button {
            height: 25px;
            width: 26px;
            border-left: 0.8px solid #d9d9d9;
          }
          [data-cost-distribution] .cost-distribution-search-shell svg {
            height: 16px;
            width: 16px;
          }
          [data-cost-distribution] .cost-distribution-select-button {
            height: 36px;
            min-width: 61.25px;
            border: 0;
            border-radius: 2px;
            background: #fff;
            padding: 0 16px;
            color: #9e9e9e;
            font-size: 14px;
            font-weight: 400;
            line-height: 16.1px;
            box-shadow: none;
          }
          [data-cost-distribution] .cost-distribution-table {
            margin: 0 0 12px;
            overflow: hidden;
            border: 0.8px solid #e8e8e8;
            border-radius: 8px;
            background: #fff;
          }
          [data-cost-distribution] .cost-distribution-table table {
            width: 100%;
            table-layout: fixed;
            color: rgba(0, 0, 0, 0.65);
            font-family: Kanit, sans-serif;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: -0.1px;
            line-height: 22.001px;
          }
          [data-cost-distribution] .cost-distribution-table th {
            height: 90.8px;
            border: 0;
            background: #f7f8f9;
            padding: 12px 16px;
            color: #000;
            font-family: Kanit, sans-serif;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: -0.1px;
            line-height: 22.001px;
            text-align: center;
            vertical-align: middle;
            text-transform: none;
          }
          [data-cost-distribution] .cost-distribution-table td {
            border: 0;
            padding: 12px 16px;
            color: rgba(0, 0, 0, 0.65);
            font-size: 14px;
            font-weight: 400;
            line-height: 22.001px;
          }
          [data-cost-distribution] .cost-distribution-empty-cell {
            height: 278.8px;
            padding: 60px 20px !important;
            text-align: center;
          }
          [data-cost-distribution] .cost-distribution-empty-cell > span {
            color: rgba(0, 0, 0, 0.65);
            font-size: 14px;
            font-weight: 400;
            line-height: 22px;
            opacity: 0.5;
          }
          @media (max-width: 1023px) {
            [data-cost-distribution] .cost-distribution-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 639px) {
            [data-cost-distribution] .cost-distribution-workspace { margin: 24px; }
            [data-cost-distribution] .cost-distribution-filters { grid-template-columns: minmax(0, 1fr); }
            [data-cost-distribution] .cost-distribution-filter-footer,
            [data-cost-distribution] .cost-distribution-actions { align-items: stretch; flex-direction: column; }
            [data-cost-distribution] .cost-distribution-checkboxes { flex-direction: column; gap: 8px; }
            [data-cost-distribution] .cost-distribution-search-shell { flex-basis: 40px; width: 100%; }
          }
        `}</style>
        <div className="flex flex-col lg:flex-row">
          <section className="m-6 flex min-w-0 flex-1 flex-col">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">1</span>
            <div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="flex items-end gap-2"><label className="min-w-0 flex-1">โครงสร้างองค์กร<select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button type="button" className="h-9 shrink-0 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button></div></div>
          </section>
          <div className="hidden w-[17px] shrink-0 lg:flex"><div className="mx-2 h-full border-l border-black/[0.12]" /></div>
          <section className="m-6 flex min-w-0 flex-1 flex-col">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">2</span>
            <div className="m-2 min-w-0"><h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล</h2><div className="flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 shrink-0 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 truncate text-black/65">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div>
          </section>
        </div>

        <div className="border-t border-black/[0.12]" />
        <section className="cost-distribution-workspace">
          <div className="cost-distribution-filters">
            <label className="min-w-0">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setEmployeeId(""); }} className={controlClass}><option value="">โครงสร้างองค์กรทั้งหมด</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            <label className="min-w-0">ตำแหน่ง<select value={position} onChange={(event) => setPosition(event.target.value)} className={controlClass}><option value="">ตำแหน่งทั้งหมด</option>{positions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="min-w-0">รายชื่อพนักงาน<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={controlClass}><option value="">ทั้งหมด</option>{availableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode}: {employee.name}</option>)}</select></label>
            <label className="min-w-0">Cost Center<select value={costCenter} onChange={(event) => setCostCenter(event.target.value)} className={controlClass}><option value="">ทั้งหมด</option>{costCenterOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          </div>
          <div className="cost-distribution-filter-footer"><div className="cost-distribution-checkboxes"><label><input type="checkbox" checked={onlyWithCostCenter} onChange={(event) => { setOnlyWithCostCenter(event.target.checked); if (event.target.checked) setOnlyWithoutCostCenter(false); }} className="size-4 accent-[#1890ff]" />แสดงเฉพาะพนักงานที่ระบุ Cost Center</label><label><input type="checkbox" checked={onlyWithoutCostCenter} onChange={(event) => { setOnlyWithoutCostCenter(event.target.checked); if (event.target.checked) setOnlyWithCostCenter(false); }} className="size-4 accent-[#1890ff]" />แสดงเฉพาะพนักงานที่ไม่ระบุ Cost Center</label></div><button type="button" onClick={applyFilters}>ค้นหา</button></div>
          <div className="cost-distribution-actions"><div className="cost-distribution-search-shell flex items-center"><input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyFilters(); }} placeholder="ค้นหาจากรหัสพนักงานหรือชื่อพนักงาน" className="min-w-0 flex-1 border-0 bg-transparent outline-none" /><button type="button" onClick={applyFilters} aria-label="ค้นหาพนักงาน" className="flex shrink-0 items-center justify-center text-black/45"><Search /></button></div><button type="button" disabled={selectedRows.size === 0} className="cost-distribution-select-button disabled:cursor-not-allowed disabled:bg-white">เลือก</button></div>
          <div className="cost-distribution-table"><Table><colgroup><col className="w-[5%]" /><col className="w-[35%]" /><col className="w-[50%]" /></colgroup><TableHeader><TableRow><TableHead>ลำดับ</TableHead><TableHead>พนักงาน</TableHead><TableHead>Cost Center</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={3} className="cost-distribution-empty-cell"><span>กำลังโหลดข้อมูล...</span></TableCell></TableRow> : !searched ? <TableRow><TableCell colSpan={3} className="cost-distribution-empty-cell"><span>ยังไม่มีรายชื่อพนักงานกรุณากด &quot;ค้นหา&quot;</span></TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={3} className="cost-distribution-empty-cell"><span>ไม่มีข้อมูล</span></TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className="hover:bg-[#f2fafe]"><TableCell className="text-center"><input type="checkbox" checked={selectedRows.has(row.id)} onChange={() => toggleSelection(row.id)} aria-label={`เลือก ${row.name}`} className="mr-2 size-4 accent-[#1890ff]" />{index + 1}</TableCell><TableCell>{row.employeeCode}: {row.name}</TableCell><TableCell><input value={costCenters[row.id] ?? ""} onChange={(event) => setCostCenters((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="ระบุ Cost Center" className={controlClass} aria-label={`Cost Center ของ ${row.name}`} /></TableCell></TableRow>)}</TableBody></Table></div>
        </section>
        <div className="border-t border-black/[0.12]" />
        <section className="m-6"><h2 className="sub-header mb-3 text-lg font-bold leading-10">ประวัติการนำเข้าข้อมูล</h2><div className="overflow-x-auto rounded-[2px] border-[0.8px] border-[#f0f0f0]"><Table className="min-w-[840px] table-fixed text-sm leading-[22.001px]"><TableHeader><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "File", "วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัปเดตข้อมูล", "ข้อมูลผิดพลาด", "ผู้นำเข้า", "Log"].map((label) => <TableHead key={label} className="border-r border-[#f0f0f0] bg-[#61a8ff] p-4 text-center font-medium text-white">{label}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow className="h-40 hover:bg-transparent"><TableCell colSpan={9} className="text-center text-sm text-black/45">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div></section>
      </CardContent>
    </Card>
  );
}

function OvertimeTypeVisibilityContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) {
        options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.name}` });
      } else {
        visit(node.children ?? [], depth + 1);
      }
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) {
        ids.set(node.id, node.organizationIds ?? []);
      } else {
        visit(node.children ?? []);
      }
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ view: "basic" });
        if (companyId) params.set("companyId", companyId);
        const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("load failed");
        const data = (await response.json()) as { employees: BasicEmployeeRow[] };
        if (cancelled) return;
        const saved = typeof window === "undefined" ? {} : JSON.parse(window.localStorage.getItem(`ot-type-visibility:${companyId}`) ?? "{}");
        setRows(data.employees);
        setVisibility(Object.fromEntries(data.employees.map((employee) => [
          employee.id,
          Array.isArray(saved[employee.id]) && saved[employee.id].length === 5 ? saved[employee.id] : [true, true, true, true, true],
        ])));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });
  const updateVisibility = (employeeId: string, column: number, checked: boolean) => {
    setVisibility((current) => ({ ...current, [employeeId]: (current[employeeId] ?? [true, true, true, true, true]).map((value, index) => index === column ? checked : value) }));
    setDirty(true);
  };
  const updateAllVisibility = (employeeId: string, checked: boolean) => {
    setVisibility((current) => ({ ...current, [employeeId]: [checked, checked, checked, checked, checked] }));
    setDirty(true);
  };
  const updateColumn = (column: number | null, checked: boolean) => {
    visibleRows.forEach((row) => column === null ? updateAllVisibility(row.id, checked) : updateVisibility(row.id, column, checked));
  };
  const save = () => {
    window.localStorage.setItem(`ot-type-visibility:${companyId}`, JSON.stringify(visibility));
    setDirty(false);
  };

  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] tracking-[-0.1px] text-black/65";
  const overtimeColumns = [
    { label: "เปิดโอทีทั้งหมด", column: null },
    { label: "โอทีล่วงเวลา (x1.0)", column: 0 },
    { label: "โอทีล่วงเวลา (x1.5)", column: 1 },
    { label: "โอทีวันหยุด (x2.0)", column: 2 },
    { label: "โอทีล่วงเวลาวันหยุด (x3.0)", column: 3 },
  ];
  const isColumnChecked = (column: number | null) => visibleRows.length > 0 && visibleRows.every((row) => column === null ? visibility[row.id]?.every(Boolean) : visibility[row.id]?.[column]);

  return (
    <Card data-ot-type-visibility className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}>
      <CardInputHeader title="ตั้งค่าการมองเห็นประเภทโอที" />
      <style>{`
        [data-ot-type-visibility] .ot-visibility-table table { min-width: 2450px !important; border-collapse: separate; border-spacing: 0; }
        [data-ot-type-visibility] .ot-visibility-table thead tr,
        [data-ot-type-visibility] .ot-visibility-table thead th { height: 76.8px !important; vertical-align: middle !important; }
        [data-ot-type-visibility] .ot-visibility-table tbody tr { height: 38.8px; }
        [data-ot-type-visibility] .ot-visibility-table { border: 0.8px solid #d9d9d9; }
        [data-ot-type-visibility] .ot-visibility-table tbody td { color: rgba(0, 0, 0, 0.65); }
        [data-ot-type-visibility] .ot-visibility-table thead th > div {
          display: block; min-height: 0; font-weight: 500; line-height: 22.001px;
        }
        [data-ot-type-visibility] .ot-visibility-table thead th > div > span { display: block; }
        [data-ot-type-visibility] .ot-visibility-table thead th > div > label {
          display: inline-block; margin-top: 0; line-height: 14px; transform: translateY(-1.6875px);
        }
        [data-ot-type-visibility] nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นประเภทโอที"] {
          padding: 16px 4px 16px 16px;
        }
        [data-ot-type-visibility] nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นประเภทโอที"] > span {
          color: rgba(0, 0, 0, 0.65); font-weight: 500; line-height: 30px;
        }
        [data-ot-type-visibility] .ot-visibility-table thead th:nth-child(2) {
          position: sticky; left: 80px; z-index: 2;
        }
        [data-ot-type-visibility] .ot-visibility-table thead th:nth-child(2) svg {
          position: absolute; top: 32px; right: 7.8px; display: inline-block; margin: 0; vertical-align: baseline;
        }
        [data-ot-type-visibility] .ot-visibility-table tbody td:nth-child(2) {
          position: sticky; left: 80px; z-index: 1;
        }
        [data-ot-type-visibility] .ot-visibility-table input[type="checkbox"] {
          appearance: none; width: 16px; height: 16px; margin: 0; border: 1px solid #d9d9d9;
          border-radius: 2px; background: #fff; vertical-align: middle;
        }
        [data-ot-type-visibility] .ot-visibility-table input[type="checkbox"]:checked {
          border-color: #1890ff; background: #1890ff url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.1 6.1 4.7 8.6 9.9 3.4' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
        }
        [data-ot-type-visibility] nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นประเภทโอที"]::before,
        [data-ot-type-visibility] nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นประเภทโอที"]::after {
          content: ""; display: block; width: 32px; height: 32px; opacity: .25; background: center / 12px 12px no-repeat;
        }
        [data-ot-type-visibility] nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นประเภทโอที"]::before {
          margin-right: 8px; background-image: url("data:image/svg+xml,%3Csvg viewBox='64 64 896 896' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000' d='M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8a31.86 31.86 0 0 0 0 50.3l450.8 352.1c5.3 4.1 12.9.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.1-12.6l-360-281 360-281.1c3.8-3 6.1-7.7 6.1-12.6z'/%3E%3C/svg%3E");
        }
        [data-ot-type-visibility] nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นประเภทโอที"]::after {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='64 64 896 896' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000' d='M765.7 486.8 314.9 134.7A7.97 7.97 0 0 0 302 141v77.3c0 4.9 2.3 9.6 6.1 12.6l360 281.1-360 281.1c-3.9 3-6.1 7.7-6.1 12.6V883c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.96 31.96 0 0 0 0-50.4z'/%3E%3C/svg%3E");
        }
      `}</style>
      <CardContent className="card-input-body px-2 py-4">
        <div className="flex flex-col divide-y divide-black/[0.12] lg:flex-row lg:divide-x lg:divide-y-0">
          <section className="m-6 flex min-w-0 flex-1 gap-2 py-2 pr-0 lg:pr-6">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span>
            <div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="mb-2 flex items-end gap-2"><label className="min-w-0 flex-[0_1_40%] text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">โครงสร้างองค์กร<select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><div className="flex-[0_1_20%]"><label className="block text-sm leading-[22px]">&nbsp;</label><button type="button" className="h-9 max-w-[100px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button></div></div></div>
          </section>
          <section className="m-6 flex min-w-0 flex-1 gap-2 py-2 pl-0 lg:pl-6">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span>
            <div className="m-2 flex-1"><h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">นำเข้าข้อมูล</h2><div className="m-1 flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-[rgba(0,0,0,0.87)] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 truncate text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div>
          </section>
        </div>
        <div className="my-6 border-t border-black/[0.12]" />
        <section className="m-6">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={controlClass} /></label><button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button></div>
          <div className="ot-visibility-table overflow-hidden rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><div className="max-h-[60vh] overflow-auto"><Table className="table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{[80, 250, 180, 180, 180, 180, ...Array(5).fill(280)].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง"].map((column) => <TableHead key={column} className={cn("border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white", column === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{column}{column === "ชื่อพนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-3 align-[-1px] fill-[rgba(0,0,0,0.54)]"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6ZM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4Z" /></svg>}</TableHead>)}{overtimeColumns.map(({ label, column }) => <TableHead key={label} className="border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 align-bottom text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white"><div className="flex min-h-20 flex-col justify-between text-sm font-normal leading-[19.6px]"><span>{label}</span><label className="mt-2 inline-flex justify-center"><input type="checkbox" checked={isColumnChecked(column)} onChange={(event) => updateColumn(column, event.target.checked)} aria-label={`เลือก${label}ทั้งหมด`} /></label></div></TableHead>)}</TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={11} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={11} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("border-b-0 bg-white hover:bg-white", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell><TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell><TableCell className={`${cellClass} text-center`}><input type="checkbox" checked={visibility[row.id]?.every(Boolean) ?? true} onChange={(event) => updateAllVisibility(row.id, event.target.checked)} aria-label={`เปิดโอทีทั้งหมดของ ${row.name}`} /></TableCell>{[0, 1, 2, 3].map((column) => <TableCell key={column} className={`${cellClass} text-center`}><input type="checkbox" checked={visibility[row.id]?.[column] ?? true} onChange={(event) => updateVisibility(row.id, column, event.target.checked)} aria-label={`ตั้งค่าโอทีของ ${row.name}`} /></TableCell>)}</TableRow>)}</TableBody></Table></div>{!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าตั้งค่าการมองเห็นประเภทโอที"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}</div>
          <p className="mt-0 text-sm leading-[22.001px] tracking-[-0.1px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><div className="mt-3 flex justify-end"><button type="button" onClick={save} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{dirty ? "บันทึก" : "บันทึก"}</button></div>
        </section>
      </CardContent>
    </Card>
  );
}

function LeaveTypeVisibilityContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const leaveTypes = ["ลากิจพิเศษ", "ลากิจธุระส่วนตัว", "ลาป่วย", "ลาพักร้อน"];
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [filters, setFilters] = useState({ name: "", organizationId: "", position: "", hashtag: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ view: "basic" });
        if (companyId) params.set("companyId", companyId);
        const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("load failed");
        const data = (await response.json()) as { employees: BasicEmployeeRow[] };
        const saved = JSON.parse(window.localStorage.getItem(`leave-type-visibility:${companyId}`) ?? "{}") as Record<string, boolean[]>;
        if (cancelled) return;
        setRows(data.employees);
        setVisibility(Object.fromEntries(data.employees.map((employee) => [
          employee.id,
          Array.isArray(saved[employee.id]) && saved[employee.id].length === leaveTypes.length ? saved[employee.id] : Array(leaveTypes.length).fill(true),
        ])));
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId, leaveTypes.length]);

  const positionOptions = useMemo(() => [...new Set(rows.map((row) => row.position).filter(Boolean))], [rows]);
  const visibleRows = useMemo(() => {
    const name = appliedFilters.name.trim().toLocaleLowerCase();
    const hashtag = appliedFilters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return rows.filter((row) =>
      (!name || `${row.employeeCode} ${row.name}`.toLocaleLowerCase().includes(name)) &&
      (!appliedFilters.organizationId || row.organizationIds.includes(appliedFilters.organizationId)) &&
      (!appliedFilters.position || row.position === appliedFilters.position) &&
      (!hashtag || row.hashtag.toLocaleLowerCase().includes(hashtag)),
    );
  }, [appliedFilters, rows]);

  const updateVisibility = (employeeId: string, column: number, checked: boolean) => {
    setVisibility((current) => ({
      ...current,
      [employeeId]: (current[employeeId] ?? Array(leaveTypes.length).fill(true)).map((value, index) => index === column ? checked : value),
    }));
    setDirty(true);
  };
  const setEmployeeVisibility = (employeeId: string, checked: boolean) => {
    setVisibility((current) => ({ ...current, [employeeId]: Array(leaveTypes.length).fill(checked) }));
    setDirty(true);
  };
  const setColumnVisibility = (column: number | null, checked: boolean) => {
    setVisibility((current) => ({ ...current, ...Object.fromEntries(visibleRows.map((row) => [
      row.id,
      column === null
        ? Array(leaveTypes.length).fill(checked)
        : (current[row.id] ?? Array(leaveTypes.length).fill(true)).map((value, index) => index === column ? checked : value),
    ])) }));
    setDirty(true);
  };
  const columnChecked = (column: number | null) => visibleRows.length > 0 && visibleRows.every((row) => column === null ? visibility[row.id]?.every(Boolean) : visibility[row.id]?.[column]);
  const save = () => {
    window.localStorage.setItem(`leave-type-visibility:${companyId}`, JSON.stringify(visibility));
    setDirty(false);
  };

  const controlClass = "h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const headClass = "!h-[76.8px] normal-case !tracking-[-0.1px] border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] tracking-[-0.1px] text-black/65";

  return (
    <Card data-leave-type-visibility className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}>
      <CardInputHeader title="ตั้งค่าการมองเห็นประเภทการลา" />
      <CardContent className="card-input-body px-2 py-4">
        <style>{`
          [data-leave-type-visibility] .leave-visibility-table table {
            width: 2450px !important;
            min-width: 2450px !important;
            border-collapse: separate;
            border-spacing: 0;
          }
          [data-leave-type-visibility] .leave-visibility-table thead tr,
          [data-leave-type-visibility] .leave-visibility-table thead th {
            height: 76.8px !important;
            vertical-align: middle !important;
          }
          [data-leave-type-visibility] .leave-visibility-table tbody tr,
          [data-leave-type-visibility] .leave-visibility-table tbody td {
            height: 38.8px !important;
          }
          [data-leave-type-visibility] .leave-visibility-table tbody tr {
            border-bottom-width: 0 !important;
          }
          [data-leave-type-visibility] .leave-visibility-table input[type="checkbox"] {
            appearance: none;
            width: 16px;
            height: 16px;
            margin: 0;
            border: 1px solid #d9d9d9;
            border-radius: 2px;
            background: #fff;
            vertical-align: middle;
          }
          [data-leave-type-visibility] .leave-visibility-table input[type="checkbox"]:checked {
            border-color: #1890ff;
            background: #1890ff url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.1 6.1 4.7 8.6 9.9 3.4' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
          }
        `}</style>
        <div className="flex flex-col divide-y divide-black/[0.12] lg:flex-row lg:divide-x lg:divide-y-0">
          <section className="m-6 flex min-w-0 flex-1 gap-2 py-2 pr-0 lg:pr-6"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">1</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="mb-2 flex items-end gap-2"><label className="min-w-0 flex-[0_1_40%] text-sm leading-[22px]">โครงสร้างองค์กร<select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button type="button" className="h-9 max-w-[100px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button></div></div></section>
          <section className="m-6 flex min-w-0 flex-1 gap-2 py-2 pl-0 lg:pl-6"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">2</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล</h2><div className="flex h-8 items-center text-sm"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 text-black/65">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div></section>
        </div>
        <div className="my-6 border-t border-black/[0.12]" />
        <section className="m-6">
          <div className="mb-2 grid gap-2 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end"><label className="text-sm leading-[22px]">ชื่อพนักงาน<input value={filters.name} onChange={(event) => setFilters((current) => ({ ...current, name: event.target.value }))} placeholder="ค้นหาชื่อพนักงาน..." className={controlClass} /></label><label className="text-sm leading-[22px]">โครงสร้างองค์กร<select value={filters.organizationId} onChange={(event) => setFilters((current) => ({ ...current, organizationId: event.target.value }))} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="text-sm leading-[22px]">โครงสร้างตำแหน่ง<select value={filters.position} onChange={(event) => setFilters((current) => ({ ...current, position: event.target.value }))} className={controlClass}><option value="">โครงสร้างตำแหน่ง</option>{positionOptions.map((position) => <option key={position}>{position}</option>)}</select></label><label className="text-sm leading-[22px]">Hashtag<input value={filters.hashtag} onChange={(event) => setFilters((current) => ({ ...current, hashtag: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") setAppliedFilters(filters); }} placeholder="#Hashtag" className={controlClass} /></label><button type="button" onClick={() => setAppliedFilters(filters)} className="h-9 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ค้นหา</button></div>
          <div className="leave-visibility-table overflow-hidden border-[0.8px] border-[#d9d9d9] shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><div className="max-h-[60vh] overflow-auto"><Table className="w-[2450px] min-w-[2450px] table-fixed text-sm"><colgroup>{[80, 250, 180, 180, 180, 180, ...Array(5).fill(280)].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader className="sticky top-0 z-10"><TableRow className="!h-[76.8px] border-b-0 bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง"].map((column) => <TableHead key={column} className={cn(headClass, column === "ชื่อพนักงาน" && "sticky left-[80px] z-20 shadow-[4px_0_20px_-8px_rgba(0,0,0,0.25)]")}>{column}{column === "ชื่อพนักงาน" && <Search className="ml-1 inline size-3 align-[-1px]" />}</TableHead>)}{["เปิด/ปิดทั้งหมด", ...leaveTypes].map((label, index) => <TableHead key={label} className={headClass}><div className="flex min-h-12 flex-col justify-between"><span>{label}</span><input type="checkbox" checked={columnChecked(index === 0 ? null : index - 1)} onChange={(event) => setColumnVisibility(index === 0 ? null : index - 1, event.target.checked)} aria-label={`เลือก${label}ทั้งหมด`} className="mx-auto size-4" /></div></TableHead>)}</TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={11} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={11} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[38.8px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell><TableCell className={cn(cellClass, "sticky left-[80px] z-10 shadow-[4px_0_20px_-8px_rgba(0,0,0,0.25)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell><TableCell className={`${cellClass} text-center`}><input type="checkbox" checked={visibility[row.id]?.every(Boolean) ?? true} onChange={(event) => setEmployeeVisibility(row.id, event.target.checked)} aria-label={`เปิดหรือปิดประเภทการลาทั้งหมดของ ${row.name}`} className="size-4" /></TableCell>{leaveTypes.map((type, column) => <TableCell key={type} className={`${cellClass} text-center`}><input type="checkbox" checked={visibility[row.id]?.[column] ?? true} onChange={(event) => updateVisibility(row.id, column, event.target.checked)} aria-label={`แสดง${type}สำหรับ ${row.name}`} className="size-4" /></TableCell>)}</TableRow>)}</TableBody></Table></div><div className="flex items-center justify-between border-t border-[#f0f0f0] px-4 py-2"><span className="text-sm text-black/65">หมายเหตุ: รายการนี้จะแสดงเฉพาะประเภทการลาที่เปิดใช้งานเท่านั้น และยกเว้นประเภทการลาที่มีรหัสอ้างอิง 09</span><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] text-sm text-[#1890ff]">1</span></div></div>
          <p className="mt-2 text-sm leading-[22px] text-red-600">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><div className="mt-3 flex justify-end"><button type="button" onClick={save} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{dirty ? "บันทึก" : "บันทึก"}</button></div>
        </section>
        <div className="mx-6 border-t border-black/[0.12]" />
        <section className="m-6"><h2 className="sub-header mb-2 text-lg font-medium">ประวัติการนำเข้าตั้งค่าการมองเห็นประเภทการลา</h2><div className="overflow-x-auto border border-[#f0f0f0]"><Table className="min-w-[720px] table-fixed text-sm"><TableHeader><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ลบข้อมูล", "ข้อมูลผิดพลาด", ""].map((column, index) => <TableHead key={index} className={headClass}>{column}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow><TableCell colSpan={7} className="h-28 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div></section>
      </CardContent>
    </Card>
  );
}

function HashtagSettingsContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic" });
      if (companyId) params.set("companyId", companyId);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[] };
      setRows(data.employees);
      setDirtyIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const visibleRows = useMemo(() => {
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
      return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
    });
  }, [filters, rows]);

  const updateHashtag = (id: string, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, hashtag: value } : row));
    setDirtyIds((current) => new Set(current).add(id));
    setSaveState("idle");
  };

  const save = async () => {
    const changedRows = rows.filter((row) => dirtyIds.has(row.id));
    if (changedRows.length === 0) return;
    setSaveState("saving");
    try {
      await saveEmployeeBatch(changedRows, ["hashtag"]);
      setDirtyIds(new Set());
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  };

  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const tableInputClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] tracking-normal text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const headClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";

  return (
    <Card
      className="card-input-container relative mx-4 mb-0 overflow-hidden rounded-lg border-0 bg-white text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
      >
      <CardInputHeader title="ตั้งค่า Hashtag" />
      <CardContent className="card-input-body px-2 pt-4 pb-[6px] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]">
        <div className="mx-6 mt-6 mb-0">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}>
                <option value="">โครงสร้างองค์กร</option>
                {organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag
              <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={controlClass} />
            </label>
            <button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button>
          </div>

          <div className="fix-column-table hashtag-settings-table overflow-hidden rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)] [&>div]:h-[466px] [&>div]:border-[0.8px] [&>div]:border-[#f0f0f0]">
            <Table className="min-w-[1180px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
              <colgroup>{[80, 250, 150, 150, 150, 150, 250].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]"><TableHead className={headClass}>ลำดับ</TableHead><TableHead className={cn(headClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>ชื่อพนักงาน <Search className="ml-1 inline size-3 align-[-1px]" /></TableHead>{(["แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง", "Hashtag"] as const).map((column) => <TableHead key={column} className={headClass}>{column}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{loading ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[48.8px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell><TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell><TableCell className={cellClass}><input value={row.hashtag} onChange={(event) => updateHashtag(row.id, event.target.value)} placeholder="#Hashtag" className={tableInputClass} aria-label={`Hashtag ของ ${row.name}`} /></TableCell></TableRow>)}</TableBody>
            </Table>
            {!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าตั้งค่า Hashtag"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}
          </div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => void save()} disabled={saveState === "saving" || dirtyIds.size === 0} className="h-[36.65px] min-w-[64px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:opacity-60">{saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก"}</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function WelfareSettingsContent({ orgTree }: { orgTree: OrgNode[] }) {
  const importFileRef = useRef<HTMLInputElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [templateWelfareType, setTemplateWelfareType] = useState("");
  const [balanceYear, setBalanceYear] = useState("");
  const [importYear, setImportYear] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [year, setYear] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [welfareType, setWelfareType] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [saved, setSaved] = useState(false);

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      options.push({ id: node.id, label: `${"\u00a0\u00a0".repeat(depth)}${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);
  const years = useMemo(() => Array.from({ length: 11 }, (_, index) => String(2565 + index)), []);
  const welfareTypes = ["ค่ารักษาพยาบาล", "ค่าเดินทาง", "ค่าอาหาร", "สวัสดิการอื่น ๆ"];
  const controlClass = "mt-0.5 h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/85 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)] disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-black/25";
  const headClass = "h-[54.8px] border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white";
  const canDownload = Boolean(templateOrganizationId && templateWelfareType);
  const canSelectFile = Boolean(importYear);
  const canSearch = Boolean(year && welfareType);
  const yearSelect = (value: string, onChange: (value: string) => void, placeholder: string, testId?: string) => (
    <select data-testid={testId} value={value} onChange={(event) => { onChange(event.target.value); setSaved(false); }} className={controlClass}>
      <option value="">{placeholder}</option>
      {years.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );

  return (
    <Card
      data-welfare-settings
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="ตั้งค่าสวัสดิการ" />
      <style>{`
        [data-welfare-settings] .card-input-body {
          color: rgba(0, 0, 0, 0.87);
          font-family: Kanit, sans-serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.1px;
          line-height: 22.001px;
        }
        [data-welfare-settings] .welfare-main-table {
          width: calc(100% + 3.2px);
          overflow: hidden;
          border: 0;
          border-top: 0.8px solid #f0f0f0;
          border-left: 0.8px solid #f0f0f0;
          border-radius: 2px;
          background: #fff;
          box-shadow: 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12);
        }
        [data-welfare-settings] .welfare-history-table {
          width: calc(100% + 3.2px);
          overflow: hidden;
          border: 0.8px solid #f0f0f0;
          border-radius: 2px;
          background: #fff;
          box-shadow: 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12);
        }
        [data-welfare-settings] .welfare-main-table > div,
        [data-welfare-settings] .welfare-history-table > div {
          overflow: visible;
        }
        [data-welfare-settings] .welfare-main-table table {
          width: 100%;
          min-width: 0;
          table-layout: auto;
          border-collapse: separate;
          border-spacing: 0;
          color: rgba(0, 0, 0, 0.65);
          font-family: Kanit, sans-serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.1px;
          line-height: 22.001px;
        }
        [data-welfare-settings] .welfare-history-table table {
          width: calc(100% + 0.8px);
          min-width: 0;
          table-layout: auto;
          color: rgba(0, 0, 0, 0.65);
          font-family: Kanit, sans-serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.1px;
          line-height: 22.001px;
        }
        [data-welfare-settings] .welfare-main-table thead tr {
          height: 98.8px;
          background: #61a8ff;
        }
        [data-welfare-settings] .welfare-main-table th,
        [data-welfare-settings] .welfare-history-table th {
          height: auto;
          padding: 16px;
          border: 0;
          border-right: 0.8px solid #f0f0f0;
          border-bottom: 0.8px solid #f0f0f0;
          background: transparent;
          color: #fff;
          font-family: Kanit, sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.1px;
          line-height: 22.001px;
          text-align: center;
          text-transform: none;
          vertical-align: middle;
        }
        [data-welfare-settings] .welfare-main-table td,
        [data-welfare-settings] .welfare-history-table td {
          border: 0;
          border-right: 0.8px solid #f0f0f0;
          border-bottom: 0.8px solid #f0f0f0;
          letter-spacing: -0.1px;
        }
        [data-welfare-settings] .welfare-main-table .welfare-empty-cell {
          height: 150.8px;
          padding: 8px;
          background: #fff;
          color: rgba(0, 0, 0, 0.65);
          font-family: Kanit, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 22.001px;
        }
        [data-welfare-settings] .welfare-main-table .welfare-empty-description,
        [data-welfare-settings] .welfare-history-table .welfare-empty-description {
          margin: 0;
          color: rgba(0, 0, 0, 0.25);
          font-family: Kanit, sans-serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.1px;
          line-height: 22px;
        }
        [data-welfare-settings] .welfare-history-title {
          margin: 0;
          color: rgba(0, 0, 0, 0.87);
          font-family: Kanit, sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.1px;
          line-height: 28.287px;
        }
        [data-welfare-settings] .welfare-section-divider {
          margin: 12px 0;
        }
        [data-welfare-settings] .welfare-template-fields > label > select {
          margin-top: 8px;
        }
        [data-welfare-settings] .welfare-template-fields > .grid select {
          margin-top: 0;
        }
      `}</style>
      <CardContent className="card-input-body px-2 py-4 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]">
        <div className="welfare-import-panel flex min-h-[276.1875px] flex-col divide-y divide-black/[0.12] lg:flex-row lg:divide-x lg:divide-y-0">
          <section className="m-6 flex min-w-0 flex-1 flex-col">
            <span className="import-no mb-4 flex size-10 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span>
            <div className="min-w-0 flex-1">
              <h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2>
              <div className="welfare-template-fields mb-2 flex flex-col gap-2">
                <label className="text-sm leading-[22px]">โครงสร้างองค์กร <span className="text-red-600">*</span>
                  <select value={templateOrganizationId} onChange={(event) => { setTemplateOrganizationId(event.target.value); setSaved(false); }} className={controlClass}>
                    <option value="">โครงสร้างองค์กร</option>
                    {organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <label className="text-sm leading-[22px]">ประเภทสวัสดิการ <span className="text-red-600">*</span>
                    <select value={templateWelfareType} onChange={(event) => { setTemplateWelfareType(event.target.value); setSaved(false); }} className={controlClass}>
                      <option value="">ประเภทสวัสดิการ</option>
                      {welfareTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="text-sm leading-[22px]">ดึงยอดคงเหลือ
                    {yearSelect(balanceYear, setBalanceYear, "เลือกปี")}
                  </label>
                  <button type="button" disabled={!canDownload} onClick={() => setSaved(false)} className="h-9 max-w-[100px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:bg-[#bfbfbf]">ดาวน์โหลด</button>
                </div>
              </div>
            </div>
          </section>

          <section className="m-6 flex min-w-0 flex-1 flex-col">
            <span className="import-no mb-4 flex size-10 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span>
            <div className="min-w-0">
              <h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล</h2>
              <div className="flex gap-2">
                <label className="min-w-0 flex-1 text-sm leading-[22px]">ปี <span className="text-red-600">*</span>
                  {yearSelect(importYear, setImportYear, "กรุณาเลือกปี", "wcl-import-year-picker")}
                </label>
                <div className="flex min-w-0 flex-1 flex-col justify-end pb-0.5">
                  <button data-testid="wcl-import-select-file-btn" type="button" disabled={!canSelectFile} onClick={() => importFileRef.current?.click()} className="h-9 w-fit rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:bg-[#f5f5f5] disabled:text-black/25">เลือกไฟล์</button>
                  {importFileName && <span className="mt-1 truncate text-xs leading-4 text-black/65">{importFileName}</span>}
                  <input ref={importFileRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => { setImportFileName(event.target.files?.[0]?.name ?? ""); setSaved(false); }} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="welfare-section-divider border-t border-black/[0.12]" />
        <div className="m-6 mb-0">
          <div className="mb-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
            <label className="text-sm leading-[22px]">ปี <span className="text-red-600">*</span>
              {yearSelect(year, setYear, "เลือกปี")}
            </label>
            <label className="text-sm leading-[22px]">โครงสร้างองค์กร
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}>
                <option value="">โครงสร้างองค์กร</option>
                {organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-sm leading-[22px]">ประเภทสวัสดิการ <span className="text-red-600">*</span>
              <select data-testid="wcl-bulk-type-select" value={welfareType} onChange={(event) => { setWelfareType(event.target.value); setSaved(false); }} className={controlClass}>
                <option value="">ประเภทสวัสดิการ</option>
                {welfareTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-sm leading-[22px]">Hashtag
              <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && canSearch) setHasSearched(true); }} placeholder="#Hashtag" className={controlClass} />
            </label>
            <button data-testid="wcl-bulk-search-btn" type="button" disabled={!canSearch} onClick={() => { setHasSearched(true); setSaved(false); }} className="h-9 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:bg-[#bfbfbf]">ค้นหา</button>
          </div>

          <div className="welfare-main-table">
            <Table className="table-auto text-sm leading-[22.001px]">
              <colgroup>{[8, 15, 12, 12, 12, 10, 10, 10, 10, 10, 10].map((width, index) => <col key={index} style={{ width: `${width}%`, minWidth: `${width}%` }} />)}</colgroup>
              <TableHeader><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "พนักงาน", "บริษัท", "แผนก", "ตำแหน่ง", "ยกมา", "วงเงิน", "วงเงินต่อฉบับ", "ใช้ไป", "คงเหลือ", ""].map((header, index) => <TableHead key={`${header}-${index}`} className={headClass}>{header}{header === "พนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-[14px] align-[-2px] fill-current"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4Z" /></svg>}{header === "วงเงินต่อฉบับ" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-[14px] align-[-2px] fill-current"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" /><path d="M464 336a48 48 0 1096 0 48 48 0 10-96 0zm72 112h-48c-4.4 0-8 3.6-8 8v272c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V456c0-4.4-3.6-8-8-8z" /></svg>}</TableHead>)}</TableRow></TableHeader>
              <TableBody><TableRow className="hover:bg-transparent"><TableCell colSpan={11} className="welfare-empty-cell text-center"><div className="flex flex-col items-center justify-center"><svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fillRule="nonzero" fill="#fafafa"><path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" /></g></g></svg><p className="welfare-empty-description">ไม่มีข้อมูล</p></div></TableCell></TableRow></TableBody>
            </Table>
          </div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-4 flex justify-end"><button type="button" onClick={() => setSaved(true)} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{saved ? "บันทึกแล้ว" : "บันทึก"}</button></div>
        </div>

        <div className="mt-[11px] border-t border-black/[0.12]" />
        <section className="m-6 mt-[13px]">
          <div className="welfare-history-title">ประวัติการนำเข้าข้อมูลสวัสดิการ</div>
          <div className="welfare-history-table mt-[0.8px] max-h-[60vh] overflow-auto">
            <Table id="tbl-history-welfare-import" className="table-fixed text-sm leading-[22.001px]">
              <colgroup>{[8, 15, 15, 10, 10, 10, 10, 10].map((width, index) => <col key={index} style={{ width: `${width}%`, minWidth: `${width}%` }} />)}</colgroup>
              <TableHeader className="sticky top-0 z-10"><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "File", "วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ข้อมูลผิดพลาด", "Log"].map((header) => <TableHead key={header} className={headClass}>{header}</TableHead>)}</TableRow></TableHeader>
              <TableBody><TableRow className="h-[150.8px] hover:bg-transparent"><TableCell colSpan={8} className="text-center"><div className="flex flex-col items-center justify-center"><svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fillRule="nonzero" fill="#fafafa"><path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-1.913v-.007z" /></g></g></svg><p className="welfare-empty-description">ไม่มีข้อมูล</p></div></TableCell></TableRow></TableBody>
            </Table>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function HistoricalSavingsContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingsHeaderScrollRef = useRef<HTMLDivElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [taxYear, setTaxYear] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      options.push({ id: node.id, label: `${"\u00a0\u00a0".repeat(depth)}${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic" });
      if (companyId) params.set("companyId", companyId);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[] };
      setRows(data.employees);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const visibleRows = useMemo(() => {
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
      return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
    });
  }, [filters, rows]);

  const updateValue = (employeeId: string, field: string, value: string) => {
    setSaved(false);
    setValues((current) => ({ ...current, [employeeId]: { ...current[employeeId], [field]: value } }));
  };

  const controlClass = "mt-0.5 h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/85 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const numberShellClass = "h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white";
  const numberInputClass = "h-[30px] w-full rounded-[2px] border-0 bg-transparent px-[11px] text-right text-sm font-normal leading-[16.1px] tracking-normal text-[rgba(0,0,0,0.65)] outline-none";
  const head = "h-[76.8px] border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 align-middle text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white";
  const cell = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]";
  const savingsFields = [
    ["income", "รายได้"],
    ["socialSecurity", "ประกันสังคม"],
    ["tax", "ภาษี"],
    ["providentFund", "กองทุนสำรองเลี้ยงชีพ"],
    ["providentFundCompany", "กองทุนสำรองเลี้ยงชีพ (บริษัทสมทบ)"],
    ["providentFund2", "กองทุนสำรองเลี้ยงชีพ 2"],
    ["providentFundCompany2", "กองทุนสำรองเลี้ยงชีพ (บริษัทสมทบ) 2"],
    ["providentFund3", "กองทุนสำรองเลี้ยงชีพ 3"],
    ["providentFundCompany3", "กองทุนสำรองเลี้ยงชีพ (บริษัทสมทบ) 3"],
  ] as const;

  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="เงินสะสมย้อนหลัง" />
      <CardContent className="card-input-body px-2 py-4">
        <div className="flex flex-col lg:flex-row">
          <section className="flex flex-1 gap-2 px-6 py-4 lg:pr-6">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span>
            <div className="m-2 min-w-0 flex-1">
              <h2 className="h-10 text-lg font-bold leading-10 text-black/87">ดาวน์โหลดเทมเพลต (*.xlsx)</h2>
              <div className="flex items-end gap-2">
                <label className="min-w-0 flex-[0_1_70%] text-sm leading-[22px] text-black/87">โครงสร้างองค์กร
                  <select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}>
                    <option value="">โครงสร้างองค์กร</option>
                    {organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => setSaved(false)} className="h-9 shrink-0 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button>
              </div>
            </div>
          </section>
          <section className="flex flex-1 gap-2 px-6 py-4 lg:pl-6">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span>
            <div className="m-2 min-w-0 flex-1">
              <h2 className="h-10 text-lg font-bold leading-10 text-black/87">นำเข้าข้อมูล</h2>
              <div className="flex items-center text-sm leading-[22.001px] text-black/65">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button>
                <span className="ml-2 truncate">{fileName || "ยังไม่ได้เลือกไฟล์"}</span>
                <input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => { setFileName(event.target.files?.[0]?.name ?? ""); setSaved(false); }} />
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-black/[0.12]" />
        <div className="m-6">
          <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end">
            <label className="flex-1 text-sm leading-[22.001px] text-black/85">ปีภาษี <span className="text-red-600">*</span>
              <input value={taxYear} onChange={(event) => { setTaxYear(event.target.value.replace(/[^0-9]/g, "")); setSaved(false); }} inputMode="numeric" maxLength={4} placeholder="เลือกวันที่" className={controlClass} aria-label="ปีภาษี" />
            </label>
            <label className="flex-1 text-sm leading-[22.001px] text-black/85">โครงสร้างองค์กร
              <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}>
                <option value="">โครงสร้างองค์กร</option>
                {organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex-1 text-sm leading-[22.001px] text-black/85">Hashtag
              <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={controlClass} />
            </label>
            <button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 shrink-0 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button>
          </div>

          <div className="fix-column-table overflow-hidden rounded-[8px] border-[0.8px] border-[#f0f0f0] bg-white font-[kanit] text-[14px] leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)] shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]">
            <div ref={savingsHeaderScrollRef} className="flex h-[76.8px] overflow-hidden">
              <Table className="min-w-[2570px] table-fixed font-[kanit] text-sm leading-[22.001px]">
                <colgroup>{[10, 20, 15, 15, 15, 15, ...Array(9).fill(14)].map((width, index) => <col key={index} style={{ width: `${width}%`, minWidth: `${width}%` }} />)}</colgroup>
                <TableHeader className="border-b-0 bg-[#61a8ff]"><TableRow className="border-b-0 bg-[#61a8ff] hover:bg-[#61a8ff]"><TableHead className={head}>ลำดับ</TableHead><TableHead className={cn(head, "sticky left-[118.975px] z-10 shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>ชื่อพนักงาน <Search className="ml-1 inline size-3 align-[-1px]" /></TableHead><TableHead className={head}>แผนก</TableHead><TableHead className={head}>ฝ่ายงาน</TableHead><TableHead className={head}>หน่วยงาน</TableHead><TableHead className={head}>ตำแหน่ง</TableHead>{savingsFields.map(([field, label]) => <TableHead key={field} className={head}>{label}</TableHead>)}</TableRow></TableHeader>
              </Table>
            </div>
            <div className="max-h-[60vh] overflow-scroll" onScroll={(event) => { if (savingsHeaderScrollRef.current) savingsHeaderScrollRef.current.scrollLeft = event.currentTarget.scrollLeft; }}>
              <Table className="min-w-[2570px] table-fixed font-[kanit] text-sm leading-[22.001px]">
                <colgroup>{[10, 20, 15, 15, 15, 15, ...Array(9).fill(14)].map((width, index) => <col key={index} style={{ width: `${width}%`, minWidth: `${width}%` }} />)}</colgroup>
                <TableBody>{loading ? <TableRow className="border-b-0"><TableCell colSpan={15} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow className="border-b-0"><TableCell colSpan={15} className="h-32 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cell} text-center`}>{index + 1}</TableCell><TableCell className={cn(cell, "sticky left-[118.975px] z-10 shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]", index % 2 === 0 ? "bg-[#f2fafe]" : "bg-white")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cell}>{row.department}</TableCell><TableCell className={cell}>{row.division}</TableCell><TableCell className={cell}>{row.unit}</TableCell><TableCell className={cell}>{row.position}</TableCell>{savingsFields.map(([field, label]) => <TableCell key={field} className={cell}><div className={numberShellClass}><input type="text" inputMode="decimal" value={values[row.id]?.[field] ?? "0.00"} onChange={(event) => updateValue(row.id, field, event.target.value)} aria-label={`${label} ${row.name}`} className={numberInputClass} /></div></TableCell>)}</TableRow>)}</TableBody>
              </Table>
            </div>
            {!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าเงินสะสมย้อนหลัง"><span className="flex size-8 items-center justify-center rounded-[2px] border-[0.8px] border-[#1890ff] bg-white text-sm leading-[30px] text-[#1890ff]">1</span></nav>}
          </div>
          <p className="mt-0 text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => setSaved(true)} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{saved ? "บันทึกแล้ว" : "บันทึก"}</button></div>
        </div>

        <div className="border-t border-black/[0.12]" />
        <section className="m-6">
          <h2 className="sub-header mb-3 text-lg font-bold leading-10 text-black/87">ประวัติการนำเข้าข้อมูล</h2>
          <div className="overflow-x-auto border border-[#f0f0f0]"><Table className="min-w-[720px] table-fixed text-sm leading-[22.001px]"><TableHeader><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{["วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ลบข้อมูล", "ข้อมูลผิดพลาด", ""].map((label, index) => <TableHead key={`${label}-${index}`} className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">{label}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow className="h-32 hover:bg-transparent"><TableCell colSpan={7} className="border border-[#f0f0f0] text-center text-sm text-black/45">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div>
        </section>
      </CardContent>
    </Card>
  );
}

function WorkInsuranceContent({ orgTree }: { orgTree: OrgNode[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [importMonth, setImportMonth] = useState("");
  const [fileName, setFileName] = useState("");
  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      options.push({ id: node.id, label: `${"\u00a0\u00a0".repeat(depth)}${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);
  const controlClass = "h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/85 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const historyColumns = ["วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ลบข้อมูล", "ข้อมูลผิดพลาด", ""];

  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="เงินประกันการทำงาน" />
      <CardContent className="card-input-body px-2 py-4 text-sm leading-[22.001px] text-[rgba(0,0,0,0.87)]">
        <div className="flex flex-col lg:flex-row">
          <section className="m-6 flex min-w-0 flex-1 flex-col">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span>
            <div className="m-2 min-w-0 flex-1">
              <h2 className="h-10 text-lg font-bold leading-10 text-black/87">ดาวน์โหลดเทมเพลต (*.xlsx)</h2>
              <div className="flex items-end gap-2">
                <label className="min-w-0 flex-[0_1_40%] text-sm leading-[22px] text-black/87">โครงสร้างองค์กร
                  <select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}>
                    <option value="">โครงสร้างองค์กร</option>
                    {organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <button type="button" className="h-9 shrink-0 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button>
              </div>
            </div>
          </section>
          <div className="hidden w-[17px] shrink-0 lg:flex"><div className="mx-2 h-full border-l border-black/[0.12]" /></div>
          <section className="m-6 flex min-w-0 flex-1 flex-col">
            <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span>
            <div className="m-2 min-w-0">
              <h2 className="h-10 text-lg font-bold leading-10 text-black/87">นำเข้าข้อมูล</h2>
              <div className="flex h-11 min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <ThaiMonthPicker value={importMonth} onChange={setImportMonth} className="h-[31.6px] min-w-0 flex-1 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/85 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" aria-label="เดือนที่นำเข้า" />
                <div className="flex min-w-0 flex-1 items-center text-sm leading-[22.001px] text-black/65">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 shrink-0 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button>
                  <span className="ml-2 truncate">{fileName || "ยังไม่ได้เลือกไฟล์"}</span>
                  <input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="my-3 border-t border-black/[0.12]" />
        <section className="mx-6 mb-6 mt-9">
          <div className="sub-header text-lg font-bold leading-[28.287px] text-[rgba(0,0,0,0.87)]">ประวัติการนำเข้าข้อมูล</div>
          <div className="overflow-x-auto border-[0.8px] border-[#f0f0f0]">
            <Table className="min-w-[720px] table-auto text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)]">
              <colgroup>{[15, 15, 15, 15, 15, 15, 10].map((width, index) => <col key={index} style={{ width: `${width}%`, minWidth: `${width}%` }} />)}</colgroup>
              <TableHeader><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{historyColumns.map((label, index) => <TableHead key={`${label}-${index}`} className="border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white">{label}</TableHead>)}</TableRow></TableHeader>
              <TableBody><TableRow className="h-[150.8px] hover:bg-transparent"><TableCell colSpan={7} className="border-r-[0.8px] border-[#f0f0f0] p-2"><div className="my-8 flex h-[70px] flex-col items-center gap-2 text-sm leading-[22px] text-[rgba(0,0,0,0.25)]"><svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" className="h-10" aria-hidden="true"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fillRule="nonzero" stroke="#d9d9d9"><path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" /></g></g></svg><span>ไม่มีข้อมูล</span></div></TableCell></TableRow></TableBody>
            </Table>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function EditDataSettingsContent() {
  const editOptions = [
    "แก้ไขรูปโปรไฟล์", "คำนำหน้าชื่อ", "ชื่อ", "นามสกุล", "ชื่อเล่น", "เพศ", "สัญชาติ", "สถานะ", "วันเกิด", "หมายเลขโทรศัพท์", "อีเมล", "ที่อยู่", "ครอบครัว", "ประวัติการทำงาน", "ประวัติการศึกษา", "ความสามารถพิเศษ", "ข้อมูลเอกสาร", "ลดหย่อนภาษี",
  ];
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="ตั้งค่าการแก้ไขข้อมูล" />
      <CardContent className="card-input-body px-2 py-4 text-sm leading-[22.001px] text-[rgba(0,0,0,0.87)]">
        <div className="m-6">
          <div className="max-h-[760px] overflow-y-auto rounded-[2px] border-[0.8px] border-[#f0f0f0]">
            <Table className="table-fixed text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)]">
              <colgroup><col className="w-[120px]" /><col /></colgroup>
              <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] border-b-0 bg-[#61a8ff] hover:bg-[#61a8ff]"><TableHead className="border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white">เปิด/ปิด</TableHead><TableHead className="border-b-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white">รายการ</TableHead></TableRow></TableHeader>
              <TableBody>{editOptions.map((option) => {
                const checked = enabled[option] ?? false;
                return <TableRow key={option} className="h-[54.8px] border-b-[0.8px] border-[#f0f0f0] hover:bg-transparent"><TableCell className="border-r-[0.8px] border-[#f0f0f0] p-4 text-center"><button type="button" role="switch" aria-checked={checked} aria-label={`${checked ? "ปิด" : "เปิด"} ${option}`} onClick={() => setEnabled((current) => ({ ...current, [option]: !checked }))} className={`relative inline-flex h-[22px] w-11 shrink-0 items-center rounded-full text-[12px] leading-[22px] text-white transition-colors ${checked ? "justify-start bg-[#1890ff]" : "justify-end bg-black/25"}`}><span className="absolute size-[18px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" style={{ left: checked ? "24px" : "2px" }} /><span className={`relative mx-[7px] ${checked ? "mr-auto" : "ml-auto"}`}>{checked ? "Y" : "N"}</span></button></TableCell><TableCell className="p-4 text-left text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)]">{option}</TableCell></TableRow>;
              })}</TableBody>
            </Table>
          </div>
          <div className="mt-3 flex justify-end"><button type="button" className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">บันทึก</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function GeneralSettingsContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  type SettingKey = "workDays" | "workHours" | "payrollCycle" | "specialCycle" | "otCycle" | "timeCycle" | "holiday" | "accounting" | "notify";
  type EmployeeSettings = Record<SettingKey, string>;
  const defaults: EmployeeSettings = { workDays: "0", workHours: "00:00:00", payrollCycle: "Full", specialCycle: "Y", otCycle: "N", timeCycle: "N", holiday: "Y", accounting: "", notify: "ยึดตามการตั้งค่าทั่วไป" };
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [payrollFilter, setPayrollFilter] = useState("ทั้งหมด");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, EmployeeSettings>>({});
  const [saved, setSaved] = useState(false);
  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      options.push({ id: node.id, label: `${"\u00a0\u00a0".repeat(depth)}${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ view: "basic" });
        if (companyId) params.set("companyId", companyId);
        const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("load failed");
        const data = (await response.json()) as { employees: BasicEmployeeRow[] };
        if (!cancelled) setRows(data.employees);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId]);
  const valueOf = (employeeId: string, key: SettingKey) => settings[employeeId]?.[key] ?? defaults[key];
  const setValue = (employeeId: string, key: SettingKey, value: string) => {
    setSaved(false);
    setSettings((current) => ({ ...current, [employeeId]: { ...defaults, ...current[employeeId], [key]: value } }));
  };
  const controlClass = "mt-0.5 h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/85 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const head = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 align-middle text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white";
  const cell = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] tracking-[-0.1px] text-black/65";
  const RadioGroup = ({ employeeId, field, options }: { employeeId: string; field: SettingKey; options: { value: string; label: string }[] }) => (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {options.map((option) => <label key={option.value} className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-sm leading-[22.001px] text-black/65"><input type="radio" name={`${employeeId}-${field}`} value={option.value} checked={valueOf(employeeId, field) === option.value} onChange={() => setValue(employeeId, field, option.value)} className="size-4 accent-[#1890ff]" />{option.label}</label>)}
    </div>
  );
  const HeaderRadios = ({ name, options, selected }: { name: string; options: string[]; selected?: number }) => (
    <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-1 text-left">
      {options.map((option, index) => <label key={option} className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-normal leading-[22.001px] text-white"><input type="radio" name={name} defaultChecked={selected === index} className="size-4 accent-[#1890ff]" />{option}</label>)}
    </div>
  );
  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="ตั้งค่าทั่วไป" />
      <CardContent className="card-input-body px-2 py-4">
        <div className="m-6">
          <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end">
            <label className="flex-1 text-sm leading-[22.001px] text-black/85">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            <label className="flex-1 text-sm leading-[22.001px] text-black/85">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#Hashtag" className={controlClass} /></label>
            <label className="flex-1 text-sm leading-[22.001px] text-black/85">รอบการคำนวณเงินเดือน<select value={payrollFilter} onChange={(event) => setPayrollFilter(event.target.value)} className={controlClass}><option>ทั้งหมด</option><option>เต็มงวด</option><option>แบ่งงวดจ่าย</option></select></label>
            <button type="button" onClick={() => setSaved(false)} className="h-9 shrink-0 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ค้นหา</button>
          </div>
          <div className="fix-column-table max-h-[600px] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]">
            <Table className="w-[1800px] min-w-full table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
              <colgroup>{[80,250,200,200,200,200,300,250,250,200,200,200,250,250,250].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">
                {[["ลำดับ", "center"], ["ชื่อพนักงาน", "center"], ["แผนก", "center"], ["ฝ่ายงาน", "center"], ["หน่วยงาน", "center"], ["ตำแหน่ง", "center"]].map(([label, align], index) => <TableHead key={label} className={cn(head, align === "center" && "text-center", index === 1 && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{label}{index === 1 && <Search className="ml-1 inline size-3 align-[-1px]" />}</TableHead>)}
                <TableHead className={head}><div>จำนวนวันทำงาน</div><HeaderRadios name="general-header-work-days" options={["26 วัน", "30 วัน", "ตามจริง", "ตามการตั้งค่าองค์กร"]} /></TableHead>
                <TableHead className={cn(head, "text-left")}><div className="text-center">จำนวนชั่วโมงการทำงาน</div><HeaderRadios name="general-header-work-hours" options={["8.00 ชั่วโมง", "8.30 ชั่วโมง", "9.00 ชั่วโมง", "ตามจริง", "ตามการตั้งค่าองค์กร"]} /></TableHead>
                <TableHead className={head}><div>รอบการคำนวณเงินเดือน</div><HeaderRadios name="general-header-payroll" options={["เต็มงวด", "แบ่งงวดจ่าย"]} selected={0} /></TableHead><TableHead className={head}><div>รอบการคำนวณงวดพิเศษ</div><HeaderRadios name="general-header-special" options={["ใช่", "ไม่ใช่"]} selected={0} /></TableHead><TableHead className={head}><div>รอบการคำนวณงวดแยกโอที</div><HeaderRadios name="general-header-ot" options={["ใช่", "ไม่ใช่"]} selected={1} /></TableHead><TableHead className={head}><div>รอบการคำนวณงวดแยกเวลาการทำงาน</div><HeaderRadios name="general-header-time" options={["ใช่", "ไม่ใช่"]} selected={1} /></TableHead><TableHead className={head}>ตั้งค่าผังบัญชี</TableHead><TableHead className={head}><div>อนุญาตให้หยุดวันหยุดนักขัตฤกษ์</div><HeaderRadios name="general-header-holiday" options={["อนุญาต", "ไม่อนุญาต"]} selected={0} /></TableHead><TableHead className={head}>HumanSoft Notify</TableHead>
              </TableRow></TableHeader>
              <TableBody>{loading ? <TableRow><TableCell colSpan={15} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={15} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : rows.map((row, index) => <TableRow key={row.id} className={cn("hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cell} text-center`}>{index + 1}</TableCell><TableCell className={cn(cell, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cell}>{row.department}</TableCell><TableCell className={cell}>{row.division}</TableCell><TableCell className={cell}>{row.unit}</TableCell><TableCell className={cell}>{row.position}</TableCell><TableCell className={cell}><RadioGroup employeeId={row.id} field="workDays" options={[{ value: "26", label: "26 วัน" }, { value: "30", label: "30 วัน" }, { value: "31", label: "ตามจริง" }, { value: "0", label: "ตามการตั้งค่าองค์กร" }]} /></TableCell><TableCell className={cell}><RadioGroup employeeId={row.id} field="workHours" options={[{ value: "08:00:00", label: "8.00 ชั่วโมง" }, { value: "08:30:00", label: "8.30 ชั่วโมง" }, { value: "09:00:00", label: "9.00 ชั่วโมง" }, { value: "24:00:00", label: "ตามจริง" }, { value: "00:00:00", label: "ตามการตั้งค่าองค์กร" }]} /></TableCell><TableCell className={cell}><RadioGroup employeeId={row.id} field="payrollCycle" options={[{ value: "Full", label: "เต็มเดือน" }, { value: "Split", label: "แบ่งงวดจ่าย" }]} /></TableCell><TableCell className={cell}><RadioGroup employeeId={row.id} field="specialCycle" options={[{ value: "Y", label: "ใช่" }, { value: "N", label: "ไม่ใช่" }]} /></TableCell><TableCell className={cell}><RadioGroup employeeId={row.id} field="otCycle" options={[{ value: "Y", label: "ใช่" }, { value: "N", label: "ไม่ใช่" }]} /></TableCell><TableCell className={cell}><RadioGroup employeeId={row.id} field="timeCycle" options={[{ value: "Y", label: "ใช่" }, { value: "N", label: "ไม่ใช่" }]} /></TableCell><TableCell className={cell}><select aria-label={`ตั้งค่าผังบัญชี ${row.name}`} value={valueOf(row.id, "accounting")} onChange={(event) => setValue(row.id, "accounting", event.target.value)} className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm"><option value="" /><option value="ผังบัญชีหลัก">ผังบัญชีหลัก</option></select></TableCell><TableCell className={cell}><RadioGroup employeeId={row.id} field="holiday" options={[{ value: "Y", label: "อนุญาต" }, { value: "N", label: "ไม่อนุญาต" }]} /></TableCell><TableCell className={cell}><select aria-label={`HumanSoft Notify ${row.name}`} value={valueOf(row.id, "notify")} onChange={(event) => setValue(row.id, "notify", event.target.value)} className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm"><option>ยึดตามการตั้งค่าทั่วไป</option><option>เปิดใช้งาน</option><option>ปิดใช้งาน</option></select></TableCell></TableRow>)}</TableBody>
            </Table>
            {!loading && rows.length > 0 && <nav className="flex h-16 items-center justify-end px-4"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}
          </div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => setSaved(true)} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{saved ? "บันทึกแล้ว" : "บันทึก"}</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function FixedIncomeExpenseContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrg, setTemplateOrg] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [itemType, setItemType] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      options.push({ id: node.id, label: `${"\u00a0\u00a0".repeat(depth)}${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);
  const search = async () => {
    if (!itemType) { setRows([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic" });
      if (companyId) params.set("companyId", companyId);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[] };
      setRows(data.employees);
    } finally { setLoading(false); }
  };
  const controlClass = "mt-0.5 h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/85 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const head = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 align-middle text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white";
  const cell = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] tracking-[-0.1px] text-black/65";
  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="รายรับรายจ่ายคงที่" />
      <CardContent className="card-input-body px-2 py-4">
        <div className="m-6 flex flex-col divide-y divide-black/[0.12] lg:flex-row lg:divide-x lg:divide-y-0">
          <section className="flex flex-1 gap-2 py-2 pr-0 lg:pr-6"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">1</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="mb-2 flex items-end gap-2"><label className="min-w-0 flex-[0_1_40%] text-sm leading-[22px]">โครงสร้างองค์กร<select value={templateOrg} onChange={(event) => setTemplateOrg(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button type="button" className="h-9 max-w-[100px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button></div></div></section>
          <section className="flex flex-1 gap-2 py-2 pl-0 lg:pl-6"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">2</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล</h2><div className="flex items-center text-sm leading-[22.001px]"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium text-black/85 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div></section>
        </div>
        <div className="my-0 border-t border-black/[0.12]" />
        <div className="m-6">
          <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end"><label className="flex-1 text-sm leading-[22.001px] text-black/85">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="flex-1 text-sm leading-[22.001px] text-black/85">ประเภทรายการรายรับ-รายจ่ายคงที่<select value={itemType} onChange={(event) => { setItemType(event.target.value); setSaved(false); }} className={controlClass}><option value="" /><option value="ค่าเดินทาง">ค่าเดินทาง</option><option value="ค่าโทรศัพท์">ค่าโทรศัพท์</option><option value="เบี้ยเลี้ยง">เบี้ยเลี้ยง</option></select></label><label className="flex-1 text-sm leading-[22.001px] text-black/85">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#Hashtag" className={controlClass} /></label><button type="button" onClick={() => void search()} className="h-9 shrink-0 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ค้นหา</button></div>
          <div className="mb-2 text-sm leading-[22.001px] text-[#ff0000]"><span className="block h-[22px]">&nbsp;</span>***ต้องไปตั้งค่าประเภทรายรับรายจ่ายเป็นรูปแบบ Constant ไปตั้งค่าที่นี้ <a href="/setting/setting-salarytype" target="_blank" className="text-[#2299ff] underline">Link</a></div>
          <div className="fix-column-table max-h-[650px] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><Table className="min-w-[3840px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{[80,300,200,200,200,200,880,880,900].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]"><TableHead rowSpan={2} className={head}>ลำดับ</TableHead><TableHead rowSpan={2} className={cn(head, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>ชื่อพนักงาน <Search className="ml-1 inline size-3 align-[-1px]" /></TableHead><TableHead rowSpan={2} className={head}>แผนก</TableHead><TableHead rowSpan={2} className={head}>ฝ่ายงาน</TableHead><TableHead rowSpan={2} className={head}>หน่วยงาน</TableHead><TableHead rowSpan={2} className={head}>ตำแหน่ง</TableHead><TableHead colSpan={3} className={head}>{itemType}</TableHead></TableRow><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]"><TableHead className={head}>มูลค่า</TableHead><TableHead className={head}>วันที่เริ่ม</TableHead><TableHead className={head}>วันที่สิ้นสุด</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={9} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="h-[202px] p-0"><div className="flex h-[202px] flex-col items-center justify-center text-sm leading-[22.001px] text-black/45"><svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fillRule="nonzero" fill="#fafafa"><path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24Z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007Z" /></g></g></svg><span className="mt-2">ไม่มีข้อมูล</span></div></TableCell></TableRow> : rows.map((row, index) => <TableRow key={row.id} className={cn("!h-[38.8px] hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cell} text-center`}>{index + 1}</TableCell><TableCell className={cn(cell, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cell}>{row.department}</TableCell><TableCell className={cell}>{row.division}</TableCell><TableCell className={cell}>{row.unit}</TableCell><TableCell className={cell}>{row.position}</TableCell><TableCell className={cell}><input aria-label={`มูลค่า ${row.name}`} className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={cell}><ThaiDatePicker aria-label={`วันที่เริ่ม ${row.name}`} className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={cell}><ThaiDatePicker aria-label={`วันที่สิ้นสุด ${row.name}`} className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell></TableRow>)}</TableBody></Table>{!loading && rows.length > 0 && <nav className="flex h-16 items-center justify-end px-4"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}</div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><div className="mt-3 flex justify-end"><button type="button" onClick={() => setSaved(true)} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{saved ? "บันทึกแล้ว" : "บันทึก"}</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function AutomaticIncomeExpenseContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Record<string, boolean[]>>({});
  const [saved, setSaved] = useState(false);
  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => { options.push({ id: node.id, label: `${"\u00a0\u00a0".repeat(depth)}${node.name}` }); visit(node.children ?? [], depth + 1); });
    visit(orgTree);
    return options;
  }, [orgTree]);
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic" });
      if (companyId) params.set("companyId", companyId);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[] };
      setRows(data.employees);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);
  const checked = (id: string, index: number) => selection[id]?.[index] ?? false;
  const toggle = (id: string, index: number) => { setSaved(false); setSelection((current) => { const next = [...(current[id] ?? [false, false, false])]; next[index] = !next[index]; return { ...current, [id]: next }; }); };
  const controlClass = "mt-0.5 h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/85 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const head = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 align-middle text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white";
  const cell = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] tracking-[-0.1px] text-black/65";
  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="รายรับรายจ่ายอัตโนมัติ" />
      <CardContent className="card-input-body px-2 py-4"><div className="m-6"><div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end"><label className="flex-1 text-sm leading-[22.001px] text-black/85">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="flex-1 text-sm leading-[22.001px] text-black/85">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#Hashtag" className={controlClass} /></label><button type="button" onClick={() => void load()} className="h-9 shrink-0 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ค้นหา</button></div><div className="mb-2 text-sm leading-[22.001px] text-[#ff0000]"><span className="block h-[22px]">&nbsp;</span>***หากต้องการใช้ฟังชั่นนี้ กรุณาติดต่อเจ้าหน้าที่</div><div className="fix-column-table max-h-[650px] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><Table className="w-[1230px] min-w-full table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{[80,300,140,140,140,140,96,96,98].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]"><TableHead className={head}>ลำดับ</TableHead><TableHead className={cn(head, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>ชื่อพนักงาน <Search className="ml-1 inline size-3 align-[-1px]" /></TableHead><TableHead className={head}>แผนก</TableHead><TableHead className={head}>ฝ่ายงาน</TableHead><TableHead className={head}>หน่วยงาน</TableHead><TableHead className={head}>ตำแหน่ง</TableHead><TableHead className={head}>ประกันสังคม</TableHead><TableHead className={head}>ภาษี</TableHead><TableHead className={head}>สาย</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={9} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : rows.map((row, rowIndex) => <TableRow key={row.id} className={cn("!h-[38.8px] hover:bg-transparent", rowIndex % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cell} text-center`}>{rowIndex + 1}</TableCell><TableCell className={cn(cell, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cell}>{row.department}</TableCell><TableCell className={cell}>{row.division}</TableCell><TableCell className={cell}>{row.unit}</TableCell><TableCell className={cell}>{row.position}</TableCell>{[0, 1, 2].map((index) => <TableCell key={index} className={`${cell} text-center`}><input type="checkbox" aria-label={`${["ประกันสังคม", "ภาษี", "สาย"][index]} ${row.name}`} checked={checked(row.id, index)} onChange={() => toggle(row.id, index)} className="size-[16px] shrink-0 cursor-pointer accent-[#1890ff]" /></TableCell>)}</TableRow>)}</TableBody></Table>{!loading && rows.length > 0 && <nav className="flex h-16 items-center justify-end px-4"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}</div><p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><div className="mt-3 flex justify-end"><button type="button" onClick={() => setSaved(true)} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{saved ? "บันทึกแล้ว" : "บันทึก"}</button></div></div></CardContent>
    </Card>
  );
}

function FundContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateFund, setTemplateFund] = useState(""); const [templateYear, setTemplateYear] = useState(""); const [templateOrg, setTemplateOrg] = useState("");
  const [importMonth, setImportMonth] = useState(""); const [fileName, setFileName] = useState("");
  const [fundName, setFundName] = useState(""); const [organizationId, setOrganizationId] = useState(""); const [hashtag, setHashtag] = useState(""); const [year, setYear] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]); const [loading, setLoading] = useState(true); const [saved, setSaved] = useState(false);
  const organizationOptions = useMemo(() => { const options: { id: string; label: string }[] = []; const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => { options.push({ id: node.id, label: `${"\u00a0\u00a0".repeat(depth)}${node.name}` }); visit(node.children ?? [], depth + 1); }); visit(orgTree); return options; }, [orgTree]);
  const load = async () => { setLoading(true); try { const params = new URLSearchParams({ view: "basic" }); if (companyId) params.set("companyId", companyId); const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" }); if (!response.ok) throw new Error("load failed"); const data = (await response.json()) as { employees: BasicEmployeeRow[] }; setRows(data.employees); } finally { setLoading(false); } };
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);
  const controlClass = "mt-0.5 h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/85 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const head = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 align-middle text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white";
  const cell = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] tracking-[-0.1px] text-black/65";
  const funds = ["กองทุนสำรองเลี้ยงชีพ", "กองทุนเงินทดแทน"];
  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="กองทุน" />
      <CardContent className="card-input-body px-2 py-4"><div className="m-6 flex flex-col divide-y divide-black/[0.12] lg:flex-row lg:divide-x lg:divide-y-0"><section className="flex-[0_1_60%] py-2 pr-0 lg:pr-6"><div className="flex gap-2"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">1</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="mb-2 flex flex-wrap items-end gap-2"><label className="min-w-[150px] flex-[0_1_28%] text-sm leading-[22px]">ชื่อกองทุน <span className="text-red-600">*</span><select value={templateFund} onChange={(event) => setTemplateFund(event.target.value)} className={controlClass}><option value="" />{funds.map((fund) => <option key={fund}>{fund}</option>)}</select></label><label className="min-w-[130px] flex-[0_1_28%] text-sm leading-[22px]">ปี <span className="text-red-600">*</span><input value={templateYear} onChange={(event) => setTemplateYear(event.target.value)} placeholder="Select year" inputMode="numeric" className={controlClass} /></label><label className="min-w-[160px] flex-[0_1_28%] text-sm leading-[22px]">โครงสร้างองค์กร<select value={templateOrg} onChange={(event) => setTemplateOrg(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button type="button" className="h-9 max-w-[100px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button></div></div></div></section><section className="flex-[0_1_40%] py-2 pl-0 lg:pl-6"><div className="flex gap-2"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">2</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล</h2><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><ThaiMonthPicker value={importMonth} onChange={setImportMonth} className="h-[31.6px] rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px] text-sm" /><div className="flex items-center text-sm"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium text-black/85 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 truncate">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div></div></div></section></div><div className="border-t border-black/[0.12]" /><div className="m-6"><div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-end"><label className="flex-1 text-sm leading-[22.001px] text-black/85">ชื่อกองทุน <span className="text-red-600">*</span><select value={fundName} onChange={(event) => setFundName(event.target.value)} className={controlClass}><option value="" />{funds.map((fund) => <option key={fund}>{fund}</option>)}</select></label><label className="flex-1 text-sm leading-[22.001px] text-black/85">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="flex-1 text-sm leading-[22.001px] text-black/85">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#Hashtag" className={controlClass} /></label><label className="flex-1 text-sm leading-[22.001px] text-black/85">ปี<input value={year} onChange={(event) => setYear(event.target.value)} placeholder="Select year" inputMode="numeric" className={controlClass} /></label><button type="button" onClick={() => void load()} className="h-9 max-w-[80px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ค้นหา</button></div><div className="mb-2 text-right text-sm leading-[22.001px] text-[#ff0000]">***ต้องไปตั้งค่าประเภทรายรับรายจ่ายเป็นรูปแบบ Fund ไปตั้งค่าได้ที่นี้ <a href="/setting/setting-salarytype" target="_blank" className="text-[#2299ff] underline">Link</a></div><div className="fix-column-table max-h-[60vh] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><Table className="min-w-[1650px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{[70,260,170,150,150,150,150,150,150,150,200,150].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "ชื่อพนักงาน", "เลขที่กองทุน", "วันที่สัญญากองทุน", "วิธีการหักเงิน", "เรทกองทุน", "วิธีการสมทบ", "บริษัทสมทบ", "ยอดสะสม", "ยอดสะสมบริษัทสมทบ", "ผู้ได้รับผลประโยชน์", ""].map((label, index) => <TableHead key={`${label}-${index}`} className={cn(head, index === 1 && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{label}{index === 1 && <Search className="ml-1 inline size-3 align-[-1px]" />}</TableHead>)}</TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={12} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={12} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : <><TableRow className="hover:bg-transparent"><TableCell colSpan={2} className="border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#f2fafe] p-2 text-sm font-medium text-black/65">แผนก: {rows[0]?.department || "-"}</TableCell><TableCell colSpan={10} className="border-b-[0.8px] border-[#f0f0f0] bg-[#f2fafe]" /></TableRow>{rows.map((row, index) => <TableRow key={row.id} className={cn("hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-white" : "[&>td]:bg-[#f2fafe]")}><TableCell className={`${cell} text-center`}>{index + 1}</TableCell><TableCell className={cn(cell, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}><div className="flex min-w-0 gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8f4ff] text-xs font-medium text-[#61a8ff]">{row.name.slice(0, 1)}</span><span className="min-w-0"><span className="block truncate"><b className="font-normal text-[#61a8ff]">{row.employeeCode}</b>: {row.name}</span><span className="block truncate text-xs text-black/45">{row.position}</span><span className="block truncate text-xs text-black/45">{row.department}</span></span></div></TableCell><TableCell className={cell}><input className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={cell}><ThaiDatePicker className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={cell}><select className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]"><option>หักเงินเดือน</option></select></TableCell><TableCell className={cell}><input className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={cell}><select className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]"><option>ตามอัตรา</option></select></TableCell><TableCell className={cell}><input className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={cell}><input className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={cell}><input className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={cell}><input className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px]" /></TableCell><TableCell className={`${cell} text-center`}><button type="button" className="text-[#2299ff]">แก้ไข</button></TableCell></TableRow>)}</>}</TableBody></Table>{!loading && rows.length > 0 && <nav className="flex h-16 items-center justify-end px-4"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}</div><p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><div className="mt-3 flex justify-end"><button type="button" onClick={() => setSaved(true)} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">{saved ? "บันทึกแล้ว" : "บันทึก"}</button></div></div><FundImportHistory /></CardContent>
    </Card>
  );
}

function FundImportHistory() {
  const headers = ["ลำดับ", "File", "วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ข้อมูลผิดพลาด", "Log"];
  return (
    <section className="mt-9 border-t border-black/[0.12] px-6 pt-9">
      <div className="sub-header text-lg font-medium leading-[28px] text-[rgba(0,0,0,0.87)]">ประวัติการนำเข้าข้อมูล</div>
      <div className="mt-2 max-h-[300px] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]">
        <Table className="min-w-[800px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
          <colgroup>{[8, 20, 20, 15, 15, 15, 15, 15].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
          <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{headers.map((header) => <TableHead key={header} className="border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] tracking-[-0.1px] text-white">{header}</TableHead>)}</TableRow></TableHeader>
          <TableBody><TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-[180px] border-b-[0.8px] border-[#f0f0f0] text-center text-sm leading-[22.001px] text-black/45">ไม่มีข้อมูล</TableCell></TableRow></TableBody>
        </Table>
      </div>
    </section>
  );
}

function WorkShiftVisibilityContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.name}` });
      else visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) ids.set(node.id, node.organizationIds ?? []);
      else visit(node.children ?? []);
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ view: "basic" });
        if (companyId) params.set("companyId", companyId);
        const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("load failed");
        const data = (await response.json()) as { employees: BasicEmployeeRow[] };
        if (cancelled) return;
        const saved = typeof window === "undefined" ? {} : JSON.parse(window.localStorage.getItem(`work-shift-visibility:${companyId}`) ?? "{}");
        setRows(data.employees);
        setVisibility(Object.fromEntries(data.employees.map((employee) => [employee.id, Array.isArray(saved[employee.id]) && saved[employee.id].length === 3 ? saved[employee.id] : [true, true, true]])));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });
  const updateVisibility = (employeeId: string, column: number, checked: boolean) => {
    setVisibility((current) => ({ ...current, [employeeId]: (current[employeeId] ?? [true, true, true]).map((value, index) => index === column ? checked : value) }));
    setDirty(true);
  };
  const updateAllVisibility = (employeeId: string, checked: boolean) => {
    setVisibility((current) => ({ ...current, [employeeId]: [checked, checked, checked] }));
    setDirty(true);
  };
  const save = () => {
    window.localStorage.setItem(`work-shift-visibility:${companyId}`, JSON.stringify(visibility));
    setDirty(false);
  };
  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";
  const shiftColumns = ["เปิดกะการทำงาน\nทั้งหมด", "WC001\n08:30-12:00-13:00-17:00", "WC002\n08:30-12:00-13:00-17:00"];

  return (
    <Card className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}>
      <CardInputHeader title="ตั้งค่าการมองเห็นกะการทำงาน" />
      <style>{`
        .card-input-container .fix-column-table table { min-width: 2000px !important; letter-spacing: -0.1px; }
        .card-input-container .fix-column-table thead th { letter-spacing: -0.1px; text-transform: none; }
        .card-input-container .fix-column-table thead tr,
        .card-input-container .fix-column-table thead th { height: 112.8px !important; }
        .card-input-container .fix-column-table tbody tr { height: 38.8px !important; }
        .card-input-container .fix-column-table input[type="checkbox"] {
          appearance: none; width: 16px; height: 16px; margin: 0; border: 1px solid #d9d9d9;
          border-radius: 2px; background: #fff; vertical-align: middle;
        }
        .card-input-container .fix-column-table input[type="checkbox"]:checked {
          border-color: #1890ff; background: #1890ff url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.1 6.1 4.7 8.6 9.9 3.4' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
        }
        nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นกะการทำงาน"]::before,
        nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นกะการทำงาน"]::after {
          content: ""; display: block; width: 32px; height: 32px; opacity: .25;
          background: center / 12px 12px no-repeat;
        }
        nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นกะการทำงาน"]::before {
          margin-right: 8px;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='64 64 896 896' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000' d='M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8a31.86 31.86 0 0 0 0 50.3l450.8 352.1c5.3 4.1 12.9.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.1-12.6l-360-281 360-281.1c3.8-3 6.1-7.7 6.1-12.6z'/%3E%3C/svg%3E");
        }
        nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นกะการทำงาน"] > span { margin-right: 8px; }
        nav[aria-label="แบ่งหน้าตั้งค่าการมองเห็นกะการทำงาน"]::after {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='64 64 896 896' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000' d='M765.7 486.8 314.9 134.7A7.97 7.97 0 0 0 302 141v77.3c0 4.9 2.3 9.6 6.1 12.6l360 281.1-360 281.1c-3.9 3-6.1 7.7-6.1 12.6V883c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.96 31.96 0 0 0 0-50.4z'/%3E%3C/svg%3E");
        }
      `}</style>
      <CardContent className="card-input-body px-2 py-4">
        <div className="flex flex-col divide-y divide-black/[0.12] lg:flex-row lg:divide-x lg:divide-y-0">
          <section className="m-6 flex flex-1 gap-2 py-2 pr-0 lg:pr-6"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="mb-2 flex items-end gap-2"><label className="min-w-0 flex-[0_1_40%] text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">โครงสร้างองค์กร<select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><div className="flex-[0_1_20%]"><label className="block text-sm leading-[22px]">&nbsp;</label><button type="button" className="h-9 max-w-[100px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button></div></div></div></section>
          <section className="m-6 flex flex-1 gap-2 py-2 pl-0 lg:pl-6"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span><div className="m-2 flex-1"><h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">นำเข้าข้อมูล</h2><div className="m-1 flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-[rgba(0,0,0,0.87)] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 truncate text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div></section>
        </div>
        <div className="my-6 border-t border-black/[0.12]" />
        <div className="m-6"><div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={controlClass} /></label><button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button></div>
          <div className="fix-column-table max-h-[60vh] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><Table className="min-w-[1570px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{[80, 250, 180, 180, 180, 180, 120, 200, 200].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "ชื่อพนักงาน", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง"].map((column) => <TableHead key={column} className={cn("border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white", column === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{column}{column === "ชื่อพนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-3 align-[-1px] fill-[rgba(0,0,0,0.54)]"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6ZM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4Z" /></svg>}</TableHead>)}{shiftColumns.map((column, index) => <TableHead key={column} className="min-h-[112px] border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 align-bottom text-center text-sm font-medium leading-[22.001px] text-white"><div className="flex min-h-20 flex-col justify-between whitespace-pre-wrap text-sm font-normal leading-[19.6px]"><span>{column}</span><label className="mt-2 inline-flex justify-center"><input type="checkbox" checked={visibleRows.length > 0 && visibleRows.every((row) => index === 0 ? visibility[row.id]?.every(Boolean) : visibility[row.id]?.[index - 1])} onChange={(event) => visibleRows.forEach((row) => index === 0 ? updateAllVisibility(row.id, event.target.checked) : updateVisibility(row.id, index - 1, event.target.checked))} className="size-4 accent-[#1890ff]" aria-label={`เลือก${column}ทั้งหมด`} /></label></div></TableHead>)}</TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={9} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={9} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[40.8px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell><TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell><TableCell className={`${cellClass} text-center`}><input type="checkbox" checked={visibility[row.id]?.every(Boolean) ?? true} onChange={(event) => updateAllVisibility(row.id, event.target.checked)} className="size-4 accent-[#1890ff]" aria-label={`เปิดกะทั้งหมดของ ${row.name}`} /></TableCell>{[0, 1].map((column) => <TableCell key={column} className={`${cellClass} text-center`}><input type="checkbox" checked={visibility[row.id]?.[column] ?? true} onChange={(event) => updateVisibility(row.id, column, event.target.checked)} className="size-4 accent-[#1890ff]" aria-label={`เปิด WC00${column + 1} ของ ${row.name}`} /></TableCell>)}</TableRow>)}</TableBody></Table>{!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าตั้งค่าการมองเห็นกะการทำงาน"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}</div>
          <p className="mt-0 text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><div className="mt-3 flex justify-end"><button type="button" disabled={!dirty} onClick={save} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:bg-[#bfbfbf]">บันทึก</button></div>
          <div className="my-6 border-t border-black/[0.12]" /><h3 className="sub-header text-lg font-medium text-[rgba(0,0,0,0.87)]">ประวัติการนำเข้าตั้งค่าการมองเห็นกะการทำงาน</h3><div className="mt-2 overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><Table className="min-w-[900px] table-fixed text-sm leading-[22.001px]"><TableHeader><TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "File", "วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ข้อมูลผิดพลาด", "ผู้นำเข้า", "Log"].map((header) => <TableHead key={header} className="border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">{header}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow><TableCell colSpan={9} className="h-40 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkdayHolidayContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrg, setTemplateOrg] = useState(""); const [org, setOrg] = useState(""); const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ org: "", hashtag: "" }); const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]); const [loading, setLoading] = useState(true); const [dirty, setDirty] = useState(false);
  const organizationOptions = useMemo(() => { const options: { id: string; name: string }[] = []; const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => { if (node.count === undefined && (node.children?.length ?? 0) === 0) options.push({ id: node.id, name: `${"  ".repeat(depth)}${node.name}` }); else visit(node.children ?? [], depth + 1); }); visit(orgTree); return options; }, [orgTree]);
  useEffect(() => { let cancelled = false; const load = async () => { setLoading(true); try { const params = new URLSearchParams({ view: "basic" }); if (companyId) params.set("companyId", companyId); const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" }); if (!response.ok) throw new Error("load failed"); const data = (await response.json()) as { employees: BasicEmployeeRow[] }; if (!cancelled) setRows(data.employees); } finally { if (!cancelled) setLoading(false); } }; void load(); return () => { cancelled = true; }; }, [companyId]);
  const visibleRows = rows.filter((row) => !filters.hashtag || row.hashtag.toLocaleLowerCase().includes(filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase()));
  const controlClass = "h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";
  const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
  return <Card className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}><CardInputHeader title="ตั้งค่าวันทำงาน-วันหยุด" /><CardContent className="card-input-body px-2 py-4"><div className="m-6 flex flex-col divide-y divide-black/[0.12] lg:flex-row lg:divide-x lg:divide-y-0"><section className="flex flex-1 gap-2 py-2 pr-0 lg:pr-6"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">1</span><div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="flex items-end gap-2"><label className="min-w-0 flex-[0_1_70%] text-sm leading-[22px]">โครงสร้างองค์กร<select value={templateOrg} onChange={(event) => setTemplateOrg(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><button type="button" className="h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button></div></div></section><section className="flex flex-1 gap-2 py-2 pl-0 lg:pl-6"><span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl text-white">2</span><div className="m-2 flex-1"><h2 className="h-10 text-lg font-bold leading-10">นำเข้าข้อมูล</h2><div className="m-1 flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 truncate text-sm text-black/65">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div></section></div><div className="my-6 border-t border-black/[0.12]" /><div className="m-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex flex-1 flex-col text-sm leading-[22px]">โครงสร้างองค์กร<select value={org} onChange={(event) => setOrg(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label className="flex flex-1 flex-col text-sm leading-[22px]">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#Hashtag" className={controlClass} /></label><button type="button" onClick={() => setFilters({ org, hashtag })} className="h-9 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white">ค้นหา</button></div><label className="mt-2 flex flex-col text-sm leading-[22px]">วันทำงาน - วันหยุด<select className={controlClass} onChange={() => setDirty(true)} defaultValue=""><option value="">วันทำงาน - วันหยุด</option><option>วันทำงาน</option><option>วันหยุดพนักงาน</option></select></label><div className="fix-column-table m-1 mt-2 max-h-[60vh] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><Table className="min-w-[1920px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{[80,200,160,160,160,160,160,...Array(7).fill(120)].map((width,index)=><col key={index} style={{width}} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ","ชื่อพนักงาน","สำนักงาน/สาขา","แผนก","ฝ่ายงาน","หน่วยงาน","ตำแหน่ง",...days].map((column)=><TableHead key={column} className={cn("border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white",column==="ชื่อพนักงาน"&&"shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{column}{column==="ชื่อพนักงาน"&&<Search className="ml-1 inline size-3 align-[-1px]" />}</TableHead>)}</TableRow></TableHeader><TableBody>{loading?<TableRow><TableCell colSpan={14} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow>:visibleRows.length===0?<TableRow><TableCell colSpan={14} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow>:visibleRows.map((row,index)=><TableRow key={row.id} className={cn("!h-[38.8px] border-b-0 hover:bg-transparent",index%2===0?"[&>td]:bg-[#f2fafe]":"[&>td]:bg-white")}><TableCell className={`${cellClass} text-center`}>{index+1}</TableCell><TableCell className={cn(cellClass,"shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.branch}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>{days.map((day,index)=><TableCell key={day} className={`${cellClass} text-center`}><button type="button" onClick={()=>setDirty(true)} className="h-[22.001px] bg-transparent p-0 text-sm leading-[22.001px] text-black/65">{index<5?"วันทำงาน":"วันหยุดพนักงาน"}</button></TableCell>)}</TableRow>)}</TableBody></Table>{!loading&&visibleRows.length>0&&<nav className="flex h-16 items-center justify-end px-4"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}</div><p className="text-sm leading-[22.001px] text-red-600">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><p className="mt-2 text-sm leading-[22.001px] text-red-600">*** หากมีการเปลี่ยนแปลงวันทำงาน - วันหยุดในหน้านี้ จะเป็นการเปลี่ยนข้อมูลพื้นฐาน ซึ่งจะไม่ส่งผลกระทบข้อมูลในแต่ละเดือน หากต้องการอัพเดทข้อมูลในแต่ละเดือน กรุณา “รีเซ็ตค่าตั้งต้น” ในเดือนที่ต้องการอีกครั้ง</p><div className="flex justify-end pt-3"><button type="button" disabled={!dirty} onClick={()=>setDirty(false)} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white disabled:bg-[#bfbfbf]">บันทึก</button></div></div><div className="my-6 border-t border-black/[0.12]" /><div className="sub-header m-6 text-lg font-medium">ประวัติการนำเข้าข้อมูล วันทำงาน - วันหยุด</div></CardContent></Card>;
}

function ShiftHolidayContent({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { let cancelled = false; const load = async () => { setLoading(true); try { const params = new URLSearchParams({ view: "basic" }); if (companyId) params.set("companyId", companyId); const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" }); if (!response.ok) throw new Error("load failed"); const data = (await response.json()) as { employees: BasicEmployeeRow[] }; if (!cancelled) setRows(data.employees); } finally { if (!cancelled) setLoading(false); } }; void load(); return () => { cancelled = true; }; }, [companyId]);
  const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
  const cell = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";
  const head = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white";
  return <Card className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}><CardInputHeader title="ตั้งค่ากะการทำงาน-วันหยุด" /><CardContent className="card-input-body px-2 py-4"><div className="m-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex flex-1 flex-col text-sm leading-[22px]">โครงสร้างองค์กร<select className="h-[31.6px] rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm"><option>โครงสร้างองค์กร</option></select></label><label className="flex flex-1 flex-col text-sm leading-[22px]">Hashtag<input placeholder="#Hashtag" className="h-[31.6px] rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px] text-sm" /></label><button type="button" className="h-9 rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold text-white">ค้นหา</button></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="flex flex-col text-sm leading-[22px]">กะการทำงาน<select className="h-[31.6px] rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px] text-sm"><option>กะการทำงาน</option><option>WC001</option><option>WC002</option></select></label><label className="flex flex-col text-sm leading-[22px]">วันทำงาน - วันหยุด<select className="h-[31.6px] rounded-[4px] border-[0.8px] border-[#d9d9d9] px-[11px] text-sm"><option>วันทำงาน - วันหยุด</option><option>วันทำงาน</option><option>วันหยุดพนักงาน</option></select></label></div><span className="block pt-2 text-right text-sm text-red-600">***เพิ่มกะการทำงานได้ที่นี่ <a href="/organization/organization-workcycle" className="text-[#2299ff] underline">Link</a></span><div className="fix-column-table mt-1 max-h-[60vh] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><Table className="min-w-[4520px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{[80,200,160,160,160,160,160,...Array(14).fill(200)].map((width,index)=><col key={index} style={{width}} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ","ชื่อพนักงาน","สำนักงาน/สาขา","แผนก","ฝ่ายงาน","หน่วยงาน","ตำแหน่ง"].map((label,index)=><TableHead key={label} rowSpan={2} className={cn(head,index===1&&"shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{label}{index===1&&<Search className="ml-1 inline size-3 align-[-1px]" />}</TableHead>)}{days.map(day=><TableHead key={day} colSpan={2} className={head}>{day}</TableHead>)}</TableRow><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{days.flatMap(day=>[<TableHead key={`${day}-shift`} className={head}>กะการทำงาน</TableHead>,<TableHead key={`${day}-holiday`} className={head}>วันทำงาน/วันหยุด</TableHead>])}</TableRow></TableHeader><TableBody>{loading?<TableRow><TableCell colSpan={21} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow>:rows.length===0?<TableRow><TableCell colSpan={21} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow>:rows.map((row,index)=><TableRow key={row.id} className={cn("!h-[38.8px] border-b-0 hover:bg-transparent",index%2===0?"[&>td]:bg-[#f2fafe]":"[&>td]:bg-white")}><TableCell className={`${cell} text-center`}>{index+1}</TableCell><TableCell className={cn(cell,"shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{row.employeeCode}: {row.name}</TableCell><TableCell className={cell}>{row.branch}</TableCell><TableCell className={cell}>{row.department}</TableCell><TableCell className={cell}>{row.division}</TableCell><TableCell className={cell}>{row.unit}</TableCell><TableCell className={cell}>{row.position}</TableCell>{days.flatMap((day,dayIndex)=>[<TableCell key={`${day}-shift`} className={`${cell} text-center`}>WC00{index%2+1}</TableCell>,<TableCell key={`${day}-holiday`} className={`${cell} text-center`}>{dayIndex<5?"วันทำงาน":"วันหยุดพนักงาน"}</TableCell>])}</TableRow>)}</TableBody></Table>{!loading&&rows.length>0&&<nav className="flex h-16 items-center justify-end px-4"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}</div><p className="text-sm leading-[22.001px] text-red-600">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p></div></CardContent></Card>;
}

/* eslint-disable @next/next/no-img-element -- the reference table renders a 24px avatar directly in the employee cell. */
function WorkShiftSettingsContent({ orgTree, companyId }: { orgTree: OrgNode[]; companyId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOrganizationId, setTemplateOrganizationId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [filters, setFilters] = useState({ organizationId: "", hashtag: "" });
  const [selectedShift, setSelectedShift] = useState("WC001");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [weeklyShifts, setWeeklyShifts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());

  const organizationOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    const visit = (nodes: OrgNode[], depth = 0) => nodes.forEach((node) => {
      if (node.count !== undefined) options.push({ id: node.id, label: `${"  ".repeat(depth)}${node.code}: ${node.name}` });
      visit(node.children ?? [], depth + 1);
    });
    visit(orgTree);
    return options;
  }, [orgTree]);

  const employeeOrganizationIds = useMemo(() => {
    const ids = new Map<string, string[]>();
    const visit = (nodes: OrgNode[]) => nodes.forEach((node) => {
      if (node.count === undefined && (node.children?.length ?? 0) === 0) ids.set(node.id, node.organizationIds ?? []);
      else visit(node.children ?? []);
    });
    visit(orgTree);
    return ids;
  }, [orgTree]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "basic" });
      if (companyId) params.set("companyId", companyId);
      const response = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { employees: BasicEmployeeRow[] };
      setRows(data.employees);
      const settingResponse = await fetch("/api/payroll/organization-shift-settings", { cache: "no-store" });
      const payload = settingResponse.ok
        ? await settingResponse.json() as { settings?: Array<{ employeeId: string; weeklyShifts: string[] }> }
        : { settings: [] };
      const saved = new Map((payload.settings ?? []).map((setting) => [setting.employeeId, setting.weeklyShifts]));
      setWeeklyShifts(Object.fromEntries(data.employees.map((employee) => [employee.id, saved.get(employee.id)?.length === 7 ? saved.get(employee.id)! : Array(7).fill("WC001")])));
      setDirtyIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || row.organizationIds.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const updateShift = (employeeId: string, dayIndex: number, value: string) => {
    setWeeklyShifts((current) => ({ ...current, [employeeId]: (current[employeeId] ?? Array(7).fill("WC001")).map((shift, index) => index === dayIndex ? value : shift) }));
    setDirtyIds((current) => new Set(current).add(employeeId));
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/payroll/organization-shift-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: rows.filter((row) => dirtyIds.has(row.id)).map((row) => ({ employeeId: row.id, selectedShift: weeklyShifts[row.id]?.[0] ?? selectedShift, weeklyShifts: weeklyShifts[row.id] ?? Array(7).fill(selectedShift) })) }),
      });
      if (!response.ok) throw new Error("save failed");
      setDirtyIds(new Set());
    } finally {
      setSaving(false);
    }
  };

  const controlClass = "h-[31.6px] w-full min-w-0 rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
  const cellClass = "border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] text-black/65";
  const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
      >
      <style>{`.card-input-container .fix-column-table thead th { letter-spacing: -0.1px; text-transform: none; }`}</style>
      <CardInputHeader title="ตั้งค่ากะการทำงาน" />
      <CardContent className="card-input-body px-2 py-4">
        <div className="m-6">
          <div className="flex flex-col divide-y divide-black/[0.12] lg:flex-row lg:divide-x lg:divide-y-0">
            <section className="flex flex-1 gap-2 py-2 pr-0 lg:pr-6">
              <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">1</span>
              <div className="m-2 min-w-0 flex-1"><h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">ดาวน์โหลดเทมเพลต (*.xlsx)</h2><div className="flex items-end gap-2"><label className="min-w-0 flex-[0_1_70%] text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">โครงสร้างองค์กร<select value={templateOrganizationId} onChange={(event) => setTemplateOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button type="button" className="h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ดาวน์โหลด</button></div></div>
            </section>
            <section className="flex flex-1 gap-2 py-2 pl-0 lg:pl-6">
              <span className="import-no m-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#61a8ff] text-xl font-normal text-white">2</span>
              <div className="m-2 flex-1"><h2 className="h-10 text-lg font-bold leading-10 text-[rgba(0,0,0,0.87)]">นำเข้าข้อมูล</h2><div className="flex items-center"><button type="button" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-[4px] bg-white px-4 text-sm font-medium leading-9 text-[rgba(0,0,0,0.87)] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">เลือกไฟล์</button><span className="ml-2 truncate text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">{fileName || "ยังไม่ได้เลือกไฟล์"}</span><input ref={fileInputRef} type="file" accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></div></div>
            </section>
          </div>

          <div className="my-6 border-t border-black/[0.12]" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">โครงสร้างองค์กร<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={controlClass}><option value="">โครงสร้างองค์กร</option>{organizationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-black/87">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setFilters({ organizationId, hashtag }); }} placeholder="#Hashtag" className={controlClass} /></label><button type="button" onClick={() => setFilters({ organizationId, hashtag })} className="h-9 min-w-[64px] rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#1685e8]">ค้นหา</button></div>
          <label className="mt-2 flex flex-col text-sm leading-[22px] text-black/87">กะการทำงาน <span className="text-red-600">***เพิ่มกะการทำงานได้ที่นี่ <a href="/organization/organization-workcycle" className="text-[#2299ff] underline">Link</a></span><select value={selectedShift} onChange={(event) => setSelectedShift(event.target.value)} className={controlClass}><option>WC001</option><option>WC002</option></select></label>

          <div className="fix-column-table mt-2 max-h-[650px] overflow-auto rounded-[8px] bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]"><Table className="min-w-[2200px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]"><colgroup>{[80, 280, 200, 200, 200, 200, 200, ...Array(7).fill(120)].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><TableHeader className="sticky top-0 z-10 bg-[#61a8ff]"><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "ชื่อพนักงาน", "สำนักงาน/สาขา", "แผนก", "ฝ่ายงาน", "หน่วยงาน", "ตำแหน่ง", ...days].map((column) => <TableHead key={column} className={cn("border-b-[0.8px] border-r-[0.8px] border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] text-white", column === "ชื่อพนักงาน" && "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}>{column}{column === "ชื่อพนักงาน" && <svg aria-hidden="true" viewBox="64 64 896 896" className="ml-1 inline size-3 align-[-1px] fill-[rgba(0,0,0,0.54)]"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6ZM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4Z" /></svg>}</TableHead>)}</TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={14} className="h-24 text-center text-black/45">กำลังโหลดข้อมูล...</TableCell></TableRow> : visibleRows.length === 0 ? <TableRow><TableCell colSpan={14} className="h-24 text-center text-black/45">ไม่มีข้อมูล</TableCell></TableRow> : visibleRows.map((row, index) => <TableRow key={row.id} className={cn("!h-[40.8px] border-b-0 hover:bg-transparent", index % 2 === 0 ? "[&>td]:bg-[#f2fafe]" : "[&>td]:bg-white")}><TableCell className={`${cellClass} text-center`}>{index + 1}</TableCell><TableCell className={cn(cellClass, "shadow-[4px_0_20px_-8px_rgba(0,0,0,0.15)]")}><img src={`${USER_IMAGE_ORIGIN}/images/userPlaceHolder.png`} alt="" className="mr-2 inline-block size-6 min-w-6 rounded-full border-[1.6px] border-[#61a8ff] p-px align-middle" />{row.employeeCode}: {row.name}</TableCell><TableCell className={cellClass}>{row.branch}</TableCell><TableCell className={cellClass}>{row.department}</TableCell><TableCell className={cellClass}>{row.division}</TableCell><TableCell className={cellClass}>{row.unit}</TableCell><TableCell className={cellClass}>{row.position}</TableCell>{days.map((day, dayIndex) => <TableCell key={day} className={`${cellClass} text-center`}><button type="button" title={`เปลี่ยนกะ ${day}`} onClick={() => updateShift(row.id, dayIndex, weeklyShifts[row.id]?.[dayIndex] === "WC002" ? "WC001" : "WC002")} className="h-[22.001px] border-0 bg-transparent p-0 text-center text-sm font-normal leading-[22.001px] text-black/65">{weeklyShifts[row.id]?.[dayIndex] ?? "WC001"}</button></TableCell>)}</TableRow>)}</TableBody></Table>{!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าตั้งค่ากะการทำงาน"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}</div>
          <p className="mt-0 text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p><p className="mt-2 text-sm leading-[22.001px] text-[#ff0000]">*** หากมีการเปลี่ยนแปลงกะการทำงานในหน้านี้ จะเป็นการเปลี่ยนข้อมูลพื้นฐาน ซึ่งจะไม่ส่งผลกระทบข้อมูลในแต่ละเดือน หากต้องการอัพเดทข้อมูลในแต่ละเดือน กรุณา “รีเซ็ตค่าตั้งต้น” ในเดือนที่ต้องการอีกครั้ง</p><div className="flex justify-end pt-3"><button type="button" disabled={dirtyIds.size === 0 || saving} onClick={() => void save()} className="h-[36.65px] rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:bg-[#bfbfbf]">{saving ? "กำลังบันทึก..." : "บันทึก"}</button></div>
        </div>
      </CardContent>
    </Card>
  );
}

/* eslint-enable @next/next/no-img-element */

/* ---------------------------------- Page ---------------------------------- */

function OrganizationEmployeePageContent({ companyId = "", companySwitch = false }: { companyId?: string; companySwitch?: boolean }) {
  const [activeTab, setActiveTab] = useState(SUBMENU_ITEMS[0]);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [selectOpen, setSelectOpen] = useState(() => Boolean(companyId) && !companySwitch);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgNode | null>(null);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<EmployeeDetail | null>(null);
  const employeeSelectionRequest = useRef(0);
  const [stats, setStats] = useState<EmployeeStats | null>(() => getPreloadedEmployeeSummary(companyId || undefined));
  const [historyPage, setHistoryPage] = useState(1);
  const [orgTree, setOrgTree] = useState<OrgNode[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const orgTreeRequests = useRef<Map<boolean, Promise<OrgNode[]>>>(new Map());
  const orgTreeHasEmployees = useRef(false);
  const pendingTreeLoads = useRef(0);
  const [loadError, setLoadError] = useState(false);

  const loadStats = useCallback(async () => {
    // The portal navigation begins this request on pointer hover.  Reusing it
    // here makes the route transition immediate instead of server-rendering
    // while the dashboard waits for the database.
    if (historyPage === 1) return preloadEmployeeSummary(companyId || undefined);
    const params = new URLSearchParams({ view: "summary" });
    params.set("historyPage", String(historyPage));
    if (companyId) params.set("companyId", companyId);
    // The active company is stored in a cookie.  Do not reuse a dashboard
    // response from the previously selected company.
    const res = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as EmployeeStats;
    if (historyPage === 1) storePreloadedEmployeeSummary(data, companyId || undefined);
    return data;
  }, [companyId, historyPage]);

  const loadOrgTree = useCallback(async (includeEmployees = false, fresh = false) => {
    // A tree that already carries employees also answers a structure-only
    // request. Only missing leaves force the heavier employee query again.
    if (!fresh) {
      if (orgTree !== null && (!includeEmployees || orgTreeHasEmployees.current)) return orgTree;
      const active = orgTreeRequests.current.get(includeEmployees);
      if (active) return active;
    }
    pendingTreeLoads.current += 1;
    setTreeLoading(true);
    const request = (async () => {
      const params = new URLSearchParams({ view: "tree" });
      if (includeEmployees) params.set("includeEmployees", "1");
      if (companyId) params.set("companyId", companyId);
      if (fresh) params.set("refresh", String(Date.now()));
      const res = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { orgTree: OrgNode[] };
      if (includeEmployees || !orgTreeHasEmployees.current) {
        setOrgTree(data.orgTree);
        orgTreeHasEmployees.current = includeEmployees;
      }
      return data.orgTree;
    })();
    orgTreeRequests.current.set(includeEmployees, request);
    try {
      return await request;
    } finally {
      if (orgTreeRequests.current.get(includeEmployees) === request) orgTreeRequests.current.delete(includeEmployees);
      pendingTreeLoads.current -= 1;
      if (pendingTreeLoads.current <= 0) setTreeLoading(false);
    }
  }, [companyId, orgTree]);

  const runLoad = useCallback(async () => {
    setLoadError(false);
    try {
      // Server-side employee mutations synchronously advance the read-model
      // version and pre-warm this snapshot. Reading it normally is both faster
      // and fresher than forcing an uncached database query here.
      invalidatePreloadedEmployeeSummary(companyId || undefined);
      setStats(await loadStats());
      // A mutation may have changed the employee list. Re-fetch the heavier
      // tree only if the user opens the picker or import tab afterwards.
      setOrgTree(null);
      orgTreeHasEmployees.current = false;
    } catch {
      if (!stats) setLoadError(true);
    }
  }, [companyId, loadStats, stats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadStats();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStats]);

  useEffect(() => {
    if (orgTree !== null) return;
    const timer = window.setTimeout(() => {
      void loadOrgTree(false);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [loadOrgTree, orgTree]);

  useEffect(() => {
    const closeEmployeeList = () => setSelectOpen(false);
    window.addEventListener("employee-list-close", closeEmployeeList);
    return () => window.removeEventListener("employee-list-close", closeEmployeeList);
  }, []);

  useEffect(() => {
    // A sidebar "ข้อมูลพนักงาน" click always opens the Dashboard submenu, even
    // when the page is already mounted at the same URL and keeps its own tab.
    const resetToEmployeeDashboard = () => {
      setActiveTab(SUBMENU_ITEMS[0]);
      setIsAddingEmployee(false);
      setSelectedEmployeeId(null);
      setSelectedEmployee(null);
      setSelectedEmployeeData(null);
      setSelectOpen(false);
      setHistoryPage(1);
    };
    window.addEventListener(EMPLOYEE_DASHBOARD_RESET_EVENT, resetToEmployeeDashboard);
    return () => window.removeEventListener(EMPLOYEE_DASHBOARD_RESET_EVENT, resetToEmployeeDashboard);
  }, []);

  useEffect(() => {
    const refreshEmployeeData = () => void runLoad();
    window.addEventListener("employee-data-changed", refreshEmployeeData);
    return () => window.removeEventListener("employee-data-changed", refreshEmployeeData);
  }, [runLoad]);

  useEffect(() => {
    let cancelled = false;
    const refreshForActiveCompany = (event: Event) => {
      const summary = (event as CustomEvent<{ summary?: EmployeeSummaryData | null }>).detail?.summary ?? null;
      // The layout has already promoted its company-specific preload to the
      // active key. Keep that request rather than invalidating it and causing
      // a second summary read after the cookie changes.
      setStats(summary);
      setHistoryPage(1);
      setOrgTree(null);
      orgTreeHasEmployees.current = false;
      setSelectOpen(false);
      setLoadError(false);
      if (summary) return;
      void preloadEmployeeSummary(companyId || undefined)
        .then((data) => {
          if (!cancelled) setStats(data);
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        });
    };
    window.addEventListener("active-company-changed", refreshForActiveCompany);
    return () => {
      cancelled = true;
      window.removeEventListener("active-company-changed", refreshForActiveCompany);
    };
  }, [companyId]);

  const selectEmployee = useCallback(async (employee: OrgNode) => {
    const requestId = ++employeeSelectionRequest.current;
    setSelectOpen(false);

    try {
      const response = await fetch(`/api/employee/${employee.id}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as EmployeeDetail;
      if (requestId !== employeeSelectionRequest.current) return;

      // Mount the detail page only after its complete basic data is ready.
      // This prevents the tree-node preview from briefly replacing form values.
      setSelectedEmployeeData(data);
      setSelectedEmployee(employee);
      setSelectedEmployeeId(employee.id);
    } catch {
      if (requestId !== employeeSelectionRequest.current) return;
      // Preserve the existing detail page if a replacement selection cannot load.
      if (!selectedEmployeeId) setLoadError(true);
    }
  }, [selectedEmployeeId]);

  if (selectedEmployeeId) {
    return (
      <OrganizationEmployeeDetailPage
        employeeId={selectedEmployeeId}
        selectedEmployee={selectedEmployee}
        initialEmployee={selectedEmployeeData}
        onBack={() => {
          setSelectedEmployeeId(null);
          setSelectedEmployee(null);
          setSelectedEmployeeData(null);
          // PATCH already advanced and rebuilt the server snapshot. Refresh
          // the dashboard from it as soon as the detail screen is dismissed.
          void runLoad();
        }}
      />
    );
  }

  if (isAddingEmployee) {
    return (
      <OrganizationEmployeeCreatePage
        onCancel={() => setIsAddingEmployee(false)}
        onComplete={() => {
          setIsAddingEmployee(false);
          void runLoad();
        }}
        employeeCount={stats?.total ?? null}
        employeeLimit={stats?.company?.employeeLimit ?? null}
      />
    );
  }

  return (
    <div
      data-employee-page
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest("[data-employee-select-panel]") && !target.closest("[data-employee-select-trigger]")) {
          setSelectOpen(false);
        }
      }}
    >
      <PageBanner
        onAddEmployee={() => setIsAddingEmployee(true)}
        total={stats?.total ?? null}
        companyCode={stats?.company?.code ?? null}
        employeeLimit={stats?.company?.employeeLimit ?? null}
      />

      <div className="relative min-h-[calc(100vh-10rem)] bg-[#f1f7fc] px-3 pb-8 pt-10 sm:px-4 lg:px-0 lg:pt-0">
        {selectOpen && (
          <EmployeeSelectPanel
            onClose={() => setSelectOpen(false)}
            orgTree={orgTree ?? []}
            loading={treeLoading && orgTree === null}
            onEmployeeSelect={(employee) => {
              void selectEmployee(employee);
            }}
          />
        )}

        <div
          className="grid items-start gap-3 lg:grid-cols-[226.3375px_minmax(0,1fr)] lg:gap-0"
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest("[data-employee-select-panel]")) {
              setSelectOpen(false);
            }
          }}
        >
          {/* เมนูย่อย */}
          <aside
            className="z-10 flex flex-col overflow-x-hidden overflow-y-auto border-none bg-[#fafafa] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)] lg:mt-10 lg:w-fit"
            style={{
              borderColor: "rgba(0, 0, 0, 0.87)",
              boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div className="border-none px-4 py-2" style={{ borderColor: "rgba(0, 0, 0, 0.87)" }}>
              <h2
                className="m-0 border-none text-xl font-normal leading-[31.425px] tracking-[-0.1px] text-[rgba(0,0,0,0.85)]"
                style={{ borderColor: "rgba(0, 0, 0, 0.85)" }}
              >
                เมนูย่อย
              </h2>
            </div>
            <div className="border-none p-2 px-4 text-sm font-normal leading-[22.001px] tracking-[-0.1px]" style={{ borderColor: "rgba(0, 0, 0, 0.87)" }}>
              {SUBMENU_ITEMS.map((item) => {
                const active = item === activeTab;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setActiveTab(item);
                      if (item === "นำเข้าข้อมูลพนักงาน" || item === "รูปพนักงาน" || item === "ข้อมูลพื้นฐาน" || item === "ข้อมูลเงินเดือน" || item === "กำหนดผู้อนุมัติรายบุคคล" || item === "ตั้งค่า Hashtag" || item === "ตั้งค่า Cost Distribution" || item === "ตั้งค่าคำนวณโควตาการลา") void loadOrgTree(true);
                    }}
                    className={cn(
                      "mb-3 block h-[41.2px] w-full rounded-[8px] border-[1.6px] px-2 py-2 text-center text-sm font-normal leading-[22.001px] tracking-[-0.1px] transition-colors",
                      active
                        ? "border-[#2299ff] bg-[#2299ff] text-white"
                        : "border-[#2299ff] bg-transparent text-[rgba(0,0,0,0.87)] hover:bg-[#edf7ff]"
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 lg:-mt-[15px]">
            {activeTab === "ลบข้อมูลพนักงาน" ? (
              <DeleteEmployeeContent />
            ) : activeTab === "นำเข้าข้อมูลพนักงาน" ? (
              <ImportEmployeeContent organizations={orgTree ?? []} />
            ) : activeTab === "รูปพนักงาน" ? (
              <EmployeePhotoContent orgTree={orgTree ?? []} loading={treeLoading} />
            ) : activeTab === "ข้อมูลพื้นฐาน" ? (
              <EmployeeBasicContent orgTree={orgTree ?? []} companyId={companyId} />
            ) : activeTab === "ข้อมูลเงินเดือน" ? (
              <SalaryInformationContent orgTree={orgTree ?? []} companyId={companyId} />
            ) : activeTab === "ข้อมูลผู้ใช้" ? (
              <UserInformationContent orgTree={orgTree ?? []} companyId={companyId} />
            ) : activeTab === "ข้อมูลใบหน้า" ? (
              <FaceInformationContent orgTree={orgTree ?? []} companyId={companyId} />
            ) : activeTab === "กำหนดผู้อนุมัติรายบุคคล" ? (
              <IndividualApproverContent orgTree={orgTree ?? []} companyId={companyId} />
            ) : activeTab === "ช่องทางการรับเงิน" ? (
              <PaymentMethodContent orgTree={orgTree ?? []} companyId={companyId} />
            ) : activeTab === "ตั้งค่ากะการทำงาน" ? (
              <WorkShiftSettingsContent orgTree={orgTree ?? []} companyId={companyId} />
            ) : activeTab === "ตั้งค่าการมองเห็นกะการทำงาน" ? (
              <WorkShiftVisibilityContent orgTree={orgTree ?? []} companyId={companyId} />
            ) : activeTab === "ตั้งค่าวันทำงาน-วันหยุด" ? (
              <WorkdayHolidayContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "ตั้งค่ากะการทำงาน-วันหยุด" ? (
  <ShiftHolidayContent companyId={companyId} />
) : activeTab === "ตั้งค่าทั่วไป" ? (
  <GeneralSettingsContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "รายรับรายจ่ายคงที่" ? (
  <FixedIncomeExpenseContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "รายรับรายจ่ายอัตโนมัติ" ? (
  <AutomaticIncomeExpenseContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "กองทุน" ? (
  <FundContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "เงินสะสมย้อนหลัง" ? (
  <HistoricalSavingsContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "เงินประกันการทำงาน" ? (
  <WorkInsuranceContent orgTree={orgTree ?? []} />
) : activeTab === "ตั้งค่าการแก้ไขข้อมูล" ? (
  <EditDataSettingsContent />
) : activeTab === "ตั้งค่า Hashtag" ? (
  <HashtagSettingsContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "ตั้งค่าสวัสดิการ" ? (
  <WelfareSettingsContent orgTree={orgTree ?? []} />
) : activeTab === "ตั้งค่าการมองเห็นประเภทโอที" ? (
  <OvertimeTypeVisibilityContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "ตั้งค่าการมองเห็นประเภทการลา" ? (
  <LeaveTypeVisibilityContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "ตั้งค่า Cost Distribution" ? (
  <CostDistributionContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "ตั้งค่าคำนวณโควตาการลา" ? (
  <LeaveQuotaCalculationContent orgTree={orgTree ?? []} companyId={companyId} />
) : activeTab === "ลดหย่อนภาษี" ? (
  <TaxDeductionContent orgTree={orgTree ?? []} />
) : activeTab === "นำเข้าฝึกอบรม" ? (
  <TrainingImportContent orgTree={orgTree ?? []} />
) : activeTab === "นำเข้าสินทรัพย์ถือครอง" ? (
  <AssetImportContent orgTree={orgTree ?? []} />
) : activeTab === "นำเข้าประวัติส่วนตัว" ? (
  <PersonalHistoryImportContent orgTree={orgTree ?? []} />
) : activeTab !== "Dashboard" ? (
              <TabPlaceholder tab={activeTab} />
            ) : loadError ? (
              <ErrorContent onRetry={runLoad} />
            ) : !stats ? (
              <LoadingContent />
            ) : (
              <DashboardContent stats={stats} historyPage={historyPage} onHistoryPageChange={setHistoryPage} onAddEmployee={() => setIsAddingEmployee(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A company switch is a client navigation, so reset page-local selection and
 * render the target company's already-preloaded snapshot without a reload. */
function OrganizationEmployeePageWithSearchParams() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId")?.trim() ?? "";
  const companySwitch = searchParams.get("companySwitch") === "1";
  return <OrganizationEmployeePageContent key={companyId} companyId={companyId} companySwitch={companySwitch} />;
}

/**
 * useSearchParams makes this boundary client-rendered for prerendered routes.
 * Rendering the normal no-data state here lets Next send the existing page
 * shell immediately; the client then loads the protected summary as usual.
 */
function OrganizationEmployeePageFallback() {
  return <OrganizationEmployeePageContent />;
}

export default function OrganizationEmployeePage() {
  return <Suspense fallback={<OrganizationEmployeePageFallback />}><OrganizationEmployeePageWithSearchParams /></Suspense>;
}
