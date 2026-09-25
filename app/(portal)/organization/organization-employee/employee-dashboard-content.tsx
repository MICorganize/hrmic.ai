"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, Search, UserPlus } from "lucide-react";

import type { OrgNode } from "@/components/employee/EmployeeSelectPanel";
import { useBasicEmployeePage } from "@/hooks/use-basic-employee-page";
import type { EmployeeSummaryData } from "@/lib/employee/summary-client";
import { formatThaiDateNumeric } from "@/lib/date/thai-date";
import { cn } from "@/lib/utils";

type EmployeeListRow = {
  id: string;
  organizationIds: string[];
  name: string;
  branch: string;
  department: string;
  division: string;
  unit: string;
  position: string;
  employeeCode: string;
  employeeType: string;
  hireDate: string;
  confirmationDate: string;
  hashtag: string;
};

type EmploymentStatus = "waiting" | "probation" | "permanent";
type StatusFilter = "all" | EmploymentStatus | "inactive" | "invited";

const AVATAR_COLORS = ["#5eaafa", "#4b91df", "#367fc9", "#276faf", "#6b9bd3", "#4387bd", "#3567a8"];

function employeeStatus(row: EmployeeListRow): EmploymentStatus {
  if (row.hireDate) {
    const startDate = new Date(`${row.hireDate}T00:00:00`);
    if (!Number.isNaN(startDate.getTime()) && startDate.getTime() > Date.now()) return "waiting";
  }
  return row.confirmationDate ? "permanent" : "probation";
}

function statusLabel(status: EmploymentStatus) {
  if (status === "waiting") return "รอเริ่มงาน";
  if (status === "permanent") return "บรรจุ";
  return "ทดลองงาน";
}

function formatHireDate(value: string) {
  if (!value) return "-";
  const start = new Date(`${value}T00:00:00`);
  if (Number.isNaN(start.getTime())) return value;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const date = formatThaiDateNumeric(value);
  const duration = [years > 0 ? `${years} ปี` : "", months > 0 ? `${months} เดือน` : "", `${Math.max(0, days)} วัน`].filter(Boolean).join(" ");
  return `${date} (${duration})`;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("") || "พ";
}

function nameWithoutNickname(name: string) {
  const withoutNickname = name.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return withoutNickname || name.trim();
}

