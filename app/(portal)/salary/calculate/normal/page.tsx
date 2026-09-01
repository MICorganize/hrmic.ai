"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  History,
  List,
  Menu,
  Power,
  RotateCcw,
  Search,
  Send,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import { EmployeeSelectPanel, type OrgNode } from "@/components/employee/EmployeeSelectPanel";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
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

/* ---------------------------------- Data ---------------------------------- */

const TABS = ["Dashboard", "คำนวณเงินเดือนรายบุคคล", "คำนวณเงินเดือนทั้งองค์กร", "ปิดงวดบัญชี", "สรุปตั้งค่าทั้งองค์กร"];
const FIRST_TAB_WIDTH = "w-[116.6125px]";

const MONTHS_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const MONTHS_TH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

type DashboardStats = {
  salaryEmployees: number;
  totalEmployees: number;
  employeeTypes: {
    monthly: number;
    daily: number;
    partTime: number;
    contract: number;
  };
  newEmployees: number;
  terminatedEmployees: number;
  birthdays: number;
};

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  salaryEmployees: 0,
  totalEmployees: 0,
  employeeTypes: { monthly: 0, daily: 0, partTime: 0, contract: 0 },
  newEmployees: 0,
  terminatedEmployees: 0,
  birthdays: 0,
};

/* ------------------------- ข้อมูลพนักงาน (รายบุคคล) ------------------------- */

const PERSON_TABS = [
  "ตารางเวลาการทำงาน",
  "ยื่นเอกสาร",
  "รายรับรายจ่าย",
  "เบิกล่วงหน้า",
  "สรุปผลการคำนวณ",
  "ภาษี",
  "ประกันสังคม",
  "ประวัติการแก้ไข",
  "ตั้งค่ารายบุคคล",
];

const DOCUMENT_SUBMISSION_TABS = ["โอที", "ลางาน", "เพิ่มเวลา", "วันหยุด", "กะการทำงาน"];

type WorkDay = {
  date: string;
  day: string;
  type: "work" | "holiday";
  status?: string;
  hours: string;
  shiftName?: string;
  shiftPeriods?: string;
  calculatedHours?: string;
  inTime?: string;
  outTime?: string;
  overtime?: string;
  leave?: string;
  note?: string;
  attendanceStatus?: "present" | "late" | "absent" | "leave";
  dayType?: "work" | "publicHoliday" | "employeeHoliday" | "specialHoliday";
};

type PersonalPayrollData = {
  calculation: {
    id: string;
    status: string;
    grossPay: number;
    deductions: number;
    netPay: number;
    calculatedAt: string;
  } | null;
  preview: {
    grossPay: number;
    socialSecurity: number;
    providentFund: number;
    tax: number;
    deductions: number;
    netPay: number;
  };
  time: { workingDays: number; leaveDays: number; actualMinutes: number };
  socialSecurity: number;
  providentFund: number;
  tax: number;
  history: { id: string; date: string; editor: string; note: string }[];
};

function formatPayrollAmount(amount: number) {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
}

function formatPayrollDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, "0")} ชั่วโมง`;
}

const SHIFT_INFO = {
  name: "SV001",
  hours: "08:00:00",
  periods: "11:00 - 15:00 - 16:00 - 20:00",
};

type EmployeeProfile = {
  code: string;
  name: string;
  company: string;
  branch: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  wage: string;
  empGroup: string;
  empType: string;
  startDate: string;
  hireDate: string;
  socialSecurity: string;
  tax: string;
  calcRound: string;
};

type EmployeeDetailsResponse = {
  employeeNumber: string;
  employeeCode: string | null;
  firstNameTH: string;
  lastNameTH: string;
  phone: string | null;
  email: string;
  companyName: string | null;
  branchName: string | null;
  departmentName: string | null;
  positionName: string | null;
  hireDate: string | null;
  confirmationDate: string | null;
  baseSalary: string | null;
  employmentType: string | null;
  socialSecurity: { calculationType: string | null } | null;
  taxInformation: { calculationType: string | null } | null;
};

function toPayrollEmployeeProfile(employee: EmployeeDetailsResponse): EmployeeProfile {
  const employmentType = employee.employmentType ?? "";
  return {
    code: employee.employeeCode ?? employee.employeeNumber,
    name: `${employee.firstNameTH} ${employee.lastNameTH}`.trim(),
    company: employee.companyName ?? "",
    branch: employee.branchName ?? "",
    department: employee.departmentName ?? "",
    position: employee.positionName ?? "",
    phone: employee.phone ?? "",
    email: employee.email ?? "",
    wage: employee.baseSalary ? `${employee.baseSalary.replace(/\.00$/, "")} บาท` : "",
    empGroup: employmentType,
    empType: employmentType,
    startDate: employee.hireDate ?? "",
    hireDate: employee.confirmationDate ?? employee.hireDate ?? "",
    socialSecurity: employee.socialSecurity?.calculationType ?? "ไม่คิดประกันสังคม",
    tax: employee.taxInformation?.calculationType ?? "",
    calcRound: "เต็มเดือน",
  };
}

type ProfileRow = { label: string; value: string };

function buildProfileColumns(p: EmployeeProfile): ProfileRow[][] {
  return [
    [
      { label: "บริษัท", value: p.company },
      { label: "สำนักงานสาขา", value: p.branch },
      { label: "แผนก", value: p.department },
      { label: "ตำแหน่ง", value: p.position },
      { label: "เบอร์โทรศัพท์", value: p.phone },
      { label: "อีเมล", value: p.email },
    ],
    [
      { label: "ค่าจ้าง", value: p.wage },
      { label: "กลุ่มประเภทพนักงาน", value: p.empGroup },
      { label: "ประเภทพนักงาน", value: p.empType },
      { label: "วันที่เริ่มงาน", value: p.startDate },
      { label: "วันที่บรรจุ", value: p.hireDate },
    ],
    [
      { label: "ประกันสังคม", value: p.socialSecurity },
      { label: "ภาษี", value: p.tax },
      { label: "รอบการคำนวณเงินเดือน", value: p.calcRound },
      { label: "รอบการคำนวณ", value: "" },
      { label: "ตั้งค่ารายบุคคล", value: "" },
    ],
  ];
}

// พนักงานในตารางรายชื่อ (จากโปรไฟล์พนักงาน)
const ORG_EMPLOYEES = [
  { code: "MIC000", name: "อดิเรก ฉ่ำชื่น", branch: "MIC Organize", dept: "HR & Administration", position: "Managing Director" },
  { code: "MIC008", name: "ณัชชารีย์ ธนดีฐิติกาญจน์ (ส้ม)", branch: "MIC Organize", dept: "HR & Administration", position: "Admin" },
  { code: "MIC014", name: "นัฐกานต์ โพธิ์ฉิม (มด)", branch: "MIC Organize", dept: "HR & Administration", position: "Admin" },
  { code: "MIC020", name: "วีรยา ชมสอิ้ง (null)", branch: "MIC Organize", dept: "Accounting & Finance", position: "Admin" },
  { code: "MIC001", name: "มณฑารัตน์ พุ่มโพธิ์ทอง (ปุ๊ก)", branch: "MIC Organize", dept: "Sales & Marketing", position: "Director" },
  { code: "MIC013", name: "มาร์ค กุหมัด (มาร์ค)", branch: "MIC Organize", dept: "Sales & Marketing", position: "Admin" },
  { code: "MIC002", name: "สุเมธ รัตนวิริยะกุล (เมธ)", branch: "MIC Organize", dept: "Project Management", position: "Manager" },
  { code: "MIC009", name: "จุฑาทิพ อาสาณรงค์ (ทิพ)", branch: "MIC Organize", dept: "Project Management", position: "Manager" },
];

const ORG_SUB_TABS = ["งวดเต็ม", "รวมทุกงวด", "เปรียบเทียบ"];

const ORG_INNER_TABS = [
  "รายชื่อพนักงาน",
  "ตารางเวลาการทำงาน",
  "แก้ไขเวลาผิดพลาด",
  "ยื่นเอกสาร",
  "รายรับรายจ่าย",
  "เบิกล่วงหน้า",
  "ตรวจสอบข้อมูลเงินเดือน",
  "สรุปผลการคำนวณ",
  "ประวัติการแก้ไข",
  "ปิดงวดบัญชี",
];

/* ------------------------------ Small helpers ------------------------------ */

function BlueTableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableHead
      className={cn(
        "h-[4.8rem] border-r border-[#d3d3d3] bg-[#61a8ff] px-4 text-sm font-medium leading-[22px] normal-case tracking-[-0.1px] text-white last:border-r-0",
        className
      )}
    >
      {children}
    </TableHead>
  );
}

/* --------------------------------- Banner ---------------------------------- */

function PayrollMonthPicker({
  monthLabel,
  monthValue,
  onMonthChange,
}: {
  monthLabel: string;
  monthValue: string;
  onMonthChange: (month: string) => void;
}) {
  const selectedYear = Number(monthValue.slice(0, 4)) || new Date().getFullYear();
  const selectedMonth = Number(monthValue.slice(5, 7)) - 1;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);

  useEffect(() => {
    if (open) setViewYear(selectedYear);
  }, [open, selectedYear]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-[31.6px] w-full items-center justify-between rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 text-sm font-normal leading-[22px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)] outline-none transition-colors hover:border-[#40a9ff] focus:border-[#40a9ff] focus:ring-1 focus:ring-[#40a9ff]"
          aria-label="เลือกเดือน"
        >
          {monthLabel}
          <Calendar className="size-4 text-slate-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] gap-0 rounded-[2px] p-0 font-[Kanit,sans-serif] shadow-[0_3px_6px_-4px_rgba(0,0,0,0.12),0_6px_16px_0_rgba(0,0,0,0.08),0_9px_28px_8px_rgba(0,0,0,0.05)]">
        <div className="flex h-10 items-center justify-between border-b border-[#f0f0f0] px-3">
          <button type="button" onClick={() => setViewYear((year) => year - 1)} title="ปีก่อนหน้า" aria-label="ปีก่อนหน้า" className="flex size-8 items-center justify-center text-black/65 transition-colors hover:text-[#1890ff]">
            <ChevronsLeft className="size-4" />
          </button>
          <button type="button" onClick={() => setViewYear(selectedYear)} title="เลือกปี" className="h-8 px-2 text-sm font-medium text-black/85 hover:text-[#1890ff]">
            {viewYear}
          </button>
          <button type="button" onClick={() => setViewYear((year) => year + 1)} title="ปีถัดไป" aria-label="ปีถัดไป" className="flex size-8 items-center justify-center text-black/65 transition-colors hover:text-[#1890ff]">
            <ChevronsRight className="size-4" />
          </button>
        </div>
        <div role="grid" aria-label={`เลือกเดือน ปี ${viewYear}`} className="grid grid-cols-3 gap-y-1 p-3">
          {MONTHS_TH_SHORT.map((label, monthIndex) => {
            const selected = viewYear === selectedYear && monthIndex === selectedMonth;
            return (
              <button
                key={label}
                type="button"
                role="gridcell"
                title={label}
                aria-selected={selected}
                onClick={() => {
                  onMonthChange(`${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`);
                  setOpen(false);
                }}
                className={cn(
                  "mx-auto flex h-8 w-16 items-center justify-center rounded-[2px] text-sm transition-colors",
                  selected ? "bg-[#1890ff] text-white" : "text-black/65 hover:bg-[#e6f7ff] hover:text-[#1890ff]"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function monthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const monthIndex = (month || 1) - 1;
  const selectedYear = year || new Date().getFullYear();
  const formatDate = (day: number) => `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    startDate: formatDate(1),
    endDate: formatDate(new Date(selectedYear, monthIndex + 1, 0).getDate()),
  };
}

type SavedPayrollPeriod = {
  startDate: string;
  endDate: string;
  isConfigured: boolean;
};

function dateFromKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatThaiDate(dateValue: string) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${MONTHS_TH[(month || 1) - 1] ?? ""} ${year}`;
}

function formatPayrollPeriod(startDate: string, endDate: string) {
  const compactDate = (value: string) => {
    const [year = "", month = "", day = ""] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : "";
  };
  return `ตั้งแต่วันที่ ${compactDate(startDate)} จนถึงวันที่ ${compactDate(endDate)}`;
}

function PayrollPeriodDatePicker({
  value,
  label,
  onChange,
  disabled,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          className="min-w-0 flex-1 truncate bg-transparent p-0 text-left font-[Kanit,sans-serif] text-sm leading-[22.001px] outline-none disabled:cursor-wait"
        >
          {formatThaiDate(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="!z-[1200] w-auto p-0" align="start">
        <DatePickerCalendar
          mode="single"
          selected={dateFromKey(value)}
          onSelect={(date) => date && onChange(dateKey(date))}
        />
      </PopoverContent>
    </Popover>
  );
}

function SalaryPeriodSettingsModal({
  open,
  monthValue,
  period,
  onClose,
  onSave,
  onReset,
}: {
  open: boolean;
  monthValue: string;
  period: SavedPayrollPeriod;
  onClose: () => void;
  onSave: (period: Pick<SavedPayrollPeriod, "startDate" | "endDate">) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [year, month] = monthValue.split("-").map(Number);
  const selectedYear = year || new Date().getFullYear();
  const selectedMonth = (month || 1) - 1;

  useEffect(() => {
    if (!open) return;
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    setError("");
  }, [monthValue, open, period.endDate, period.startDate]);

  async function savePeriod() {
    if (!startDate || !endDate || startDate > endDate) {
      setError("กรุณาระบุช่วงวันที่ให้ถูกต้อง");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ startDate, endDate });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ไม่สามารถบันทึกงวดเงินเดือนได้");
    } finally {
      setSaving(false);
    }
  }

  async function resetPeriod() {
    setSaving(true);
    setError("");
    try {
      await onReset();
      const range = monthRange(monthValue);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ไม่สามารถรีเซ็ตงวดเงินเดือนได้");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/[0.32] p-4" role="dialog" aria-modal="true" aria-labelledby="salary-period-settings-title">
      <button type="button" aria-label="ปิดหน้าต่างตั้งค่างวด" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className="relative z-10 w-[733.3333px] max-w-full overflow-hidden rounded-[11px] bg-white font-[Kanit,sans-serif] text-sm shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]">
        <header className="modal-header h-[85.7125px] bg-[#61a8ff] p-6 text-white">
          <div className="flex h-[37.7125px] items-center">
            <h2 id="salary-period-settings-title" className="text-[24px] font-normal leading-[37.716px]">
            การคำนวณเงินเดือนของเดือน {MONTHS_TH[selectedMonth] ?? ""} {selectedYear}
            </h2>
          </div>
        </header>

        <div className="modal-body h-[98.38875px] px-9 py-[22.394375px]">
          <label className="block h-[22px] text-sm font-normal leading-[22.001px] text-black/[0.87]">ตั้งแต่วันที่ - จนถึงวันที่</label>
          <div className="flex h-[31.6px] items-center rounded-[4px] border-[0.8px] border-[#40a9ff] bg-white px-[11px] py-1 text-sm leading-[22.001px] text-black/[0.65] shadow-[0_0_0_2px_rgba(24,144,255,0.2)]">
            <PayrollPeriodDatePicker value={startDate} label="วันเริ่มต้น" onChange={setStartDate} disabled={saving} />
            <span className="flex h-4 w-8 shrink-0 items-center justify-center px-2"><ArrowRight className="size-3.5" /></span>
            <PayrollPeriodDatePicker value={endDate} label="วันสิ้นสุด" onChange={setEndDate} disabled={saving} />
            <span className="ml-1 flex h-[22px] w-3 shrink-0 items-center justify-center text-black/45">
              <Calendar className="size-3" aria-hidden="true" />
            </span>
          </div>
          {error && <p role="alert" className="mt-1 text-xs leading-4 text-[#d9363e]">{error}</p>}
        </div>

        <footer className="modal-footer flex h-[60.8px] items-center justify-end bg-white p-3 shadow-[0_0_1px_rgba(0,0,0,0.87)]">
          <button type="button" onClick={onClose} disabled={saving} className="mr-2 h-9 rounded-[4px] bg-[#808b9e] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#909aaa] disabled:cursor-wait disabled:opacity-70">ยกเลิก</button>
          <button type="button" onClick={() => void resetPeriod()} disabled={saving} className="mr-2 h-9 min-w-16 rounded-[4px] bg-[#ff4c33] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#ff654f] disabled:cursor-wait disabled:opacity-70">ลบ</button>
          <button type="button" onClick={() => void savePeriod()} disabled={saving} className="h-9 rounded-[4px] bg-[#03ae03] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#039b03] disabled:cursor-wait disabled:opacity-70">{saving ? "กำลังบันทึก" : "บันทึก"}</button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

function PageBanner({
  monthLabel,
  monthIndex,
  year,
  monthValue,
  onMonthChange,
}: {
  monthLabel: string;
  monthIndex: number;
  year: number;
  monthValue: string;
  onMonthChange: (month: string) => void;
}) {
  const [periodSettingsOpen, setPeriodSettingsOpen] = useState(false);
  const [period, setPeriod] = useState<SavedPayrollPeriod>(() => ({ ...monthRange(monthValue), isConfigured: false }));

  useEffect(() => {
    const controller = new AbortController();
    setPeriod({ ...monthRange(monthValue), isConfigured: false });

    async function loadPeriod() {
      try {
        const response = await fetch(`/api/payroll/period?month=${encodeURIComponent(monthValue)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unable to load saved payroll period");
        setPeriod((await response.json()) as SavedPayrollPeriod);
      } catch (requestError) {
        if ((requestError as { name?: string }).name !== "AbortError") {
          console.error("Unable to load payroll period:", requestError);
        }
      }
    }

    void loadPeriod();
    return () => controller.abort();
  }, [monthValue]);

  async function savePeriod(nextPeriod: Pick<SavedPayrollPeriod, "startDate" | "endDate">) {
    const response = await fetch("/api/payroll/period", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: monthValue, ...nextPeriod }),
    });
    const data = (await response.json().catch(() => null)) as SavedPayrollPeriod | { error?: string } | null;
    if (!response.ok) throw new Error(data && "error" in data ? data.error : "ไม่สามารถบันทึกงวดเงินเดือนได้");
    setPeriod(data as SavedPayrollPeriod);
  }

  async function resetPeriod() {
    const response = await fetch(`/api/payroll/period?month=${encodeURIComponent(monthValue)}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as SavedPayrollPeriod | { error?: string } | null;
    if (!response.ok) throw new Error(data && "error" in data ? data.error : "ไม่สามารถรีเซ็ตงวดเงินเดือนได้");
    setPeriod(data as SavedPayrollPeriod);
  }

  return (
    <section className="h-[7.5rem] bg-[#61a8ff] px-6 text-sm leading-[22px] tracking-[-0.1px] text-white">
      <div className="flex h-full items-start justify-between gap-4 pt-6">
        {/* Breadcrumb + title */}
        <div className="min-w-0">
          <p className="flex items-center gap-0 text-sm leading-[22px] tracking-[-0.1px] text-white/70">
            <span>การประมวลผลเงินเดือน</span>
            <ChevronRight className="size-4" />
            <span>คำนวณเงินเดือน</span>
          </p>
          <h1 className="inline-block text-[24px] font-normal leading-[37.716px] tracking-[-0.1px] text-white">คำนวณเงินเดือน</h1>
        </div>

        {/* Month picker + period (Element: stacked column, ~320px) */}
        <div className="w-80 shrink-0 pt-[2.05px]">
          <PayrollMonthPicker monthLabel={monthLabel} monthValue={monthValue} onMonthChange={onMonthChange} />

          <div className="flex h-6 items-center justify-between">
            <span className="flex min-w-0 flex-1 justify-center whitespace-nowrap text-sm leading-[22px] tracking-[-0.1px] text-white">
              {formatPayrollPeriod(period.startDate, period.endDate)}
            </span>
            <button
              type="button"
              onClick={() => setPeriodSettingsOpen(true)}
              className="size-6 shrink-0 rounded-full p-0 font-semibold text-white transition-colors hover:bg-white/20"
              aria-label="ตั้งค่างวด"
              title="ตั้งค่างวด"
            >
              <Settings className="size-5" />
            </button>
          </div>
        </div>
      </div>
      <SalaryPeriodSettingsModal
        open={periodSettingsOpen}
        monthValue={monthValue}
        period={period}
        onClose={() => setPeriodSettingsOpen(false)}
        onSave={savePeriod}
        onReset={resetPeriod}
      />
    </section>
  );
}

/* --------------------------------- Tabs bar -------------------------------- */

function TabsBar({ activeTab, onChange }: { activeTab: string; onChange: (tab: string) => void }) {
  return (
    <div className="flex h-10 items-stretch bg-[#61a8ff] px-6 text-sm leading-[22px] tracking-[-0.1px] text-white">
      {TABS.map((tab, i) => {
        const active = tab === activeTab;
        return (
          <div
            key={tab}
            className={cn(
              "h-10 shrink-0 overflow-hidden",
              i === 0 && FIRST_TAB_WIDTH,
              active && "bg-[rgba(0,80,180,0.75)]",
              i === 0 && "rounded-tl-[8px]",
              i === TABS.length - 1 && "rounded-tr-[8px]"
            )}
          >
            <button
              type="button"
              onClick={() => onChange(tab)}
              className={cn(
                "ml-0.5 block h-10 w-full whitespace-nowrap bg-[rgba(0,80,180,0.25)] px-4 py-2 text-left text-[16px] font-medium leading-6 tracking-[-0.1px] text-white transition-colors",
                active && "font-medium tracking-[0.3px]"
              )}
            >
              {tab}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Tab: Dashboard ----------------------------- */

function DashboardContent({ stats, monthLabel }: { stats: DashboardStats; monthLabel: string }) {
  const employeeTypeStats = [
    { label: "พนักงานรายเดือน", count: stats.employeeTypes.monthly },
    { label: "พนักงานรายวัน", count: stats.employeeTypes.daily },
    { label: "พนักงานพาร์ตไทม์", count: stats.employeeTypes.partTime },
    { label: "พนักงานเหมาจ่าย", count: stats.employeeTypes.contract },
  ];
  const statusBlocks = [
    { label: "พนักงานเข้าใหม่", count: stats.newEmployees },
    { label: "พนักงานลาออก", count: stats.terminatedEmployees },
    { label: "วันเกิดพนักงาน", count: stats.birthdays },
  ];
  const chartTotal = employeeTypeStats.reduce((total, item) => total + item.count, 0);
  const chartColors = ["#b5d9e9", "#75b9dc", "#8fca8b", "#e8bf77"];
  let chartOffset = 0;
  const chartBackground = chartTotal
    ? `conic-gradient(${employeeTypeStats
        .filter((item) => item.count > 0)
        .map((item, index) => {
          const start = chartOffset;
          chartOffset += (item.count / chartTotal) * 100;
          return `${chartColors[index]} ${start}% ${chartOffset}%`;
        })
        .join(", ")})`
    : "#b5d9e9";

  return (
    <div className="flex flex-col p-8">
      <div className="flex flex-col xl:flex-row">
        {/* พนักงานทั้งหมด */}
        <Card className="m-3 h-[248px] flex-[1_1_100%] rounded-lg border-0 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)] xl:max-w-[33.34%]">
          <CardContent className="h-full p-[16px_8px]">
            <DashboardCardHeader title="พนักงานทั้งหมด" monthLabel={monthLabel} />
            <DashboardDivider />
            <div className="flex gap-6">
              <DashboardNumber count={stats.salaryEmployees} caption="(ฐานข้อมูลเงินเดือน)" />
              <span className="self-center [font-size:3vw] font-normal leading-[56px] text-[rgba(0,0,0,0.87)]">=</span>
              <DashboardNumber count={stats.totalEmployees} caption="(ฐานข้อมูลพนักงาน)" />
            </div>
          </CardContent>
        </Card>

        {/* สัดส่วนพนักงาน */}
        <Card className="m-3 h-[248px] flex-[1_1_100%] rounded-lg border-0 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)] xl:max-w-[66.66%]">
          <CardContent className="h-full p-[16px_8px]">
            <DashboardCardHeader title="สัดส่วนพนักงาน" monthLabel={monthLabel} />
            <DashboardDivider />
            <div className="flex h-[160.275px] flex-wrap">
              <div className="mr-3 flex flex-1 items-center justify-center">
                <div
                  role="img"
                  aria-label={`กราฟสัดส่วนพนักงาน: พนักงานรายเดือน ${stats.employeeTypes.monthly} คน`}
                  className="relative size-[150px] rounded-full bg-[#b5d9e9]"
                  style={{ background: chartBackground }}
                >
                  <span className="absolute left-1/2 top-[5px] h-[70px] w-[3px] -translate-x-1/2 rounded-full bg-white" />
                </div>
              </div>

              <div className="mr-3 flex flex-1 flex-col items-start justify-center text-[17px] leading-[26.7155px] text-[rgba(0,0,0,0.87)]">
                {employeeTypeStats.map((s) => (
                  <div key={s.label} className="flex w-full items-start gap-3 first:gap-4">
                    <span className="flex-1">{s.label}</span>
                    <span className="shrink-0">{s.count} คน</span>
                  </div>
                ))}
              </div>

              {statusBlocks.map((b, index) => (
                <div
                  key={b.label}
                  className={cn(
                    "flex flex-[1_1_15%] flex-col items-center justify-center text-center xl:max-w-[15%]",
                    index < statusBlocks.length - 1 && "mr-3"
                  )}
                >
                  <span className="text-[15px] leading-[23.5725px] text-[rgba(0,0,0,0.54)]">{b.label}</span>
                  <span className="[font-size:3vw] font-bold leading-[56px] text-[rgba(0,0,0,0.87)]">{b.count}</span>
                  <span className="[font-size:1.5vw] leading-[40px] text-[rgba(0,0,0,0.87)]">คน</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* คำแนะนำ */}
      <div className="flex">
      <Card className="m-3 h-[144px] flex-[1_1_0%] rounded-lg border-0 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
        <CardContent className="h-full p-[16px_8px]">
          <DashboardCardHeader title="คำแนะนำ" monthLabel={monthLabel} />
          <div className="flex h-[34px]"><DashboardDivider /></div>
          <div className="mb-3 flex h-[44.275px] items-center justify-center rounded-[4px] bg-[#fdff82] p-2 text-[18px] font-normal leading-[28.287px] text-black shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
              ใช้ได้เฉพาะแพ็คเกจ Professional เท่านั้น
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function DashboardCardHeader({ title, monthLabel }: { title: string; monthLabel: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">
        <p className="font-normal">&nbsp;{title}</p>
        <span className="shrink-0">(ณ {monthLabel})</span>
      </div>
    </>
  );
}

function DashboardDivider() {
  return <div className="my-4 h-[2px] w-full bg-[#f0f0f0]" />;
}

function DashboardNumber({ count, caption }: { count: number; caption: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="[font-size:3vw] font-bold leading-[56px] text-[rgba(0,0,0,0.87)]">{count}</span>
      <span className="[font-size:1.5vw] leading-[40px] text-[rgba(0,0,0,0.87)]">คน</span>
      <span className="text-[15px] leading-[23.5725px] text-[rgba(0,0,0,0.54)]">{caption}</span>
    </div>
  );
}

/* ----------------------------- Tab: รายบุคคล ------------------------------ */

function CellEditIcon({ onClick }: { onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-0 top-0.5 flex h-[13.6px] w-[13.6px] items-center justify-center p-0 text-[#61a8ff]"
      aria-label="แก้ไข"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3 fill-current">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.82-1.83z" />
      </svg>
    </button>
  );
}

function dateInputValue(displayDate: string) {
  const [day, month, year] = displayDate.split("/");
  return `${year}-${month}-${day}`;
}

function overtimeMinutes(value?: string) {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
}

type AttendanceVariance = {
  label: "มาเช้า" | "สาย" | "พักเกิน" | "พักไว" | "กลับก่อน" | "กลับช้า";
  duration: string;
};

function minutesFromTime(value?: string) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatVariance(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function attendanceVariances(day: WorkDay): AttendanceVariance[] {
  if (day.type !== "work") return [];

  const [shiftStart, breakStart, breakEnd, shiftEnd] = (day.shiftPeriods ?? SHIFT_INFO.periods)
    .split(" - ")
    .map(minutesFromTime);
  const checkIn = minutesFromTime(day.inTime);
  const checkOut = minutesFromTime(day.outTime);
  const variances: AttendanceVariance[] = [];

  if (checkIn !== null && shiftStart !== null) {
    if (checkIn < shiftStart) variances.push({ label: "มาเช้า", duration: formatVariance(shiftStart - checkIn) });
    if (checkIn > shiftStart) variances.push({ label: "สาย", duration: formatVariance(checkIn - shiftStart) });
  }
  if (checkOut !== null && shiftEnd !== null) {
    if (checkOut < shiftEnd) variances.push({ label: "กลับก่อน", duration: formatVariance(shiftEnd - checkOut) });
    if (checkOut > shiftEnd) variances.push({ label: "กลับช้า", duration: formatVariance(checkOut - shiftEnd) });
  }

  // The persisted attendance model has one IN and one OUT timestamp, so it
  // does not contain a separate break-out/break-in pair to derive these two
  // values. They remain absent until that data exists, just like the source UI.
  void breakStart;
  void breakEnd;
  return variances;
}

const WORK_DAY_TYPE_OPTIONS = [
  ["work", "วันทำงาน"],
  ["publicHoliday", "วันหยุดนักขัตฤกษ์"],
  ["employeeHoliday", "วันหยุดพนักงาน"],
  ["specialHoliday", "วันหยุดพิเศษ"],
] as const;

const WORK_SHIFT_OPTIONS = [
  { name: "WC001", label: "WC001 : 08:30 - 17:00", hours: "07:30:00", periods: "08:30 - 12:00 - 13:00 - 17:00" },
  { name: "WC002", label: "WC002 : 08:30 - 17:00", hours: "07:30:00", periods: "08:30 - 12:00 - 13:00 - 17:00" },
] as const;

function WorkDayTypePopover({
  day,
  employeeId,
  anchor,
  onClose,
  onSaved,
}: {
  day: WorkDay;
  employeeId: string;
  anchor: Pick<DOMRect, "left" | "top" | "width">;
  onClose: () => void;
  onSaved: (data: { rows?: WorkDay[]; naDates?: string[] }) => void;
}) {
  const [saving, setSaving] = useState(false);
  const selected = day.dayType ?? (day.type === "holiday" ? "employeeHoliday" : "work");
  const updateDayType = async (dayType: WorkDay["dayType"]) => {
    if (!dayType || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/payroll/work-time", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, date: dateInputValue(day.date), dayType }),
      });
      const data = await response.json() as { rows?: WorkDay[]; naDates?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถบันทึกประเภทวันได้");
      onSaved(data);
      onClose();
    } catch (error) {
      console.error("Unable to update work-day type:", error);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed z-[1030] w-[179.1375px] rounded-[8px] bg-white p-6 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-black/[0.65]"
      style={{ left: anchor.left + anchor.width / 2, top: anchor.top, transform: "translate(-50%, -100%)", boxShadow: "0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3)" }}
      role="tooltip"
      aria-label="เลือกประเภทวันทำงาน"
    >
      <div className="flex h-32 w-[131.1375px] flex-col" role="radiogroup">
        {WORK_DAY_TYPE_OPTIONS.map(([value, label], index) => {
          const checked = selected === value;
          return (
            <label
              key={value}
              className={cn(
                "relative block h-8 w-full cursor-pointer whitespace-nowrap border-[0.8px] border-[#d9d9d9] bg-white px-[15px] text-left text-sm font-normal leading-[30px] tracking-[-0.1px] transition-none",
                index > 0 && "-mt-[0.8px]",
                index === 0 && "rounded-[2px_0_0_2px]",
                index === WORK_DAY_TYPE_OPTIONS.length - 1 && "rounded-[0_2px_2px_0]",
                checked ? "z-[1] border-[#1890ff] text-[#1890ff]" : "text-black/[0.65]"
              )}
            >
              <input type="radio" name={`work-day-type-${day.date}`} value={value} checked={checked} disabled={saving} onChange={() => void updateDayType(value)} className="sr-only" />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function WorkShiftPopover({
  day,
  anchor,
  onClose,
  onSelect,
}: {
  day: WorkDay;
  anchor: Pick<DOMRect, "left" | "top" | "width">;
  onClose: () => void;
  onSelect: (shift: (typeof WORK_SHIFT_OPTIONS)[number]) => void;
}) {
  const selected = day.shiftName ?? "WC001";

  return (
    <div
      className="fixed z-[1030] w-[223.8875px] rounded-[8px] bg-white p-6 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-black/[0.65]"
      style={{ left: anchor.left + anchor.width / 2, top: anchor.top, transform: "translate(-50%, -100%)", boxShadow: "0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3)" }}
      role="tooltip"
      aria-label="เลือกกะการทำงาน"
    >
      <div className="max-h-[437.76px] overflow-auto">
        <div className="max-h-[400px] overflow-hidden">
          <div className="flex flex-col pl-1" role="radiogroup">
            {WORK_SHIFT_OPTIONS.map((shift, index) => {
            const checked = selected === shift.name;
            return (
              <label
                key={shift.name}
                className={cn(
                  "relative block h-8 w-full cursor-pointer whitespace-nowrap border-[0.8px] border-[#d9d9d9] bg-white px-[15px] text-left text-sm font-normal leading-[30px] tracking-[-0.1px] transition-none",
                  index === 0 && "rounded-[2px_0_0_2px]",
                  index === WORK_SHIFT_OPTIONS.length - 1 && "rounded-[0_2px_2px_0]",
                  checked ? "z-[1] border-[#1890ff] text-[#1890ff]" : "text-black/[0.65]"
                )}
              >
                <input
                  type="radio"
                  name={`work-shift-${day.date}`}
                  value={shift.name}
                  checked={checked}
                  onChange={() => {
                    onSelect(shift);
                    onClose();
                  }}
                  className="sr-only"
                />
                <span>{shift.label}</span>
              </label>
            );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkingTimePopover({
  day,
  anchor,
  onClose,
  onSaveTime,
  onRemoveTime,
}: {
  day: WorkDay;
  anchor: Pick<DOMRect, "left" | "top" | "width">;
  onClose: () => void;
  onSaveTime: (kind: "IN" | "OUT", time: string) => Promise<void>;
  onRemoveTime: (kind: "IN" | "OUT") => Promise<void>;
}) {
  const [time, setTime] = useState("");
  const [entries, setEntries] = useState<Array<{ id: string; kind: "IN" | "OUT"; value: string; persisted: boolean }>>(() => [
    ...(day.inTime ? [{ id: "in", kind: "IN" as const, value: day.inTime, persisted: true }] : []),
    ...(day.outTime ? [{ id: "out", kind: "OUT" as const, value: day.outTime, persisted: true }] : []),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isValidTime = (value: string) => /^(?:[0-9]|[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const normalizedTime = (value: string) => value.length === 4 ? `0${value}` : value;
  // The original Ant popover is 76px with only the add-time row. Every
  // persisted IN/OUT row contributes its 32px control and 4px margins above
  // and below, so the two-row state is exactly 156px high.
  const innerPopoverHeight = Math.min(76 + entries.length * 40, 437.76);

  const timeMask = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (!digits) return "";
    if (digits.length === 1) return digits;

    const first = Number(digits[0]);
    const second = Number(digits[1]);
    const twoDigitHour = first * 10 + second;

    // The source mask is `Hh:m0`: a second digit that would make the hour
    // exceed 23 starts the minute portion instead, producing e.g. `2:46`.
    if (twoDigitHour > 23) {
      if (digits.length === 2) return `${digits[0]}:${digits[1]}`;
      const minute = second * 10 + Number(digits[2]);
      return minute <= 59 ? `${digits[0]}:${digits[1]}${digits[2]}` : `${digits[0]}:${digits[1]}`;
    }

    if (digits.length === 2) return digits;
    if (digits.length === 3) return `${digits.slice(0, 2)}:${digits[2]}`;
    const minute = Number(digits.slice(2));
    return minute <= 59 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : `${digits.slice(0, 2)}:${digits[2]}`;
  };

  const addEntry = async () => {
    if (!isValidTime(time) || saving) return;
    const kinds = new Set(entries.map((entry) => entry.kind));
    const kind = !kinds.has("IN") ? "IN" : !kinds.has("OUT") ? "OUT" : null;
    if (!kind) {
      setError("มีเวลาเข้าและออกสำหรับวันนี้แล้ว");
      return;
    }

    const value = normalizedTime(time);
    setSaving(true);
    setError("");
    try {
      // Unlike editing an existing row, Add time commits the newly entered
      // value immediately. The table is refreshed by onSaveTime right away.
      await onSaveTime(kind, value);
      setEntries((current) => [...current, { id: kind.toLowerCase(), kind, value, persisted: true }]);
      setTime("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถเพิ่มเวลาได้");
    } finally {
      setSaving(false);
    }
  };

  const saveEntry = async (entry: { id: string; kind: "IN" | "OUT"; value: string }) => {
    if (!isValidTime(entry.value) || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSaveTime(entry.kind, normalizedTime(entry.value));
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถเพิ่มเวลาได้");
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (entry: { id: string; kind: "IN" | "OUT"; persisted: boolean }) => {
    if (!entry.persisted) {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      return;
    }
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onRemoveTime(entry.kind);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถลบเวลาได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-working-time-popover
      className="ant-popover ant-popover-placement-top fixed z-[1030] m-0 box-border h-auto min-h-[76px] w-[395.35px] max-h-[437.76px] cursor-auto select-text p-0 text-left font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-black/[0.65] whitespace-normal [font-variant-numeric:tabular-nums]"
      style={{ left: anchor.left + anchor.width / 2, top: anchor.top, transform: "translate(-50%, -100%)", transformOrigin: "center bottom", width: "395.35px", minHeight: "76px", maxHeight: "437.76px" }}
    >
      <div className="ant-popover-content box-border">
        <div className="ant-popover-inner box-border overflow-hidden rounded-[8px] bg-white" style={{ boxShadow: "0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3)" }}>
          <div
            className="ant-popover-inner-content box-border min-h-[76px] max-h-[437.76px] overflow-auto px-6 py-6 leading-[26.6px]"
            style={{ width: "395.35px", height: `${innerPopoverHeight}px` }}
            role="tooltip"
            aria-label={`เพิ่มเวลาทำงานวันที่ ${day.date}`}
          >
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="relative box-border flex h-8 w-[347.35px] shrink-0 touch-auto items-center justify-start overflow-hidden font-[Kanit,sans-serif] text-sm font-normal leading-[26.6px] tracking-[-0.1px] text-black/[0.87]"
          style={{ margin: "4px 0" }}
        >
          <div className="mr-1 box-border flex h-[26.6px] flex-[1_0_10%] flex-col items-center justify-center font-[Kanit,sans-serif] text-sm font-normal leading-[26.6px] text-black/[0.87]">({entry.kind})</div>
          <div className="mr-1 box-border flex flex-[1_0_55%] flex-col items-end justify-center">
            <input
              type="text"
              value={entry.value}
              onChange={(event) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, value: timeMask(event.target.value) } : item))}
              placeholder="00:00"
              inputMode="numeric"
              maxLength={5}
              aria-label={`เวลา ${entry.kind}`}
              className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-black/[0.65] outline-none transition-all duration-300 placeholder:text-black/[0.25] hover:border-[#40a9ff] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
            />
          </div>
          <div className="mr-1 box-border flex flex-[1_0_10%] flex-col items-end justify-center">
            <button type="button" aria-label={`บันทึกเวลา ${entry.kind}`} disabled={saving} onClick={() => void saveEntry(entry)} className="ml-1 block h-8 rounded-[2px] border-[0.8px] border-[#1890ff] bg-[#1890ff] px-[15px] py-1 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-white shadow-[0_2px_0_rgba(0,0,0,0.016)] transition-all duration-300 hover:border-[#40a9ff] hover:bg-[#40a9ff] disabled:opacity-60">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="inline-block size-3.5 align-middle fill-current"><path d="M17 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4Zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3Zm3-10H5V5h10v4Z" /></svg>
            </button>
          </div>
          <div className="mr-1 box-border flex flex-[1_0_10%] flex-col items-end justify-center">
            <button type="button" aria-label={`ยกเลิกเวลา ${entry.kind}`} disabled={saving} onClick={() => void removeEntry(entry)} className="block h-8 rounded-[2px] border-[0.8px] border-[#ff4d4f] bg-[#ff4d4f] px-[15px] py-1 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-white shadow-[0_2px_0_rgba(0,0,0,0.016)] transition-all duration-300 hover:border-[#ff7875] hover:bg-[#ff7875] disabled:opacity-60">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="inline-block size-3.5 align-middle fill-current"><path d="M18.3 5.71 16.89 4.29 12 9.17 7.11 4.29 5.7 5.71l4.89 4.88-4.89 4.89 1.41 1.41L12 12l4.89 4.89 1.41-1.41-4.89-4.89 4.89-4.88Z" /></svg>
            </button>
          </div>
        </div>
      ))}
      <div className="flex h-8 w-[347.35px] shrink-0 items-center justify-center">
        <div className="mr-1 flex flex-[1_0_74%] flex-col">
          <input
            type="text"
            value={time}
            onChange={(event) => setTime(timeMask(event.target.value))}
            placeholder="00:00"
            inputMode="numeric"
            maxLength={5}
            aria-label="เวลา"
            className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-black/[0.65] outline-none transition-all duration-300 placeholder:text-black/[0.25] hover:border-[#40a9ff] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
          />
        </div>
        <div className="mr-1 flex flex-col items-end justify-center">
          <button
            type="button"
            onClick={() => void addEntry()}
            disabled={saving}
            className="ml-1 h-8 whitespace-nowrap rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white px-[15px] py-1 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-black/[0.65] shadow-[0_2px_0_rgba(0,0,0,0.016)] transition-all duration-300 hover:border-[#40a9ff] hover:text-[#40a9ff] focus:border-[#40a9ff] focus:text-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
          >
            เพิ่มเวลา
          </button>
        </div>
      </div>
      {error && <span role="alert" className="sr-only">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function OvertimeRequestDialog({
  day,
  employeeName,
  onClose,
  onSave,
}: {
  day: WorkDay;
  employeeName: string;
  onClose: () => void;
  onSave: (overtime: string) => void;
}) {
  const date = dateInputValue(day.date);
  const [selectedDate, setSelectedDate] = useState(date);
  const [otType, setOtType] = useState(day.type === "holiday" ? "โอทีวันหยุด (x2.0)" : "โอทีล่วงเวลา (x1.0)");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState("");
  const employeeDisplayName = employeeName.replace(/\s*\([^)]*\)/g, "").trim();

  const save = () => {
    if (!start || !end) return;
    const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
    onSave(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`);
    onClose();
  };

  const inputClass = "block h-[33.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-black/[0.65] outline-none transition-all duration-300 hover:border-[#40a9ff] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/[0.32]" role="dialog" aria-modal="true" aria-label={`ขอโอที วันที่ ${day.date}`}>
      <section className="max-h-full w-full max-w-[1180px] overflow-auto rounded-[11px] bg-white font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-black/[0.65] shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]">
        <header className="sticky top-0 z-10 h-[52.275px] bg-[#61a8ff] px-6 py-3 text-lg font-[700] leading-[28.287px] text-white">
          <div className="flex h-[28.275px] items-center justify-start">ขอโอที</div>
        </header>

        <div className="relative flex h-[426.6375px] max-h-[426.64px] overflow-hidden">
          <div className="modal-left flex-1 overflow-auto px-9 py-5">
            <div className="my-1 h-[92.825px] w-full text-center text-lg font-normal leading-[28.287px]">
              <p className="m-0 mb-1"><b className="font-[700]">{day.date}</b></p>
              <p className="m-0 mb-1">สถานะ: {day.status ?? (day.type === "holiday" ? "วันหยุดนักขัตฤกษ์" : "วันทำงาน")}</p>
              <p className="m-0">กะการทำงาน: {day.shiftName ?? "WC001"} {day.shiftPeriods ?? "08:30 - 12:00 - 13:00 - 17:00"}</p>
            </div>

            <div className="modal-body p-9">
              <div className="flex h-[55.6px] gap-2">
                <label className="block flex-1">วันที่ <span className="text-red-500">*</span><input data-testid="doc-ot-date-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className={inputClass} /></label>
                <label className="block flex-1">ชื่อพนักงาน <span className="text-red-500">*</span><input data-testid="doc-ot-employee-input" disabled value={employeeDisplayName} className={cn(inputClass, "h-[31.6px] cursor-not-allowed bg-[#f5f5f5] text-black/[0.65]")} /></label>
                <label className="block flex-1">ประเภทโอที <span className="text-red-500">*</span><select data-testid="doc-ot-type-select" value={otType} onChange={(event) => setOtType(event.target.value)} className="block h-8 w-full appearance-auto rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-black/[0.65] outline-none transition-all duration-300 hover:border-[#40a9ff] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"><option>โอทีล่วงเวลา (x1.0)</option><option>โอทีล่วงเวลา (x1.5)</option><option>โอทีวันหยุด (x2.0)</option><option>โอทีล่วงเวลาวันหยุด (x3.0)</option></select></label>
              </div>
              <div className="flex h-[55.6px] gap-2">
                <label className="block flex-1">ตั้งแต่วันที่ <span className="text-red-500">*</span><input data-testid="doc-ot-start-input" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass} /></label>
                <label className="block flex-1">จนถึงวันที่ <span className="text-red-500">*</span><input data-testid="doc-ot-end-input" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className={inputClass} /></label>
              </div>
              <div className="flex h-[194px] gap-2">
                <label className="block flex-1">รายละเอียด<textarea data-testid="doc-ot-desc-textarea" rows={7} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 block h-[163.6px] w-full resize-none rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 font-[Kanit,sans-serif] text-sm leading-[22.001px] text-black/[0.65] outline-none transition-all duration-300 hover:border-[#40a9ff] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" /></label>
                <div className="flex-1"><label className="block">รูปภาพ</label><div className="relative mt-1 flex h-[164px] w-full justify-center rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white pt-[160.2px]"><label className="absolute inset-x-0 top-0 flex h-[162.4px] cursor-pointer justify-center"><span className="sr-only">{imageName || "รูปภาพโอที"}</span>{imageName ? <span className="flex size-[162.4px] items-center justify-center text-xs text-black/[0.45]">{imageName}</span> : <svg aria-hidden="true" viewBox="0 0 162.4 162.4" className="size-[162.4px]"><g fill="none" stroke="#bfbfbf" strokeWidth="4"><path d="M47 53h45l14 14v43H47z"/><path d="M61 84l11-11 12 12 8-8 14 15"/><circle cx="89" cy="74" r="5"/></g><text x="81.2" y="124" textAnchor="middle" fill="#bfbfbf" fontFamily="Arial, sans-serif" fontSize="7">NO IMAGE AVAILABLE</text></svg>}<input data-testid="doc-ot-image-input" type="file" className="hidden" onChange={(event) => setImageName(event.target.files?.[0]?.name ?? "")} /></label></div></div>
              </div>
            </div>
          </div>
        </div>

        <footer className="modal-footer sticky bottom-0 z-50 flex h-[60.8px] items-center justify-between gap-4 bg-white p-3 shadow-[0_0_1px_rgba(0,0,0,0.65)]">
          <div className="flex flex-1 justify-end">
            <button data-testid="doc-ot-close-btn-detail" type="button" onClick={onClose} className="mr-2 h-9 rounded-[4px] bg-[#808b9e] px-4 font-[Kanit,sans-serif] text-sm font-[600] leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ปิด</button>
            <button data-testid="doc-ot-save-add-btn" type="button" onClick={save} className="h-9 rounded-[4px] bg-[#03ae03] px-4 font-[Kanit,sans-serif] text-sm font-[600] leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">บันทึก</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function LeaveRequestDialog({
  day,
  employeeName,
  onClose,
  onSave,
}: {
  day: WorkDay;
  employeeName: string;
  onClose: () => void;
  onSave: (leaveType: string) => void;
}) {
  const [leaveType, setLeaveType] = useState("ลากิจพิเศษ");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const employeeDisplayName = employeeName.replace(/\s*\([^)]*\)/g, "").trim();
  const inputClass = "block h-[33.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 font-[Kanit,sans-serif] text-sm leading-[22.001px] text-black/[0.65] outline-none transition-all duration-300 hover:border-[#40a9ff] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/[0.32]" role="dialog" aria-modal="true" aria-label={`ขอลางาน วันที่ ${day.date}`}>
      <section className="max-h-full w-full max-w-[1230px] overflow-auto rounded-[11px] bg-white font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-black/[0.65] shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]">
        <header className="sticky top-0 z-10 h-[61.7125px] bg-[#61a8ff] px-6 py-3 text-white"><div className="flex items-center text-2xl font-normal leading-[37.7125px]">ขอลางาน</div></header>
        <div className="content flex h-[528.7px] overflow-hidden p-[10px]">
          <div className="left-col -mr-[10px] flex-1">
            <div className="h-[133.1px] w-full pt-[10px] text-center text-lg font-normal leading-[28.287px]">
              <p className="m-0 mb-[3.33px]"><b className="font-[700]">{day.date}</b></p>
              <p className="m-0 mb-[3.33px]">สถานะ: {day.status ?? (day.type === "holiday" ? "วันหยุดนักขัตฤกษ์" : "วันทำงาน")}</p>
              <p className="m-0 mb-[3.33px]">กะการทำงาน: {day.shiftName ?? "WC001"} {day.shiftPeriods ?? "08:30 - 12:00 - 13:00 - 17:00"}</p>
              <p className="m-0">โควตาการลา: 0.00/3.00 วัน</p>
            </div>
            <div className="modal-body flex h-[375.6px] p-9">
              <div className="w-full">
                <div className="flex h-[54px] gap-2">
                  <label className="block flex-1">ชื่อพนักงาน <span className="text-red-500">*</span><input data-testid="doc-time-leave-employee-input" disabled value={employeeDisplayName} className={cn(inputClass, "h-[31.6px] cursor-not-allowed bg-[#f5f5f5]")} /></label>
                  <label className="block flex-1">ประเภทการลา <span className="text-red-500">*</span><select data-testid="doc-time-leave-type-select" value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className="block h-8 w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] font-[Kanit,sans-serif] text-sm leading-[22.001px] text-black/[0.65] outline-none transition-all duration-300 hover:border-[#40a9ff] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"><option>ลากิจพิเศษ</option><option>ลาป่วย</option><option>ลาพักร้อน</option><option>ลาไม่รับค่าจ้าง</option></select></label>
                </div>
                <div className="flex h-[55.6px] gap-2">
                  <label className="block flex-1">ตั้งแต่วันที่ <span className="text-red-500">*</span><input data-testid="doc-time-leave-start-input" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass} /></label>
                  <label className="block flex-1">จนถึงวันที่ <span className="text-red-500">*</span><input data-testid="doc-time-leave-end-input" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className={inputClass} /></label>
                </div>
                <div className="flex h-[194px] gap-2">
                  <label className="mt-1 block flex-1">รายละเอียด<textarea data-testid="doc-time-leave-desc-textarea" rows={7} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 block h-[163.6px] w-full resize-none rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] py-1 font-[Kanit,sans-serif] text-sm leading-[22.001px] text-black/[0.65] outline-none transition-all duration-300 hover:border-[#40a9ff] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" /></label>
                  <div className="flex-1"><label className="block">รูปภาพ</label><div className="relative mt-1 flex h-[164px] w-full justify-center overflow-hidden rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white pt-[160.2px]"><label className="absolute inset-x-0 top-0 flex h-[162.4px] cursor-pointer justify-center"><span className="sr-only">{imageName || "รูปภาพการลา"}</span>{imageName ? <span className="flex size-[162.4px] items-center justify-center text-xs text-black/[0.45]">{imageName}</span> : <svg aria-hidden="true" viewBox="0 0 162.4 162.4" className="size-[162.4px]"><g fill="none" stroke="#bfbfbf" strokeWidth="4"><path d="M47 53h45l14 14v43H47z"/><path d="M61 84l11-11 12 12 8-8 14 15"/><circle cx="89" cy="74" r="5"/></g><text x="81.2" y="124" textAnchor="middle" fill="#bfbfbf" fontFamily="Arial, sans-serif" fontSize="7">NO IMAGE AVAILABLE</text></svg>}<input data-testid="doc-time-leave-image-input" type="file" accept="image/*" className="hidden" onChange={(event) => setImageName(event.target.files?.[0]?.name ?? "")} /></label></div></div>
                </div>
              </div>
            </div>
          </div>
          <div className="line-vertical relative mr-4 w-[0.8px] shrink-0 border-l-[0.8px] border-[#eee]"><button id="btn-toggle-sidebar" type="button" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)} className="absolute -left-[13px] top-1/2 flex size-6 -translate-y-1/2 items-center justify-center bg-white"><svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-6 transition-transform", sidebarOpen && "rotate-180")} fill="none"><circle cx="12" cy="12" r="11" stroke="#D9D9D9" strokeWidth="2"/><path d="M13.8242 16.2368C14.1413 15.9212 14.1404 15.4076 13.8222 15.0931L10.6914 12L13.8231 8.89908C14.1406 8.58467 14.1403 8.07151 13.8225 7.75745C13.5097 7.44847 13.0067 7.44847 12.6939 7.75745L9.1199 11.2886C8.72367 11.6801 8.72367 12.3198 9.1199 12.7113L12.6902 16.2388C13.0047 16.5495 13.5108 16.5486 13.8242 16.2368Z" fill="rgba(0,0,0,0.5419)"/></svg></button></div>
          {sidebarOpen && <aside className="right-col mt-[10px] h-[498.7px] w-[296px] shrink-0 overflow-hidden px-6"><div className="data-container"><strong className="text-base">ตั้งค่า - {leaveType}</strong><ul className="m-0 mt-2 list-disc pl-6"><li>ลาติดต่อกันได้สูงสุด <strong>3 วัน</strong></li><li>ห้ามลาเกินโควตา</li><li><span>ลาได้ </span><strong>ทุกเพศ</strong></li></ul></div></aside>}
        </div>
        <footer className="modal-footer sticky bottom-0 z-50 flex h-[60.8px] items-center justify-between gap-4 bg-white p-3 shadow-[0_0_1px_rgba(0,0,0,0.65)]"><div className="flex flex-1 justify-end"><button data-testid="doc-time-leave-close-btn" type="button" onClick={onClose} className="mr-2 h-9 rounded-[4px] bg-[#808b9e] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ปิด</button><button data-testid="doc-time-leave-save-add-btn" type="button" onClick={() => { onSave(leaveType); onClose(); }} className="h-9 rounded-[4px] bg-[#03ae03] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">บันทึก</button></div></footer>
      </section>
    </div>
  );
}

function WorkTimeEditDialog({
  day,
  employeeId,
  onClose,
  onSaved,
}: {
  day: WorkDay;
  employeeId: string;
  onClose: () => void;
  onSaved: (data: { rows?: WorkDay[]; naDates?: string[] }) => void;
}) {
  const [status, setStatus] = useState<"present" | "late" | "absent" | "leave">(day.attendanceStatus ?? (day.leave ? "leave" : "present"));
  const [checkIn, setCheckIn] = useState(day.inTime ?? "");
  const [checkOut, setCheckOut] = useState(day.outTime ?? "");
  const [overtime, setOvertime] = useState(String(overtimeMinutes(day.overtime)));
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState(day.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/payroll/work-time", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          date: dateInputValue(day.date),
          status,
          checkIn,
          checkOut,
          overtimeMinutes: Number(overtime),
          leaveType,
          reason,
        }),
      });
      const data = await response.json() as { rows?: WorkDay[]; naDates?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถบันทึกข้อมูลได้");
      onSaved(data);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label={`แก้ไขข้อมูลวันที่ ${day.date}`}>
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">แก้ไขข้อมูลวันทำงาน {day.date}</h3><button type="button" onClick={onClose} aria-label="ปิด">×</button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">สถานะ<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-1 h-9 w-full rounded border px-2"><option value="present">ทำงานปกติ</option><option value="late">มาสาย</option><option value="absent">ขาดงาน</option><option value="leave">ลา</option></select></label>
          <label className="text-sm">โอที (นาที)<input type="number" min="0" step="1" value={overtime} onChange={(event) => setOvertime(event.target.value)} className="mt-1 h-9 w-full rounded border px-2" /></label>
          <label className="text-sm">เวลาเข้า<input type="time" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-1 h-9 w-full rounded border px-2" /></label>
          <label className="text-sm">เวลาออก<input type="time" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="mt-1 h-9 w-full rounded border px-2" /></label>
          <label className="text-sm">ประเภทการลา<select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className="mt-1 h-9 w-full rounded border px-2"><option value="">ไม่บันทึกการลา</option><option value="annual">ลาพักร้อน</option><option value="sick">ลาป่วย</option><option value="personal">ลากิจ</option><option value="maternity">ลาคลอด</option><option value="unpaid">ลาไม่รับค่าจ้าง</option></select></label>
          <label className="text-sm">หมายเหตุการลา<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-9 w-full rounded border px-2" /></label>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded border px-4">ยกเลิก</button><button type="button" onClick={() => void save()} disabled={saving} className="h-9 rounded bg-[#1890ff] px-4 text-white disabled:opacity-60">{saving ? "กำลังบันทึก" : "บันทึก"}</button></div>
      </div>
    </div>
  );
}

