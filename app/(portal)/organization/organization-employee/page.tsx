"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";

import { DeleteEmployeeContent } from "@/components/employee/DeleteEmployeeContent";
import { EmployeeSelectPanel, type OrgNode } from "@/components/employee/EmployeeSelectPanel";
import OrganizationEmployeeCreatePage from "./create/page";
import OrganizationEmployeeDetailPage, { type EmployeeDetail } from "./[id]/page";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

/* ---------------------------------- Types --------------------------------- */

type EmployeeStats = {
  total: number;
  company: { id: string; name: string; code: string | null; employeeLimit: number | null } | null;
  byGender: { male: number; female: number; other: number; unknown: number };
  byEmploymentType: Record<string, number>;
  byBranch: { name: string; count: number }[];
  byNationality: { nationality: string; count: number }[];
  history: { id: string; subject: string; by: string; date: string; note: string }[];
  historyTotal: number;
};

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
  useEffect(() => setExpanded((current) => new Set([...current, ...companies.map((company) => company.id)])), [companies]);
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
  selectOpen,
  onToggleSelect,
  onAddEmployee,
  total,
  companyCode,
  employeeLimit,
}: {
  selectOpen: boolean;
  onToggleSelect: () => void;
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
      {/* Left column: breadcrumb, title, select button */}
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

        {/* Select employee button */}
        <div className="hidden md:block">
          <button
            type="button"
            data-employee-select-trigger
            onClick={onToggleSelect}
            className={cn(
              "inline-flex h-[36.65px] w-[170.8px] items-center justify-center gap-0 rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.2),0px_2px_2px_0px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)] transition-colors hover:bg-slate-100",
              selectOpen && "bg-slate-100"
            )}
            aria-expanded={selectOpen}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-6 shrink-0" fill="currentColor">
              <path d="M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z" />
            </svg>
            เลือกพนักงาน
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
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
        <RefreshCw className="size-6 animate-spin" />
        <span className="text-sm">กำลังโหลดข้อมูล...</span>
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

function DashboardContent({
  stats,
  historyPage,
  onHistoryPageChange,
}: {
  stats: EmployeeStats;
  historyPage: number;
  onHistoryPageChange: (page: number) => void;
}) {
  const historyPageCount = Math.max(1, Math.ceil(stats.historyTotal / 10));
  const historyPageNumbers = (() => {
    if (historyPageCount <= 7) return Array.from({ length: historyPageCount }, (_, index) => index + 1);
    if (historyPage <= 3) return [1, 2, 3, 4, 5, historyPageCount];
    if (historyPage >= historyPageCount - 2) return [1, historyPageCount - 4, historyPageCount - 3, historyPageCount - 2, historyPageCount - 1, historyPageCount];
    return [1, historyPage - 1, historyPage, historyPage + 1, historyPageCount];
  })();
  return (
    <Card
      className="ml-4 overflow-hidden rounded-lg border-none bg-white text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)] xl:h-[1752.625px]"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
    >
      {/* Card header with title and ? button */}
      <div className="flex h-[59.3625px] items-center border-b border-[rgba(0,0,0,0.12)] p-3 text-[22px] font-normal leading-[34.573px] tracking-[-0.1px]">
        <span>Dashboard</span>
        <button
          type="button"
          className="hidden"
          aria-label="ข้อมูลเพิ่มเติม"
        >
          ?
        </button>
      </div>

      {/* Card body */}
      <div className="border-none px-2 py-4">
        {/* Row 1: เพศ, ประเภทพนักงาน, พนักงานแต่ละสาขา */}
        <div className="flex flex-col px-6 py-6 xl:h-[336.825px] xl:flex-row xl:gap-12">
          {/* เพศ */}
          <div className="min-w-0 xl:h-[288.825px] xl:w-[378px] xl:shrink-0">
            <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">เพศ</p>
            <div
              className="my-2 h-[242.425px] rounded-[8px] border-none bg-white p-3 text-base font-bold leading-[25.144px] tracking-[-0.1px]"
              style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
            >
              <div className="flex h-[155.7125px] items-center justify-center text-center text-2xl leading-[37.716px]">
                {GENDERS.map((g) => (
                  <div key={g.key} className={cn("flex flex-1 flex-col items-center justify-center", g.iconClass)}>
                    <g.icon className="size-[118px] font-normal leading-6" />
                    <span className={cn("font-bold leading-[37.716px]", g.countClass)}>
                      {stats.byGender[g.key]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="my-3 h-px bg-[#f0f0f0]" />
              <div className="flex h-[37.7125px] items-center justify-center text-2xl font-bold leading-[37.716px]">
                รวม{"\u00A0\u00A0"}<span className="font-bold text-[#5ca6f4]">{stats.total}</span>{"\u00A0\u00A0"}คน
              </div>
            </div>
          </div>

          {/* ประเภทพนักงาน */}
          <div className="min-w-0 xl:h-[288.825px] xl:w-[209.825px] xl:shrink-0">
            <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">ประเภทพนักงาน</p>
            <div>
              {EMPLOYEE_TYPES.map((t) => (
                <div
                  key={t.key}
                  className="my-2 flex h-[49.1375px] items-center rounded-[8px] border-none bg-white p-3 text-base font-bold leading-[25.144px] tracking-[-0.1px]"
                  style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
                >
                  <div className="flex w-full justify-between gap-3">
                    <span>{t.label}</span>
                    <span className="shrink-0">
                      {typeCount(stats, t.key)}{"\u00A0\u00A0"}คน
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* พนักงานแต่ละสาขา */}
          <div className="min-w-0 xl:h-[288.825px] xl:w-[209.8375px] xl:shrink-0">
            <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">พนักงานแต่ละสาขา</p>
            <div
              className="my-2 min-h-[49.1375px] rounded-[8px] border-none bg-white p-3 text-base font-bold leading-[25.144px] tracking-[-0.1px]"
              style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
            >
              {stats.byBranch.length === 0 ? (
                <div className="py-4 text-center text-base text-muted-foreground">ไม่มีข้อมูล</div>
              ) : (
                <div>
                  {stats.byBranch.map((b) => (
                    <div key={b.name} className="flex w-full justify-between gap-3">
                      <span>{b.name}</span>
                      <span className="shrink-0">{b.count}{"\u00A0\u00A0"}คน</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: สัญชาติ (48% width) */}
        <div className="flex xl:h-[193.975px]">
          <div className="ml-6 min-w-0 xl:h-[193.975px] xl:w-[451.9875px] xl:shrink-0">
            <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">สัญชาติ</p>
            <div
              className="my-2 h-[149.7px] rounded-[8px] border-none bg-white p-3 text-center text-base font-bold leading-[25.144px] tracking-[-0.1px]"
              style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
            >
              <div className="flex h-[125.7px] items-center justify-center gap-0 text-center text-xl leading-[31.43px]">
              <div className="w-[150px]">
                <span>ไทย</span>
                <div className="text-base">
                  <span className="font-bold text-[#5ca6f4]">{stats.byNationality.find(n => n.nationality === "ไทย")?.count ?? 0}</span>{"\u00A0\u00A0"}คน
                </div>
              </div>
              <div className="w-[160px]">
                <span>ต่างชาติ</span>
                <div className="text-base">
                  <span className="font-bold text-[#5ca6f4]">{stats.byNationality.find(n => n.nationality === "ต่างชาติ")?.count ?? 0}</span>{"\u00A0\u00A0"}คน
                </div>
              </div>
              <div className="flex-1">
                <span className="text-base leading-5">ไม่ระบุสัญชาติ / บุคคลพื้นที่สูง</span>
                <div className="text-base">
                  <span className="font-bold text-[#5ca6f4]">{stats.byNationality.find(n => n.nationality !== "ไทย" && n.nationality !== "ต่างชาติ")?.count ?? 0}</span>{"\u00A0\u00A0"}คน
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Row 3: เอกสารหมดอายุ */}
        <div className="flex xl:h-[294.675px]">
          <div className="m-6 min-w-0 xl:h-[246.675px] xl:w-[976px] xl:shrink-0">
          <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">เอกสารหมดอายุ</p>
          <div className="w-full overflow-x-auto xl:w-[976px]">
            <div className="overflow-hidden rounded-[8px] border border-[#f0f0f0]">
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                  <TableHead className="w-20 bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">ลำดับ</TableHead>
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">ประเภทเอกสาร</TableHead>
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">ชื่อเอกสาร</TableHead>
                  <TableHead className="w-[150px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">วันหมดอายุ</TableHead>
                  <TableHead className="w-[150px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">หมดอายุภายใน</TableHead>
                  <TableHead className="w-20 bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-[150.8px] hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <div className="flex h-[150.8px] flex-col items-center justify-center gap-2 text-muted-foreground">
                      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                          <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                          <g fillRule="nonzero" stroke="#d9d9d9">
                            <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                          </g>
                        </g>
                      </svg>
                      <span className="text-sm">ไม่มีข้อมูล</span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
          </div>
          </div>
        </div>

        {/* Row 4: ประวัติการแก้ไขข้อมูลพนักงาน */}
        <div className="flex">
          <div className="m-6 min-w-0 xl:w-[916px] xl:shrink-0">
          <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">ประวัติการแก้ไขข้อมูลพนักงาน</p>
          <div className="w-full overflow-x-auto xl:w-[916px]">
            <div className="overflow-hidden rounded-[8px] border border-[#f0f0f0]">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">แก้ไขของ</TableHead>
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">แก้ไขโดย</TableHead>
                  <TableHead className="w-[150px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">วันที่แก้ไข</TableHead>
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.history.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4}>
                      <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
                        <span className="text-sm">ไม่มีข้อมูล</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.history.map((row, i) => (
                    <TableRow key={row.id} className={cn("h-[60.8px]", i % 2 === 0 ? "bg-[#f2fafe]" : "bg-white")}>
                      <TableCell className="p-2 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]">{row.subject}</TableCell>
                      <TableCell className="p-2 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]">{row.by}</TableCell>
                      <TableCell className="whitespace-nowrap p-2 text-center text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]">{row.date}</TableCell>
                      <TableCell className="p-2 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]"><p className="m-0 p-0">{row.note}</p></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
          {stats.historyTotal > 10 && (
            <nav className="mt-4 flex items-center justify-end gap-2 text-sm leading-[22.001px]" aria-label="แบ่งหน้าประวัติการแก้ไขข้อมูลพนักงาน">
              <button type="button" onClick={() => onHistoryPageChange(historyPage - 1)} disabled={historyPage === 1} aria-label="หน้าก่อนหน้า" className="flex size-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-black/[0.54] disabled:cursor-not-allowed disabled:text-black/25">
                <svg aria-hidden="true" viewBox="64 64 896 896" className="size-3 fill-current"><path d="M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8a31.86 31.86 0 000 50.3l450.8 352.1c5.2 4.1 12.9.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.2-12.6L361.2 512l356.6-280.8c3.9-3.1 6.2-7.7 6.2-12.9z" /></svg>
              </button>
              {historyPageNumbers.map((page, index) => (
                <span key={page} className="contents">
                  {index > 0 && page - historyPageNumbers[index - 1] > 1 && <span className="flex size-8 items-center justify-center text-black/45">•••</span>}
                  <button type="button" onClick={() => onHistoryPageChange(page)} aria-current={page === historyPage ? "page" : undefined} className={cn("flex size-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-sm font-normal leading-[30px] text-black/65", page === historyPage ? "border-[#1890ff] font-medium text-[#039be5]" : "hover:border-[#1890ff] hover:text-[#1890ff]")}>{page}</button>
                </span>
              ))}
              <button type="button" onClick={() => onHistoryPageChange(historyPage + 1)} disabled={historyPage === historyPageCount} aria-label="หน้าถัดไป" className="flex size-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-black/[0.54] disabled:cursor-not-allowed disabled:text-black/25">
                <svg aria-hidden="true" viewBox="64 64 896 896" className="size-3 fill-current"><path d="M765.7 486.8 314.9 134.7c-5.2-4.1-12.9-.4-12.9 6.3v77.3c0 4.9 2.3 9.6 6.2 12.6L664.8 512 308.2 793.2c-3.9 3.1-6.2 7.7-6.2 12.6v77.3c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.86 31.86 0 000-50.3z" /></svg>
              </button>
            </nav>
          )}
          </div>
        </div>
      </div>
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
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => void saveAssignments("department", selectedDepartmentEmployees, organization)} className="m-1 h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#029702]">บันทึก</button></div>
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
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => void saveAssignments("position", selectedPositionEmployees, position)} className="m-1 h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#029702]">บันทึก</button></div>
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
  title: string;
  name: string;
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
};

function CardInputHeader({ title }: { title: string }) {
  return (
    <div className="card-input-header tooltip-header-hover flex items-center border-b border-black/[0.12] px-3 py-3 text-[22px] font-normal leading-[34.573px] text-[rgba(0,0,0,0.87)]">
      <div className="flex items-center">
        {title}
        <button
          type="button"
          className="tooltip-header ml-2 inline-flex size-4 items-center justify-center rounded-full border border-current text-[10px] leading-none text-black/65"
          aria-label={`ข้อมูลเพิ่มเติมเกี่ยวกับ${title}`}
          title={`ข้อมูลเพิ่มเติมเกี่ยวกับ${title}`}
        >
          <span className="text" aria-hidden="true">?</span>
        </button>
      </div>
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
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || employeeOrganizationIds.get(row.id)?.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const updateRow = (id: string, field: keyof BasicEmployeeRow, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
    setSaveState("idle");
  };

  const save = async () => {
    setSaveState("saving");
    try {
      const responses = await Promise.all(rows.map(({ id, name: _name, department: _department, division: _division, unit: _unit, position: _position, ...changes }) =>
        fetch(`/api/employee/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) })
      ));
      if (responses.some((response) => !response.ok)) throw new Error("save failed");
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

          <div className="fix-column-table max-h-[80vh] overflow-auto rounded-[8px] bg-white">
            <Table className="min-w-[2700px] table-fixed font-[Kanit,sans-serif] text-sm leading-[22.001px]">
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
                  <TableCell className={cellClass}><input type="date" value={row.birthDate} onChange={(event) => updateRow(row.id, "birthDate", event.target.value)} className={tableInputClass} /></TableCell>
                  {(["phone", "email"] as const).map((field) => <TableCell key={field} className={cellClass}><input type={field === "email" ? "email" : "text"} value={row[field]} onChange={(event) => updateRow(row.id, field, event.target.value)} className={tableInputClass} /></TableCell>)}
                </TableRow>)}
              </TableBody>
            </Table>
            {!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าข้อมูลพื้นฐาน"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}
          </div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => void save()} disabled={saveState === "saving"} className="h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:opacity-60">{saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก"}</button></div>
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
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
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
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || employeeOrganizationIds.get(row.id)?.includes(filters.organizationId);
    const normalizedHashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();
    return matchesOrganization && (!normalizedHashtag || row.hashtag.toLocaleLowerCase().includes(normalizedHashtag));
  });

  const updateRow = (id: string, field: keyof BasicEmployeeRow, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
    setSaveState("idle");
  };

  const save = async () => {
    setSaveState("saving");
    try {
      const responses = await Promise.all(rows.map((row) => fetch(`/api/employee/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSalary: row.baseSalary,
          advanceType: row.advanceType,
          advanceLimit: row.advanceLimit,
          hireDate: row.hireDate,
          confirmationDate: row.confirmationDate,
          probationDays: row.probationDays,
          socialSecurityCalc: row.socialSecurityCalc,
          socialSecurityFixed: row.socialSecurityFixed,
          taxCalc: row.taxCalc,
          taxFixed: row.taxFixed,
        }),
      })));
      if (responses.some((response) => !response.ok)) throw new Error("save failed");
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
                  <TableCell className={cellClass}><input type="date" value={row.hireDate} onChange={(event) => updateRow(row.id, "hireDate", event.target.value)} className={tableInputClass} /></TableCell>
                  <TableCell className={cellClass}><input type="date" required value={row.confirmationDate} onChange={(event) => updateRow(row.id, "confirmationDate", event.target.value)} className={tableInputClass} /></TableCell>
                  <TableCell className={cellClass}><input type="number" min="0" max="999" value={row.probationDays} onChange={(event) => updateRow(row.id, "probationDays", event.target.value)} className={tableInputClass} /></TableCell>
                  <TableCell className={cellClass}><select value={row.socialSecurityCalc} onChange={(event) => updateRow(row.id, "socialSecurityCalc", event.target.value)} className={tableSelectClass}><option value="">-</option>{["ไม่คิดประกันสังคม", "คิดประกันสังคม", "กำหนดค่าคงที่"].map((value) => <option key={value}>{value}</option>)}</select></TableCell>
                  <TableCell className={`${cellClass} text-right`}><input type="number" min="0" value={row.socialSecurityFixed} className={tableInputClass} disabled /></TableCell>
                  <TableCell className={cellClass}><select value={row.taxCalc} onChange={(event) => updateRow(row.id, "taxCalc", event.target.value)} className={tableSelectClass}><option value="">-</option>{["คิดภาษี ภงด.1 ใหม่ทุกเดือน", "คิดตามฐานเงินเดือนจริงที่ได้รับ", "ไม่คิดภาษี"].map((value) => <option key={value}>{value}</option>)}</select></TableCell>
                  <TableCell className={`${cellClass} text-right`}><input type="number" min="0" value={row.taxFixed} className={tableInputClass} disabled /></TableCell>
                  <TableCell className={`${cellClass} text-center`} />
                </TableRow>)}
              </TableBody>
            </Table>
            {!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าข้อมูลเงินเดือน"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}
          </div>
          <p className="text-sm leading-[22.001px] text-[#ff0000]">*** กรณีที่มีการแก้ไขแล้วไม่กดบันทึก ถ้ากดเปลี่ยนหน้าถัดไปข้อมูลก่อนหน้าที่มีการแก้ไขจะไม่ถูกบันทึก</p>
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => void save()} disabled={saveState === "saving"} className="h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] disabled:opacity-60">{saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก"}</button></div>
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
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const groupsFor = (row: BasicEmployeeRow) => row.employeeType === "พนักงานรายเดือน" ? ["EMPLOYEE"] : ["EMPLOYEE"];
  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || employeeOrganizationIds.get(row.id)?.includes(filters.organizationId);
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
            {!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าข้อมูลผู้ใช้"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}
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
  const [rows, setRows] = useState<BasicEmployeeRow[]>([]);
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const visibleRows = rows.filter((row) => {
    const matchesOrganization = !filters.organizationId || employeeOrganizationIds.get(row.id)?.includes(filters.organizationId);
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
            {!loading && visibleRows.length > 0 && <nav className="flex h-16 items-center justify-end px-4" aria-label="แบ่งหน้าข้อมูลใบหน้า"><span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">1</span></nav>}
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
    return (!filters.organizationId || employeeOrganizationIds.get(row.id)?.includes(filters.organizationId))
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
          <div className="mb-2 mt-3 flex justify-end"><button type="button" onClick={() => setSaveState("saved")} className="h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-medium leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#029702]">{saveState === "saved" ? "บันทึกแล้ว" : "บันทึก"}</button></div>
          <div className="border-t border-[#f0f0f0] pt-6"><div className="sub-header text-lg font-bold leading-[28px] text-[rgba(0,0,0,0.87)]">ประวัติการนำเข้าข้อมูลผู้อนุมัติ</div><div className="mt-2 overflow-x-auto"><Table className="min-w-[800px] table-fixed"><TableHeader><TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">{["ลำดับ", "File", "วันที่", "จำนวนข้อมูล", "นำเข้าข้อมูล", "อัพเดตข้อมูล", "ข้อมูลผิดพลาด", "Log"].map((header) => <TableHead key={header} className="border border-[#f0f0f0] bg-[#61a8ff] p-4 text-center text-sm font-medium text-white">{header}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow className="hover:bg-transparent"><TableCell colSpan={8} className="h-40 border border-[#f0f0f0] text-center text-sm text-black/45">ไม่มีข้อมูล</TableCell></TableRow></TableBody></Table></div></div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodContent() {
  return (
    <Card
      className="card-input-container relative mx-4 mb-3 overflow-hidden rounded-lg border-0 bg-white"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px rgba(0,0,0,0.14),0px 1px 3px rgba(0,0,0,0.12)" }}
    >
      <CardInputHeader title="ช่องทางการรับเงิน" />
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

/* ---------------------------------- Page ---------------------------------- */

export default function OrganizationEmployeePage() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId")?.trim() ?? "";
  const [activeTab, setActiveTab] = useState(SUBMENU_ITEMS[0]);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [selectOpen, setSelectOpen] = useState(() => Boolean(companyId));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgNode | null>(null);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState<EmployeeDetail | null>(null);
  const employeeSelectionRequest = useRef(0);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [orgTree, setOrgTree] = useState<OrgNode[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadStats = useCallback(async (fresh = false) => {
    const params = new URLSearchParams({ view: "summary" });
    params.set("historyPage", String(historyPage));
    if (companyId) params.set("companyId", companyId);
    if (fresh) params.set("refresh", String(Date.now()));
    // The active company is stored in a cookie.  Do not reuse a dashboard
    // response from the previously selected company.
    const res = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as EmployeeStats;
  }, [companyId, historyPage]);

  const loadOrgTree = useCallback(async (fresh = false) => {
    if (!fresh && orgTree !== null) return orgTree;
    setTreeLoading(true);
    try {
      const params = new URLSearchParams({ view: "tree" });
      if (companyId) params.set("companyId", companyId);
      if (fresh) params.set("refresh", String(Date.now()));
      const res = await fetch(`/api/employee?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { orgTree: OrgNode[] };
      setOrgTree(data.orgTree);
      return data.orgTree;
    } finally {
      setTreeLoading(false);
    }
  }, [companyId, orgTree]);

  const runLoad = useCallback(async () => {
    setLoadError(false);
    try {
      setStats(await loadStats(true));
      // A mutation may have changed the employee list. Re-fetch the heavier
      // tree only if the user opens the picker or import tab afterwards.
      setOrgTree(null);
    } catch {
      if (!stats) setLoadError(true);
    }
  }, [loadStats, stats]);

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
    // Warm the picker cache only after the dashboard is interactive. This
    // makes a later "เลือกพนักงาน" click instant without delaying first paint.
    if (!stats || orgTree !== null || treeLoading) return;
    const idleId = window.requestIdleCallback?.(() => void loadOrgTree(), { timeout: 2_000 });
    if (idleId !== undefined) return () => window.cancelIdleCallback(idleId);
    const timer = window.setTimeout(() => void loadOrgTree(), 1_200);
    return () => window.clearTimeout(timer);
  }, [loadOrgTree, orgTree, stats, treeLoading]);

  useEffect(() => {
    const closeEmployeeList = () => setSelectOpen(false);
    window.addEventListener("employee-list-close", closeEmployeeList);
    return () => window.removeEventListener("employee-list-close", closeEmployeeList);
  }, []);

  useEffect(() => {
    const refreshEmployeeData = () => void runLoad();
    window.addEventListener("employee-data-changed", refreshEmployeeData);
    return () => window.removeEventListener("employee-data-changed", refreshEmployeeData);
  }, [runLoad]);

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
        }}
        onEmployeeChange={(employee) => {
          void selectEmployee(employee);
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
        selectOpen={selectOpen}
        onToggleSelect={() => {
          if (!selectOpen) void loadOrgTree();
          setSelectOpen((current) => !current);
        }}
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
            loading={treeLoading}
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
                      if (item === "นำเข้าข้อมูลพนักงาน" || item === "รูปพนักงาน" || item === "ข้อมูลพื้นฐาน" || item === "ข้อมูลเงินเดือน" || item === "กำหนดผู้อนุมัติรายบุคคล") void loadOrgTree();
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
              <PaymentMethodContent />
            ) : activeTab !== "Dashboard" ? (
              <TabPlaceholder tab={activeTab} />
            ) : loadError ? (
              <ErrorContent onRetry={runLoad} />
            ) : !stats ? (
              <LoadingContent />
            ) : (
              <DashboardContent stats={stats} historyPage={historyPage} onHistoryPageChange={setHistoryPage} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