export function DashboardContent({
  stats,
  onEmployeeSelect,
  onAddEmployee,
}: {
  stats: EmployeeSummaryData;
  historyPage: number;
  onHistoryPageChange: (page: number) => void;
  onEmployeeSelect?: (employee: OrgNode) => void;
  onAddEmployee: () => void;
}) {
  const companyId = stats.company?.id ?? "";
  const { rows, loading, page, hasNextPage, hasPreviousPage, next, previous } = useBasicEmployeePage<EmployeeListRow>(companyId, 100);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [department, setDepartment] = useState("");
  const [employeeType, setEmployeeType] = useState("");

  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort(), [rows]);
  const employeeTypes = useMemo(() => [...new Set(rows.map((row) => row.employeeType).filter(Boolean))].sort(), [rows]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = rows.filter((row) => {
      const status = employeeStatus(row);
      const matchesStatus = statusFilter === "all" || (statusFilter !== "inactive" && statusFilter !== "invited" && status === statusFilter);
      const matchesQuery = !normalizedQuery || `${row.employeeCode} ${row.name} ${row.position} ${row.department}`.toLocaleLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery && (!department || row.department === department) && (!employeeType || row.employeeType === employeeType);
    });
    return filtered;
  }, [department, employeeType, query, rows, statusFilter]);

  const selectEmployee = (row: EmployeeListRow) => {
    onEmployeeSelect?.({ id: row.id, code: row.employeeCode, name: row.name, positionName: row.position, type: row.employeeType, organizationIds: row.organizationIds });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#e7e8ec] bg-white shadow-[0_2px_10px_rgba(20,32,56,.04)]">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <label className="relative block w-full max-w-[240px]"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#b0b0b8]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาพนักงาน" className="h-9 w-full rounded-md border border-[#dddde3] bg-white pl-9 pr-3 text-sm text-[#34343d] outline-none transition-colors placeholder:text-[#b4b4bb] focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20" /></label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative"><DropdownSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-9 min-w-[122px] appearance-none rounded-md border border-[#dddde3] bg-white pl-3 pr-9 text-sm text-[#777780] outline-none transition-colors focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20"><option value="all">ทั้งหมด</option><option value="waiting">รอเริ่มงาน</option><option value="probation">ทดลองงาน</option><option value="permanent">บรรจุ</option></DropdownSelect></label>
          <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className={cn("inline-flex h-9 items-center gap-2 rounded-md border border-[#dddde3] bg-white px-3 text-sm font-normal text-[#777780] outline-none transition-colors hover:bg-[#fafafa] focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20", filtersOpen && "border-[#5eaafa] bg-[#f4f9ff] text-[#5eaafa]")}><Filter className="size-4" />ตัวกรอง<ChevronDown className={cn("size-4 transition-transform", filtersOpen && "rotate-180")} /></button>
          <button type="button" onClick={onAddEmployee} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1474ee] px-4 text-sm font-medium text-white shadow-[0_4px_12px_rgba(20,116,238,.24)] hover:bg-[#0d65d8]"><UserPlus className="size-4" />เพิ่มพนักงาน</button>
        </div>
      </div>

      {filtersOpen && <div className="grid gap-3 border-t border-[#eeeef1] bg-[#fafafa] px-4 py-3 sm:grid-cols-2 sm:px-5">
        <label className="text-xs text-[#777780]">แผนก<DropdownSelect value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#dddde3] bg-white px-3 text-sm text-[#44444e] outline-none"><option value="">ทั้งหมด</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</DropdownSelect></label>
        <label className="text-xs text-[#777780]">ประเภทพนักงาน<DropdownSelect value={employeeType} onChange={(event) => setEmployeeType(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#dddde3] bg-white px-3 text-sm text-[#44444e] outline-none"><option value="">ทั้งหมด</option>{employeeTypes.map((item) => <option key={item} value={item}>{item}</option>)}</DropdownSelect></label>
      </div>}

      <div className="overflow-x-auto px-4 pb-3 sm:px-5">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-left text-sm">
          <colgroup><col className="w-[80px]" /><col className="w-[225px]" /><col className="w-[115px]" /><col className="w-[230px]" /><col className="w-[140px]" /><col className="w-[285px]" /><col className="w-[105px]" /></colgroup>
          <thead><tr className="h-11 bg-[#edf6ff] text-[#355f8a]"><th className="px-4 font-semibold">รหัส</th><th className="px-4 font-semibold">รายชื่อ</th><th className="px-4 font-semibold">ตำแหน่ง</th><th className="px-4 font-semibold">แผนก</th><th className="px-4 font-semibold">กะการทำงาน</th><th className="px-4 font-semibold">วันที่เริ่มงาน</th><th className="px-4 font-semibold">สถานะ</th></tr></thead>
          <tbody className="text-sm font-normal">
            {loading ? <tr><td colSpan={7} className="h-40 text-center text-[#9999a2]">กำลังโหลดข้อมูลพนักงาน...</td></tr> : visibleRows.length === 0 ? <tr><td colSpan={7} className="h-40 text-center text-[#9999a2]">ไม่พบข้อมูลพนักงาน</td></tr> : visibleRows.map((row, index) => {
              const status = employeeStatus(row);
              const displayName = nameWithoutNickname(row.name);
              return <tr key={row.id} className="h-[55px] border-b border-[#e5edf6] text-[#565660] transition-colors hover:bg-[#f4f9ff]">
                <td className="px-4 text-[#65656e]">{row.employeeCode || "-"}</td>
                <td className="px-4"><button type="button" onClick={() => selectEmployee(row)} className="flex w-full items-center gap-2.5 text-left"><span className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white" style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}>{initials(displayName)}</span><span className="min-w-0"><span className="block truncate text-sm font-normal text-[#33333d]">{displayName}</span><span className="block truncate text-xs text-[#92929b]">{row.position || "ไม่ระบุตำแหน่ง"}</span></span></button></td>
                <td className="px-4">{row.position ? row.position.split(/\s+/)[0] : "-"}</td>
                <td className="px-4"><span className="block truncate text-[#4a4a54]">{row.department || "-"}</span></td>
                <td className="px-4">-</td><td className="px-4 leading-5">{formatHireDate(row.hireDate)}</td><td className="px-4"><span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-normal", status === "permanent" ? "bg-[#edf8ef] text-[#2d8a46]" : status === "waiting" ? "bg-[#eef4ff] text-[#3272c8]" : "bg-[#edf6ff] text-[#2f7fd3]")}>{statusLabel(status)}</span></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      {(hasPreviousPage || hasNextPage) && <div className="flex items-center justify-end gap-2 border-t border-[#e5edf6] px-5 py-3 text-sm"><button type="button" disabled={!hasPreviousPage || loading} onClick={() => void previous()} className="rounded-md border border-[#dddde3] px-3 py-1.5 text-[#66666f] disabled:opacity-40">ก่อนหน้า</button><span className="flex size-8 items-center justify-center rounded-md bg-[#5eaafa] text-white">{page}</span><button type="button" disabled={!hasNextPage || loading} onClick={() => void next()} className="rounded-md border border-[#dddde3] px-3 py-1.5 text-[#66666f] disabled:opacity-40">ถัดไป</button></div>}
    </section>
  );
}

import { DropdownSelect } from "@/components/ui/dropdown-select";