function WorkTimeTable({ rows, naDates, employeeId, employeeName, showCalculatedAttendance, onSaved }: { rows: WorkDay[]; naDates: string[]; employeeId: string; employeeName: string; showCalculatedAttendance: boolean; onSaved: (data: { rows?: WorkDay[]; naDates?: string[] }) => void }) {
  const cellClass = "relative !p-2 !align-baseline border-b border-r border-[#d3d3d3] text-[#212121] last:border-r-0";
  const [editingDay, setEditingDay] = useState<WorkDay | null>(null);
  const [editingDayType, setEditingDayType] = useState<{ day: WorkDay; anchor: Pick<DOMRect, "left" | "top" | "width"> } | null>(null);
  const [editingShift, setEditingShift] = useState<{ day: WorkDay; anchor: Pick<DOMRect, "left" | "top" | "width"> } | null>(null);
  const [editingWorkTime, setEditingWorkTime] = useState<{ day: WorkDay; anchor: Pick<DOMRect, "left" | "top" | "width"> } | null>(null);
  const [editingOvertime, setEditingOvertime] = useState<WorkDay | null>(null);
  const [editingLeave, setEditingLeave] = useState<WorkDay | null>(null);

  useEffect(() => {
    if (!editingDayType && !editingOvertime && !editingLeave) return;

    const bodyOverflow = document.body.style.overflow;
    const bodyOverscrollBehavior = document.body.style.overscrollBehavior;
    const documentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";

    const preventScroll = (event: Event) => event.preventDefault();
    const preventScrollKeys = (event: KeyboardEvent) => {
      if ([" ", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", preventScroll, { passive: false, capture: true });
    window.addEventListener("touchmove", preventScroll, { passive: false, capture: true });
    window.addEventListener("keydown", preventScrollKeys, true);

    return () => {
      window.removeEventListener("wheel", preventScroll, true);
      window.removeEventListener("touchmove", preventScroll, true);
      window.removeEventListener("keydown", preventScrollKeys, true);
      document.body.style.overflow = bodyOverflow;
      document.body.style.overscrollBehavior = bodyOverscrollBehavior;
      document.documentElement.style.overflow = documentOverflow;
    };
  }, [editingDayType, editingOvertime, editingLeave]);

  useEffect(() => {
    if (!editingWorkTime) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-working-time-popover]")) return;
      setEditingWorkTime(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditingWorkTime(null);
    };

    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [editingWorkTime]);

  const persistWorkTime = async (action: "setTime" | "removeTime", kind: "IN" | "OUT", time?: string) => {
    if (!editingWorkTime) return;
    const response = await fetch("/api/payroll/work-time", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        employeeId,
        date: dateInputValue(editingWorkTime.day.date),
        slot: kind,
        time,
      }),
    });
    const data = await response.json().catch(() => null) as { error?: string; rows?: WorkDay[]; naDates?: string[] } | null;
    if (!response.ok) throw new Error(data?.error ?? "ไม่สามารถบันทึกเวลาทำงานได้");
    onSaved({ rows: data?.rows ?? [], naDates: data?.naDates ?? [] });
  };

  return (
    <div className="m-0 flex size-full flex-col overflow-hidden p-0">
      {/* Download timetable button */}
      <div className="my-1 flex flex-row items-center gap-1">
        <div className="flex flex-1 items-center justify-end">
          <div className="mr-[18px] flex flex-col">
          <button
            id="btn-normal-person-full-work-table-download-timetable"
            type="button"
            className="time-table-button inline-flex h-[36px] w-[164px] items-center justify-center gap-1 whitespace-nowrap rounded-[5px] border border-black bg-white px-4 font-[Kanit,sans-serif] text-[15px] font-medium leading-[normal] text-black"
          >
            <span className="whitespace-nowrap">ตารางเวลาทำงาน</span>
            <svg aria-hidden="true" viewBox="0 0 13 16" className="size-6 shrink-0" fill="none">
              <path d="M12.0594 3.06091L9.4375 0.439038C9.15625 0.157788 8.775 -0.00158691 8.37813 -0.00158691H2C1.17188 0.00153809 0.5 0.673413 0.5 1.50154V14.5015C0.5 15.3297 1.17188 16.0015 2 16.0015H11C11.8281 16.0015 12.5 15.3297 12.5 14.5015V4.12341C12.5 3.72654 12.3406 3.34216 12.0594 3.06091ZM10.8781 4.00154H8.5V1.62341L10.8781 4.00154ZM2 14.5015V1.50154H7V4.75154C7 5.16716 7.33437 5.50154 7.75 5.50154H11V14.5015H2ZM9.81875 10.0109C9.4375 9.63591 8.35 9.73904 7.80625 9.80779C7.26875 9.47966 6.90938 9.02654 6.65625 8.36091C6.77812 7.85779 6.97187 7.09216 6.825 6.61091C6.69375 5.79216 5.64375 5.87341 5.49375 6.42654C5.35625 6.92966 5.48125 7.62966 5.7125 8.52341C5.4 9.27029 4.93437 10.2734 4.60625 10.8484C3.98125 11.1703 3.1375 11.6672 3.0125 12.2922C2.90937 12.7859 3.825 14.0172 5.39062 11.3172C6.09062 11.0859 6.85312 10.8015 7.52812 10.689C8.11875 11.0078 8.80938 11.2203 9.27188 11.2203C10.0688 11.2203 10.1469 10.339 9.81875 10.0109ZM3.62812 12.4422C3.7875 12.014 4.39375 11.5203 4.57812 11.3484C3.98438 12.2953 3.62812 12.464 3.62812 12.4422ZM6.17812 6.48591C6.40937 6.48591 6.3875 7.48904 6.23438 7.76091C6.09688 7.32654 6.1 6.48591 6.17812 6.48591ZM5.41563 10.7547C5.71875 10.2265 5.97813 9.59841 6.1875 9.04529C6.44688 9.51716 6.77813 9.89529 7.12813 10.1547C6.47813 10.289 5.9125 10.564 5.41563 10.7547ZM9.52812 10.5984C9.52812 10.5984 9.37187 10.7859 8.3625 10.3547C9.45938 10.2734 9.64062 10.5234 9.52812 10.5984Z" fill="#FF402F" />
            </svg>
          </button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "max-h-[60vh] border border-[#d3d3d3]",
          editingDayType || editingOvertime || editingLeave ? "overflow-hidden" : "overflow-auto"
        )}
        onClick={() => {
          setEditingDayType(null);
          setEditingShift(null);
          setEditingWorkTime(null);
          setEditingOvertime(null);
          setEditingLeave(null);
        }}
      >
        <table className="box-content min-w-[1533px] table-fixed border border-[#d3d3d3] border-separate border-spacing-0 text-sm leading-[22px]">
          <colgroup>
            <col className="w-[150px] min-w-[150px]" />
            <col className="w-[235px] min-w-[235px]" />
            <col className="w-[200px] min-w-[200px]" />
            <col className="w-[260px] min-w-[260px]" />
            <col className="w-[254px] min-w-[254px]" />
            <col className="w-[254px] min-w-[254px]" />
            <col className="w-[180px] min-w-[180px]" />
          </colgroup>
          <TableHeader className="border-b-[1.6px] border-[#d3d3d3] [&_tr]:!border-[#d3d3d3]">
            <TableRow className="hover:bg-transparent">
              <BlueTableHead className="sticky top-0 z-10 w-[150px] !p-4 text-center">วันที่</BlueTableHead>
              <BlueTableHead className="sticky top-0 z-10 w-[235px] !p-4 text-center">กะการทำงาน</BlueTableHead>
              <BlueTableHead className="sticky top-0 z-10 w-[200px] !p-4 text-center">เวลาทำงาน</BlueTableHead>
              <BlueTableHead className="sticky top-0 z-10 w-[260px] !p-4 text-center"><span className="inline-block w-44 text-sm">มาเช้า/สาย/พักเกิน/พักไว/กลับก่อน/กลับช้า</span></BlueTableHead>
              <BlueTableHead className="sticky top-0 z-10 w-[254px] !p-4 text-center">โอที</BlueTableHead>
              <BlueTableHead className="sticky top-0 z-10 w-[254px] !p-4 text-center">ลา</BlueTableHead>
              <BlueTableHead className="sticky top-0 z-10 w-[180px] !p-4 text-center">หมายเหตุ</BlueTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <tr aria-hidden="true" className="h-[1.6px] border-0 bg-[#d3d3d3]">
              <td colSpan={7} className="!h-[1.6px] !p-0 leading-none" />
            </tr>
            {rows.map((d) => {
              const variances = showCalculatedAttendance ? attendanceVariances(d) : [];
              return <TableRow
                key={d.date}
                className={cn(
                  d.type === "holiday" ? "bg-[#e0e0e0] hover:bg-[#e0e0e0]" : "bg-transparent hover:bg-transparent"
                )}
              >
                <TableCell className={cellClass}>
                  <CellEditIcon onClick={(event) => {
                    event.stopPropagation();
                    setEditingShift(null);
                    setEditingWorkTime(null);
                    setEditingOvertime(null);
                    setEditingLeave(null);
                    const anchor = event.currentTarget.getBoundingClientRect();
                    setEditingDayType((current) => current?.day.date === d.date ? null : { day: d, anchor });
                  }} />
                  <p className="text-[13px] leading-[20.43px] text-[#212121]">
                    {d.day} {d.date}<br />{d.status ?? (d.type === "work" ? "วันทำงาน" : "วันหยุดพนักงาน")}
                  </p>
                </TableCell>
                <TableCell className={cellClass}>
                  <CellEditIcon onClick={(event) => {
                    event.stopPropagation();
                    setEditingDayType(null);
                    setEditingWorkTime(null);
                    setEditingOvertime(null);
                    setEditingLeave(null);
                    const anchor = event.currentTarget.getBoundingClientRect();
                    setEditingShift((current) => current?.day.date === d.date ? null : { day: d, anchor });
                  }} />
                  <p className="text-[13px] leading-[20.43px] text-[#212121]">
                    {d.shiftName ?? SHIFT_INFO.name} : {d.hours} ชั่วโมง
                  </p>
                  <p className="text-[13px] leading-[20.43px] text-[#212121]">{d.shiftPeriods ?? SHIFT_INFO.periods}</p>
                  <p className="flex items-center text-[13px] leading-[20.43px] text-[#212121]">
                    <span className="pr-[5px] text-[#61a8ff]">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3 fill-current">
                        <path d="M11 17h2v-2h-2v2zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
                      </svg>
                    </span>
                    <span>คำนวณได้ {d.calculatedHours ?? d.hours} ชั่วโมง</span>
                  </p>
                </TableCell>
                <TableCell className={cellClass}>
                  <CellEditIcon onClick={(event) => {
                    event.stopPropagation();
                    setEditingDayType(null);
                    setEditingShift(null);
                    setEditingOvertime(null);
                    setEditingLeave(null);
                    const anchor = event.currentTarget.getBoundingClientRect();
                    setEditingWorkTime((current) => current?.day.date === d.date ? null : { day: d, anchor });
                  }} />
                  {(d.inTime || d.outTime) && (
                    <p className="text-[13px] leading-[20.43px] text-[#212121]">
                      {d.inTime && <span className="text-xs leading-[18.858px]"> (IN) {d.inTime} </span>}
                      {d.inTime && d.outTime && <>&nbsp;-&gt;&nbsp;</>}
                      {d.outTime && <span className="text-xs leading-[18.858px]"> (OUT) {d.outTime} </span>}
                    </p>
                  )}
                </TableCell>
                <TableCell className={cellClass}>
                  {variances.map((variance) => (
                    <div key={variance.label} className="flex w-full items-start justify-between text-[13px] font-normal leading-[20.43px] text-[#212121]">
                      <span> {variance.label} =&gt; {variance.duration} </span>
                    </div>
                  ))}
                </TableCell>
                <TableCell className={cellClass}>
                  <CellEditIcon onClick={(event) => {
                    event.stopPropagation();
                    setEditingDayType(null);
                    setEditingShift(null);
                    setEditingWorkTime(null);
                    setEditingOvertime(d);
                    setEditingLeave(null);
                  }} />
                  {d.overtime && <p className="text-[13px] leading-[20.43px] text-[#212121]">{d.overtime}</p>}
                </TableCell>
                <TableCell className={cellClass}>
                  <CellEditIcon onClick={(event) => {
                    event.stopPropagation();
                    setEditingDayType(null);
                    setEditingShift(null);
                    setEditingWorkTime(null);
                    setEditingOvertime(null);
                    setEditingLeave(d);
                  }} />
                  {d.leave && <p className="text-[13px] leading-[20.43px] text-[#212121]">{d.leave}</p>}
                </TableCell>
                <TableCell className={cellClass}>
                  <CellEditIcon onClick={() => setEditingDay(d)} />
                  {d.note && <p className="text-[13px] leading-[20.43px] text-[#212121]">{d.note}</p>}
                </TableCell>
              </TableRow>;
            })}
            {naDates.map((date) => (
              <TableRow key={date} className="bg-muted/40 hover:bg-muted/40">
                <TableCell className="text-foreground">
                  <span className="font-medium text-red-500">{date}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">ไม่มีสถานะวันทำงาน</span>
                </TableCell>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  ยังไม่ได้เริ่มงาน/ลาออก
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
      {editingDay && <WorkTimeEditDialog day={editingDay} employeeId={employeeId} onClose={() => setEditingDay(null)} onSaved={onSaved} />}
      {editingDayType && createPortal(
        <WorkDayTypePopover day={editingDayType.day} anchor={editingDayType.anchor} employeeId={employeeId} onClose={() => setEditingDayType(null)} onSaved={onSaved} />,
        document.body
      )}
      {editingShift && createPortal(
        <WorkShiftPopover
          day={editingShift.day}
          anchor={editingShift.anchor}
          onClose={() => setEditingShift(null)}
          onSelect={(shift) => onSaved({
            rows: rows.map((row) => row.date === editingShift.day.date ? {
              ...row,
              shiftName: shift.name,
              hours: shift.hours,
              shiftPeriods: shift.periods,
            } : row),
            naDates,
          })}
        />,
        document.body
      )}
      {editingWorkTime && createPortal(
        <WorkingTimePopover
          day={editingWorkTime.day}
          anchor={editingWorkTime.anchor}
          onClose={() => setEditingWorkTime(null)}
          onSaveTime={(kind, time) => persistWorkTime("setTime", kind, time)}
          onRemoveTime={(kind) => persistWorkTime("removeTime", kind)}
        />,
        document.body
      )}
      {editingOvertime && createPortal(
        <OvertimeRequestDialog
          day={editingOvertime}
          employeeName={employeeName}
          onClose={() => setEditingOvertime(null)}
          onSave={(overtime) => onSaved({
            rows: rows.map((row) => row.date === editingOvertime.date ? { ...row, overtime } : row),
            naDates,
          })}
        />,
        document.body
      )}
      {editingLeave && createPortal(
        <LeaveRequestDialog
          day={editingLeave}
          employeeName={employeeName}
          onClose={() => setEditingLeave(null)}
          onSave={(leave) => onSaved({
            rows: rows.map((row) => row.date === editingLeave.date ? { ...row, leave } : row),
            naDates,
          })}
        />,
        document.body
      )}
    </div>
  );
}

function DocumentSubmissionContent() {
  const [activeDocumentTab, setActiveDocumentTab] = useState(DOCUMENT_SUBMISSION_TABS[0]);

  const requestLabel: Record<(typeof DOCUMENT_SUBMISSION_TABS)[number], string> = {
    "โอที": "ขอโอที",
    "ลางาน": "ขอลางาน",
    "เพิ่มเวลา": "ขอเพิ่มเวลา",
    "วันหยุด": "ขอเปลี่ยนวันหยุด",
    "กะการทำงาน": "ขอเปลี่ยนกะการทำงาน",
  };

  return (
    <section className="flex w-full flex-col overflow-hidden lg:h-[calc(100vh-25rem)] lg:min-h-[28rem] lg:flex-row" aria-label="ยื่นเอกสาร">
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="ประเภทยื่นเอกสาร"
        className="flex shrink-0 overflow-x-auto border-b border-[#e8e8e8] bg-white lg:-mr-px lg:w-[93.975px] lg:flex-col lg:overflow-x-visible lg:border-b-0"
      >
        <div className="hidden h-8 shrink-0 items-center justify-center text-[rgba(0,0,0,0.45)] lg:flex" aria-hidden="true">
          <ChevronDown className="size-4 rotate-180" />
        </div>
        {DOCUMENT_SUBMISSION_TABS.map((tab) => {
          const active = tab === activeDocumentTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveDocumentTab(tab)}
              className={cn(
                "relative mb-4 block h-[46px] min-w-[93px] whitespace-nowrap bg-transparent px-3 text-right text-sm font-normal leading-[22.001px] tracking-[-0.1px] transition-all duration-300 ease-[cubic-bezier(0.645,0.045,0.355,1)] lg:w-[95.175px]",
                tab === DOCUMENT_SUBMISSION_TABS[DOCUMENT_SUBMISSION_TABS.length - 1] && "mb-0",
                active ? "font-medium text-[#61a8ff]" : "text-[rgba(0,0,0,0.65)] hover:text-[#61a8ff]"
              )}
            >
              {tab}
              {active && <span className="absolute -left-px top-0 h-full w-full rounded-[8px] border-2 border-[#61a8ff]" />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={activeDocumentTab} className="m-[15px_15px_15px_5px] flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#1687df]"
          >
            {requestLabel[activeDocumentTab]}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 15H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V8h10v2z" />
            </svg>
          </button>

          <div className="ml-auto flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-[91px] items-center gap-1 rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[#008000] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-black/[.04]"
            >
              <Check className="size-5" />
              อนุมัติ
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-[104px] items-center gap-0 whitespace-nowrap rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[#ff0000] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-black/[.04]"
            >
              <X className="size-5" />
              ไม่อนุมัติ
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto border border-[#f0f0f0]">
          <Table className="box-content min-w-[1420px] table-fixed border-separate border-spacing-0 border border-[#d3d3d3] text-sm leading-[22px]">
            <colgroup>
              <col className="w-[60px]" />
              <col className="w-[500px]" />
              <col className="w-[250px]" />
              <col className="w-[150px]" />
              <col className="w-[200px]" />
              <col className="w-[200px]" />
              <col className="w-[60px]" />
            </colgroup>
            <TableHeader className="border-b border-[#f0f0f0] [&_tr]:border-[#f0f0f0]">
              <TableRow className="bg-[#61a8ff] hover:bg-[#61a8ff]">
                <TableHead className="h-[55px] border-r border-[#d3d3d3] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] normal-case tracking-normal text-white first:rounded-tl-[2px]">
                  <input type="checkbox" aria-label="เลือกรายการทั้งหมด" className="size-4 accent-[#1890ff]" />
                </TableHead>
                {['รายละเอียด', 'สถานะ', 'วันที่', 'กะการทำงาน', 'เวลาทำงาน'].map((heading) => (
                  <TableHead key={heading} className="h-[55px] border-r border-[#d3d3d3] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] normal-case tracking-normal text-white">{heading}</TableHead>
                ))}
                <TableHead className="h-[55px] bg-[#61a8ff] p-4 text-center text-sm font-medium leading-[22.001px] normal-case tracking-normal text-white last:rounded-tr-[2px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="h-[150px] bg-white hover:bg-white">
                <TableCell colSpan={7} className="p-0">
                  <div className="relative -top-px flex h-[150px] flex-col items-center justify-center gap-2 text-[rgba(0,0,0,0.25)]">
                    <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                        <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                        <g fill="#d9d9d9" fillRule="nonzero">
                          <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                          <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                        </g>
                      </g>
                    </svg>
                    <p className="text-sm leading-[22px] text-[rgba(0,0,0,0.45)]">ไม่มีข้อมูล</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

const PERSONAL_EXPENSE_ITEMS = [
  "กองทุนกู้ยืม กยศ.",
  "ปรับเงินหักอื่นๆ",
  "เงินหักกรมบังคับคดี",
];

function EmptyTableState() {
  return (
    <div className="flex h-[150px] flex-col items-center justify-center gap-2 text-[rgba(0,0,0,0.45)]">
      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
          <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
          <g fill="#d9d9d9" fillRule="nonzero">
            <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
          </g>
        </g>
      </svg>
      <p className="text-sm leading-[22px]">ไม่มีข้อมูล</p>
    </div>
  );
}

function PersonalIncomeExpenseTable({
  title,
  children,
  className,
}: {
  title: "รายรับ" | "รายจ่าย";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("m-3 min-w-0 flex-1 overflow-x-auto lg:min-w-[566px]", className)}>
      <div className="min-w-[550px] border border-[#f0f0f0] bg-white text-sm text-[rgba(0,0,0,0.87)]">
        <div className="flex h-[64.225px] items-center border-b border-[#f0f0f0] px-4 text-xl font-bold leading-6 text-[rgba(0,0,0,0.65)]">{title}</div>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[150px]" />
            <col className="w-[200px]" />
            <col className="w-[200px]" />
          </colgroup>
          <thead>
            <tr className="h-[54.8px] bg-[#61a8ff]">
              {['ประเภท', 'รายการ', 'มูลค่า'].map((heading) => (
                <th key={heading} className="border-b border-r border-[#d3d3d3] px-4 text-center text-sm font-medium leading-[22px] text-white last:border-r-0">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function PersonalIncomeExpenseContent() {
  return (
    <>
      <section className="flex flex-col lg:flex-row" aria-label="รายรับรายจ่าย">
        <PersonalIncomeExpenseTable title="รายรับ" className="lg:mr-5">
          <tr>
            <td colSpan={3} className="p-0"><EmptyTableState /></td>
          </tr>
        </PersonalIncomeExpenseTable>

        <PersonalIncomeExpenseTable title="รายจ่าย">
          <tr className="h-[41.1375px] bg-[#81d4fa]">
            <th colSpan={3} className="border-b border-[#f0f0f0] px-2 text-left text-base font-bold leading-[22px] text-black">Expense</th>
          </tr>
          {PERSONAL_EXPENSE_ITEMS.map((item) => (
            <tr key={item} className="h-[48px] bg-white">
              <td className="border-b border-r border-[#f0f0f0] px-2" />
              <td className="border-b border-r border-[#f0f0f0] px-2 leading-[22px] text-[rgba(0,0,0,0.65)]">{item}</td>
              <td className="border-b border-[#f0f0f0] px-2 py-2 text-right">
                <input
                  type="number"
                  min="0"
                  step="1"
                  aria-label={`มูลค่า ${item}`}
                  className="h-8 w-full rounded-[2px] border border-[#d9d9d9] bg-white px-2 text-right text-sm outline-none transition-colors hover:border-[#40a9ff] focus:border-[#40a9ff] focus:ring-1 focus:ring-[#40a9ff]"
                />
              </td>
            </tr>
          ))}
        </PersonalIncomeExpenseTable>
      </section>
      <div className="m-3">
        <button type="button" className="block h-8 w-full rounded-[2px] border border-[#1890ff] bg-[#1890ff] px-[15px] py-1 text-sm font-normal leading-[22.001px] text-white transition-colors hover:bg-[#40a9ff]">
          บันทึก
        </button>
      </div>
    </>
  );
}

type AdvanceWithdrawal = {
  date: string;
  amount: number;
};

function formatBaht(amount: number) {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
}

function AdvanceSummaryRow({
  label,
  value,
  bordered = false,
  labelClassName,
}: {
  label: string;
  value: number;
  bordered?: boolean;
  labelClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-[25.14px] flex-1 items-center justify-between text-base leading-[25.144px] text-black/[0.87]", bordered && "border-b-[0.25px] border-[#cccccc]")}>
      <span className={cn("text-left", labelClassName)}>{label}</span>
      <span className="shrink-0 text-right">{formatBaht(value)}</span>
    </div>
  );
}

function AdvanceWithdrawalContent() {
  const [date, setDate] = useState(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [amount, setAmount] = useState("");
  const [withdrawals, setWithdrawals] = useState<AdvanceWithdrawal[]>([]);

  const parsedAmount = Number(amount);
  const canSave = Boolean(date) && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const withdrawnAmount = withdrawals.reduce((total, withdrawal) => total + withdrawal.amount, 0);
  const creditLimit = 0;
  const forecastAmount = 39992.17;

  const displayDate = (value: string) => {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  const saveWithdrawal = () => {
    if (!canSave) return;

    setWithdrawals((current) => [...current, { date, amount: parsedAmount }]);
    setDate("");
    setAmount("");
  };

  return (
    <div className="flex flex-col p-6 lg:flex-row">
      <aside className="mr-0 flex w-full shrink-0 self-start lg:mr-3 lg:w-[37.42%]">
        <div className="m-6 flex min-h-[278.9px] w-full flex-col rounded-[5px] border-[1.6px] border-[#008000] p-3">
          <div className="flex min-h-[25.14px] flex-1 items-center">
            <p className="text-base font-bold leading-[25.144px] text-black/[0.87]">กำหนดเบิกตามวงเงิน</p>
          </div>
          <div className="flex flex-1 flex-col">
            <AdvanceSummaryRow label="วงเงินเบิกล่วงหน้า" value={creditLimit} />
            <AdvanceSummaryRow label="เบิกไปแล้ว" value={withdrawnAmount} bordered />
            <AdvanceSummaryRow label="คงเหลือ" value={creditLimit - withdrawnAmount} />
          </div>

          <div className="my-3 border-t border-[#f0f0f0]" />

          <div className="flex min-h-[25.14px] flex-1 items-center">
            <p className="text-base font-bold leading-[25.144px] text-black/[0.87]">คาดการณ์การเบิกล่วงหน้า</p>
          </div>
          <div className="flex flex-1 flex-col">
            <AdvanceSummaryRow label="Calculated : 27/08/2026 09:40 น." value={forecastAmount} labelClassName="mr-3" />
            <AdvanceSummaryRow label="เบิกไปแล้ว" value={withdrawnAmount} bordered />
            <AdvanceSummaryRow label="คงเหลือ" value={forecastAmount - withdrawnAmount} />
          </div>
        </div>
      </aside>

      <div className="w-full min-w-0 lg:w-[61.5%]">
        <div className="m-[26px] rounded-[5px] border-[0.8px] border-[#cccccc] bg-white p-3">
          <div className="p-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-start">
              <label className="flex min-w-0 flex-1 flex-col items-start text-[18px] font-normal leading-[28.287px] text-black/[0.87]">
                วันที่
                <span className="relative block">
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    aria-label="วันที่เบิกล่วงหน้า"
                    className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] pr-9 font-[Kanit,sans-serif] text-sm leading-[22px] text-black/[0.65] outline-none transition-colors hover:border-[#40a9ff] focus:border-[#40a9ff] focus:ring-1 focus:ring-[#40a9ff]"
                  />
                  <Calendar aria-hidden="true" className="pointer-events-none absolute right-[11px] top-[7px] size-4 text-black/[0.45]" />
                </span>
              </label>
              <label className="flex min-w-0 flex-1 flex-col items-start text-[18px] font-normal leading-[28.287px] text-black/[0.87]">
                จำนวนเงิน
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    aria-label="จำนวนเงินเบิกล่วงหน้า"
                    className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] font-[Kanit,sans-serif] text-right text-sm leading-[22px] text-black/[0.65] outline-none transition-colors hover:border-[#40a9ff] focus:border-[#40a9ff] focus:ring-1 focus:ring-[#40a9ff]"
                  />
              </label>
              <div className="md:w-[67px]">
                <span className="block h-[28.287px] text-[18px] leading-[28.287px] text-transparent" aria-hidden="true">บันทึก</span>
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={saveWithdrawal}
                  className="h-[30px] w-full rounded-[2px] bg-[#1890ff] px-[15px] font-[Kanit,sans-serif] text-sm font-semibold leading-[22px] text-white transition-colors hover:bg-[#40a9ff] disabled:cursor-not-allowed disabled:bg-black/[0.12] disabled:text-black/[0.26]"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[2px_2px_0_0] border-[0.8px] border-[#d9d9d9]">
            <table className="w-full min-w-[380px] table-fixed border-collapse font-[Kanit,sans-serif] text-sm leading-[22.001px] text-black/[0.65]">
              <thead>
                <tr className="h-[54.8px] bg-[#61a8ff] text-white">
                  <th className="w-20 border-r border-[#d9d9d9] px-4 text-center font-medium">ลำดับ</th>
                  <th className="w-[150px] border-r border-[#d9d9d9] px-4 text-center font-medium">วันที่</th>
                  <th className="w-[150px] px-4 text-right font-medium">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="h-[150px] border-b border-[#f0f0f0] text-center text-sm text-black/[0.25]">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <svg aria-hidden="true" viewBox="0 0 64 41" className="h-[41px] w-16 fill-[#f5f5f5] stroke-[#d9d9d9]">
                          <ellipse cx="32" cy="33" rx="31" ry="7" fill="none" />
                          <path d="M55 13 45 1H19L9 13v18c0 2 1 4 3 4h40c2 0 3-2 3-4V13ZM9 22h11c1 0 2 1 2 3h20c0-2 1-3 3-3h10" fill="none" />
                        </svg>
                        <span>ไม่มีข้อมูล</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((withdrawal, index) => (
                    <tr key={`${withdrawal.date}-${index}`}>
                      <td className="h-12 border-b border-r border-[#f0f0f0] px-4 text-center">{index + 1}</td>
                      <td className="border-b border-r border-[#f0f0f0] px-4 text-center">{displayDate(withdrawal.date)}</td>
                      <td className="border-b border-[#f0f0f0] px-4 text-right">{formatBaht(withdrawal.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="h-[54.8px] border-r border-[#d9d9d9] px-4 text-right">รวมเป็นเงิน</td>
                  <td className="px-4 text-right">{formatBaht(withdrawnAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

type CalculationResultRow = {
  cells: React.ReactNode[];
  emphasis?: "group" | "total" | "expense-total" | "footer" | "highlight" | "empty";
};

function CalculationResultTable({
  title,
  headers,
  widths,
  rows,
  heightClassName,
}: {
  title: string;
  headers: string[];
  widths: string[];
  rows: CalculationResultRow[];
  heightClassName?: string;
}) {
  const bodyRows = rows.filter((row) => row.emphasis !== "footer");
  const footerRows = rows.filter((row) => row.emphasis === "footer");
  const isTimeSummary = title === "ผลรวมเวลา";
  const isIncomeExpenseSummary = title === "รายรับรายจ่ายระหว่างเดือน";

  const renderRow = (row: CalculationResultRow, rowIndex: number) => row.emphasis === "group" ? (
    <tr key={rowIndex} className="text-base font-bold text-black">
      <th colSpan={headers.length} className="bg-[#81d4fa] px-2 py-2 text-left leading-[25.1361875px]">{row.cells[0]}</th>
    </tr>
  ) : row.emphasis === "empty" ? (
    <tr key={rowIndex}>
      <td colSpan={headers.length} className="h-[150px] border-b border-[#f0f0f0] text-center text-black/[0.25]">{row.cells[0]}</td>
    </tr>
  ) : (
    <tr key={rowIndex} className={cn(
      row.emphasis === "total" && "bg-white font-bold",
      row.emphasis === "expense-total" && "bg-[#f2fafe] font-bold",
      row.emphasis === "footer" && "bg-[#61a8ff] font-bold text-white",
      row.emphasis === "highlight" && "bg-[#bddeff]"
    )}>
      {row.cells.map((cell, cellIndex) => (
        <td
          key={cellIndex}
          colSpan={row.emphasis === "footer" || row.emphasis === "total" || row.emphasis === "expense-total" || row.emphasis === "highlight" ? (cellIndex === 0 ? headers.length - 1 : 1) : 1}
          className={cn(
            "border-b border-r border-[#f0f0f0] px-2 py-2 align-middle",
            isTimeSummary && row.emphasis === undefined && (rowIndex % 2 === 0 ? "bg-[#f2fafe]" : "bg-white"),
            isIncomeExpenseSummary && row.emphasis === undefined && (rowIndex % 2 === 0 ? "bg-[#f2fafe]" : "bg-white"),
            row.emphasis === "total" && "bg-white",
            row.emphasis === "expense-total" && "bg-[#f2fafe]",
            row.emphasis === "footer" && "border-b-0 px-4 py-4",
            row.emphasis === "footer" || row.emphasis === "total" || row.emphasis === "expense-total" || row.emphasis === "highlight" || cellIndex === headers.length - 1 || isTimeSummary && cellIndex >= 2 ? "text-right" : cellIndex === 0 ? "text-center" : "text-left"
          )}
        >
          {cell}
        </td>
      ))}
    </tr>
  );

  return (
    <section className={cn("min-w-0 self-start overflow-hidden rounded-[8px] bg-white font-[Kanit,sans-serif] text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)]", heightClassName)}>
      <h3 className="border-x-[0.8px] border-t-[0.8px] border-[#f0f0f0] px-4 py-4 text-left text-[20px] font-bold leading-[31.43px] text-[rgba(0,0,0,0.65)]">{title}</h3>
      <div className={cn("overflow-x-auto border-l-[0.8px] border-t-[0.8px] border-[#f0f0f0]", isTimeSummary && "h-[398.4px]", isIncomeExpenseSummary && "h-[809.475px]")}>
      <table className="table-fixed border-separate border-spacing-0 text-left" style={{ width: `${widths.reduce((total, width) => total + Number.parseFloat(width), 0)}px`, minWidth: "100%" }}>
        <colgroup>
          {widths.map((width, index) => <col key={index} style={{ width, minWidth: width }} />)}
        </colgroup>
        <thead>
          <tr className="h-[54.8px] bg-[#61a8ff] text-center">
            {headers.map((header, index) => (
              <th key={header} className={cn("border-b border-r border-[#f0f0f0] px-4 text-center font-medium text-white", index === headers.length - 1 && "text-center")}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map(renderRow)}
        </tbody>
        {footerRows.length > 0 && <tfoot>{footerRows.map(renderRow)}</tfoot>}
      </table>
      </div>
    </section>
  );
}

function ResultHelp({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 14 15" className={cn("ml-1 inline-block size-3 align-[-2.25px]", className)} fill="none">
      <path d="M6.4165 11H7.58317V9.83329H6.4165V11ZM6.99984 1.66663C6.23379 1.66663 5.47525 1.81751 4.76752 2.11066C4.05978 2.40381 3.41672 2.83349 2.87505 3.37517C1.78109 4.46913 1.1665 5.95286 1.1665 7.49996C1.1665 9.04706 1.78109 10.5308 2.87505 11.6247C3.41672 12.1664 4.05978 12.5961 4.76752 12.8893C5.47525 13.1824 6.23379 13.3333 6.99984 13.3333C8.54693 13.3333 10.0307 12.7187 11.1246 11.6247C12.2186 10.5308 12.8332 9.04706 12.8332 7.49996C12.8332 6.73391 12.6823 5.97537 12.3891 5.26764C12.096 4.55991 11.6663 3.91684 11.1246 3.37517C10.583 2.83349 9.93989 2.40381 9.23216 2.11066C8.52442 1.81751 7.76588 1.66663 6.99984 1.66663ZM6.99984 12.1666C4.42734 12.1666 2.33317 10.0725 2.33317 7.49996C2.33317 4.92746 4.42734 2.83329 6.99984 2.83329C9.57234 2.83329 11.6665 4.92746 11.6665 7.49996C11.6665 10.0725 9.57234 12.1666 6.99984 12.1666ZM6.99984 3.99996C6.381 3.99996 5.78751 4.24579 5.34992 4.68338C4.91234 5.12096 4.6665 5.71445 4.6665 6.33329H5.83317C5.83317 6.02387 5.95609 5.72713 6.17488 5.50833C6.39367 5.28954 6.69042 5.16663 6.99984 5.16663C7.30926 5.16663 7.606 5.28954 7.82479 5.50833C8.04359 5.72713 8.1665 6.02387 8.1665 6.33329C8.1665 7.49996 6.4165 7.35413 6.4165 9.24996H7.58317C7.58317 7.93746 9.33317 7.79163 9.33317 6.33329C9.33317 5.71445 9.08734 5.12096 8.64975 4.68338C8.21217 4.24579 7.61868 3.99996 6.99984 3.99996Z" fill="black" fillOpacity="0.65" />
    </svg>
  );
}

function CalculationResultContent({ payroll }: { payroll: PersonalPayrollData | null }) {
  const values = payroll?.calculation ?? payroll?.preview;
  const grossPay = values?.grossPay ?? 0;
  const deductions = values?.deductions ?? 0;
  const netPay = values?.netPay ?? 0;
  const tax = payroll?.tax ?? 0;
  const socialSecurity = payroll?.socialSecurity ?? 0;
  const providentFund = payroll?.providentFund ?? 0;
  const workDays = payroll?.time.workingDays ?? 0;
  const leaveDays = payroll?.time.leaveDays ?? 0;
  const workDuration = payroll?.time.actualMinutes ?? 0;
  const timeRows: CalculationResultRow[] = [
    { cells: ["1", "เงินเดือน", "", <span key="salary">{formatPayrollAmount(grossPay)} <ResultHelp /></span>] },
    { cells: ["2", "ค่าแรง", <span key="wage">{formatPayrollAmount(grossPay / 30)} /วัน <ResultHelp /></span>, ""] },
    { cells: ["3", "วันทำงาน", <span key="days">{workDays}/30 วัน <ResultHelp /></span>, ""] },
    { cells: ["4", "วันลา", <span key="holiday">{leaveDays} วัน <ResultHelp /></span>, ""] },
    { cells: ["5", <div key="hours" className="flex items-center justify-between"><span>ชั่วโมงการทำงาน</span><ResultHelp className="relative top-[0.46875px]" /></div>, <span key="work-hours">{formatPayrollDuration(workDuration)} <ResultHelp /></span>, ""] },
    { cells: ["6", <div key="special" className="flex items-center justify-between"><span>วันทำงานพิเศษ</span><ResultHelp className="relative top-[0.46875px]" /></div>, <span key="special-days">0: วัน <ResultHelp /></span>, ""] },
    { cells: ["มูลค่า", formatPayrollAmount(grossPay)], emphasis: "footer" },
  ];
  const incomeRows = [
    ["ST0028", "Constant", "ค่าตอบแทนจากยอดขาย", "0.00 บาท"],
    ["ST0034", "Constant", "ค่าบำรุงรักษารถ", "0.00 บาท"],
    ["ST0029", "Constant", "ค่าเดินทาง/ ค่าน้ำมัน", "0.00 บาท"],
    ["ST0030", "Constant", "ค่าเบี้ยเลี้ยง", "0.00 บาท"],
    ["ST0031", "Constant", "ค่าโทรศัพท์", "0.00 บาท"],
    ["ST0032", "Constant", "ปรับเงินรับอื่นๆ", "0.00 บาท"],
    ["ST0033", "Constant", "เงินรับอื่นๆ", "0.00 บาท"],
    ["ST0012", "Constant", "โบนัส", "0.00 บาท"],
  ];
  const expenseRows = [
    ["ST0005", "Expense", "กองทุนกู้ยืม กยศ.", "0.00 บาท"],
    ["social_insurance", "Auto", "ประกันสังคม", formatPayrollAmount(socialSecurity)],
    ["provident_fund", "Auto", "กองทุนสำรองเลี้ยงชีพ", formatPayrollAmount(providentFund)],
    ["ST0026", "Expense", "ปรับเงินหักอื่นๆ", "0.00 บาท"],
    ["tax", "Auto", "ภาษี", formatPayrollAmount(tax)],
    ["ST0025", "Auto", "สาย", "0.00 บาท"],
    ["work_insurance", "Loan", "เงินประกันการทำงาน", "0.00 บาท"],
    ["ST0007", "Expense", "เงินหักกรมบังคับคดี", "0.00 บาท"],
  ];
  const incomeExpenseRows: CalculationResultRow[] = [
    { cells: ["รายรับ"], emphasis: "group" },
    ...incomeRows.map((row, index) => ({
      cells: [String(index + 1), <span key={row[0]} className="flex items-center justify-between"><span>{row[0]}</span>{row[0] !== "ST0031" && <span className="inline-flex h-4 w-[27.3375px] items-center justify-center rounded-[5px] bg-[rgba(255,93,24,0.5)] p-0 text-center text-[10px] font-medium leading-[15.715px] text-[rgba(0,0,0,0.65)]">Tax</span>}</span>, row[1], row[2], row[3]],
    })),
    { cells: ["รวมรายรับ", "0.00 บาท"], emphasis: "total" },
    { cells: ["รายจ่าย"], emphasis: "group" },
    ...expenseRows.map((row, index) => ({ cells: [String(index + 1), row[0], row[1], row[2], row[3]] })),
    { cells: ["รวมรายจ่าย", formatPayrollAmount(deductions)], emphasis: "expense-total" },
  ];
  const netRows: CalculationResultRow[] = [
    { cells: ["รวมการคำนวณเวลา", <span key="time-total">{formatPayrollAmount(grossPay)} <ResultHelp /></span>] },
    { cells: ["รวมรายรับ", <span key="income-total">0.00 บาท <ResultHelp /></span>] },
    { cells: ["รวมรายจ่าย", <span key="expense-total">{formatPayrollAmount(deductions)} <ResultHelp /></span>] },
    { cells: ["รวมรายรับรายจ่าย", <span key="income-expense-total">{formatPayrollAmount(-deductions)} <ResultHelp /></span>] },
    { cells: ["เงินเดือนที่ได้รับ", <span key="net-pay">{formatPayrollAmount(netPay)} <ResultHelp /></span>], emphasis: "highlight" },
    { cells: ["รวมเบิกล่วงหน้า", "0.00 บาท"] },
    { cells: ["คงเหลือ", <span key="remaining">{formatPayrollAmount(netPay)} <ResultHelp /></span>] },
  ];

  return (
    <div className="m-3 font-[Kanit,sans-serif]">
      <div className="flex justify-end">
        <div className="my-3">
          <button type="button" className="inline-flex h-9 items-center gap-1 rounded-[4px] bg-[#3c4252] px-4 text-sm font-semibold leading-9 text-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#4b5264]">
            สลิปเงินเดือน <FileText className="size-5" />
          </button>
        </div>
      </div>

      <div className="grid items-start grid-cols-1 gap-3 xl:grid-cols-[580.8px_770.8px]">
        <CalculationResultTable title="ผลรวมเวลา" headers={["ลำดับ", "รายการ", "ผลรวมเวลา", "มูลค่า"]} widths={["80px", "200px", "150px", "150px"]} rows={timeRows} heightClassName="xl:h-[462.625px]" />
        <CalculationResultTable title="รายรับรายจ่ายระหว่างเดือน" headers={["ลำดับ", "รหัสอ้างอิง", "รูปแบบการคำนวณ", "รายการ", "มูลค่า"]} widths={["80px", "140px", "140px", "260px", "150px"]} rows={incomeExpenseRows} heightClassName="xl:h-[873.7px]" />
      </div>

      <div className="my-3 grid items-start grid-cols-1 gap-3 xl:grid-cols-2">
        <CalculationResultTable title="เบิกล่วงหน้า" headers={["ลำดับ", "รายการ", "มูลค่า"]} widths={["80px", "250px", "150px"]} rows={[{ cells: [<div key="empty" className="flex flex-col items-center justify-center gap-1"><svg aria-hidden="true" viewBox="0 0 64 41" className="mx-auto h-[41px] w-16 fill-[#f5f5f5] stroke-[#d9d9d9]"><ellipse cx="32" cy="33" rx="31" ry="7" fill="none" /><path d="M55 13 45 1H19L9 13v18c0 2 1 4 3 4h40c2 0 3-2 3-4V13ZM9 22h11c1 0 2 1 2 3h20c0-2 1-3 3-3h10" fill="none" /></svg><span>ไม่มีข้อมูล</span></div>], emphasis: "empty" }, { cells: ["มูลค่า", "0.00 บาท"], emphasis: "footer" }]} heightClassName="xl:h-[336.625px]" />
        <CalculationResultTable title="ผลการคำนวณสุทธิ" headers={["รายการ", "มูลค่า"]} widths={["300px", "150px"]} rows={netRows} heightClassName="xl:h-[403.425px]" />
      </div>
    </div>
  );
}

/* -------------------------------- Tab: ภาษี ------------------------------- */

type TaxCalculationRow = {
  number?: string;
  label: string;
  value: string;
  level?: 0 | 1 | 2 | 3;
  emphasis?: boolean;
  muted?: boolean;
};

const TAX_CALCULATION_ROWS: TaxCalculationRow[] = [
  { number: "1", label: "เงินเดือนเดือนนี้", value: "44,000.00" },
  { label: "1.1 เงินเดือน", value: "39,000.00", level: 1 },
  { label: "1.2 [งวดปกติ] ค่าเดินทาง/ ค่าน้ำมัน", value: "5,000.00", level: 1 },
  { number: "2", label: "รายได้พึงประเมิน", value: "510,000.00" },
  { label: "2.1 เงินเดือนเดือนนี้", value: "44,000.00", level: 1 },
  { label: "2.2 เงินเดือนก่อนหน้า", value: "290,000.00", level: 1 },
  { label: "2.3 เงินเดือนประมาณการ", value: "176,000.00", level: 1 },
  { label: "2.3.1 เงินเดือน", value: "39,000.00", level: 2 },
  { label: "2.3.2 รายรับคงที่", value: "5,000.00", level: 2 },
  { label: "2.3.2.1 ค่าเดินทาง/ ค่าน้ำมัน", value: "5,000.00", level: 3 },
  { label: "2.3.3 รายจ่ายคงที่", value: "0.00", level: 2 },
  { label: "2.3.4 รวมรายได้", value: "44,000.00", level: 2 },
  { label: "2.3.5 จำนวนเดือนที่ประมาณการ", value: "4", level: 2 },
  { label: "2.3.6 ประมาณการรายได้", value: "176,000.00", level: 2 },
  { number: "3", label: "กองทุนสำรองเลี้ยงชีพเดือนนี้", value: "0.00" },
  { number: "4", label: "ประมาณการกองทุนสำรองเลี้ยงชีพ", value: "0.00" },
  { number: "5", label: "ประกันสังคมเดือนนี้", value: "0.00" },
  { number: "6", label: "ประมาณการประกันสังคม", value: "3,500.00" },
  { number: "7", label: "หัก ค่าใช้จ่าย", value: "100,000.00" },
  { number: "8", label: "หัก ลดหย่อนต่างๆ", value: "60,000.00" },
  { label: "8.1 ค่าลดหย่อนส่วนตัวและครอบครัว", value: "60,000.00", level: 1 },
  { label: "8.1.1 ผู้มีเงินได้", value: "60,000.00", level: 2, muted: true },
  { number: "9", label: "รวมรายได้ก่อนคิดภาษี", value: "346,500.00" },
  { number: "10", label: "ภาษีที่ต้องเสียทั้งปี", value: "12,150.00", emphasis: true },
  { number: "11", label: "นำส่งภาษีไปแล้ว", value: "6,393.75" },
  { number: "12", label: "เหลือส่งอีก (เดือน)", value: "5.00" },
  { number: "13", label: "ภาษีที่ต้องเสียเฉพาะเดือนนี้", value: "1,151.25", emphasis: true },
];

function TaxDeductionEditIcon() {
  return (
    <span className="ml-1 inline-block size-6 align-middle" aria-label="แก้ไขรายการลดหย่อน">
      <svg aria-hidden="true" viewBox="0 0 24 25" className="size-6" fill="none">
        <path d="M2.8335 23.4167V19.75H21.1668V23.4167H2.8335ZM6.50016 16.0833H7.7835L14.9335 8.95625L13.6272 7.65L6.50016 14.8V16.0833ZM4.66683 17.9167V14.0208L14.9335 3.77708C15.1016 3.60903 15.2963 3.47917 15.5179 3.3875C15.7394 3.29583 15.9724 3.25 16.2168 3.25C16.4613 3.25 16.6981 3.29583 16.9272 3.3875C17.1564 3.47917 17.3627 3.61667 17.546 3.8L18.8064 5.08333C18.9897 5.25139 19.1234 5.45 19.2075 5.67917C19.2915 5.90833 19.3335 6.14514 19.3335 6.38958C19.3335 6.61875 19.2915 6.8441 19.2075 7.06563C19.1234 7.28715 18.9897 7.48958 18.8064 7.67292L8.56266 17.9167H4.66683Z" fill="#1386F4" />
      </svg>
    </span>
  );
}

function TaxCalculationRowView({ row, striped }: { row: TaxCalculationRow; striped: boolean }) {
  const level = row.level ?? 0;
  const cellClassName = cn(
    "h-[38.8px] border-b border-r border-[#f0f0f0] p-2 align-middle text-sm leading-[22.001px] last:border-r-0",
    row.emphasis ? "font-bold text-black/[0.65]" : "text-black/[0.65]"
  );
  const rowClassName = striped ? "bg-[#f2fafe] hover:bg-[#f2fafe]" : "bg-white hover:bg-white";

  if (level === 1) {
    return (
      <tr className={rowClassName}>
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
        <td colSpan={3} className={cn(cellClassName, "text-left")}>{row.label}</td>
        <td colSpan={3} className={cn(cellClassName, "text-right")}>{row.value}</td>
        <td className={cn(cellClassName, "text-center")} />
      </tr>
    );
  }

  if (level === 2) {
    return (
      <tr className={rowClassName}>
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
        <td colSpan={2} className={cn(cellClassName, "text-left")}>{row.label}</td>
        <td colSpan={2} className={cn(cellClassName, "text-right")}>{row.value}</td>
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
      </tr>
    );
  }

  if (level === 3) {
    return (
      <tr className={rowClassName}>
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-left")}>{row.label}</td>
        <td className={cn(cellClassName, "text-right")}>{row.value}</td>
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
        <td className={cn(cellClassName, "text-center")} />
      </tr>
    );
  }

  return (
    <tr className={rowClassName}>
      <td className={cn(cellClassName, "text-center")}>{row.number}</td>
      <td colSpan={4} className={cn(cellClassName, "text-left")}>
        {row.label}
        {row.number === "8" && <TaxDeductionEditIcon />}
      </td>
      <td colSpan={4} className={cn(cellClassName, "text-right")}>{row.value}</td>
    </tr>
  );
}

function TaxCalculationContent({ payroll, onCalculate }: { payroll: PersonalPayrollData | null; onCalculate: () => Promise<void> }) {
  const [isCalculating, setIsCalculating] = useState(false);
  const monthlyIncome = payroll?.calculation?.grossPay ?? payroll?.preview.grossPay ?? 0;
  const monthlyTax = payroll?.tax ?? 0;
  const annualIncome = monthlyIncome * 12;
  const taxRows = TAX_CALCULATION_ROWS.map((row) => {
    if (row.label === "เงินเดือนเดือนนี้" || row.label === "1.1 เงินเดือน" || row.label === "2.1 เงินเดือนเดือนนี้") {
      return { ...row, value: monthlyIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
    }
    if (row.label === "รายได้พึงประเมิน") {
      return { ...row, value: annualIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
    }
    if (row.label === "ภาษีที่ต้องเสียเฉพาะเดือนนี้") {
      return { ...row, value: monthlyTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
    }
    return row;
  });

  const recalculateTax = async () => {
    setIsCalculating(true);
    try {
      await onCalculate();
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="p-8 font-[Kanit,sans-serif]">
      <div className="flex justify-end">
        <div className="my-3 flex flex-wrap">
          <button
            type="button"
            className="mr-2 inline-flex h-9 w-[85.5px] items-center gap-1 rounded-[4px] bg-[#3c4252] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#4b5264]"
          >
            ภาษี <FileText className="size-6" />
          </button>
          <button
            type="button"
            onClick={recalculateTax}
            disabled={isCalculating}
            className="inline-flex h-9 w-[130.0625px] items-center gap-1 rounded-[4px] bg-[#3c4252] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#4b5264] disabled:cursor-wait disabled:bg-[#4b5264]"
          >
            คำนวณภาษี <RotateCcw className={cn("size-6", isCalculating && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[8px] bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
        <div className="border-l border-t border-[#f0f0f0]">
        <table className="w-[1040px] min-w-full table-fixed border-separate border-spacing-0 text-sm leading-[22.001px] text-black/[0.65]">
          <colgroup>
            <col className="w-20" />
            <col className="w-[200px]" />
            <col className="w-[200px]" />
            <col className="w-[200px]" />
            <col className="w-[200px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr className="h-[54.8px] bg-[#61a8ff] text-white">
              <th className="border-b border-r border-[#d3d3d3] px-4 text-center font-medium">ลำดับ</th>
              <th colSpan={4} className="border-b border-r border-[#d3d3d3] px-4 text-center font-medium">รายการ</th>
              <th colSpan={4} className="border-b border-[#d3d3d3] px-4 text-center font-medium">มูลค่า</th>
            </tr>
          </thead>
          <tbody>
            {taxRows.map((row, index) => <TaxCalculationRowView key={`${row.label}-${index}`} row={row} striped={index % 2 === 0} />)}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function SocialSecurityContent({ amount }: { amount: number }) {
  return (
    <div className="p-8 font-[Kanit,sans-serif]">
      <div className="flex justify-end">
        <div className="my-3 flex">
          <button
            type="button"
            className="mr-2 inline-flex h-9 w-[133.35px] items-center gap-1 rounded-[4px] bg-[#3c4252] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#4b5264]"
            aria-label="ส่งออกประกันสังคมเป็น PDF"
          >
            ประกันสังคม
            <svg aria-hidden="true" viewBox="0 0 24 24" className="relative left-[0.9px] top-[0.65px] size-6 shrink-0 fill-current">
              <path d="M20 2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm-8 9.5c0 .83-.67 1.5-1.5 1.5H9v2H8v-5h2.5c.83 0 1.5.67 1.5 1.5Zm1.5 3.5h-1v-5h1c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2Zm4-2h-1v2h-1v-5h2.5v1h-1.5v1h1v1Zm-6.5-2H9v1h1.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5Zm2.5 0v3c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="min-w-[1040px] w-full table-fixed border-separate border-spacing-0 border-l border-t border-[#f0f0f0] text-sm leading-[22.001px] text-black/[0.65]">
          <colgroup>
            <col className="w-20" />
            <col className="w-[200px]" />
            <col className="w-[200px]" />
            <col className="w-[200px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr className="h-[54.8px] bg-[#61a8ff] text-white">
              <th className="border-b border-r border-[#d3d3d3] px-4 text-center font-medium">ลำดับ</th>
              <th colSpan={3} className="border-b border-r border-[#d3d3d3] px-4 text-center font-medium">รายการ</th>
              <th colSpan={3} className="border-b border-[#d3d3d3] px-4 text-center font-medium">มูลค่า</th>
            </tr>
          </thead>
          <tbody>
            {amount > 0 ? (
              <tr className="h-[54.8px] bg-white">
                <td className="border-b border-r border-[#f0f0f0] px-4 text-center">1</td>
                <td colSpan={3} className="border-b border-r border-[#f0f0f0] px-4">เงินสมทบประกันสังคม</td>
                <td colSpan={3} className="border-b border-[#f0f0f0] px-4 text-right">{formatPayrollAmount(amount)}</td>
              </tr>
            ) : (
              <tr>
                <td colSpan={7} className="h-[150.8px] border-b border-[#f0f0f0] bg-white p-2 text-center align-middle">
                  <div className="my-8 mr-[0.8px] h-[70px] text-center text-[rgba(0,0,0,0.25)]">
                  <div className="mb-2 h-10">
                    <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="mx-auto block h-10 w-16">
                      <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                        <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                        <g fill="#d9d9d9" fillRule="nonzero">
                          <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                          <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                        </g>
                      </g>
                    </svg>
                  </div>
                  <p className="text-sm leading-[22px]">ไม่มีข้อมูล</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const EDIT_HISTORY_ROWS = [
  ["27/08/2026 09:40:36", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", "คำนวณเงินเดือน New"],
  ["24/08/2026 17:47:40", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", "คำนวณเงินเดือน (รายบุคคล) New"],
  ["24/08/2026 17:44:57", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", "คำนวณเงินเดือน New"],
  ["24/08/2026 09:03:00", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", "คำนวณเงินเดือน New"],
  ["24/08/2026 09:01:49", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", "คำนวณเงินเดือน (รายบุคคล) New"],
  ["24/08/2026 09:01:42", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "31/08/2026 17:00:00"'],
  ["24/08/2026 09:01:38", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "28/08/2026 17:00:00"'],
  ["24/08/2026 09:01:35", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "27/08/2026 17:00:00"'],
  ["24/08/2026 09:01:32", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "26/08/2026 17:00:00"'],
  ["24/08/2026 09:01:31", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "25/08/2026 17:00:00"'],
  ["24/08/2026 09:01:29", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "24/08/2026 17:00:00"'],
  ["24/08/2026 09:01:24", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "21/08/2026 17:00:00"'],
  ["24/08/2026 09:01:22", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "20/08/2026 17:00:00"'],
  ["24/08/2026 09:01:20", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "19/08/2026 17:00:00"'],
  ["24/08/2026 09:01:17", "อดิเรก ฉ่ำชื่น", "Adirek Chumchuen", 'เพิ่มเวลา "18/08/2026 17:00:00"'],
] as const;

function EditHistoryContent({ history }: { history: PersonalPayrollData["history"] }) {
  const rows = history.map((item) => [
    new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(item.date)),
    item.editor,
    item.editor,
    item.note,
  ] as const);
  return (
    <div className="font-[Kanit,sans-serif] text-sm leading-[22.001px]">
      <div className="m-3">
        <div className="overflow-hidden pr-[15.2px]">
          <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0 rounded-t-[2px] border-[0.8px] border-[#d3d3d3] bg-white text-sm leading-[22.001px] text-black/[0.65]">
            <colgroup>
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[450px]" />
            </colgroup>
            <thead>
              <tr className="h-[54.8px] bg-[#61a8ff] text-white">
                {['วันที่แก้ไข', 'แก้ไขของ', 'แก้ไขโดย', 'หมายเหตุ'].map((heading) => (
                  <th key={heading} className="border-b-[0.8px] border-r-[0.8px] border-b-[#f0f0f0] border-r-[#d3d3d3] px-4 text-center text-sm font-medium leading-[22.001px] first:rounded-tl-[2px] last:rounded-tr-[2px]">{heading}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        <div className="max-h-[930px] overflow-y-scroll [&::-webkit-scrollbar]:w-3">
          <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0 rounded-t-[2px] border-[0.8px] border-[#d3d3d3] bg-white text-sm leading-[22.001px] text-black/[0.65]">
            <colgroup>
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[450px]" />
            </colgroup>
            <tbody>
              {rows.map(([date, subject, editor, note], index) => (
                <tr key={`${date}-${note}`} className={cn("h-[38.8px]", index % 2 === 0 ? "bg-[#f2fafe]" : "bg-white")}>
                  <td className="border-b-[0.8px] border-r-[0.8px] border-b-[#f0f0f0] border-r-[#d3d3d3] p-2 text-center align-middle">{date}</td>
                  <td className="border-b-[0.8px] border-r-[0.8px] border-b-[#f0f0f0] border-r-[#d3d3d3] p-2 text-left align-middle">{subject}</td>
                  <td className="border-b-[0.8px] border-r-[0.8px] border-b-[#f0f0f0] border-r-[#d3d3d3] p-2 text-left align-middle">{editor}</td>
                  <td className="border-b-[0.8px] border-r-[0.8px] border-b-[#f0f0f0] border-r-[#d3d3d3] p-2 text-left align-middle">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between px-3 pb-4">
        <label className="relative block h-8 w-[105px]">
          <select aria-label="จำนวนรายการต่อหน้า" defaultValue="15" className="h-8 w-full appearance-none rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] pr-8 text-sm leading-[22px] text-black/[0.65] outline-none hover:border-[#40a9ff] focus:border-[#40a9ff] focus:ring-1 focus:ring-[#40a9ff]">
            <option value="15">15 / หน้า</option>
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-[11px] top-2 size-3 text-black/[0.25]" />
        </label>

        <div className="flex items-center justify-end gap-4">
          <div className="relative right-[1.3625px] flex h-8">
            <input type="number" min="1" max="100000" step="1" inputMode="decimal" aria-label="ไปยังหน้า" placeholder="ไปยังหน้า" className="h-8 w-[98px] rounded-l-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-sm leading-[22px] text-black/[0.65] outline-none hover:border-[#40a9ff] focus:border-[#40a9ff] focus:ring-1 focus:ring-[#40a9ff]" />
            <button type="button" aria-label="ไปยังหน้าที่ระบุ" className="flex size-8 items-center justify-center rounded-r-[4px] border-[0.8px] border-[#d9d9d9] bg-white p-[1px_6px] text-sm leading-[30px] text-black/[0.87] transition-colors hover:border-[#40a9ff] hover:text-[#40a9ff]">
              <svg aria-hidden="true" viewBox="64 64 896 896" className="size-3.5 fill-current"><path d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" /></svg>
            </button>
          </div>
          <span className="text-sm leading-[22px] text-black/[0.87]">หน้าที่ 1</span>
          <div className="flex">
            <button type="button" disabled aria-label="หน้าก่อนหน้า" className="mr-2 flex size-8 items-center justify-center rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-[#f5f5f5] p-[1px_6px] text-sm leading-[30px] text-black/[0.25] disabled:cursor-not-allowed">
              <svg aria-hidden="true" viewBox="64 64 896 896" className="size-3.5 fill-current"><path d="M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8a31.86 31.86 0 0 0 0 50.3l450.8 352.1c5.3 4.1 12.9.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.1-12.6l-360-281 360-281.1c3.8-3 6.1-7.7 6.1-12.6z" /></svg>
            </button>
            <button type="button" aria-label="หน้าถัดไป" className="flex size-8 items-center justify-center rounded-[2px] border-[0.8px] border-[#d9d9d9] bg-white p-[1px_6px] text-sm leading-[30px] text-black/[0.87] transition-colors hover:border-[#40a9ff] hover:text-[#40a9ff]">
              <svg aria-hidden="true" viewBox="64 64 896 896" className="size-3.5 fill-current"><path d="M765.7 486.8 314.9 134.7A7.97 7.97 0 0 0 302 141v77.3c0 4.9 2.3 9.6 6.1 12.6l360 281.1-360 281.1c-3.9 3-6.1 7.7-6.1 12.6V883c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.96 31.96 0 0 0 0-50.4z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonContent({ monthKey }: { monthKey: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgNode | null>(null);
  const [orgTree, setOrgTree] = useState<OrgNode[]>([]);
  const [subTab, setSubTab] = useState(PERSON_TABS[0]);
  const [work, setWork] = useState<{ rows: WorkDay[]; naDates: string[] }>({ rows: [], naDates: [] });
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [payroll, setPayroll] = useState<PersonalPayrollData | null>(null);
  const [payrollSaving, setPayrollSaving] = useState(false);
  // Selecting the same employee is a deliberate refresh action too. The ID
  // alone would not change, so effects that depend only on it would not run.
  const [employeeSelectionVersion, setEmployeeSelectionVersion] = useState(0);
  const personTabListRef = useRef<HTMLDivElement>(null);
  const [personTabPagination, setPersonTabPagination] = useState({ before: false, after: false });

  const syncPersonTabPagination = () => {
    const tabList = personTabListRef.current;
    if (!tabList) return;

    const maxScrollLeft = tabList.scrollWidth - tabList.clientWidth;
    setPersonTabPagination({
      before: tabList.scrollLeft > 1,
      after: maxScrollLeft - tabList.scrollLeft > 1,
    });
  };

  const scrollPersonTabs = (direction: "before" | "after") => {
    personTabListRef.current?.scrollBy({ left: direction === "before" ? -220 : 220, behavior: "smooth" });
    window.setTimeout(syncPersonTabPagination, 320);
  };

  useEffect(() => {
    const tabList = personTabListRef.current;
    if (!tabList) return;

    const observer = new ResizeObserver(syncPersonTabPagination);
    observer.observe(tabList);
    const frame = window.requestAnimationFrame(syncPersonTabPagination);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ employeeId: selectedEmployeeId, month: monthKey });
    void fetch(`/api/payroll/personal?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Personal payroll request failed");
        return response.json() as Promise<PersonalPayrollData>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setPayroll(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error("Unable to load personal payroll data:", error);
          setPayroll(null);
        }
      });

    return () => controller.abort();
  }, [employeeSelectionVersion, monthKey, selectedEmployeeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployeeTree() {
      try {
        const response = await fetch("/api/employee", { cache: "no-store" });
        if (!response.ok) throw new Error("Employee list request failed");
        const data = (await response.json()) as { orgTree?: OrgNode[] };
        if (!cancelled) setOrgTree(data.orgTree ?? []);
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load employee list:", error);
          setOrgTree([]);
        }
      }
    }

    void loadEmployeeTree();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) {
      return;
    }

    const employeeId = selectedEmployeeId;
    const controller = new AbortController();

    async function loadWorkTime() {
      try {
        const params = new URLSearchParams({ employeeId, month: monthKey });
        const response = await fetch(`/api/payroll/work-time?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Work-time request failed");
        const data = (await response.json()) as { rows?: WorkDay[]; naDates?: string[] };
        if (!controller.signal.aborted) {
          setWork({ rows: data.rows ?? [], naDates: data.naDates ?? [] });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load work-time data:", error);
          setWork({ rows: [], naDates: [] });
        }
      }
    }

    void loadWorkTime();
    return () => controller.abort();
  }, [employeeSelectionVersion, monthKey, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      return;
    }

    const employeeId = selectedEmployeeId;
    const controller = new AbortController();

    async function loadEmployeeProfile() {
      try {
        const response = await fetch(`/api/employee/${encodeURIComponent(employeeId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Employee profile request failed");
        const data = (await response.json()) as EmployeeDetailsResponse;
        if (!controller.signal.aborted) setEmployeeProfile(toPayrollEmployeeProfile(data));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load employee profile:", error);
          setEmployeeProfile(null);
        }
      }
    }

    void loadEmployeeProfile();
    return () => controller.abort();
  }, [employeeSelectionVersion, selectedEmployeeId]);

  useEffect(() => {
    const closeEmployeeList = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("[data-employee-select-panel]") && !target.closest("[data-payroll-employee-select-trigger]")) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("click", closeEmployeeList);
    return () => document.removeEventListener("click", closeEmployeeList);
  }, []);

  const fallbackProfile = selectedCode
    ? {
        code: selectedCode,
        name: selectedEmployee?.name ?? selectedCode,
        company: "",
        branch: "",
        department: "",
        position: selectedEmployee?.positionName ?? "",
        phone: "",
        email: "",
        wage: "",
        empGroup: selectedEmployee?.type ?? "",
        empType: selectedEmployee?.type ?? "",
        startDate: "",
        hireDate: "",
        socialSecurity: "",
        tax: "",
        calcRound: "เต็มเดือน",
      }
    : null;
  const profile = employeeProfile ?? fallbackProfile;

  const runPayrollAction = async (action: "calculate" | "reset") => {
    if (!selectedEmployeeId || payrollSaving) return;
    setPayrollSaving(true);
    try {
      const response = await fetch("/api/payroll/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, employeeId: selectedEmployeeId, month: monthKey }),
      });
      if (!response.ok) throw new Error("Personal payroll update failed");
      setPayroll((await response.json()) as PersonalPayrollData);
    } catch (error) {
      console.error(`Unable to ${action} personal payroll:`, error);
    } finally {
      setPayrollSaving(false);
    }
  };

  return (
    <div>
      {/* งวดเต็ม sub-tab */}
      <div className="relative flex h-12 border-b-2 border-[#1890ff]">
        <button
          type="button"
          role="tab"
          aria-selected="true"
          aria-controls="normal-person-full-panel"
          className="relative flex h-12 w-40 items-center justify-center gap-0 text-sm font-semibold leading-[22px] text-[#1890ff]"
        >
          งวดเต็ม
          <svg aria-hidden="true" viewBox="0 0 24 24" className="relative -left-[0.3px] size-6 shrink-0 fill-[#fbc02d] text-[#fbc02d] leading-6">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#1890ff]" />
        </button>
      </div>

      {/* Toolbar row */}
      <div id="normal-person-full-panel" role="tabpanel" aria-label="งวดเต็ม" className="relative top-[0.8px] flex min-h-[84.65px] flex-col p-6">
      <div className="flex flex-1 flex-row gap-2">
        {/* เลือกพนักงาน */}
        <div className="flex items-start">
          <Button
            data-payroll-employee-select-trigger
            className="h-[36.65px] w-[135.7625px] gap-0 rounded-[4px] border-0 [border-style:none] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-6" />
            เลือกพนักงาน
          </Button>
        </div>

        {/* คำนวณ / รีเซ็ต — available after an employee is selected */}
        {selectedCode && (
          <div className="flex flex-1 items-end justify-end gap-0">
            <button
              id="btn-normal-person-full-cal-menu"
              type="button"
              onClick={() => void runPayrollAction("calculate")}
              disabled={payrollSaving}
              className="group relative mr-1 flex h-9 items-center rounded-[4px] border-0 [border-style:none] bg-white px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-white"
            >
              <span>{payrollSaving ? "กำลังคำนวณ" : "คำนวณ"}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-current">
                <path d="M19 8l-4 4h3c0 1.65-1.35 3-3 3-.52 0-1.01-.14-1.43-.38l-1.46 1.46A4.96 4.96 0 0 0 15 17c2.76 0 5-2.24 5-5h3l-4-4zM6 12c0-1.65 1.35-3 3-3 .52 0 1.01.14 1.43.38l1.46-1.46A4.96 4.96 0 0 0 9 7c-2.76 0-5 2.24-5 5H1l4 4 4-4H6z" />
              </svg>
              <span aria-hidden="true" className="pointer-events-none absolute -top-2.5 right-0 hidden size-4 items-center justify-center rounded-full bg-[#ffa500] text-[16px] leading-5 text-white group-hover:flex">?</span>
            </button>
            <button
              id="btn-normal-person-full-reset-menu"
              type="button"
              onClick={() => void runPayrollAction("reset")}
              disabled={payrollSaving || !payroll?.calculation}
              className="group relative flex h-9 items-center rounded-[4px] border-0 [border-style:none] bg-white px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-white"
            >
              <span>รีเซ็ต</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-current">
                <path d="M13 3c-4.97 0-9 4.03-9 9H1l4 4 4-4H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05l-1.41 1.41A8.96 8.96 0 0 0 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
              </svg>
              <span aria-hidden="true" className="pointer-events-none absolute -top-2.5 right-0 hidden size-4 items-center justify-center rounded-full bg-[#ffa500] text-[16px] leading-5 text-white group-hover:flex">?</span>
            </button>
          </div>
        )}
      </div>

      {profile ? (
        <>
          {/* Employee info header */}
          <section className="content-header my-2 flex overflow-hidden rounded-lg bg-white p-2 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
            <div className="m-3 flex shrink-0 flex-col items-center justify-center">
              <img
                src="https://web-core.humansoft.co.th/images/userPlaceHolder.png"
                alt="avatar"
                className="size-24 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://api.humansoft.co.th/images/userPlaceHolder.png";
                }}
              />
            </div>

            <div className="mx-3 flex min-w-0 flex-1 flex-col">
              <div className="mx-2 flex flex-row">
                <span className="text-[20px] font-bold leading-normal text-[rgba(0,0,0,0.87)]">
                  {profile.code}: {profile.name} ()
                </span>
                <Link
                  href={selectedEmployeeId ? `/organization/organization-employee/${selectedEmployeeId}?from=payroll-personal` : "/organization/organization-employee"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 flex size-6 shrink-0 items-center justify-center text-[#039be5]"
                  aria-label={`เปิดข้อมูลพนักงาน ${profile.name}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-current">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.82-1.83z" />
                  </svg>
                </Link>
              </div>

              <div className="flex flex-row">
                {buildProfileColumns(profile).map((column, columnIndex) => (
                  <div key={columnIndex} className="mx-2 flex flex-1 flex-col items-start justify-start">
                    {column.map((row) => (
                      <div key={row.label} className="text-[14px] font-normal leading-normal text-[rgba(0,0,0,0.65)]">
                        {row.label}: <span className="font-medium text-[rgba(0,0,0,0.87)]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Sub-tabs */}
          <section className={cn(
            "content-body overflow-hidden rounded-lg bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]",
            subTab === "ยื่นเอกสาร" ? "mb-0 mt-2" : "my-2"
          )}>
            <div className="flex h-12 items-stretch overflow-hidden border-b border-black/[0.12] bg-white">
              <button
                type="button"
                aria-label="เลื่อนแท็บไปทางซ้าย"
                disabled={!personTabPagination.before}
                onClick={() => scrollPersonTabs("before")}
                className="relative z-10 flex h-12 w-8 shrink-0 items-center justify-center bg-white text-black/[0.54] shadow-[0_2px_4px_-1px_rgba(0,0,0,0.2),0_4px_5px_rgba(0,0,0,0.14),0_1px_10px_rgba(0,0,0,0.12)] transition-colors hover:text-black/[0.87] disabled:cursor-default disabled:text-black/[0.26]"
              >
                <span aria-hidden="true" className="size-2.5 rotate-[135deg] border-b-2 border-r-2 border-current" />
              </button>
              <div
                ref={personTabListRef}
                role="tablist"
                aria-label="ข้อมูลคำนวณเงินเดือนรายบุคคล"
                onScroll={syncPersonTabPagination}
                className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {PERSON_TABS.map((tab, index) => {
                  const active = tab === subTab;
                  return (
                    <button
                      key={tab}
                      id={`normal-person-full-person-tab-${index + 1}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSubTab(tab)}
                      className={cn(
                        "group relative flex h-12 min-w-40 shrink-0 items-center justify-center px-6 text-sm font-semibold leading-normal transition-colors",
                        active ? "text-[#1890ff]" : "text-black/[0.54] hover:text-black/[0.87]"
                      )}
                    >
                      <span className="tooltip-hover w-full">{tab}</span>
                      <span aria-hidden="true" className="absolute right-2.5 top-0 hidden size-5 items-center justify-center rounded-full bg-[#ffa500] text-[16px] font-normal leading-5 text-white shadow-[0_2px_3px_rgba(0,0,0,0.5)] group-hover:flex">?</span>
                      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1890ff]" />}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                aria-label="เลื่อนแท็บไปทางขวา"
                disabled={!personTabPagination.after}
                onClick={() => scrollPersonTabs("after")}
                className="relative z-10 flex h-12 w-8 shrink-0 items-center justify-center bg-white text-black/[0.54] shadow-[0_2px_4px_-1px_rgba(0,0,0,0.2),0_4px_5px_rgba(0,0,0,0.14),0_1px_10px_rgba(0,0,0,0.12)] transition-colors hover:text-black/[0.87] disabled:cursor-default disabled:text-black/[0.26]"
              >
                <span aria-hidden="true" className="size-2.5 rotate-[-45deg] border-b-2 border-r-2 border-current" />
              </button>
            </div>

            {/* Tab content stays inside the same card as the tab header. */}
            {subTab === "ตารางเวลาการทำงาน" ? (
              <WorkTimeTable
                rows={work.rows}
                naDates={work.naDates}
                employeeId={selectedEmployeeId ?? ""}
                employeeName={selectedEmployee?.name ?? ""}
                showCalculatedAttendance={Boolean(payroll?.calculation)}
                onSaved={(data) => setWork({ rows: data.rows ?? [], naDates: data.naDates ?? [] })}
              />
            ) : subTab === "ยื่นเอกสาร" ? (
              <DocumentSubmissionContent />
            ) : subTab === "รายรับรายจ่าย" ? (
              <PersonalIncomeExpenseContent />
            ) : subTab === "เบิกล่วงหน้า" ? (
              <AdvanceWithdrawalContent />
            ) : subTab === "สรุปผลการคำนวณ" ? (
              <CalculationResultContent payroll={payroll} />
            ) : subTab === "ภาษี" ? (
              <TaxCalculationContent payroll={payroll} onCalculate={() => runPayrollAction("calculate")} />
            ) : subTab === "ประกันสังคม" ? (
              <SocialSecurityContent amount={payroll?.socialSecurity ?? 0} />
            ) : subTab === "ประวัติการแก้ไข" ? (
              <EditHistoryContent history={payroll?.history ?? []} />
            ) : subTab === "ตั้งค่ารายบุคคล" ? (
              <IndividualSettingsContent employeeId={selectedEmployeeId} />
            ) : (
              <div className="p-5">
                <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                  อยู่ระหว่างการพัฒนา — {subTab}
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}

      </div>

      {sidebarOpen && (
        <EmployeeSelectPanel
          onClose={() => setSidebarOpen(false)}
          orgTree={orgTree}
          onEmployeeSelect={(employee) => {
            setSelectedCode(employee.code);
            setSelectedEmployeeId(employee.id);
            setSelectedEmployee(employee);
            setEmployeeProfile(null);
            setPayroll(null);
            setWork({ rows: [], naDates: [] });
            setEmployeeSelectionVersion((current) => current + 1);
            setSidebarOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------- Tab: ตั้งค่ารายบุคคล ------------------------- */

type IndividualWorkTimeSetting = {
  type: "มาเช้า" | "สาย" | "พักเกิน" | "พักไว" | "กลับก่อน" | "กลับช้า";
  enabled: boolean;
  isPaid: boolean;
  countMin: number;
  countMax: number;
  countMethod: string;
  moneyMin: number | null;
  moneyMax: number | null;
  moneyMethod: string | null;
  calculationMethod: string | null;
  roundingMethod: string | null;
  calculationTargets: string[];
  calculationDayTypes: string[];
};

const DEFAULT_INDIVIDUAL_WORK_TIME_SETTINGS: IndividualWorkTimeSetting[] = [
  { type: "มาเช้า", enabled: true, isPaid: true, countMin: 0, countMax: 15, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 15, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "สาย", enabled: true, isPaid: false, countMin: 0, countMax: 480, countMethod: "เริ่มนับทันที", moneyMin: null, moneyMax: null, moneyMethod: null, calculationMethod: null, roundingMethod: null, calculationTargets: [], calculationDayTypes: [] },
  { type: "พักเกิน", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "พักไว", enabled: true, isPaid: true, countMin: 0, countMax: 45, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "0 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "กลับก่อน", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 0, moneyMax: 0, moneyMethod: "เริ่มคำนวณทันที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
  { type: "กลับช้า", enabled: true, isPaid: true, countMin: 0, countMax: 0, countMethod: "เริ่มนับทันที", moneyMin: 10, moneyMax: 0, moneyMethod: "เริ่มได้รับเงินหลังเวลาเลิกงาน 10 นาที", calculationMethod: "1 เท่าของค่าแรง", roundingMethod: "ไม่ปัดเศษ", calculationTargets: [], calculationDayTypes: ["วันทำงาน"] },
];

function individualWorkTimeCell(value: string | number | null) {
  return value === null || value === "" ? "-" : String(value);
}

const INDIVIDUAL_OT_ROWS = [
  ["โอทีล่วงเวลา (x1.0)", "0", "เริ่มคำนวณทันที", "1 เท่าของค่าแรง"],
  ["โอทีล่วงเวลา (x1.5)", "0", "เริ่มคำนวณทันที", "1.5 เท่าของค่าแรง"],
  ["โอทีวันหยุด (x2.0)", "0", "เริ่มคำนวณทันที", "1 เท่าของค่าแรง"],
  ["โอทีล่วงเวลาวันหยุด (x3.0)", "0", "เริ่มคำนวณทันที", "3 เท่าของค่าแรง"],
  ["โอทีล่วงเวลาวันหยุด (x4.0)", "0", "เริ่มคำนวณทันที", "3 เท่าของค่าแรง"],
  ["โอทีล่วงเวลาวันหยุด (x5.0)", "0", "เริ่มคำนวณทันที", "3 เท่าของค่าแรง"],
  ["โอทีล่วงเวลาวันหยุด (x6.0)", "0", "เริ่มคำนวณทันที", "3 เท่าของค่าแรง"],
  ["โอทีล่วงเวลาวันหยุด (x7.0)", "0", "เริ่มคำนวณทันที", "3 เท่าของค่าแรง"],
];

type IndividualOvertimeSetting = {
  ruleNumber: number;
  enabled: boolean;
  startMinutes: number;
  countingChoice: "immediate" | "after";
  payMethod: "wage-rate" | "minute" | "formula" | "holiday";
  wageRate: number;
  roundMoney: "none" | "round";
  maxHours: "shift" | "8" | "12" | "16" | "24";
  roundHours: "none" | "10" | "15" | "20" | "30" | "60";
  calculationTargets: string[];
};

const DEFAULT_INDIVIDUAL_OVERTIME_SETTINGS: IndividualOvertimeSetting[] = INDIVIDUAL_OT_ROWS.map((_, index) => ({
  ruleNumber: index + 1,
  enabled: true,
  startMinutes: 0,
  countingChoice: "after",
  payMethod: "wage-rate",
  wageRate: index === 1 ? 1.5 : index >= 3 ? 3 : 1,
  roundMoney: "none",
  maxHours: "shift",
  roundHours: "none",
  calculationTargets: [],
}));

function individualOvertimeSummary(setting: IndividualOvertimeSetting, title: string) {
  const payMethod = setting.payMethod === "wage-rate"
    ? `${setting.wageRate} เท่าของค่าแรง`
    : setting.payMethod === "minute"
      ? "เป็นนาที"
      : setting.payMethod === "formula"
        ? "ตามสูตรการคำนวณพิเศษ"
        : "แปลงเป็นวันหยุดพิเศษ";
  const maxHours = setting.maxHours === "shift" ? "ตามกะการทำงาน" : `${setting.maxHours} ชั่วโมง`;
  const roundHours = ({ none: "ไม่ปัดเศษ", "10": "ปัดลง 10 นาที", "15": "ปัดลง 15 นาที", "20": "ปัดลง 20 นาที", "30": "ปัดลงครึ่งชัวโมง", "60": "ปัดลงเต็มชั่วโมง" } as const)[setting.roundHours];
  return [
    title,
    setting.enabled ? String(setting.startMinutes) : "-",
    setting.enabled ? setting.startMinutes === 0 ? "เริ่มคำนวณทันที" : `เริ่มคำนวณหลังเวลาเลิกงาน ${setting.startMinutes} นาที` : "-",
    setting.enabled ? payMethod : "-",
    setting.enabled ? maxHours : "-",
    setting.enabled ? roundHours : "-",
    setting.enabled ? setting.roundMoney === "none" ? "ไม่ปัดเศษ" : "ปัดเศษ" : "",
    setting.enabled && setting.calculationTargets.length ? setting.calculationTargets.join(", ") : "-",
  ];
}

const INDIVIDUAL_CONSTANT_ROWS = [
  ["รายรับ", "โบนัส", "", "", ""],
  ["รายรับ", "ค่าเดินทาง/ ค่าน้ำมัน", "5,000", "", ""],
  ["รายรับ", "เงินรับอื่นๆ", "", "", ""],
  ["รายรับ", "ค่าโทรศัพท์", "", "", ""],
  ["รายรับ", "ค่าเบี้ยเลี้ยง", "", "", ""],
  ["รายรับ", "ค่าตอบแทนจากยอดขาย", "", "", ""],
  ["รายรับ", "ค่าบำรุงรักษารถ", "", "", ""],
  ["รายรับ", "ปรับเงินรับอื่นๆ", "", "", ""],
];

const INDIVIDUAL_DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

type IndividualGeneralSettings = {
  workDays: "26" | "30" | "actual" | "organization";
  workHours: "08:00:00" | "08:30:00" | "09:00:00" | "actual" | "organization";
  payrollCalculation: "full" | "split";
  allowHolidayWork: boolean;
};

const DEFAULT_INDIVIDUAL_GENERAL_SETTINGS: IndividualGeneralSettings = {
  workDays: "actual",
  workHours: "actual",
  payrollCalculation: "full",
  allowHolidayWork: true,
};

type IndividualShiftHolidaySettings = {
  selectedShift: "WC001" | "WC002";
  weeklyShifts: string[];
  selectedDayType: "วันทำงาน" | "วันหยุดพนักงาน";
  weeklyDayTypes: string[];
};

const DEFAULT_INDIVIDUAL_SHIFT_HOLIDAY_SETTINGS: IndividualShiftHolidaySettings = {
  selectedShift: "WC002",
  weeklyShifts: Array(7).fill("WC002"),
  selectedDayType: "วันหยุดพนักงาน",
  weeklyDayTypes: ["วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันหยุดพนักงาน", "วันหยุดพนักงาน"],
};

function IndividualSettingsContent({ employeeId }: { employeeId: string | null }) {
  const [openSections, setOpenSections] = useState<string[]>(["general", "worktime", "shift", "constant", "automatic", "fund", "tax", "debt"]);
  const [autoItems, setAutoItems] = useState<string[]>([]);
  const [generalSettings, setGeneralSettings] = useState<IndividualGeneralSettings>(DEFAULT_INDIVIDUAL_GENERAL_SETTINGS);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [workTimeSettings, setWorkTimeSettings] = useState<IndividualWorkTimeSetting[]>(DEFAULT_INDIVIDUAL_WORK_TIME_SETTINGS);
  const [editingWorkTimeSetting, setEditingWorkTimeSetting] = useState<IndividualWorkTimeSetting | null>(null);
  const [editingOvertimeRule, setEditingOvertimeRule] = useState<number | null>(null);
  const [overtimeSettings, setOvertimeSettings] = useState<IndividualOvertimeSetting[]>(DEFAULT_INDIVIDUAL_OVERTIME_SETTINGS);
  const [shiftHolidaySettings, setShiftHolidaySettings] = useState<IndividualShiftHolidaySettings>(DEFAULT_INDIVIDUAL_SHIFT_HOLIDAY_SETTINGS);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftDirty, setShiftDirty] = useState(true);
  const [dayTypeSaving, setDayTypeSaving] = useState(false);
  const [shiftHolidayError, setShiftHolidayError] = useState<string | null>(null);
  const [workTimeSaving, setWorkTimeSaving] = useState(false);
  const [workTimeError, setWorkTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    const controller = new AbortController();
    void fetch(`/api/payroll/individual-work-time?${new URLSearchParams({ employeeId }).toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Individual work-time settings request failed");
        return response.json() as Promise<{ settings?: IndividualWorkTimeSetting[] }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setWorkTimeSettings(data.settings ?? DEFAULT_INDIVIDUAL_WORK_TIME_SETTINGS);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          // The table may be introduced by a pending deployment migration.
          // Keep the source-compatible defaults visible until it is available.
          setWorkTimeSettings(DEFAULT_INDIVIDUAL_WORK_TIME_SETTINGS);
        }
      });

    return () => controller.abort();
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;

    const controller = new AbortController();
    void fetch(`/api/payroll/individual-shift-holiday-settings?${new URLSearchParams({ employeeId }).toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Individual shift and holiday settings request failed");
        return response.json() as Promise<{ settings?: IndividualShiftHolidaySettings }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setShiftHolidaySettings(data.settings ?? DEFAULT_INDIVIDUAL_SHIFT_HOLIDAY_SETTINGS);
          setShiftHolidayError(null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setShiftHolidaySettings(DEFAULT_INDIVIDUAL_SHIFT_HOLIDAY_SETTINGS);
      });

    return () => controller.abort();
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;

    const controller = new AbortController();
    void fetch(`/api/payroll/individual-overtime-settings?${new URLSearchParams({ employeeId }).toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Individual overtime settings request failed");
        return response.json() as Promise<{ settings?: IndividualOvertimeSetting[] }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) setOvertimeSettings(data.settings ?? DEFAULT_INDIVIDUAL_OVERTIME_SETTINGS);
      })
      .catch(() => {
        if (!controller.signal.aborted) setOvertimeSettings(DEFAULT_INDIVIDUAL_OVERTIME_SETTINGS);
      });

    return () => controller.abort();
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;

    const controller = new AbortController();
    void fetch(`/api/payroll/individual-general-settings?${new URLSearchParams({ employeeId }).toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Individual general settings request failed");
        return response.json() as Promise<{ settings?: IndividualGeneralSettings }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setGeneralSettings(data.settings ?? DEFAULT_INDIVIDUAL_GENERAL_SETTINGS);
          setGeneralError(null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setGeneralSettings(DEFAULT_INDIVIDUAL_GENERAL_SETTINGS);
      });

    return () => controller.abort();
  }, [employeeId]);

  const saveGeneralSettings = async () => {
    if (!employeeId || generalSaving) return;
    setGeneralSaving(true);
    setGeneralError(null);
    setGeneralSaved(false);
    try {
      const response = await fetch("/api/payroll/individual-general-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, ...generalSettings }),
      });
      const data = await response.json() as { settings?: IndividualGeneralSettings; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save individual general settings");
      setGeneralSettings(data.settings ?? generalSettings);
      setGeneralSaved(true);
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : "ไม่สามารถบันทึกการตั้งค่าทั่วไปได้");
    } finally {
      setGeneralSaving(false);
    }
  };

  const saveWorkTimeSetting = async (setting: IndividualWorkTimeSetting) => {
    if (!employeeId || workTimeSaving) return;
    setWorkTimeSaving(true);
    setWorkTimeError(null);
    try {
      const response = await fetch("/api/payroll/individual-work-time", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, ...setting }),
      });
      const data = await response.json() as { settings?: IndividualWorkTimeSetting[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save individual work-time settings");
      setWorkTimeSettings(data.settings ?? workTimeSettings);
      setEditingWorkTimeSetting(null);
    } catch (error) {
      setWorkTimeError(error instanceof Error ? error.message : "ไม่สามารถบันทึกการตั้งค่าเวลาการทำงานได้");
    } finally {
      setWorkTimeSaving(false);
    }
  };

  const saveOvertimeSetting = (settings: IndividualOvertimeSetting[]) => {
    setOvertimeSettings(settings);
    setEditingOvertimeRule(null);
  };

  const saveShiftHolidaySettings = async (section: "shift" | "day") => {
    const saving = section === "shift" ? shiftSaving : dayTypeSaving;
    if (!employeeId || saving) return;
    (section === "shift" ? setShiftSaving : setDayTypeSaving)(true);
    setShiftHolidayError(null);
    try {
      const payload = section === "shift"
        ? { employeeId, section, selectedShift: shiftHolidaySettings.selectedShift, weeklyShifts: shiftHolidaySettings.weeklyShifts }
        : { employeeId, section, selectedDayType: shiftHolidaySettings.selectedDayType, weeklyDayTypes: shiftHolidaySettings.weeklyDayTypes };
      const response = await fetch("/api/payroll/individual-shift-holiday-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { settings?: IndividualShiftHolidaySettings; error?: string };
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถบันทึกกะการทำงาน-วันหยุดได้");
      if (data.settings) {
        setShiftHolidaySettings((current) => section === "shift"
          ? { ...current, selectedShift: data.settings!.selectedShift, weeklyShifts: data.settings!.weeklyShifts }
          : { ...current, selectedDayType: data.settings!.selectedDayType, weeklyDayTypes: data.settings!.weeklyDayTypes });
      }
      if (section === "shift") setShiftDirty(false);
    } catch (error) {
      setShiftHolidayError(error instanceof Error ? error.message : "ไม่สามารถบันทึกกะการทำงาน-วันหยุดได้");
    } finally {
      (section === "shift" ? setShiftSaving : setDayTypeSaving)(false);
    }
  };

  const toggleAutoItem = (item: string) => {
    setAutoItems((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  };
  const toggleSection = (section: string) => {
    setOpenSections((current) => current.includes(section) ? current.filter((item) => item !== section) : [...current, section]);
  };

  return (
    <div className="bg-white">
      <div className="overflow-hidden rounded-[2px] border-x border-t border-b-0 border-[#d9d9d9] bg-[#fafafa]">
        <IndividualSettingsAccordion title="ตั้งค่าทั่วไป" open={openSections.includes("general")} onToggle={() => toggleSection("general")}>
          <div className="space-y-2 p-3">
            <IndividualRadioGroup label="จำนวนวันที่ทำงาน" value={generalSettings.workDays} onValueChange={(workDays) => { setGeneralSettings((current) => ({ ...current, workDays: workDays as IndividualGeneralSettings["workDays"] })); setGeneralSaved(false); }} options={[["26", "26 วัน"], ["30", "30 วัน"], ["actual", "ตามจริง"], ["organization", "ตามการตั้งค่าองค์กร"]]} />
            <IndividualRadioGroup label="จำนวนชั่วโมงการทำงาน" value={generalSettings.workHours} onValueChange={(workHours) => { setGeneralSettings((current) => ({ ...current, workHours: workHours as IndividualGeneralSettings["workHours"] })); setGeneralSaved(false); }} options={[["08:00:00", "8.00 ชั่วโมง"], ["08:30:00", "8.30 ชั่วโมง"], ["09:00:00", "9.00 ชั่วโมง"], ["actual", "ตามจริง"], ["organization", "ตามการตั้งค่าองค์กร"]]} />
            <IndividualRadioGroup label="การคำนวณเงินเดือน" value={generalSettings.payrollCalculation} onValueChange={(payrollCalculation) => { setGeneralSettings((current) => ({ ...current, payrollCalculation: payrollCalculation as IndividualGeneralSettings["payrollCalculation"] })); setGeneralSaved(false); }} options={[["full", "เต็มเดือน"], ["split", "แบ่งงวดจ่าย"]]} />
            <IndividualRadioGroup label="อนุญาตให้หยุดวันหยุดนักขัตฤกษ์" value={generalSettings.allowHolidayWork ? "allow" : "deny"} onValueChange={(value) => { setGeneralSettings((current) => ({ ...current, allowHolidayWork: value === "allow" })); setGeneralSaved(false); }} options={[["allow", "อนุญาต"], ["deny", "ไม่อนุญาต"]]} />
          </div>
          <div className="px-3 pb-3 pt-10">
            {generalError && <p role="alert" className="mb-2 text-sm text-[#cf1322]">{generalError}</p>}
            {generalSaved && <p role="status" className="mb-2 text-sm text-[#389e0d]">บันทึกข้อมูลสำเร็จ</p>}
            <Button type="button" onClick={() => void saveGeneralSettings()} disabled={!employeeId || generalSaving} className="h-9 w-full rounded-[2px] bg-[#03ae03] px-6 text-sm font-medium shadow-[0_2px_2px_rgba(0,0,0,0.14),0_3px_1px_-2px_rgba(0,0,0,0.2),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#029602] disabled:bg-[#bfbfbf]">{generalSaving ? "กำลังบันทึก" : "บันทึก"}</Button>
          </div>
        </IndividualSettingsAccordion>

        <IndividualSettingsAccordion title="ตั้งค่าเวลาการทำงาน" open={openSections.includes("worktime")} onToggle={() => toggleSection("worktime")}>
          <div className="flex flex-col p-3">
            <div>
              <p className="mb-2.5 w-full px-px py-3 text-base font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">ประเภทเวลาการทำงาน</p>
              <div className="w-full overflow-x-auto rounded-[2px] border border-[#d9d9d9]">
                <table className="w-full table-auto text-sm text-black/[0.65]">
                  <colgroup>
                    {["12%", "6%", "6%", "11%", "6%", "6%", "11%", "10%", "8%", "10%", "12%", "4%"].map((width, index) => <col key={`work-time-column-${index}`} style={{ width }} />)}
                  </colgroup>
                  <thead className="text-white">
                    <tr className="bg-[#61a8ff]">
                      <IndividualTableHead tone="inverse" rowSpan={2}>ประเภทเวลาการทำงาน</IndividualTableHead>
                      <IndividualTableHead tone="inverse" colSpan={3} className="border-b border-white">เริ่มนับเวลา (นาที)</IndividualTableHead>
                      <IndividualTableHead tone="inverse" colSpan={3} className="border-b border-white">เริ่มคำนวณเงิน (นาที)</IndividualTableHead>
                      <IndividualTableHead tone="inverse" rowSpan={2} className="border-l border-l-white">วิธีการคำนวณ</IndividualTableHead>
                      <IndividualTableHead tone="inverse" rowSpan={2}>ปัดเศษจำนวนเงิน</IndividualTableHead>
                      <IndividualTableHead tone="inverse" rowSpan={2}><span className="inline-flex items-center justify-center gap-1">นำไปคำนวณกับ <IndividualInfoIcon /></span></IndividualTableHead>
                      <IndividualTableHead tone="inverse" rowSpan={2}>ประเภทวันที่คำนวณ</IndividualTableHead>
                      <IndividualTableHead tone="inverse" rowSpan={2} />
                    </tr>
                    <tr className="bg-[#61a8ff]">{["ต่ำสุด", "สูงสุด", "เวลาคำนวณ", "ต่ำสุด", "สูงสุด", "เวลาคำนวณ"].map((label, index) => <IndividualTableHead tone="inverse" key={`calculation-range-${index}`}><span className="whitespace-nowrap">{label}</span></IndividualTableHead>)}</tr>
                  </thead>
                  <tbody>
                    {workTimeSettings.map((setting) => {
                      const cells = [
                        setting.type,
                        setting.countMin,
                        setting.countMax,
                        setting.countMethod,
                        ...(setting.enabled && setting.isPaid
                          ? [
                              individualWorkTimeCell(setting.moneyMin),
                              individualWorkTimeCell(setting.moneyMax),
                              individualWorkTimeCell(setting.moneyMethod),
                              individualWorkTimeCell(setting.calculationMethod),
                              setting.roundingMethod === "ไม่ปัดเศษ" ? "" : setting.roundingMethod ?? "",
                              individualWorkTimeCell(setting.calculationTargets.join(", ")),
                              individualWorkTimeCell(setting.calculationDayTypes.join(", ")),
                            ]
                          : ["-", "-", "-", "-", "", "-", "-"]),
                      ];
                      return (
                      <tr key={setting.type} className="border-t border-[#f0f0f0] bg-white">
                        {cells.map((cell, index) => <IndividualTableCell key={`${setting.type}-${index}`} strong={index === 0} className={index === 7 ? "border-l border-l-white" : undefined}>{cell}</IndividualTableCell>)}
                        <IndividualTableCell><IndividualEditButton label={`แก้ไข ${setting.type}`} onClick={() => { setWorkTimeError(null); setEditingWorkTimeSetting(setting); }} /></IndividualTableCell>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="my-2.5 w-full px-px py-3 text-base font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">ประเภทโอที</p>
              <div className="w-full overflow-x-auto rounded-[2px] border border-[#d9d9d9]">
                <table className="w-full table-auto text-sm text-black/[0.65]">
                  <colgroup>{["12%", "8%", "14%", "16%", "12%", "12%", "8%", "12%", "6%"].map((width, index) => <col key={`overtime-column-${index}`} style={{ width }} />)}</colgroup>
                  <thead className="text-white"><tr className="bg-[#61a8ff]">{["ประเภทโอที", "เริ่มนับเวลา (นาที)", "เวลาคำนวณ", "วิธีการคำนวณ", "ชั่วโมงโอทีสูงสุด", "การปัดเศษชั่วโมง", "ปัดเศษจำนวนเงิน", "นำไปคำนวณกับ", ""].map((label, index) => <IndividualTableHead tone="inverse" key={`overtime-header-${index}`}>{label === "นำไปคำนวณกับ" ? <span className="inline-flex items-center justify-center gap-1">{label} <IndividualInfoIcon /></span> : label}</IndividualTableHead>)}</tr></thead>
                  <tbody>
                    {overtimeSettings.map((setting) => {
                      const title = INDIVIDUAL_OT_ROWS[setting.ruleNumber - 1]?.[0] ?? `โอที (#${setting.ruleNumber})`;
                      return <tr key={setting.ruleNumber} className="border-t border-[#f0f0f0] bg-white">
                        {individualOvertimeSummary(setting, title).map((cell, index) => <IndividualTableCell key={`${setting.ruleNumber}-${index}`} strong={index === 0}>{cell}</IndividualTableCell>)}
                        <IndividualTableCell><IndividualEditButton label={`แก้ไข ${title}`} onClick={() => setEditingOvertimeRule(setting.ruleNumber)} /></IndividualTableCell>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </IndividualSettingsAccordion>

        <IndividualSettingsAccordion title="จัดการกะการทำงาน-วันหยุด" open={openSections.includes("shift")} onToggle={() => toggleSection("shift")}>
          <div className="p-1">
            <IndividualWeekSchedule
              label="กะการทำงาน"
              value={shiftHolidaySettings.selectedShift}
              options={[["WC001", "WC001 : 08:30 - 17:00"], ["WC002", "WC002 : 08:30 - 17:00"]]}
              values={shiftHolidaySettings.weeklyShifts}
              disabled={!employeeId || shiftSaving}
              onValueChange={(value) => {
                const settings = { ...shiftHolidaySettings, selectedShift: value as IndividualShiftHolidaySettings["selectedShift"] };
                setShiftHolidaySettings(settings);
                setShiftDirty(true);
              }}
              onCellChange={(index, value) => {
                const settings = { ...shiftHolidaySettings, weeklyShifts: shiftHolidaySettings.weeklyShifts.map((shift, itemIndex) => itemIndex === index ? value : shift) };
                setShiftHolidaySettings(settings);
                setShiftDirty(true);
              }}
              linked
            />
            {shiftDirty && <Button type="button" onClick={() => void saveShiftHolidaySettings("shift")} disabled={!employeeId || shiftSaving} className="mt-2 h-9 w-full rounded-[2px] bg-[#03ae03] px-4 text-sm font-semibold text-white shadow-[0_2px_2px_rgba(0,0,0,0.14),0_3px_1px_-2px_rgba(0,0,0,0.2),0_1px_5px_rggba(0,0,0,0.12)] hover:bg-[#029602] disabled:bg-[#bfbfbf]">บันทึก</Button>}
            <div className="mt-2">
              <IndividualWeekSchedule
                label="วันทำงาน - วันหยุด"
                value={shiftHolidaySettings.selectedDayType}
                options={[["วันทำงาน", "วันทำงาน"], ["วันหยุดพนักงาน", "วันหยุดพนักงาน"]]}
                values={shiftHolidaySettings.weeklyDayTypes}
                disabled={!employeeId || dayTypeSaving}
                onValueChange={(value) => {
                  const settings = { ...shiftHolidaySettings, selectedDayType: value as IndividualShiftHolidaySettings["selectedDayType"] };
                  setShiftHolidaySettings(settings);
                }}
                onCellChange={(index, value) => {
                  const settings = { ...shiftHolidaySettings, weeklyDayTypes: shiftHolidaySettings.weeklyDayTypes.map((dayType, itemIndex) => itemIndex === index ? value : dayType) };
                  setShiftHolidaySettings(settings);
                }}
              />
              <Button type="button" onClick={() => void saveShiftHolidaySettings("day")} disabled={!employeeId || dayTypeSaving} className="mt-2 h-9 w-full rounded-[2px] bg-[#03ae03] px-4 text-sm font-semibold text-white shadow-[0_2px_2px_rgba(0,0,0,0.14),0_3px_1px_-2px_rgba(0,0,0,0.2),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#029602] disabled:bg-[#bfbfbf]">{dayTypeSaving ? "กำลังบันทึก" : "บันทึก"}</Button>
            </div>
            {shiftHolidayError && <p role="alert" className="mt-2 text-sm text-[#cf1322]">{shiftHolidayError}</p>}
          </div>
        </IndividualSettingsAccordion>

        <IndividualSettingsAccordion title="รายรับ รายจ่ายคงที่" open={openSections.includes("constant")} onToggle={() => toggleSection("constant")}>
          <div className="overflow-x-auto"><table className="min-w-[760px] w-full table-fixed border border-[rgba(0,0,0,0.65)] bg-white text-sm text-[rgba(0,0,0,0.65)]"><thead className="text-white"><tr className="border border-[rgba(0,0,0,0.65)] bg-[#61a8ff] text-[rgba(0,0,0,0.65)]">{["ประเภท", "รายการ", "มูลค่า", "วันที่เริ่ม", "วันที่สิ้นสุด", ""].map((label) => <IndividualTableHead tone="inverse" key={label}>{label}</IndividualTableHead>)}</tr></thead><tbody>{INDIVIDUAL_CONSTANT_ROWS.map((row) => <tr key={row[1]} className="border-t border-[#f0f0f0] bg-white">{row.map((cell, index) => <IndividualTableCell key={`${row[1]}-${index}`} align={index === 1 ? "left" : undefined}>{cell}</IndividualTableCell>)}<IndividualTableCell><IndividualEditButton label={`แก้ไข ${row[1]}`} /></IndividualTableCell></tr>)}</tbody></table></div>
        </IndividualSettingsAccordion>

        <IndividualSettingsAccordion title="รายรับ รายจ่ายอัตโนมัติ" open={openSections.includes("automatic")} onToggle={() => toggleSection("automatic")}>
          <div><div className="max-w-[700px] overflow-hidden border border-[rgba(0,0,0,0.65)] bg-white"><table className="w-full table-fixed bg-white text-sm text-[rgba(0,0,0,0.65)]"><thead className="text-white"><tr className="border border-[rgba(0,0,0,0.65)] bg-[#61a8ff] text-[rgba(0,0,0,0.65)]"><IndividualTableHead tone="inverse">ประเภท</IndividualTableHead><IndividualTableHead tone="inverse">รายการ</IndividualTableHead><IndividualTableHead tone="inverse" /></tr></thead><tbody>{["ประกันสังคม", "ภาษี", "สาย"].map((item) => <tr key={item} className="border-t border-[#f0f0f0] bg-white"><IndividualTableCell>รายจ่าย</IndividualTableCell><IndividualTableCell align="left">{item}</IndividualTableCell><IndividualTableCell><input type="checkbox" aria-label={`เปิดใช้ ${item}`} checked={autoItems.includes(item)} onChange={() => toggleAutoItem(item)} className="size-4" /></IndividualTableCell></tr>)}</tbody></table></div><div className="mt-3 max-w-[700px]"><Button type="button" className="h-9 w-full rounded-[2px] border border-white bg-[#2299ff] px-6 text-sm font-semibold text-white hover:bg-[#1b7fcc]">บันทึก</Button></div></div>
        </IndividualSettingsAccordion>

        <IndividualSettingsAccordion title="กองทุน" open={openSections.includes("fund")} onToggle={() => toggleSection("fund")}>
          <div className="overflow-x-auto"><table className="min-w-[1200px] w-full table-fixed border border-[rgba(0,0,0,0.65)] bg-white text-sm text-[rgba(0,0,0,0.65)]"><thead className="text-white"><tr className="border border-[rgba(0,0,0,0.65)] bg-[#61a8ff] text-[rgba(0,0,0,0.65)]">{["ชื่อกองทุน", "เลขที่กองทุน", "วันที่สัญญากองทุน", "วิธีการหักเงิน", "เรทกองทุน", "วิธีการสมทบ", "บริษัทสมทบ", "ยอดสะสม", "ผู้ได้รับผลประโยชน์", "หมายเหตุ", ""].map((label) => <IndividualTableHead tone="inverse" key={label}>{label}</IndividualTableHead>)}</tr></thead><tbody>{["กองทุนสำรองเลี้ยงชีพ", "กองทุนสำรองเลี้ยงชีพ 3"].map((name) => <tr key={name} className="border-t border-[#f0f0f0] bg-white"><IndividualTableCell align="left">{name}</IndividualTableCell>{Array.from({ length: 9 }).map((_, index) => <IndividualTableCell key={index} />)}<IndividualTableCell><IndividualEditButton label={`แก้ไข ${name}`} /></IndividualTableCell></tr>)}</tbody></table></div>
        </IndividualSettingsAccordion>

        <IndividualSettingsAccordion title="ภาษี" open={openSections.includes("tax")} onToggle={() => toggleSection("tax")}>
          <div><div className="max-w-[760px] overflow-hidden border border-[rgba(0,0,0,0.65)] bg-white"><table className="w-full table-fixed bg-white text-sm text-[rgba(0,0,0,0.65)]"><thead className="text-white"><tr className="border border-[rgba(0,0,0,0.65)] bg-[#61a8ff] text-[rgba(0,0,0,0.65)]">{["ปี", "จำนวนเดือน", "มูลค่า", ""].map((label) => <IndividualTableHead tone="inverse" key={label}>{label}</IndividualTableHead>)}</tr></thead><tbody>{[["2026", "9 เดือน", "63,500"], ["2025", "1 เดือน", "60,000"], ["2024", "1 เดือน", "0"]].map((row) => <tr key={row[0]} className="border-t border-[#f0f0f0] bg-white">{row.map((cell) => <IndividualTableCell key={cell}>{cell}</IndividualTableCell>)}<IndividualTableCell><IndividualEditButton label={`แก้ไขภาษีปี ${row[0]}`} /><IndividualDeleteButton label={`ลบภาษีปี ${row[0]}`} /></IndividualTableCell></tr>)}</tbody></table></div></div>
        </IndividualSettingsAccordion>

        <IndividualSettingsAccordion title="จัดการหนี้สินพนักงาน" open={openSections.includes("debt")} onToggle={() => toggleSection("debt")}>
          <div className="overflow-x-auto"><table data-testid="setting-individual-debt-table" className="min-w-[1100px] w-full table-fixed border border-[rgba(0,0,0,0.65)] text-sm text-[rgba(0,0,0,0.65)]"><thead className="text-white"><tr className="border border-[rgba(0,0,0,0.65)] bg-[#61a8ff] text-[rgba(0,0,0,0.65)]">{["ลำดับ", "วันที่", "ประเภท", "เงินต้น", "ดอกเบี้ย", "เป็นเงิน", "จำนวนงวด", "หมายเหตุ", "สถานะ", ""].map((label) => <IndividualTableHead tone="inverse" key={label}>{label}</IndividualTableHead>)}</tr></thead><tbody><tr><td colSpan={10} className="h-36 text-center text-sm text-[rgba(0,0,0,0.25)]">ไม่มีข้อมูล</td></tr></tbody></table></div>
        </IndividualSettingsAccordion>
      </div>
      {editingWorkTimeSetting && createPortal(
        <IndividualWorkTimeSettingDialog
          key={editingWorkTimeSetting.type}
          setting={editingWorkTimeSetting}
          saving={workTimeSaving}
          error={workTimeError}
          onClose={() => { if (!workTimeSaving) { setWorkTimeError(null); setEditingWorkTimeSetting(null); } }}
          onSave={saveWorkTimeSetting}
        />,
        document.body
      )}
      {editingOvertimeRule !== null && createPortal(
        <IndividualOvertimeSettingDialog
          key={editingOvertimeRule}
          employeeId={employeeId}
          ruleNumber={editingOvertimeRule}
          title={INDIVIDUAL_OT_ROWS[editingOvertimeRule - 1]?.[0] ?? "โอทีล่วงเวลา (x1.0)"}
          onClose={() => setEditingOvertimeRule(null)}
          onSaved={saveOvertimeSetting}
          setting={overtimeSettings.find((setting) => setting.ruleNumber === editingOvertimeRule) ?? DEFAULT_INDIVIDUAL_OVERTIME_SETTINGS[editingOvertimeRule - 1]}
        />,
        document.body
      )}
    </div>
  );
}

function IndividualWorkTimeSettingDialog({
  setting,
  saving,
  error,
  onClose,
  onSave,
}: {
  setting: IndividualWorkTimeSetting;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (setting: IndividualWorkTimeSetting) => void;
}) {
  const [draft, setDraft] = useState(setting);
  const [wageRate, setWageRate] = useState(() => Number.parseFloat(setting.calculationMethod?.match(/[\d.]+/)?.[0] ?? "1") || 1);
  const hasTimeCalculation = draft.enabled;
  const hasMoneyCalculation = hasTimeCalculation && draft.isPaid;
  const updateNumber = (key: "countMin" | "countMax" | "moneyMin" | "moneyMax", value: string) => {
    const maximum = key === "countMin" || key === "countMax" ? 600 : 15;
    const number = Math.min(maximum, Math.max(0, Number.parseInt(value || "0", 10) || 0));
    setDraft((current) => ({ ...current, [key]: number }));
  };
  const toggleChoice = (key: "calculationTargets" | "calculationDayTypes", choice: string) => {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(choice)
        ? current[key].filter((item) => item !== choice)
        : [...current[key], choice],
    }));
  };
  const calculationType = draft.calculationMethod === "เป็นนาที"
    ? "เป็นนาที"
    : draft.calculationMethod === "ตามสูตรการคำนวณพิเศษ"
      ? "ตามสูตรการคำนวณพิเศษ"
      : "ตามเรทค่าแรง";
  const settingForSave: IndividualWorkTimeSetting = {
    ...draft,
    calculationDayTypes: hasMoneyCalculation
      ? [...new Set(["วันทำงาน", ...draft.calculationDayTypes])]
      : [],
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/[0.32] p-4" role="dialog" aria-modal="true" aria-label={`แก้ไข ${setting.type}`}>
      <section className="max-h-[90vh] w-full max-w-[1100px] overflow-hidden rounded-[11px] bg-white shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]">
        <div className="max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 z-10 min-w-full bg-[#61a8ff] p-6 text-center text-white">
          <h2 className="text-2xl font-normal leading-none">{setting.type}</h2>
        </header>
        <div className="flex p-9 text-sm text-black/[0.85]">
          <div className="flex w-full flex-1 flex-col"><div className="mb-6 flex justify-end"><div className="mr-4 flex items-center"><span>Tag</span><span className="ml-1.5 inline-flex h-8 items-center rounded-[4px] bg-[#fff0f5] px-2 text-[#c71585]">{setting.type}</span></div></div>
          <section className="mb-6 w-full max-w-[493.4375px] self-center rounded-[10px] border border-[#c5c5c5] p-4 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
            <header className="w-full border-b-2 border-[#c5c5c5] pb-3 text-center"><h3 className="px-3 text-base font-bold">พนักงานรายเดือน</h3></header>
            <div className="pt-3">
              <fieldset><legend className="font-normal">1. คุณต้องการเปิดให้โปรแกรมคำนวณ &quot;{setting.type}&quot; หรือไม่ ?</legend><div className="mt-3 inline-flex overflow-hidden rounded-[2px] border border-[#d9d9d9]"><label className={cn("flex h-8 cursor-pointer items-center border-r border-[#d9d9d9] px-3", draft.enabled && "bg-[#e6f7ff] text-[#1890ff]")}><input type="radio" className="sr-only" checked={draft.enabled} onChange={() => setDraft((current) => ({ ...current, enabled: true }))} />เปิด</label><label className={cn("flex h-8 cursor-pointer items-center px-3", !draft.enabled && "bg-[#e6f7ff] text-[#1890ff]")}><input type="radio" className="sr-only" checked={!draft.enabled} onChange={() => setDraft((current) => ({ ...current, enabled: false }))} />ปิด</label></div></fieldset>
              {hasTimeCalculation && <>
                <fieldset className="mt-4"><legend className="flex items-center gap-1 font-normal">2. เริ่มนับ &quot;{setting.type}&quot; ก่อนเวลาเริ่มงานกี่นาที <CircleHelp aria-hidden="true" className="size-[15px] text-[#8c8c8c]" /></legend><div className="mt-3 grid gap-5 sm:grid-cols-2"><label className="flex h-8 overflow-hidden rounded-[2px] border border-[#d9d9d9]"><span className="flex items-center border-r border-[#d9d9d9] bg-[#fafafa] px-3">ต่ำสุด</span><input type="number" min="0" max="600" value={draft.countMin} onChange={(event) => updateNumber("countMin", event.target.value)} disabled={saving} className="min-w-0 flex-1 px-3 outline-none disabled:bg-[#f5f5f5]" /><span className="flex items-center border-l border-[#d9d9d9] bg-[#fafafa] px-3">นาที</span></label><label className="flex h-8 overflow-hidden rounded-[2px] border border-[#d9d9d9]"><span className="flex items-center border-r border-[#d9d9d9] bg-[#fafafa] px-3">สูงสุด</span><input type="number" min="0" max="600" value={draft.countMax} onChange={(event) => updateNumber("countMax", event.target.value)} disabled={saving} className="min-w-0 flex-1 px-3 outline-none disabled:bg-[#f5f5f5]" /><span className="flex items-center border-l border-[#d9d9d9] bg-[#fafafa] px-3">นาที</span></label></div></fieldset>
                <fieldset className="mt-4"><legend className="font-normal">3. ได้รับเงิน &quot;{setting.type}&quot; หรือไม่ ?</legend><div className="mt-3 inline-flex overflow-hidden rounded-[2px] border border-[#d9d9d9]"><label className={cn("flex h-8 cursor-pointer items-center border-r border-[#d9d9d9] px-3", draft.isPaid && "bg-[#e6f7ff] text-[#1890ff]")}><input type="radio" className="sr-only" checked={draft.isPaid} disabled={saving} onChange={() => setDraft((current) => ({ ...current, isPaid: true, moneyMin: current.moneyMin ?? 0, moneyMax: current.moneyMax ?? 0, moneyMethod: current.moneyMethod ?? "เริ่มคำนวณทันที", calculationMethod: current.calculationMethod ?? "1 เท่าของค่าแรง", roundingMethod: current.roundingMethod ?? "ไม่ปัดเศษ", calculationDayTypes: current.calculationDayTypes.length ? current.calculationDayTypes : ["วันทำงาน"] }))} />ได้</label><label className={cn("flex h-8 cursor-pointer items-center px-3", !draft.isPaid && "bg-[#e6f7ff] text-[#1890ff]")}><input type="radio" className="sr-only" checked={!draft.isPaid} disabled={saving} onChange={() => setDraft((current) => ({ ...current, isPaid: false, moneyMin: null, moneyMax: null, moneyMethod: null, calculationMethod: null, roundingMethod: null, calculationTargets: [], calculationDayTypes: [] }))} />ไม่ได้</label></div></fieldset>
              </>}
              {hasMoneyCalculation && <>
                <fieldset className="border-t border-[#f0f0f0] pt-4"><legend className="mb-3 flex items-center gap-1 font-medium">4. เริ่มได้รับเงิน &quot;{setting.type}&quot; ก่อนเวลาเริ่มงานกี่นาที <CircleHelp aria-hidden="true" className="size-4 text-[#8c8c8c]" /></legend><div className="grid gap-5 sm:grid-cols-2"><label className="flex h-10 overflow-hidden rounded-[2px] border border-[#d9d9d9]"><span className="flex items-center border-r border-[#d9d9d9] bg-[#fafafa] px-3">ต่ำสุด</span><input type="number" min="0" max="15" value={draft.moneyMin ?? 0} onChange={(event) => updateNumber("moneyMin", event.target.value)} className="min-w-0 flex-1 px-3 outline-none" /><span className="flex items-center border-l border-[#d9d9d9] bg-[#fafafa] px-3">นาที</span></label><label className="flex h-10 overflow-hidden rounded-[2px] border border-[#d9d9d9]"><span className="flex items-center border-r border-[#d9d9d9] bg-[#fafafa] px-3">สูงสุด</span><input type="number" min="0" max="15" value={draft.moneyMax ?? 0} onChange={(event) => updateNumber("moneyMax", event.target.value)} className="min-w-0 flex-1 px-3 outline-none" /><span className="flex items-center border-l border-[#d9d9d9] bg-[#fafafa] px-3">นาที</span></label></div></fieldset>
                <fieldset className="border-t border-[#f0f0f0] pt-4"><legend className="mb-3 font-medium">5. ได้รับเงินแบบไหน</legend><div className="flex flex-wrap overflow-hidden rounded-[2px] border border-[#d9d9d9] w-fit">{["ตามเรทค่าแรง", "เป็นนาที", "ตามสูตรการคำนวณพิเศษ"].map((choice, index) => <label key={choice} className={cn("cursor-pointer px-4 py-2", index > 0 && "border-l border-[#d9d9d9]", calculationType === choice && "bg-[#e6f7ff] text-[#1890ff]")}><input type="radio" className="sr-only" checked={calculationType === choice} onChange={() => setDraft((current) => ({ ...current, calculationMethod: choice === "ตามเรทค่าแรง" ? `${wageRate} เท่าของค่าแรง` : choice }))} />{choice}</label>)}</div>{calculationType === "ตามเรทค่าแรง" && <label className="mt-4 flex h-10 max-w-xs overflow-hidden rounded-[2px] border border-[#d9d9d9]"><input type="number" min="0" max="1000" step="1" value={wageRate} onChange={(event) => { const value = Math.min(1000, Math.max(0, Number(event.target.value) || 0)); setWageRate(value); setDraft((current) => ({ ...current, calculationMethod: `${value} เท่าของค่าแรง` })); }} className="min-w-0 flex-1 px-3 outline-none" /><span className="flex items-center border-l border-[#d9d9d9] bg-[#fafafa] px-3">เท่าของค่าแรง</span></label>}</fieldset>
                <fieldset className="border-t border-[#f0f0f0] pt-4"><legend className="mb-3 font-medium">6. ปัดเศษจำนวนเงิน</legend><div className="inline-flex overflow-hidden rounded-[2px] border border-[#d9d9d9]">{["ไม่ปัดเศษ", "ปัดเศษ"].map((choice, index) => <label key={choice} className={cn("cursor-pointer px-5 py-2", index > 0 && "border-l border-[#d9d9d9]", (draft.roundingMethod ?? "ไม่ปัดเศษ") === choice && "bg-[#e6f7ff] text-[#1890ff]")}><input type="radio" className="sr-only" checked={(draft.roundingMethod ?? "ไม่ปัดเศษ") === choice} onChange={() => setDraft((current) => ({ ...current, roundingMethod: choice }))} />{choice}</label>)}</div></fieldset>
                <fieldset className="border-t border-[#f0f0f0] pt-4"><legend className="mb-3 font-medium">7. นำไปคำนวณกับ</legend><div className="flex flex-wrap gap-x-6 gap-y-3">{["ประกันสังคม", "กองทุนสำรองเลี้ยงชีพ", "ภาษี", "ภาษีลาออก"].map((choice) => <label key={choice} className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={draft.calculationTargets.includes(choice)} onChange={() => toggleChoice("calculationTargets", choice)} className="size-4 accent-[#1890ff]" />{choice}</label>)}</div></fieldset>
                <fieldset className="border-t border-[#f0f0f0] pt-4"><legend className="mb-3 font-medium">8. ประเภทวันที่คำนวณ</legend><div className="flex flex-wrap gap-x-6 gap-y-3">{["วันทำงาน", "วันหยุด", "วันหยุดนักขัตฤกษ์"].map((choice) => <label key={choice} className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={choice === "วันทำงาน" || draft.calculationDayTypes.includes(choice)} disabled={choice === "วันทำงาน" || saving} onChange={() => toggleChoice("calculationDayTypes", choice)} className="size-4 accent-[#1890ff]" />{choice}</label>)}</div></fieldset>
              </>}
              {error && <p className="text-[#cf1322]" role="alert">{error}</p>}
            </div>
          </section>
        </div>
        </div>
        <footer className="sticky bottom-0 z-10 flex min-w-full justify-end border-t border-black/[0.3] bg-white p-3 shadow-[0_0_1px_0_rgba(0,0,0,1)]"><Button type="button" onClick={onClose} disabled={saving} className="mr-2 h-9 rounded-[4px] bg-[#808b9e] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#707a8b]">ยกเลิก</Button><Button type="button" onClick={() => onSave(settingForSave)} disabled={saving} className="h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#029602]">{saving ? "กำลังบันทึก" : "บันทึก"}</Button></footer>
        </div>
      </section>
    </div>
  );
}

function IndividualOvertimeSettingDialog({
  employeeId,
  ruleNumber,
  title,
  setting,
  onClose,
  onSaved,
}: {
  employeeId: string | null;
  ruleNumber: number;
  title: string;
  setting: IndividualOvertimeSetting;
  onClose: () => void;
  onSaved: (settings: IndividualOvertimeSetting[]) => void;
}) {
  const [enabled, setEnabled] = useState(setting.enabled);
  const [startMinutes, setStartMinutes] = useState(setting.startMinutes);
  const [countingChoice, setCountingChoice] = useState(setting.countingChoice);
  const [payMethod, setPayMethod] = useState(setting.payMethod);
  const [wageRate, setWageRate] = useState(setting.wageRate);
  const [roundMoney, setRoundMoney] = useState(setting.roundMoney);
  const [maxHours, setMaxHours] = useState(setting.maxHours);
  const [roundHours, setRoundHours] = useState(setting.roundHours);
  const [calculationTargets, setCalculationTargets] = useState<string[]>(setting.calculationTargets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateNumber = (value: string, maximum: number, onUpdate: (value: number) => void) => {
    onUpdate(Math.min(maximum, Math.max(0, Number.parseInt(value || "0", 10) || 0)));
  };
  const toggleTarget = (target: string) => {
    setCalculationTargets((current) => current.includes(target) ? current.filter((item) => item !== target) : [...current, target]);
  };
  const buttonGroupClass = "my-3 ml-0 inline-flex overflow-hidden rounded-[2px] border border-[#d9d9d9]";
  const optionClass = (selected: boolean, divider = false) => cn("box-border inline-block h-8 cursor-pointer px-[15px] text-sm leading-[30px] transition-colors", divider && "border-l border-[#d9d9d9]", selected && "bg-[#e6f7ff] text-[#1890ff]");
  const simulatedMinutes = Math.max(0, 60 - startMinutes);

  const save = async () => {
    if (!employeeId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/payroll/individual-overtime-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          ruleNumber,
          enabled,
          startMinutes,
          countingChoice,
          payMethod,
          wageRate,
          roundMoney,
          maxHours,
          roundHours,
          calculationTargets,
        }),
      });
      const data = await response.json() as { settings?: IndividualOvertimeSetting[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถบันทึกการตั้งค่าโอทีได้");
      onSaved(data.settings ?? []);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกการตั้งค่าโอทีได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/[0.32] p-4" role="dialog" aria-modal="true" aria-label={`โอที (#${ruleNumber})`}>
      <section className="flex max-h-[90vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[11px] bg-white font-[Kanit,sans-serif] text-sm leading-[22px] tracking-[-0.1px] text-black/[0.85] shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]">
        <header className="shrink-0 bg-[#61a8ff] px-6 py-6 text-white">
          <h2 className="text-2xl font-normal leading-[37.716px]">โอที (#{ruleNumber})</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-9">
          <div className="relative left-[8px] mx-auto w-full max-w-[514px] rounded-[10px] border border-[#c5c5c5] p-4 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
            <header className="border-b-2 border-[#c5c5c5] pb-3 text-center"><h3 className="text-base font-bold">พนักงานรายเดือน</h3></header>
            <div className="pt-3">
              <fieldset>
                <legend>1. คุณต้องการเปิดให้โปรแกรมคำนวณ &quot;{title}&quot; หรือไม่ ?</legend>
                <div className={buttonGroupClass}>
                  <label className={optionClass(enabled)}><input type="radio" className="sr-only" checked={enabled} onChange={() => setEnabled(true)} />เปิด</label>
                  <label className={optionClass(!enabled, true)}><input type="radio" className="sr-only" checked={!enabled} onChange={() => setEnabled(false)} />ปิด</label>
                </div>
              </fieldset>

              {enabled && <>
                <fieldset className="mt-4">
                  <legend className="flex min-h-[31px] items-center gap-1">2. เริ่มนับ &quot;{title}&quot; หลังเวลาเลิกงานกี่นาที <CircleHelp aria-hidden="true" className="size-4 text-[#8c8c8c]" /></legend>
                  <label className="flex box-border h-8 w-[200px] overflow-hidden rounded-[2px] border border-[#d9d9d9]">
                    <input aria-label="เริ่มนับโอทีหลังเวลาเลิกงาน" type="number" min="0" max="600" value={startMinutes} onChange={(event) => updateNumber(event.target.value, 600, setStartMinutes)} className="min-w-0 flex-1 px-3 outline-none" />
                    <span className="flex items-center border-l border-[#d9d9d9] bg-[#fafafa] px-3">นาที</span>
                  </label>
                </fieldset>

                <fieldset className="mt-4">
                  <legend>3. สมมติเวลาเลิกงานคือ <span className="text-[#ff4d4f]">17:00 น.</span> ถ้าพนักงานเลิกงาน <span className="text-[#ff4d4f]">18:00 น.</span> จะคำนวณ &quot;{title}&quot; กี่นาที (โดยอ้างอิงจากข้อที่ 2)</legend>
                  <div className={buttonGroupClass}>
                    <label className={optionClass(countingChoice === "immediate")}><input type="radio" className="sr-only" checked={countingChoice === "immediate"} onChange={() => setCountingChoice("immediate")} />{simulatedMinutes} นาที</label>
                    <label className={optionClass(countingChoice === "after", true)}><input type="radio" className="sr-only" checked={countingChoice === "after"} onChange={() => setCountingChoice("after")} />{simulatedMinutes} นาที</label>
                  </div>
                </fieldset>

                <fieldset className="mt-[14px]">
                  <legend>4. ได้รับเงินแบบไหน</legend>
                  <div className="my-3 ml-0 flex w-[176px] flex-col overflow-hidden rounded-[2px] border border-[#d9d9d9]">
                    {[
                      ["wage-rate", "ตามเรทค่าแรง"],
                      ["minute", "เป็นนาที"],
                      ["formula", "ตามสูตรการคำนวณพิเศษ"],
                      ["holiday", "แปลงเป็นวันหยุดพิเศษ"],
                    ].map(([value, label], index) => <label key={value} className={cn(optionClass(payMethod === value), index > 0 && "border-t border-[#d9d9d9]")}><input type="radio" className="sr-only" checked={payMethod === value} onChange={() => setPayMethod(value as IndividualOvertimeSetting["payMethod"])} />{label}</label>)}
                  </div>
                  {payMethod === "wage-rate" && <label className="mt-[26px] flex box-border h-8 w-[200px] overflow-hidden rounded-[2px] border border-[#d9d9d9]"><input aria-label="เท่าของค่าแรง" type="number" min="0" max="1000" step="1" value={wageRate} onChange={(event) => updateNumber(event.target.value, 1000, setWageRate)} className="min-w-0 flex-1 px-3 outline-none" /><span className="flex items-center border-l border-[#d9d9d9] bg-[#fafafa] px-3">เท่าของค่าแรง</span></label>}
                </fieldset>

                <fieldset className="mt-4">
                  <legend>5. ปัดเศษจำนวนเงิน</legend>
                  <div className="mt-2 inline-flex overflow-hidden rounded-[2px] border border-[#d9d9d9]">
                    <label className={optionClass(roundMoney === "none")}><input type="radio" className="sr-only" checked={roundMoney === "none"} onChange={() => setRoundMoney("none")} />ไม่ปัดเศษ</label>
                    <label className={optionClass(roundMoney === "round", true)}><input type="radio" className="sr-only" checked={roundMoney === "round"} onChange={() => setRoundMoney("round")} />ปัดเศษ</label>
                  </div>
                </fieldset>

                <fieldset className="mt-[14px]">
                  <legend>6. กำหนดชั่วโมงโอทีสูงสุด</legend>
                  <div className="flex flex-wrap gap-x-2 gap-y-0">
                    {[["shift", "ตามกะการทำงาน"], ["8", "8 ชั่วโมง"], ["12", "12 ชั่วโมง"], ["16", "16 ชั่วโมง"], ["24", "24 ชั่วโมง"]].map(([value, label]) => <label key={value} className="inline-flex cursor-pointer items-center gap-4"><input type="radio" checked={maxHours === value} onChange={() => setMaxHours(value as IndividualOvertimeSetting["maxHours"])} className="size-4 accent-[#1890ff]" />{label}</label>)}
                  </div>
                </fieldset>

                <fieldset className="mt-4">
                  <legend>7. การปัดเศษชั่วโมง</legend>
                  <div className="flex flex-wrap gap-x-2 gap-y-0">
                    {[["none", "ไม่ปัดเศษ"], ["10", "ปัดลง 10 นาที"], ["15", "ปัดลง 15 นาที"], ["20", "ปัดลง 20 นาที"], ["30", "ปัดลงครึ่งชัวโมง"], ["60", "ปัดลงเต็มชั่วโมง"]].map(([value, label], index) => <Fragment key={value}><label className="inline-flex cursor-pointer items-center gap-4"><input type="radio" checked={roundHours === value} onChange={() => setRoundHours(value as IndividualOvertimeSetting["roundHours"])} className="size-4 accent-[#1890ff]" />{label}</label>{index === 2 && <span aria-hidden="true" className="basis-full" />}</Fragment>)}
                  </div>
                </fieldset>

                <fieldset className="mt-4">
                  <legend>8. นำไปคำนวณกับ</legend>
                  <div className="grid grid-cols-2 gap-x-[7px] gap-y-0">
                    {["ประกันสังคม", "กองทุนสำรองเลี้ยงชีพ", "ภาษี", "ภาษีลาออก"].map((target) => <label key={target} className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" checked={calculationTargets.includes(target)} onChange={() => toggleTarget(target)} className="size-4 accent-[#1890ff]" />{target}</label>)}
                  </div>
                </fieldset>
              </>}
            </div>
          </div>
        </div>
        <footer className="flex shrink-0 justify-end border-t border-black/[0.3] bg-white p-3 shadow-[0_0_1px_0_rgba(0,0,0,1)]">
          {error && <p role="alert" className="mr-auto self-center text-sm text-[#cf1322]">{error}</p>}
          <Button type="button" onClick={onClose} disabled={saving} className="mr-2 h-9 rounded-[4px] bg-[#808b9e] px-4 text-sm font-semibold text-white hover:bg-[#707a8b] disabled:bg-[#bfbfbf]">ยกเลิก</Button>
          <Button type="button" onClick={() => void save()} disabled={!employeeId || saving} className="h-9 rounded-[4px] bg-[#03ae03] px-4 text-sm font-semibold text-white hover:bg-[#029602] disabled:bg-[#bfbfbf]">{saving ? "กำลังบันทึก" : "บันทึก"}</Button>
        </footer>
      </section>
    </div>
  );
}

function IndividualSettingsAccordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return <section className="border-b border-[#d9d9d9]"><button type="button" onClick={onToggle} aria-expanded={open} className="relative flex h-[46px] w-full items-center bg-transparent py-3 pl-10 pr-4 text-left text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.85)] transition-colors hover:bg-transparent"><ChevronRight aria-hidden="true" className={cn("absolute left-4 size-3 text-[rgba(0,0,0,0.65)] transition-transform", open && "rotate-90")} />{title}</button>{open && <div className="border-t border-[#d9d9d9] bg-white"><div className="p-2">{children}</div></div>}</section>;
}

function IndividualRadioGroup({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (value: string) => void; options: [string, string][] }) {
  return <fieldset><legend className="mb-3 text-sm font-normal leading-[22px] text-black/[0.85]">{label}</legend><div className="flex flex-wrap gap-x-5 gap-y-3 pl-3">{options.map(([optionValue, optionLabel]) => <label key={optionValue} className="inline-flex cursor-pointer items-center gap-2 text-sm font-normal leading-[22px] text-black/[0.65]"><input type="radio" name={label} value={optionValue} checked={value === optionValue} onChange={() => onValueChange(optionValue)} className="size-4 accent-[#1890ff]" />{optionLabel}</label>)}</div></fieldset>;
}

function IndividualTableHead({ children, className, tone = "default", ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { tone?: "default" | "inverse" }) { return <th {...props} className={cn("border-r border-[#f0f0f0] px-4 py-4 text-center align-middle text-sm font-medium leading-[22.001px] last:border-r-0", tone === "inverse" ? "text-white" : "text-[rgba(0,0,0,0.85)]", className)}>{children}</th>; }

function IndividualTableCell({ children, strong = false, align = "center", className }: { children?: React.ReactNode; strong?: boolean; align?: "left" | "center" | "right"; className?: string }) { return <td className={cn("border-r border-[#f0f0f0] bg-white px-2 py-2 align-middle text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.65)] last:border-r-0", align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center", strong && "font-medium text-[rgba(0,0,0,0.65)]", className)}>{children}</td>; }

function IndividualInfoIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5 fill-current"><path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z" /></svg>; }

function IndividualShiftDownloadIcon() { return <svg aria-hidden="true" viewBox="0 0 512 512" className="size-3.5 fill-current"><path d="M339.093 246.464c-3.627-7.232-11.008-11.797-19.093-11.797h-42.667V21.333C277.333 9.557 267.797 0 256 0s-21.333 9.557-21.333 21.333v213.334H192c-8.085 0-15.467 4.565-19.093 11.797-3.584 7.232-2.816 15.872 2.027 22.336l64 85.333c.277.363.704.491 1.003.832 1.408 1.664 3.072 2.944 4.928 4.117.768.469 1.365 1.088 2.197 1.472 2.731 1.28 5.717 2.112 8.939 2.112s6.208-.832 8.96-2.112c.811-.384 1.429-1.003 2.176-1.472 1.856-1.173 3.52-2.453 4.928-4.117.277-.341.725-.469 1.003-.832l64-85.333c4.864-6.464 5.632-15.104 2.025-22.336Z" /><path d="M490.667 320c-11.797 0-21.333 9.557-21.333 21.333v64c0 35.285-28.715 64-64 64H106.667c-35.285 0-64-28.715-64-64v-64C42.667 329.557 33.131 320 21.334 320 9.536 320 0 329.557 0 341.333v64C0 464.149 47.851 512 106.667 512h298.667C464.149 512 512 464.149 512 405.333v-64C512 329.557 502.464 320 490.667 320Z" /></svg>; }

function IndividualEditButton({ label, onClick }: { label: string; onClick?: () => void }) { return <button type="button" aria-label={label} onClick={onClick} className="m-0.5 inline-flex size-8 items-center justify-center rounded-full border border-white bg-[#a1ded7] font-semibold text-white transition-all duration-200 hover:border-[#a1ded7] hover:bg-white hover:text-[#a1ded7]"><svg aria-hidden="true" viewBox="0 0 488.471 488.471" className="size-3.5 fill-current"><path d="m483.999 111.318-106.847-106.846c-5.962-5.962-15.621-5.962-21.584 0l-351.066 351.067c-2.862 2.862-4.472 6.738-4.472 10.792l-.03 106.876c0 4.04 1.61 7.93 4.472 10.792s6.752 4.472 10.792 4.472l106.876-.03c4.054 0 7.93-1.61 10.792-4.472l351.067-351.067c5.962-5.962 5.962-15.621 0-21.584zm-368.203 346.622-85.298.03.03-85.298 251.868-251.868 85.268 85.268c-.001 0-251.868 251.868-251.868 251.868zm273.453-273.453-85.268-85.267 62.371-62.371 85.268 85.268z" /></svg></button>; }

function IndividualDeleteButton({ label }: { label: string }) { return <button type="button" aria-label={label} className="m-0.5 inline-flex size-8 items-center justify-center rounded-full border border-white bg-[#eb8794] font-semibold text-white transition-all duration-200 hover:border-[#eb8794] hover:bg-white hover:text-[#eb8794]"><Trash2 aria-hidden="true" className="size-3.5" /></button>; }

function IndividualWeekSchedule({
  label,
  value,
  options,
  values,
  onValueChange,
  onCellChange,
  disabled = false,
  linked = false,
}: {
  label: string;
  value: string;
  options: [string, string][];
  values: string[];
  onValueChange: (value: string) => void;
  onCellChange?: (index: number, value: string) => void;
  disabled?: boolean;
  linked?: boolean;
}) {
  return <section>
    <label className="mb-1 ml-1 block text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">{label}</label>
    <select aria-label={label} value={value} onChange={(event) => onValueChange(event.target.value)} disabled={disabled} className="mb-2 h-8 w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.65)] outline-none transition-colors focus:border-[#1890ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)] disabled:cursor-not-allowed disabled:bg-[#fafafa]">
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
    <div className="overflow-x-auto rounded-lg border border-[#f0f0f0] bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
      <table className="min-w-[840px] w-full table-fixed bg-white text-sm text-[rgba(0,0,0,0.65)]">
        <thead className="text-white"><tr className="bg-[#61a8ff]">{INDIVIDUAL_DAYS.map((day) => <IndividualTableHead tone="inverse" key={day}>{day}</IndividualTableHead>)}</tr></thead>
        <tbody><tr className="border-t border-[#f0f0f0] bg-white">{values.map((item, index) => <IndividualTableCell key={INDIVIDUAL_DAYS[index]} className="relative !border-r !border-[#f0f0f0] !bg-[#f2fafe] !py-2">
          {onCellChange ? <div className="inline-block"><span className="font-normal text-[#039be5]">{item}</span><button type="button" aria-label={`ใช้${value}กับ${label}${INDIVIDUAL_DAYS[index]}`} onClick={() => onCellChange(index, value)} disabled={disabled} className="inline-flex size-10 align-middle items-center justify-center bg-transparent p-0 text-[#039be5] hover:bg-transparent disabled:cursor-not-allowed"><IndividualShiftDownloadIcon /></button></div> : item}
        </IndividualTableCell>)}</tr></tbody>
      </table>
    </div>
  </section>;
}

/* ---------------------------- Tab: รายองค์กร ------------------------------ */

function OrganizationContent() {
  const [calcEnabled, setCalcEnabled] = useState(true);
  const [salaryVisible, setSalaryVisible] = useState(false);
  const [subTab, setSubTab] = useState(ORG_SUB_TABS[0]);
  const [innerTab, setInnerTab] = useState(ORG_INNER_TABS[0]);
  const [selected, setSelected] = useState<string[]>(ORG_EMPLOYEES.map((e) => e.code));
  const innerTabRef = useRef<HTMLDivElement>(null);
  const orgCellClass = "!p-2 border-b border-r border-[#f0f0f0] bg-white last:border-r-0";

  const allChecked =
    ORG_EMPLOYEES.length > 0 && ORG_EMPLOYEES.every((e) => selected.includes(e.code));

  function toggleAll() {
    if (allChecked) {
      setSelected([]);
    } else {
      setSelected(ORG_EMPLOYEES.map((e) => e.code));
    }
  }

  function toggleRow(code: string) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  return (
    <div className="space-y-0">
      {/* Sub-tabs: งวดเต็ม / รวมทุกงวด / เปรียบเทียบ */}
      <div role="tablist" aria-label="รูปแบบการคำนวณเงินเดือนทั้งองค์กร" className="flex h-12 border-b border-black/[0.12] bg-white">
          {ORG_SUB_TABS.map((tab) => {
            const active = tab === subTab;
            const hasArrow = tab === "งวดเต็ม" || tab === "รวมทุกงวด";
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`normal-organization-${tab}`}
                onClick={() => setSubTab(tab)}
                className={cn(
                  "group relative flex h-12 min-w-40 shrink-0 items-center justify-center px-6 font-[Kanit,sans-serif] text-sm font-semibold leading-[22px] transition-colors",
                  active
                    ? "text-[#1890ff]"
                    : "text-black/[0.54] hover:text-black/[0.87]"
                )}
              >
                <span className="tooltip-hover flex items-center justify-center">
                  <span>{tab}</span>
                  {hasArrow && (
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-[#fbc02d] text-[#fbc02d]">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </span>
                {tab === "งวดเต็ม" && (
                  <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-0 hidden size-5 items-center justify-center rounded-full bg-[#ffa500] text-[16px] font-normal leading-5 text-white shadow-[0_2px_3px_rgba(0,0,0,0.5)] group-hover:flex">?</span>
                )}
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1890ff]" />}
              </button>
            );
          })}
      </div>

      {/* Filter + action toolbar */}
      <div className="mx-6 mb-[22px] mt-6 flex flex-wrap items-start justify-between gap-2">
        {/* Filters */}
        <div className="flex flex-1 flex-wrap items-start gap-2">
          {["โครงสร้างองค์กร", "ตำแหน่ง", "ประเภทพนักงาน"].map((f) => (
            <button
              key={f}
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-[#d9d9d9] bg-white px-3 font-[Kanit,sans-serif] text-sm font-normal leading-[22px] text-black/[0.87] shadow-none transition-colors hover:border-[#61a8ff] hover:bg-white"
            >
              {f}
              <ChevronDown className="size-[14px] stroke-[2.5] text-black" />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-end gap-1 self-end">
          <button
            type="button"
            className="group relative inline-flex h-9 items-center gap-0 rounded-[4px] border-0 bg-white px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-black/[0.87] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-white"
          >
            <span>สร้างรายชื่อ&nbsp;</span>
            <List className="size-6" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-2.5 right-0 hidden size-4 items-center justify-center rounded-full bg-[#ffa500] text-[16px] font-normal leading-5 text-white group-hover:flex">?</span>
          </button>
          <button
            type="button"
            className="group relative inline-flex h-9 items-center gap-0 rounded-[4px] border-0 bg-white px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-black/[0.87] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-white"
          >
            <span>คำนวณ&nbsp;</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-current">
              <path d="M19 8l-4 4h3c0 1.65-1.35 3-3 3-.52 0-1.01-.14-1.43-.38l-1.46 1.46A4.96 4.96 0 0 0 15 17c2.76 0 5-2.24 5-5h3l-4-4zM6 12c0-1.65 1.35-3 3-3 .52 0 1.01.14 1.43.38l1.46-1.46A4.96 4.96 0 0 0 9 7c-2.76 0-5 2.24-5 5H1l4 4 4-4H6z" />
            </svg>
            <span aria-hidden="true" className="pointer-events-none absolute -top-2.5 right-0 hidden size-4 items-center justify-center rounded-full bg-[#ffa500] text-[16px] font-normal leading-5 text-white group-hover:flex">?</span>
          </button>
          <button
            type="button"
            className="group relative inline-flex h-9 items-center gap-0 rounded-[4px] border-0 bg-white px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-black/[0.87] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-white"
          >
            <span>รีเซ็ต&nbsp;</span>
            <RotateCcw className="size-6" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-2.5 right-0 hidden size-4 items-center justify-center rounded-full bg-[#ffa500] text-[16px] font-normal leading-5 text-white group-hover:flex">?</span>
          </button>
        </div>
      </div>

      <section className="content-body relative -top-[1.2px] mx-6 overflow-visible rounded-[5px] border border-[#cccccc] bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
      {/* Inner tabs */}
      <div className="flex h-12 items-stretch overflow-hidden border-b border-black/[0.12] bg-white">
        <button
          type="button"
          onClick={() => innerTabRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
          className="flex w-12 shrink-0 items-center justify-center bg-white text-black/[0.54] shadow-[2px_0_8px_rgba(0,0,0,0.12)] transition-colors hover:text-black/[0.87]"
          aria-label="เลื่อนแท็บซ้าย"
        >
          <ChevronLeft className="size-6" />
        </button>
        <div ref={innerTabRef} role="tablist" aria-label="ข้อมูลคำนวณเงินเดือนทั้งองค์กร" className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ORG_INNER_TABS.map((tab) => {
            const active = tab === innerTab;
            const label = tab === "รายชื่อพนักงาน" ? `รายชื่อพนักงาน (${ORG_EMPLOYEES.length})` : tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`normal-organization-${tab}`}
                onClick={() => setInnerTab(tab)}
                className={cn(
                  "group relative flex h-12 min-w-40 shrink-0 items-center justify-center whitespace-nowrap px-6 font-[Kanit,sans-serif] text-sm font-semibold leading-[22px] transition-colors",
                  active
                    ? "text-[#1890ff]"
                    : "text-black/[0.54] hover:text-black/[0.87]"
                )}
              >
                <span>{label}</span>
                <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-[5px] hidden size-5 items-center justify-center rounded-full bg-[#ffa500] text-[16px] font-normal leading-5 text-white shadow-[0_2px_3px_rgba(0,0,0,0.5)] group-hover:flex">?</span>
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1890ff]" />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => innerTabRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
          className="flex w-12 shrink-0 items-center justify-center bg-white text-black/[0.54] shadow-[-2px_0_8px_rgba(0,0,0,0.12)] transition-colors hover:text-black/[0.87]"
          aria-label="เลื่อนแท็บขวา"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      {/* Tab content */}
      {innerTab === "รายชื่อพนักงาน" ? (
        <div id="normal-organization-employee" className="flex">
          <div className="m-6 flex flex-1 flex-col gap-2">
            {/* Toggle + เปิด/ปิดข้อมูลเงินเดือน */}
            <div className="mb-2 flex flex-wrap items-center justify-end gap-3">
              <div className="mr-3 flex items-center gap-2 text-sm text-black/[.87]">
                <button
                  type="button"
                  role="switch"
                  aria-checked={calcEnabled}
                  onClick={() => setCalcEnabled((v) => !v)}
                  className={cn(
                    "relative inline-flex h-[22px] w-11 items-center rounded-full transition-colors",
                    calcEnabled ? "bg-[#1890ff]" : "bg-[#bfbfbf]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-[18px] translate-x-0.5 rounded-full bg-white shadow transition-transform",
                      calcEnabled && "translate-x-[22px]"
                    )}
                  />
                </button>
                <span className="mr-2">เปิด/ปิด การคำนวณเงินเดือนของพนักงาน</span>
                <CircleHelp className="size-4 shrink-0 fill-[#61a8ff] text-[#61a8ff]" />
              </div>
              <button
                type="button"
                onClick={() => setSalaryVisible((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-white px-4 text-sm font-medium text-black/[.87] shadow-[0_2px_2px_0_rgba(0,0,0,.14),0_3px_1px_-2px_rgba(0,0,0,.2),0_1px_5px_0_rgba(0,0,0,.12)] transition-colors hover:bg-black/[.04]"
              >
                เปิด/ปิดข้อมูลเงินเดือน
                <Power className="size-4" />
              </button>
            </div>

            {/* Table */}
            <div className="max-h-[80vh] overflow-auto border border-[#f0f0f0]">
              <Table className="min-w-[1100px] table-fixed text-sm leading-[22px]">
              <TableHeader className="sticky top-0 z-10 bg-[#61a8ff]">
                <TableRow className="hover:bg-transparent">
                  <BlueTableHead className="h-auto w-[5%] py-4 text-center">
                    <span className="inline-flex h-[22px] items-center">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        className="size-4 accent-[#1890ff]"
                      />
                    </span>
                  </BlueTableHead>
                  <BlueTableHead className="h-auto w-[5%] py-4 text-center">ลำดับ</BlueTableHead>
                  <BlueTableHead className="h-auto w-[8%] py-4 text-center">รหัสพนักงาน</BlueTableHead>
                  <BlueTableHead className="h-auto w-[16%] py-4 text-center">
                    <span className="inline-flex items-center gap-1">
                      ชื่อพนักงาน
                      <Search className="size-3.5" />
                    </span>
                  </BlueTableHead>
                  <BlueTableHead className="h-auto w-[16%] py-4 text-center">สำนักงานสาขา</BlueTableHead>
                  <BlueTableHead className="h-auto w-[15%] py-4 text-center">แผนก</BlueTableHead>
                  <BlueTableHead className="h-auto w-[15%] py-4 text-center">ตำแหน่ง</BlueTableHead>
                  <BlueTableHead className="h-auto w-[7%] py-4 text-center">งวด</BlueTableHead>
                  <BlueTableHead className="h-auto w-[8%] py-4 text-center">ข้อมูลเงินเดือน</BlueTableHead>
                  <BlueTableHead className="h-auto w-[5%] py-4"> </BlueTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ORG_EMPLOYEES.map((e, i) => (
                  <TableRow
                    key={e.code}
                    className="bg-white hover:bg-white"
                  >
                    <TableCell className={cn(orgCellClass, "text-center")}>
                      <span className="inline-flex h-[22px] items-center">
                        <input
                          type="checkbox"
                          checked={selected.includes(e.code)}
                          onChange={() => toggleRow(e.code)}
                          className="size-4 accent-[#1890ff]"
                        />
                      </span>
                    </TableCell>
                    <TableCell className={cn(orgCellClass, "text-center text-foreground")}>{i + 1}</TableCell>
                    <TableCell className={cn(orgCellClass, "text-center font-medium text-foreground")}>{e.code}</TableCell>
                    <TableCell className={cn(orgCellClass, "text-foreground")}>{e.name.includes("(") ? e.name : `${e.name} ()`}</TableCell>
                    <TableCell className={cn(orgCellClass, "text-foreground")}>{e.branch}</TableCell>
                    <TableCell className={cn(orgCellClass, "text-foreground")}>{e.dept}</TableCell>
                    <TableCell className={cn(orgCellClass, "text-foreground")}>{e.position}</TableCell>
                    <TableCell className={cn(orgCellClass, "text-center text-foreground")}>เต็มงวด</TableCell>
                    <TableCell className={cn(orgCellClass, "text-center text-foreground")}>
                      {salaryVisible ? "เปิด" : "ปิด"}
                    </TableCell>
                    <TableCell className={cn(orgCellClass, "text-center")}>
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center rounded-full bg-[#eb8794] text-white transition-colors hover:bg-[#df7380]"
                        aria-label={`ลบ ${e.name} ออกจากรายชื่อ`}
                        title="ลบออกจากรายชื่อ"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                disabled
                className="flex size-8 cursor-not-allowed items-center justify-center rounded-md border border-border text-muted-foreground/50"
                aria-label="หน้าก่อนหน้า"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="size-8 rounded-sm border border-[#2196f3] bg-white text-sm font-medium text-[#2196f3] shadow-sm"
              >
                1
              </button>
              <button
                type="button"
                disabled
                className="flex size-8 cursor-not-allowed items-center justify-center rounded-md border border-border text-muted-foreground/50"
                aria-label="หน้าถัดไป"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            อยู่ระหว่างการพัฒนา — {innerTab}
          </div>
        </div>
      )}
      </section>
    </div>
  );
}

/* ------------------------------ Tab: ปิดงวดบัญชี ----------------------------- */

type ReportAction = "PDF" | "Excel" | "Text";

type ClosePeriodReport = {
  title: string;
  count?: string;
  actions: ReportAction[];
  available?: boolean;
  note?: string;
  integration?: "peak" | "accrevo";
};

const CLOSE_PERIOD_GROUPS: { heading: string; reports: ClosePeriodReport[] }[] = [
  {
    heading: "เงินเดือน",
    reports: [
      {
        title: "รายงานผลการคำนวณเงินเดือนสุทธิงวดปกติ",
        count: "8 คน",
        actions: ["PDF", "Excel", "Text"],
        available: true,
      },
      {
        title: "รายงานสรุปเงินที่ต้องจ่าย",
        actions: ["PDF", "Excel", "Text"],
        note: "กรุณาปิดงวดบัญชีเพื่อทำการดาวน์โหลดเอกสาร",
      },
      {
        title: "สลิปเงินเดือน",
        actions: ["PDF"],
        note: "กรุณาปิดงวดบัญชีเพื่อทำการดาวน์โหลดเอกสาร",
      },
    ],
  },
  {
    heading: "ภาษี ประกันสังคม",
    reports: [
      {
        title: "รายงานประกันสังคม",
        actions: ["PDF", "Excel"],
        note: "กรุณาปิดงวดบัญชีเพื่อทำการดาวน์โหลดเอกสาร",
      },
      {
        title: "รายงานภาษี ภงด.1",
        actions: ["PDF", "Text"],
        note: "กรุณาปิดงวดบัญชีเพื่อทำการดาวน์โหลดเอกสาร",
      },
      {
        title: "รายงานภาษี ภงด.3",
        actions: ["PDF", "Excel", "Text"],
        note: "กรุณาปิดงวดบัญชีเพื่อทำการดาวน์โหลดเอกสาร",
      },
    ],
  },
  {
    heading: "การเชื่อมต่อภายนอก",
    reports: [
      {
        title: "PEAK",
        actions: [],
        integration: "peak",
      },
      {
        title: "accrevo",
        actions: [],
        integration: "accrevo",
        note: "สามารถกดส่งได้ 1 ครั้งต่อ 1 การปิดงวด กรุณาปิดงวดบัญชีอีกครั้งเพื่อทำการส่งข้อมูล",
      },
    ],
  },
];

function ReportDownloadButton({ type, disabled = false }: { type: ReportAction; disabled?: boolean }) {
  const colors: Record<ReportAction, string> = {
    PDF: "border-[#db9a9a] text-[#e87878] enabled:hover:bg-[#fff7f7]",
    Excel: "border-[#8bbd95] text-[#56a66b] enabled:hover:bg-[#f4fcf6]",
    Text: "border-[#76b6e6] text-[#3599e6] enabled:hover:bg-[#f3faff]",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-2 text-sm font-semibold leading-9 shadow-[0_1px_2px_rgba(10,13,18,0.05)] transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#e5e5e5] disabled:text-[#a9a9a9]",
        colors[type]
      )}
    >
      <Download className="size-4" />
      {type}
    </button>
  );
}

function ClosePeriodContent() {
  const [payDate, setPayDate] = useState("");
  const [taxDate, setTaxDate] = useState("");

  return (
    <div className="space-y-[22px] px-2 pt-2">
      <Card className="shadow-sm">
        <CardContent className="flex min-h-[6.5rem] flex-wrap items-end justify-between gap-4 px-[23px] pb-[25px] pt-5">
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="grid gap-0 text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">
              วันที่จ่าย
              <input
                type="date"
                value={payDate}
                onChange={(event) => setPayDate(event.target.value)}
                className="h-[34px] w-[180px] rounded border border-[#d9d9d9] bg-white px-[11px] py-1 text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.65)] outline-none focus:border-[#61a8ff]"
              />
            </label>
            <label className="grid gap-0 text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">
              วันที่จ่ายภาษี
              <input
                type="date"
                min="2026-08-01"
                max="2026-09-17"
                value={taxDate}
                onChange={(event) => setTaxDate(event.target.value)}
                className="h-[34px] w-[180px] rounded border border-[#d9d9d9] bg-white px-[11px] py-1 text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.65)] outline-none focus:border-[#61a8ff]"
              />
            </label>
            <button type="button" className="h-[34px] rounded bg-[#03ae03] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#029902]">
              บันทึก
            </button>
          </div>
          <button type="button" className="h-[34px] rounded bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#1687df]">
            ปิดงวดบัญชี
          </button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="pb-5 pl-[23px] pr-[21px] pt-[31px]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "โครงสร้างองค์กร", multiple: true },
              { label: "กลุ่มพนักงาน" },
              { label: "ประเภทพนักงาน", multiple: true },
              { label: "ช่องทางการชำระเงิน" },
            ].map((filter) => (
              <label key={filter.label} className="grid gap-0 text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">
                {filter.label}
                <button
                  type="button"
                  className="relative h-8 w-full rounded-sm border border-[#d9d9d9] bg-white px-[11px] py-1 text-left text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.45)] outline-none transition-colors hover:border-[#61a8ff] focus-visible:border-[#61a8ff]"
                >
                  ทั้งหมด
                  {filter.multiple ? (
                    <span className="absolute right-2.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center rounded-full bg-[#b8b8b8] text-[11px] leading-none text-white" aria-hidden="true">×</span>
                  ) : (
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  )}
                </button>
              </label>
            ))}
          </div>

          <div className="mt-[13px] flex h-9 flex-wrap items-stretch justify-between gap-3">
            <p className="ml-[3px] flex items-center text-xs leading-[18.858px] text-[#e97777]">กรุณากดปุ่มนำไปใช้หลังจากเลือกตัวกรองข้อมูล (Filter)</p>
            <button type="button" className="relative -left-px h-9 rounded bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#1687df]">
              ค้นหา
            </button>
          </div>

          <div className="mt-[21px] -ml-[13px] mr-[-12px] w-[calc(100%+23px)] overflow-hidden rounded-sm border border-[#e5e9ed]">
            <Table className="table-fixed text-sm leading-[22px]">
              <colgroup>
                <col className="w-[38%]" />
                <col className="w-[30%]" />
                <col className="w-[32%]" />
              </colgroup>
              <TableHeader className="[&_tr]:border-0">
                <TableRow className="bg-[#e7eff8] hover:bg-[#e7eff8]">
                  <TableHead className="h-[58px] px-4 text-center text-base font-medium normal-case tracking-normal text-black">รายงาน</TableHead>
                  <TableHead className="h-[58px] px-4 text-center text-base font-medium normal-case tracking-normal text-black">จำนวนพนักงาน</TableHead>
                  <TableHead className="h-[58px] px-4 text-center text-base font-medium normal-case tracking-normal text-black" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {CLOSE_PERIOD_GROUPS.map((group) => (
                  <Fragment key={group.heading}>
                    <TableRow className="h-[47px] border-0 bg-[#cfe3fb] hover:bg-[#cfe3fb]">
                      <TableCell colSpan={3} className="h-[47px] border-b border-[#d8e6f7] px-4 py-0 align-middle text-[15px] font-medium leading-[23.5725px] text-[rgba(0,0,0,0.75)]">
                        {group.heading}
                      </TableCell>
                    </TableRow>
                    {group.reports.map((report) => (
                      <TableRow key={report.title} className="h-[67px] bg-white hover:bg-white">
                        <TableCell className={cn(
                          "h-[67px] border-b border-[#f0f0f0] px-2 align-middle text-base font-medium leading-5 text-[rgba(0,0,0,0.65)]",
                          report.integration === "accrevo" ? "pb-3 pt-[7px]" : "py-3"
                        )}>
                          {report.integration ? (
                            <img
                              src={`https://micorganize.humansoft.co.th/assets/images/logos/partner/${report.integration === "peak" ? "PEAK_LOGO-1.png" : "accrevo-1.png"}`}
                              alt={report.title}
                              className={report.integration === "peak" ? "relative -top-px h-10 w-[135px] object-contain" : "h-[29px] w-[83px] object-contain"}
                            />
                          ) : (
                            <span className={cn("relative inline-block", report.note ? "-top-0.5" : "-top-1")}>{report.title}</span>
                          )}
                          {report.note && <span className="block text-xs font-normal leading-[18.858px] text-[#e97777]">{report.note}</span>}
                        </TableCell>
                        <TableCell className="h-[67px] border-b border-[#f0f0f0] px-2 py-3 text-center align-middle text-base font-medium leading-5 text-[rgba(0,0,0,0.65)]"><span className="relative -top-1">{report.count}</span></TableCell>
                        <TableCell className="h-[67px] border-b border-[#f0f0f0] px-2 py-3 align-middle">
                          {report.integration ? (
                            <div className="flex justify-end gap-2">
                              <button type="button" disabled className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#e5e5e5] px-3 text-sm text-[#a9a9a9]">
                                <Send className="size-4" /> Send
                              </button>
                              <button type="button" className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#70b8ec] bg-white px-3 text-sm font-medium text-[#2997e7]">
                                <History className="size-4" /> การดำเนินงาน
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              {report.actions.map((type) => (
                                <ReportDownloadButton key={type} type={type} disabled={!report.available} />
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------- Tab: สรุปตั้งค่าทั้งองค์กร ------------------------ */

const SETTINGS_TABS = [
  "ตั้งค่าทั่วไป",
  "ตั้งค่าเวลาการทำงาน",
  "ตั้งค่าประเภทการลา",
  "ตั้งค่าประเภทรายรับรายจ่าย",
];

const GENERAL_PAYROLL_SETTINGS = [
  "รอบการจ่ายเงินเดือน วันที่ 16-15 กำหนดปิดงวดอัตโนมัติ",
  "วิธีการคำนวณแบ่งงวด งวดสุดท้าย = งวดเต็ม - ผลรวมของงวดแยกก่อนหน้า",
  "วันทำงานเพื่อนำไปหารค่าแรงต่อวันเท่ากับ 30 วัน/เดือน",
  "จำนวนชั่วโมงเท่ากับ 08:00 ชั่วโมง/วัน",
  "เปิดการป้องกันการเลือกโอที",
  "จำนวนเงินที่เกิดจากการคำนวณของโปรแกรมจะไม่ถูกปัดเศษ",
  "พนักงานรายวันไม่ได้รับค่าแรงในวันหยุดนักขัตฤกษ์",
  "การคิดชั่วโมงการทำงานพนักงานพาร์ตไทม์จะ ไม่ปัดเศษ",
  "ตั้งอัตราประกันสังคมของพนักงานเท่ากับ 5 %",
  "ตั้งอัตราประกันสังคมของนายจ้างเท่ากับ 5 %",
];

const GENERAL_LEAVE_SETTINGS = [
  "รอบโควตาการลาประจำปี ตั้งแต่วันที่ 01 มกราคม 2026 จนถึงวันที่ 31 ธันวาคม 2026",
  "จำนวนชั่วโมงการทำงานสำหรับการคำนวณโควตาการลาเท่ากับ 8 ชั่วโมง",
];

const GENERAL_TIME_SETTINGS = [
  "ตั้งค่าป้องกันเวลาซ้ำ โดยตั้งให้ ห่างกัน 2 นาที",
  "กำหนดการ สแกนนิ้วมากกว่า 2 ครั้ง/วัน",
  "ถ้าแสกนนิ้วไม่ครบจะถูกระบบทำการตัดขาดงาน ครึ่งวัน",
];

function SummaryTableHead({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <TableHead {...props} className={cn("h-auto border-r border-[#d3d3d3] bg-[#61a8ff] px-3 py-4 text-center text-sm font-medium normal-case tracking-normal text-white last:border-r-0", className)}>
      {children}
    </TableHead>
  );
}

function SummaryGroupRow({ children, colSpan }: { children: React.ReactNode; colSpan: number }) {
  return (
    <TableRow className="bg-[#cfe3fb] hover:bg-[#cfe3fb]">
      <TableCell colSpan={colSpan} className="border-b border-[#d9e6f4] px-4 py-3 font-medium text-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

function GeneralSettingsSummary() {
  return (
    <Card className="min-h-[24.25rem] shadow-sm">
      <CardContent className="p-9">
        <h2 className="text-xl font-bold text-foreground">ตั้งค่าทั่วไป</h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-9">
          <div className="space-y-4 lg:border-r lg:border-[#d7d7d7] lg:pr-9">
            <section>
              <p className="text-sm text-muted-foreground">• คำนวณเงินเดือน</p>
              <ul className="mt-1 space-y-0.5 pl-5 text-sm leading-5 text-muted-foreground">
                {GENERAL_PAYROLL_SETTINGS.map((setting) => <li key={setting}>• {setting}</li>)}
              </ul>
            </section>
          </div>
          <div className="space-y-4">
            <section>
              <p className="text-sm text-muted-foreground">• โควตาการลา</p>
              <ul className="mt-1 space-y-0.5 pl-5 text-sm leading-5 text-muted-foreground">
                {GENERAL_LEAVE_SETTINGS.map((setting) => <li key={setting}>• {setting}</li>)}
              </ul>
            </section>
            <section>
              <p className="text-sm text-muted-foreground">• การลงเวลาการทำงาน</p>
              <ul className="mt-1 space-y-0.5 pl-5 text-sm leading-5 text-muted-foreground">
                {GENERAL_TIME_SETTINGS.map((setting) => <li key={setting}>• {setting}</li>)}
              </ul>
            </section>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const TIME_DEDUCTION_ROWS = [
  ["พนักงานรายเดือน", "10", "0", "เริ่มนับหลังเวลาเริ่มงาน 10 นาที", "10", "0", "เริ่มหักเงินหลังเวลาเริ่มงาน 10 นาที", "นาทีละ 1 บาท", "ไม่ปัดเศษจำนวนเงิน", "-"],
  ["พนักงานรายวัน", "10", "0", "เริ่มนับหลังเวลาเริ่มงาน 10 นาที", "10", "0", "เริ่มหักเงินหลังเวลาเริ่มงาน 10 นาที", "นาทีละ 1 บาท", "ไม่ปัดเศษจำนวนเงิน", "-"],
  ["พนักงานรายเดือน", "5", "0", "เริ่มนับก่อนเวลาเลิกงาน 5 นาที", "5", "0", "เริ่มหักเงินก่อนเวลาเลิกงาน 5 นาที", "1 เท่าของค่าแรง", "ไม่ปัดเศษจำนวนเงิน", "-"],
  ["พนักงานรายวัน", "5", "0", "เริ่มนับก่อนเวลาเลิกงาน 5 นาที", "5", "0", "เริ่มหักเงินก่อนเวลาเลิกงาน 5 นาที", "1 เท่าของค่าแรง", "ไม่ปัดเศษจำนวนเงิน", "-"],
];

const OVERTIME_ROWS = [
  ["พนักงานรายเดือน", "0", "เริ่มคำนวณทันที", "1 เท่าของค่าแรง", "ตามกะการทำงาน", "ไม่ปัดเศษ", "-"],
  ["พนักงานรายวัน", "30", "เริ่มคำนวณทันที", "1 เท่าของค่าแรง", "ตามกะการทำงาน", "ไม่ปัดเศษ", "-"],
];

function WorkTimeSettingsSummary() {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-7 p-7">
        <div>
          <h2 className="text-xl font-bold text-foreground">ตั้งค่าเวลาการทำงาน</h2>
          <p className="mt-5 text-sm text-muted-foreground">• ประเภทถูกหักเงิน</p>
          <Table className="mt-3 min-w-[1150px] table-fixed text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SummaryTableHead rowSpan={2} className="w-[12%]">ประเภทพนักงาน</SummaryTableHead>
                <SummaryTableHead colSpan={3}>เริ่มนับเวลา (นาที)</SummaryTableHead>
                <SummaryTableHead colSpan={3}>เริ่มหักเงิน (นาที)</SummaryTableHead>
                <SummaryTableHead rowSpan={2} className="w-[12%]">หักเงิน</SummaryTableHead>
                <SummaryTableHead rowSpan={2} className="w-[12%]">ปัดเศษจำนวนเงิน</SummaryTableHead>
                <SummaryTableHead rowSpan={2} className="w-[7%]">นำไปคำนวณกับ</SummaryTableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                {["ต่ำสุด", "สูงสุด", "เวลาคำนวณ", "ต่ำสุด", "สูงสุด", "เวลาคำนวณ"].map((header, index) => <SummaryTableHead key={`${header}-${index}`}>{header}</SummaryTableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              <SummaryGroupRow colSpan={10}>สาย</SummaryGroupRow>
              {TIME_DEDUCTION_ROWS.slice(0, 2).map((row) => <SummaryDetailRow key={`สาย-${row[0]}`} row={row} />)}
              <SummaryGroupRow colSpan={10}>กลับก่อน</SummaryGroupRow>
              {TIME_DEDUCTION_ROWS.slice(2).map((row) => <SummaryDetailRow key={`กลับก่อน-${row[0]}`} row={row} />)}
            </TableBody>
          </Table>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">• ประเภทโอที</p>
          <Table className="mt-3 min-w-[900px] table-fixed text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["ประเภทพนักงาน", "เริ่มนับเวลา (นาที)", "เวลาคำนวณ", "วิธีการคำนวณ", "ชั่วโมงโอทีสูงสุด", "การปัดเศษชั่วโมง", "นำไปคำนวณกับ"].map((header) => <SummaryTableHead key={header}>{header}</SummaryTableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {["โอทีล่วงเวลา (x1.0)", "โอทีล่วงเวลา (x1.5)", "โอทีวันหยุด (x2.0)", "โอทีล่วงเวลาวันหยุด (x3.0)"].map((title, index) => (
                <Fragment key={title}>
                  <SummaryGroupRow colSpan={7}><p>{title}</p><p className="text-xs font-normal">นำไปใช้กับ วัน{index < 2 ? "ทำงาน (นอกเวลากะการทำงาน)" : "หยุด (ในเวลากะการทำงาน และนอกเวลากะการทำงาน)"}</p></SummaryGroupRow>
                  {OVERTIME_ROWS.map((row) => <SummaryDetailRow key={`${title}-${row[0]}`} row={[...row.slice(0, 3), `${index === 1 ? "1.5" : index === 3 ? "3" : "1"} เท่าของค่าแรง`, ...row.slice(4)]} />)}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryDetailRow({ row }: { row: string[] }) {
  return (
    <TableRow className="bg-white hover:bg-white">
      {row.map((cell, index) => <TableCell key={`${cell}-${index}`} className="border-b border-r border-[#f0f0f0] px-3 py-2 text-center align-middle text-foreground last:border-r-0">{cell}</TableCell>)}
    </TableRow>
  );
}

const LEAVE_TYPES = [
  ["รหัสอ้างอิง 01", "ลากิจได้รับค่าจ้าง", "0 วัน", "0 วัน", "7 วัน", "1 ปี", "ห้ามลาเกินโควตา/ ไม่ปัดเศษชั่วโมงลา/ ลาได้ทั้งเพศชายและเพศหญิง/ นับอายุงานจากวันที่บรรจุ/ เฉลี่ยโควตาในปี/ แสดงโควตาเป็นวัน", "0 เดือน / 6 วัน"],
  ["รหัสอ้างอิง 04", "ลาคลอดได้รับค่าจ้าง", "0 วัน", "0 วัน", "45 วัน", "1 ปี", "ห้ามลาเกินโควตา/ สะสมวันหยุด/ ไม่ปัดเศษชั่วโมงลา/ ลาได้เฉพาะเพศหญิง/ นับอายุงานจากวันที่บรรจุ/ เฉลี่ยโควตาในปี/ แสดงโควตาเป็นวัน", "0 เดือน / 45 วัน"],
  ["รหัสอ้างอิง 06", "ลาพักร้อน", "0 วัน", "0 วัน", "10 วัน", "1 ปี", "ห้ามลาเกินโควตา/ ไม่ปัดเศษชั่วโมงลา/ ลาได้ทั้งเพศชายและเพศหญิง/ นับอายุงานจากวันที่บรรจุ/ เฉลี่ยโควตาในปี/ แสดงโควตาเป็นวัน", "12 เดือน / 6 วัน  •  36 เดือน / 8 วัน  •  60 เดือน / 10 วัน"],
  ["รหัสอ้างอิง 09", "ขาดงาน", "0 วัน", "0 วัน", "0 วัน", "1 ปี", "ไม่ปัดเศษชั่วโมงลา/ ลาได้ทั้งเพศชายและเพศหญิง/ นับอายุงานจากวันที่บรรจุ/ เฉลี่ยโควตาในปี/ แสดงโควตาเป็นวัน", "-"],
];

function LeaveSettingsSummary() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-7">
        <h2 className="text-xl font-bold text-foreground">ตั้งค่าประเภทการลา</h2>
        <Table className="mt-5 min-w-[1100px] table-fixed text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["ลาล่วงหน้า", "ลาย้อนหลัง", "ลาติดต่อกันสูงสุด", "จำนวนปีสะสม", "เงื่อนไข", "ประเภทพนักงาน", "วิธีคำนวณการลา", ""].map((header) => <SummaryTableHead key={header} className={header === "เงื่อนไข" ? "w-[24%]" : ""}>{header}</SummaryTableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {LEAVE_TYPES.map((leave) => (
              <Fragment key={leave[0]}>
                <SummaryGroupRow colSpan={8}><span className="mr-8 text-sm font-normal">{leave[0]}</span>{leave[1]}</SummaryGroupRow>
                <TableRow className="bg-white hover:bg-white">
                  {leave.slice(2, 7).map((cell, index) => <TableCell key={`${leave[0]}-${index}`} className="border-b border-r border-[#f0f0f0] px-3 py-3 text-center align-middle text-foreground">{cell}</TableCell>)}
                  <TableCell className="border-b border-r border-[#f0f0f0] px-3 py-3 text-center align-middle text-foreground">พนักงานรายเดือน</TableCell>
                  <TableCell className="border-b border-r border-[#f0f0f0] px-3 py-3 text-center align-middle text-foreground">ลาไม่ได้รับค่าจ้างเรท 0 เท่าต่อวัน</TableCell>
                  <TableCell className="border-b border-[#f0f0f0] px-3 py-3 text-center align-middle text-foreground">{leave[7]}</TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const INCOME_ROWS = [
  ["เงินชดเชยเกษียณ", "Retirement Severance", "Auto", "retirement_severance", "-", "", "ไม่ปัดเศษ"],
  ["คอมมิชชั่น", "Commission", "Income", "ST0017", "- งวดพิเศษ", "40(1)", "ไม่ปัดเศษ"],
  ["เงินค่าตกใจ", "Severance Extended", "Auto", "severance_extended", "- ภาษี", "", "ไม่ปัดเศษ"],
  ["เงินสดย่อย", "Petty Cash", "Auto", "petty_cash", "-", "40(1)", "ไม่ปัดเศษ"],
  ["ภาษีบริษัทจ่ายให้", "Tax Company Provided", "Auto", "tax_company_provided", "- ภาษี", "40(1)", "ไม่ปัดเศษ"],
  ["ค่าตำแหน่ง", "Position Value", "Constant", "ST0001", "-", "40(1)", "ไม่ปัดเศษ"],
  ["โบนัส", "Bonus", "Income", "ST0012", "-", "40(1)", "ไม่ปัดเศษ"],
  ["เงินได้อื่นๆ", "Other Income", "Income", "ST0013", "- งวดพิเศษ", "40(1)", "ไม่ปัดเศษ"],
];

const EXPENSE_ROWS = [
  ["เงินหักกรมบังคับคดี", "Legal Execution Department", "Expense", "ST0007", "-", "40(1)", "ไม่ปัดเศษ"],
  ["ภาษี", "Tax", "Auto", "tax", "-", "40(1)", "ปัดเศษ"],
  ["กองทุนสำรองเลี้ยงชีพ", "Provident Fund", "Fund", "provident", "-", "40(1)", "ไม่ปัดเศษ"],
  ["เงินหักอื่นๆ", "Other Expense", "Expense", "ST0016", "-", "40(1)", "ไม่ปัดเศษ"],
  ["หัก ณ ที่จ่าย", "Withholding Tax", "Auto", "nvat", "- หัก ณ ที่จ่าย งวดพิเศษ", "40(1)", "ปัดเศษ"],
  ["ประกันสังคม", "SSO", "Auto", "social_insurance", "-", "40(1)", "ปัดเศษ"],
];

function IncomeExpenseSettingsSummary() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-7">
        <h2 className="text-xl font-bold text-foreground">ตั้งค่าประเภทรายรับรายจ่าย</h2>
        <Table className="mt-5 min-w-[1050px] table-fixed text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["รายการ", "รายการ (ENG)", "รูปแบบการคำนวณ", "รหัสอ้างอิง", "นำไปคำนวณกับ", "ประเภทรายรับ รายจ่าย 40(x)", "ตั้งค่าการปัดเศษ"].map((header) => <SummaryTableHead key={header}>{header}</SummaryTableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            <SummaryGroupRow colSpan={7}>รายรับ</SummaryGroupRow>
            {INCOME_ROWS.map((row) => <SummaryDetailRow key={row[0]} row={row} />)}
            <SummaryGroupRow colSpan={7}>รายจ่าย</SummaryGroupRow>
            {EXPENSE_ROWS.map((row) => <SummaryDetailRow key={row[0]} row={row} />)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function OrganizationSettingsSummary() {
  const [activeTab, setActiveTab] = useState(SETTINGS_TABS[0]);

  return (
    <div className="-mx-6 -mt-3">
      <div className="flex h-12 items-stretch border-b border-[#61a8ff] bg-[#edf6ff] px-6">
        {SETTINGS_TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-6 text-sm font-medium transition-colors",
                active ? "text-[#61a8ff]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {active && <span className="absolute inset-x-5 bottom-0 h-0.5 bg-[#61a8ff]" />}
            </button>
          );
        })}
      </div>
      <div className="mx-6 pt-9">
        {activeTab === "ตั้งค่าทั่วไป" && <GeneralSettingsSummary />}
        {activeTab === "ตั้งค่าเวลาการทำงาน" && <WorkTimeSettingsSummary />}
        {activeTab === "ตั้งค่าประเภทการลา" && <LeaveSettingsSummary />}
        {activeTab === "ตั้งค่าประเภทรายรับรายจ่าย" && <IncomeExpenseSettingsSummary />}
      </div>
    </div>
  );
}

/* ------------------------------- Placeholder ------------------------------- */

function TabPlaceholder({ tab }: { tab: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">{tab}</p>
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          อยู่ระหว่างการพัฒนา
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------- Page ---------------------------------- */

export default function PayrollCalculationPage() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(2026, 7, 1)); // สิงหาคม 2026
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(EMPTY_DASHBOARD_STATS);

  const monthIndex = selectedMonth.getMonth();
  const year = selectedMonth.getFullYear();
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const response = await fetch(`/api/payroll/dashboard?month=${monthKey}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Dashboard request failed");
        setDashboardStats((await response.json()) as DashboardStats);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          console.error("Unable to load payroll dashboard:", error);
          setDashboardStats(EMPTY_DASHBOARD_STATS);
        }
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [monthKey]);

  const monthLabel = `${MONTHS_TH[monthIndex]} ${year}`;
  return (
    <div>
      <PageBanner
        monthLabel={monthLabel}
        monthIndex={monthIndex}
        year={year}
        monthValue={monthKey}
        onMonthChange={(month) => {
          const [selectedYear, selectedMonthIndex] = month.split("-").map(Number);
          if (selectedYear && selectedMonthIndex) setSelectedMonth(new Date(selectedYear, selectedMonthIndex - 1, 1));
        }}
      />

      <TabsBar activeTab={activeTab} onChange={setActiveTab} />

      <div
        className={cn(
          "min-h-[calc(100vh-10rem)] bg-[#eef6fd] pb-8",
          activeTab === "Dashboard" ||
          activeTab === "คำนวณเงินเดือนรายบุคคล" ||
          activeTab === "คำนวณเงินเดือนทั้งองค์กร"
            ? "p-0"
            : "px-4 pt-3 sm:px-6 lg:px-6"
        )}
      >
        {activeTab === "Dashboard" && <DashboardContent stats={dashboardStats} monthLabel={monthLabel} />}
        {activeTab === "คำนวณเงินเดือนรายบุคคล" && <PersonContent monthKey={monthKey} />}
        {activeTab === "คำนวณเงินเดือนทั้งองค์กร" && <OrganizationContent />}
        {activeTab === "ปิดงวดบัญชี" && <ClosePeriodContent />}
        {activeTab === "สรุปตั้งค่าทั้งองค์กร" && <OrganizationSettingsSummary />}
      </div>
    </div>
  );
}
