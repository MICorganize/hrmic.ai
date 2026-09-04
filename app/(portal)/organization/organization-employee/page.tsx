"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  RefreshCw,
} from "lucide-react";

import { DeleteEmployeeContent } from "@/components/employee/DeleteEmployeeContent";
import { EmployeeSelectPanel, type OrgNode } from "@/components/employee/EmployeeSelectPanel";
import OrganizationEmployeeCreatePage from "./create/page";
import OrganizationEmployeeDetailPage from "./[id]/page";
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

/* ---------------------------------- Types --------------------------------- */

type EmployeeStats = {
  total: number;
  company: { id: string; name: string; code: string | null } | null;
  byGender: { male: number; female: number; other: number; unknown: number };
  byEmploymentType: Record<string, number>;
  byBranch: { name: string; count: number }[];
  byNationality: { nationality: string; count: number }[];
  history: { id: string; subject: string; by: string; date: string; note: string }[];
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
}: {
  selectOpen: boolean;
  onToggleSelect: () => void;
  onAddEmployee: () => void;
  total: number | null;
  companyCode: string | null;
}) {
  const maxDisplay = 2;
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
              "inline-flex h-[36.65px] w-[170.8px] items-center gap-1 rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.2),0px_2px_2px_0px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)] transition-colors hover:bg-slate-100",
              selectOpen && "bg-slate-100"
            )}
            aria-expanded={selectOpen}
          >
            <Menu className="size-6" />
            เลือกพนักงาน
          </button>
        </div>
      </div>

      {/* Center column: progress bar */}
      <div className="mx-16 hidden flex-1 flex-col items-center justify-center md:flex">
        <div className="h-2 w-full overflow-hidden bg-[#c5c6cb] [background-image:radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.25)_1px,transparent_1.25px)] [background-size:8px_4px]">
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

function DashboardContent({ stats }: { stats: EmployeeStats }) {
  return (
    <Card
      className="ml-4 overflow-visible rounded-lg border-none bg-white text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]"
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
            <Table className="min-w-[960px] border border-[#f0f0f0]">
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

        {/* Row 4: ประวัติการแก้ไขข้อมูลพนักงาน */}
        <div className="flex">
          <div className="m-6 min-w-0 xl:w-[916px] xl:shrink-0">
          <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">ประวัติการแก้ไขข้อมูลพนักงาน</p>
          <div className="w-full overflow-x-auto xl:w-[916px]">
            <Table className="min-w-[900px] border border-[#f0f0f0]">
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
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [orgTree, setOrgTree] = useState<OrgNode[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadStats = useCallback(async (fresh = false) => {
    const params = new URLSearchParams({ view: "summary" });
    if (companyId) params.set("companyId", companyId);
    if (fresh) params.set("refresh", String(Date.now()));
    const res = await fetch(`/api/employee?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as EmployeeStats;
  }, [companyId]);

  const loadOrgTree = useCallback(async (fresh = false) => {
    if (!fresh && orgTree !== null) return orgTree;
    setTreeLoading(true);
    try {
      const params = new URLSearchParams({ view: "tree" });
      if (companyId) params.set("companyId", companyId);
      if (fresh) params.set("refresh", String(Date.now()));
      const res = await fetch(`/api/employee?${params.toString()}`);
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

  if (selectedEmployeeId) {
    return (
      <OrganizationEmployeeDetailPage
        employeeId={selectedEmployeeId}
        selectedEmployee={selectedEmployee}
        onBack={() => {
          setSelectedEmployeeId(null);
          setSelectedEmployee(null);
        }}
        onEmployeeChange={(employee) => {
          setSelectedEmployee(employee);
          setSelectedEmployeeId(employee.id);
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
      />
    );
  }

  return (
    <div
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
      />

      <div className="relative min-h-[calc(100vh-10rem)] bg-[#f1f7fc] px-3 pb-8 pt-10 sm:px-4 lg:px-0 lg:pt-0">
        {selectOpen && (
          <EmployeeSelectPanel
            onClose={() => setSelectOpen(false)}
            orgTree={orgTree ?? []}
            loading={treeLoading}
            onEmployeeSelect={(employee) => {
              setSelectedEmployee(employee);
              setSelectedEmployeeId(employee.id);
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
                      if (item === "นำเข้าข้อมูลพนักงาน") void loadOrgTree();
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
            ) : activeTab !== "Dashboard" ? (
              <TabPlaceholder tab={activeTab} />
            ) : loadError ? (
              <ErrorContent onRetry={runLoad} />
            ) : !stats ? (
              <LoadingContent />
            ) : (
              <DashboardContent stats={stats} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
