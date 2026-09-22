"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { th } from "date-fns/locale/th";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  RefreshCw,
} from "lucide-react";

import type { OrgNode } from "@/components/employee/EmployeeSelectPanel";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { ThaiYearPicker } from "@/components/ui/thai-date-picker";
import { EmployeePageHeadingCard } from "../employee-page-heading-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SUPPORT_ASSET_ORIGIN, USER_IMAGE_ORIGIN } from "@/lib/external-assets";
import { formatThaiDateNumeric, formatThaiDateTimeText, formatThaiYear, parseIsoDate, toIsoDate } from "@/lib/date/thai-date";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const TABS = [
  "ข้อมูลพื้นฐาน",
  "ข้อมูลกำหนดเอง",
  "ตั้งค่า",
  "ประวัติส่วนตัว",
  "ประวัติการปรับเงินเดือน/ปรับประเภท",
  "รายรับ/รายจ่ายคงที่",
  "รายรับ/รายจ่ายอัตโนมัติ",
  "กองทุน",
  "เงินประกันการทำงาน",
  "สวัสดิการ",
  "ภาษี",
  "การฝึกอบรม",
  "สินทรัพย์ถือครอง",
  "โรงพยาบาลตามสิทธิ",
  "ประวัติการแก้ไข",
];

const DISABLED_TABS = new Set(["ข้อมูลกำหนดเอง"]);
const NO_WRAP_TABS = new Set([
  "ประวัติการปรับเงินเดือน/ปรับประเภท",
  "รายรับ/รายจ่ายคงที่",
  "รายรับ/รายจ่ายอัตโนมัติ",
  "เงินประกันการทำงาน",
  "โรงพยาบาลตามสิทธิ",
]);

/** Measured widths from the HRMic employee-header tab strip at desktop size. */
const HEADER_TAB_WIDTHS: Partial<Record<(typeof TABS)[number], number>> = {
  "ข้อมูลพื้นฐาน": 160,
  "ตั้งค่า": 160,
  "ประวัติส่วนตัว": 160,
  "ประวัติการปรับเงินเดือน/ปรับประเภท": 255.475,
  "รายรับ/รายจ่ายคงที่": 161.5125,
  "รายรับ/รายจ่ายอัตโนมัติ": 184.375,
  "เงินประกันการทำงาน": 165.85,
  "โรงพยาบาลตามสิทธิ": 164.275,
};

function UpdateEmployeeConfirmationDialog({
  open,
  saving,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => confirmButtonRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onCancel, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-[8.75px] font-[Kanit,sans-serif]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-employee-dialog-title"
        aria-describedby="update-employee-dialog-description"
        className="flex w-[320px] flex-col justify-center rounded-[5px] bg-white p-[12.5px] text-left text-[rgba(0,0,0,0.87)]"
      >
        <div className="flex w-[295px] flex-col items-center px-[18px]">
          <div className="mb-[18.75px] mt-[12.5px] box-content flex size-[50px] items-center justify-center overflow-visible rounded-full border-[2.4px] border-[#facea8]">
            <div className="flex h-[50px] w-[56px] items-center">
              <div className="flex size-[56px] items-center justify-center rounded-[100px] bg-[#ffecd9] p-[10px]">
                <div className="flex size-[38px] items-center justify-center rounded-[100px] bg-[#ffc181] p-[10px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${SUPPORT_ASSET_ORIGIN}/assets/icons/svg/warning-line-orange.svg`}
                    alt=""
                    className="size-[18px]"
                    style={{ scale: 1.3 }}
                  />
                </div>
              </div>
            </div>
          </div>
          <h2 id="update-employee-dialog-title" className="mb-[7.5px] text-[16px] font-semibold leading-[25.144px] text-[#595959]">
            อัปเดตข้อมูล
          </h2>
        </div>
        <div className="w-[295px] px-[18px] text-center text-[12px] font-normal leading-[18.4px] text-[#545454]">
          <p id="update-employee-dialog-description">ยืนยันอัปเดตข้อมูลพนักงาน</p>
        </div>
        <div className="mt-[12.5px] flex h-[42.9px] w-[295px] items-center justify-center px-4">
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="m-[3.75px] flex h-[35.4px] w-[79px] items-center justify-center rounded-[4px] border-[0.8px] border-[#1890ff] bg-[#1890ff] px-6 py-[10px] text-[12px] font-medium leading-[13.8px] text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] disabled:cursor-not-allowed"
          >
            ยืนยัน
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="m-[3.75px] flex h-[35.4px] w-[82.75px] items-center justify-center rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-6 py-[10px] text-[12px] font-medium leading-[13.8px] text-[rgba(0,0,0,0.65)] shadow-[0_1px_2px_rgba(16,24,40,0.05)] disabled:cursor-not-allowed"
          >
            ยกเลิก
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

/* ---------------------------------- Types --------------------------------- */

export type EmployeeDetail = {
  id: string;
  employeeNumber: string;
  employeeCode: string | null;
  fingerprintCode: string | null;
  title: string | null;
  firstNameTH: string;
  lastNameTH: string;
  nickname: string | null;
  firstNameEN: string | null;
  lastNameEN: string | null;
  nicknameEN: string | null;
  gender: "male" | "female" | "other" | null;
  nationality: string | null;
  maritalStatus: string | null;
  birthDate: string | null;
  age: string | null;
  phone: string | null;
  email: string;
  citizenId: string | null;
  alienIdNumber: string | null;
  passportNo: string | null;
  workPermitNo: string | null;
  companyName: string | null;
  branchName: string | null;
  departmentName: string | null;
  positionName: string | null;
  hireDate: string | null;
  confirmationDate: string | null;
  contractEndDate: string | null;
  retirementDate: string | null;
  probationDays: number | null;
  probationDate: string | null;
  baseSalary: string | null;
  advanceType: string | null;
  advanceLimit: string | null;
  employmentType: string | null;
  paymentChannel: string | null;
  companyPayoutAccount: string | null;
  socialSecurity: {
    ssoNumber: string;
    calculationType: string | null;
    fixedAmount: string | null;
    effectiveDate: string | null;
  } | null;
  taxInformation: {
    calculationType: string | null;
    fixedAmount: string | null;
    effectiveDate: string | null;
  } | null;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    branchCode: string | null;
    accountName: string;
  } | null;
  addresses: Array<{
    type: "current" | "permanent";
    addressLine: string | null;
    postalCode: string | null;
    province: string | null;
    district: string | null;
    subdistrict: string | null;
    provinceId?: string | null;
    districtId?: string | null;
    subdistrictId?: string | null;
  }>;
  description: string | null;
  hashtag: string | null;
};

function detailPreviewFromTreeNode(employee: OrgNode): EmployeeDetail {
  return {
    id: employee.id,
    employeeNumber: employee.code,
    employeeCode: employee.code || null,
    fingerprintCode: null,
    title: null,
    firstNameTH: employee.firstNameTH ?? employee.name,
    lastNameTH: employee.lastNameTH ?? "",
    nickname: employee.nickname ?? null,
    firstNameEN: null,
    lastNameEN: null,
    nicknameEN: null,
    gender: null,
    nationality: null,
    maritalStatus: null,
    birthDate: null,
    age: null,
    phone: null,
    email: "",
    citizenId: null,
    alienIdNumber: null,
    passportNo: null,
    workPermitNo: null,
    companyName: null,
    branchName: null,
    departmentName: null,
    positionName: employee.positionName ?? null,
    hireDate: null,
    confirmationDate: null,
    contractEndDate: null,
    retirementDate: null,
    probationDays: null,
    probationDate: null,
    baseSalary: null,
    advanceType: null,
    advanceLimit: null,
    employmentType: employee.type ?? null,
    paymentChannel: null,
    companyPayoutAccount: null,
    socialSecurity: null,
    taxInformation: null,
    bankAccount: null,
    addresses: [],
    description: null,
    hashtag: employee.hashtag ?? null,
  };
}

type AddressLocation = {
  id: string;
  subdistrictId: string;
  districtId: string;
  provinceId: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string | null;
  label: string;
};

type StoredAddressLocation = Pick<
  AddressLocation,
  "province" | "district" | "subdistrict" | "postalCode" | "provinceId" | "districtId" | "subdistrictId"
>;

/* ------------------------------ Form fields ------------------------------- */

function FieldShell({
  label,
  required,
  children,
  className,
}: {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-1.5 py-[5px]", className)}>
      <label className="mb-1 block text-sm font-normal leading-5 text-[#4b5870]">
        {label}
        {required && <span className="text-[#ff0000]"> *</span>}
      </label>
      {children}
    </div>
  );
}

function TextBox({
  name,
  value,
  placeholder,
  disabled,
  className,
  onChange,
  inputMode,
  maxLength,
}: {
  name?: string;
  value?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <input
      name={name}
      type="text"
      defaultValue={value ?? ""}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
      inputMode={inputMode}
      maxLength={maxLength}
      className={cn(
        "h-8 w-full rounded-lg border border-[#dfe4e8] bg-white px-3 text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors placeholder:text-[#9aa5b5] focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20",
        disabled && "cursor-not-allowed bg-[#f5f7fa] text-[#7b8798]",
        className
      )}
    />
  );
}

function SelectBox({
  name,
  value,
  placeholder,
  className,
}: {
  name?: string;
  value?: string | null;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative w-full">
      <input
        name={name}
        type="text"
        defaultValue={value ?? ""}
        placeholder={placeholder}
        className={cn(
          "h-8 w-full rounded-lg border border-[#dfe4e8] bg-white px-3 pr-9 text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors placeholder:text-[#9aa5b5] focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20",
          className
        )}
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-[calc(50%-4px)] size-4 -translate-y-1/2 text-black/45" />
    </div>
  );
}

function DateBox({
  name,
  value,
  placeholder,
  className,
}: {
  name?: string;
  value?: string | null;
  placeholder?: string;
  className?: string;
}) {
  const initialDate = parseIsoDate(value);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(initialDate);
  const displayText = selected ? formatThaiDateNumeric(selected) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={selected ? toIsoDate(selected) : ""} />}
      <PopoverTrigger asChild>
        <button type="button" className={cn("relative flex h-8 w-full items-center justify-between rounded-lg border border-[#dfe4e8] bg-white px-3 pr-9 text-left text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20", !selected && "text-muted-foreground/60", className)}>
          <span className="truncate">{displayText || placeholder || "เลือกวันที่"}</span>
          <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={selected} onSelect={(day) => { setSelected(day); setOpen(false); }} locale={th} captionLayout="dropdown-years" />
      </PopoverContent>
    </Popover>
  );
}

function RadioRow({
  name,
  options,
  value,
  className,
}: {
  name?: string;
  options: string[];
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-x-2",
        className
      )}
    >
      {options.map((opt) => {
        const checked = opt === value;
        return (
        <label
          key={opt}
          className="inline-flex h-6 shrink-0 cursor-pointer items-center gap-[8px] text-sm font-normal leading-5 text-[#4b5870]"
        >
          <input type="radio" name={name} value={opt} defaultChecked={checked} className="sr-only" />
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-full border bg-white",
              checked ? "border-[#1474ee]" : "border-[#cbd5e1]"
            )}
          >
            {checked && <span className="size-2 rounded-full bg-[#1474ee]" />}
          </span>
          <span>{opt}</span>
        </label>
      )})}
    </div>
  );
}

function HelpLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <CircleHelp className="size-3.5 text-muted-foreground" />
    </span>
  );
}

/* --------------------------- Employee settings tab ------------------------ */

function SettingRadioGroup({
  name,
  options,
  initialValue,
}: {
  name: string;
  options: string[];
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-3 font-[Kanit,sans-serif] text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">
      {options.map((option) => {
        const checked = value === option;
        return (
          <label key={option} className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap">
            <input
              type="radio"
              name={name}
              value={option}
              checked={checked}
              onChange={() => setValue(option)}
              className="sr-only"
            />
            <span className={cn("flex size-4 items-center justify-center rounded-full border", checked ? "border-[#1890ff]" : "border-[#d9d9d9]")}>{checked && <span className="size-2 rounded-full bg-[#1890ff]" />}</span>
            <span>{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function SettingSelect({ placeholder, value, disabled, className }: { placeholder?: string; value?: string; disabled?: boolean; className?: string }) {
  return (
    <button type="button" disabled={disabled} className={cn("relative flex h-8 w-full items-center rounded border border-[#d9d9d9] bg-white px-[11px] pr-8 text-left font-[Kanit,sans-serif] text-sm leading-[22px] text-[rgba(0,0,0,0.65)] disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-black/25", className)}>
      <span className={cn("truncate", !value && "text-black/25")}>{value || placeholder}</span>
      <ChevronDown className="absolute right-2 size-4 text-black/45" />
    </button>
  );
}

function SettingsTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[#d9d9d9]">
      <table className="min-w-full border-collapse font-[Kanit,sans-serif] text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">
        <thead className="bg-[#fafafa] font-medium text-[rgba(0,0,0,0.85)]">
          <tr>{headers.map((header) => <th key={header} className="border-b border-r border-[#d9d9d9] px-3 py-2 text-center font-medium last:border-r-0">{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SettingPanel({ title, children, contentClassName }: { title: string; children: React.ReactNode; contentClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-b border-[#e5eaf2] font-[Kanit,sans-serif] last:border-b-0">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="relative flex h-12 w-full items-center bg-white py-3 pl-10 pr-4 text-left text-sm font-normal leading-[22px] text-[#34425c] transition-colors hover:bg-[#f8faff]">
        <ChevronRight className={cn("absolute left-4 size-3.5 shrink-0 text-[#738199] transition-transform", open && "rotate-90 text-[#1474ee]")} strokeWidth={2} />
        {title}
      </button>
      {open && <div className={cn("border-t border-[#edf0f5] bg-[#f8faff] p-4", contentClassName)}>{children}</div>}
    </section>
  );
}

function EmployeeSettingsContent() {
  const [saved, setSaved] = useState(false);
  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };
  const saveButton = <button type="button" onClick={save} className="mt-4 h-10 w-full rounded-lg bg-[#1474ee] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-[22px] text-white shadow-[0_4px_12px_rgba(20,116,238,.24)] transition-colors hover:bg-[#0d65d8]">{saved ? "บันทึกแล้ว" : "บันทึก"}</button>;
  const checkbox = <input type="checkbox" defaultChecked className="size-4 accent-[#1890ff]" aria-label="เปิดใช้งาน" />;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-[0_3px_12px_rgba(29,52,93,0.06)]">
      <div className="overflow-hidden bg-white">
        <SettingPanel title="ตั้งค่าทั่วไป">
          <div className="space-y-3">
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">จำนวนวันที่ทำงาน</label><SettingRadioGroup name="working-days" options={["26 วัน", "30 วัน", "ตามจริง", "ตามการตั้งค่าองค์กร"]} initialValue="30 วัน" /></div>
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">จำนวนชั่วโมงการทำงาน</label><SettingRadioGroup name="working-hours" options={["8.00 ชั่วโมง", "8.30 ชั่วโมง", "9.00 ชั่วโมง", "ตามจริง", "ตามการตั้งค่าองค์กร"]} initialValue="ตามการตั้งค่าองค์กร" /></div>
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">รอบการคำนวณเงินเดือน</label><SettingRadioGroup name="payroll-cycle" options={["เต็มเดือน", "แบ่งงวดจ่าย"]} initialValue="เต็มเดือน" /></div>
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">รอบการคำนวณงวดพิเศษ</label><SettingRadioGroup name="special-cycle" options={["ใช่", "ไม่ใช่"]} initialValue="ใช่" /></div>
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">รอบการคำนวณงวดแยกโอที</label><SettingRadioGroup name="ot-cycle" options={["ใช่", "ไม่ใช่"]} initialValue="ไม่ใช่" /></div>
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">รอบการคำนวณงวดแยกเวลาการทำงาน</label><SettingRadioGroup name="worktime-cycle" options={["ใช่", "ไม่ใช่"]} initialValue="ไม่ใช่" /></div>
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">ตั้งค่าผังบัญชี</label><div className="pl-3"><SettingSelect /></div></div>
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">อนุญาตให้หยุดวันหยุดนักขัตฤกษ์</label><SettingRadioGroup name="holiday-leave" options={["อนุญาต", "ไม่อนุญาต"]} initialValue="อนุญาต" /></div>
            <div><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">เมื่อลงเวลาส่งข้อมูลเข้ากลุ่มแชท</label><div className="pl-3"><SettingSelect placeholder="เลือกกลุ่มแชท" /></div></div>
          </div>
          {saveButton}
        </SettingPanel>

        <SettingPanel title="กำหนดผู้อนุมัติรายบุคคล">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((step) => <div key={step}><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">อนุมัติขั้น {step}</label><div className="flex gap-2"><div className="w-[250px]"><SettingSelect value="MIC_ORGANIZE" disabled={step > 1} /></div><SettingSelect placeholder="ผู้อนุมัติ" disabled={step > 1} /></div></div>)}
          </div>
          {saveButton}
          <p className="mt-2 flex items-start gap-1 text-sm text-black/65"><CircleHelp className="mt-0.5 size-4 shrink-0" />การแก้ไขผู้อนุมัติจะส่งผลต่อลำดับขั้นการอนุมัติเอกสาร รวมถึงรอบการประเมินพนักงานทดลองงานที่อ้างอิงตามสายการอนุมัติ</p>
        </SettingPanel>

        <SettingPanel title="ตั้งค่าผู้ใช้">
          <div className="flex flex-wrap items-center justify-between gap-4 p-3"><p className="text-xl text-[rgba(0,0,0,0.85)]">ชื่อผู้ใช้: <b>mic000</b></p><div className="flex flex-wrap gap-1"><button type="button" className="h-9 rounded border border-[#1890ff] px-4 text-sm text-[#1890ff]">เปลี่ยนชื่อผู้ใช้</button><button type="button" className="h-9 rounded border border-[#1890ff] px-4 text-sm text-[#1890ff]">คืนค่ารหัสผ่าน</button><button type="button" className="h-9 rounded border border-[#1890ff] px-4 text-sm text-[#1890ff]">จัดกลุ่มผู้ใช้งาน</button></div></div>
        </SettingPanel>

        <SettingPanel title="ตั้งค่ากะการทำงาน"><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">กะการทำงาน</label><SettingSelect /><SettingsTable headers={["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]}><tr>{Array.from({ length: 7 }).map((_, index) => <td key={index} className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center last:border-r-0">WC001</td>)}</tr></SettingsTable></SettingPanel>
        <SettingPanel title="ตั้งค่าการมองเห็นกะการทำงาน"><SettingsTable headers={["รหัสกะการทำงาน", "ช่วงเวลาทำงาน", "เปิดกะการทำงาน"]}><tr><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center">WC001</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center">08:30-12:00-13:00-17:00</td><td className="border-t border-[#d9d9d9] px-3 py-2 text-center">{checkbox}</td></tr><tr><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center">WC002</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center">08:30-12:00-13:00-17:00</td><td className="border-t border-[#d9d9d9] px-3 py-2 text-center">{checkbox}</td></tr></SettingsTable>{saveButton}</SettingPanel>
        <SettingPanel title="ตั้งค่าวันทำงาน-วันหยุด"><label className="mb-1 block text-sm text-[rgba(0,0,0,0.65)]">วันทำงาน - วันหยุด</label><SettingSelect /><SettingsTable headers={["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]}><tr>{["วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันทำงาน", "วันหยุดพนักงาน", "วันหยุดพนักงาน"].map((day, index) => <td key={`work-day-${index}`} className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center last:border-r-0">{day}</td>)}</tr></SettingsTable></SettingPanel>
        <SettingPanel title="ตั้งค่าการมองเห็นประเภทโอที"><SettingsTable headers={["เปิดโอทีทั้งหมด", "โอทีล่วงเวลา (x1.0)", "โอทีล่วงเวลา (x1.5)", "โอทีวันหยุด (x2.0)", "โอทีล่วงเวลาวันหยุด (x3.0)"]}><tr>{Array.from({ length: 5 }).map((_, index) => <td key={index} className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center last:border-r-0">{checkbox}</td>)}</tr></SettingsTable>{saveButton}</SettingPanel>
        <SettingPanel title="ตั้งค่าการมองเห็นประเภทการลา"><SettingsTable headers={["ลากิจพิเศษ", "ลากิจธุระส่วนตัว", "ลาป่วย", "ลาพักร้อน"]}><tr>{Array.from({ length: 4 }).map((_, index) => <td key={index} className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center last:border-r-0">{checkbox}</td>)}</tr></SettingsTable><p className="mt-2 text-sm text-black/65">หมายเหตุ: รายการนี้จะแสดงเฉพาะประเภทการลาที่เปิดใช้งานเท่านั้น และยกเว้นประเภทการลาที่มีรหัสอ้างอิง 09</p>{saveButton}</SettingPanel>
        <SettingPanel title="ตั้งค่าโควตาการลา"><SettingsTable headers={["ปี", "ลากิจพิเศษ", "ลากิจธุระส่วนตัว", "ลาป่วย", "ลาพักร้อน", "ขาดงาน"]}>{[2024, 2025, 2026].map((year) => <tr key={year}><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center">{formatThaiYear(year)}</td>{Array.from({ length: 5 }).map((_, index) => <td key={index} className="border-r border-t border-[#d9d9d9] px-3 py-1.5 text-center last:border-r-0"><input disabled={year !== 2026} type="number" min="0" className="h-8 w-full rounded border border-[#d9d9d9] px-2 disabled:bg-[#f5f5f5]" /></td>)}</tr>)}</SettingsTable>{saveButton}</SettingPanel>
        <SettingPanel title="ตั้งค่าเวลาการทำงาน"><p className="mb-3 text-base text-[rgba(0,0,0,0.85)]">ประเภทเวลาการทำงาน</p><SettingsTable headers={["ประเภทเวลาการทำงาน", "เริ่มนับเวลา (นาที)", "เวลาคำนวณ", "วิธีการคำนวณ", "นำไปคำนวณกับ", "ประเภทวันที่คำนวณ"]}>{["มาเช้า", "สาย", "พักเกิน", "พักไว", "กลับก่อน", "กลับช้า"].map((type) => <tr key={type}><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center font-medium">{type}</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center">0</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2">เริ่มคำนวณทันที</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2">1 เท่าของค่าแรง</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center">-</td><td className="border-t border-[#d9d9d9] px-3 py-2">วันทำงาน</td></tr>)}</SettingsTable><p className="mb-3 mt-5 text-base text-[rgba(0,0,0,0.85)]">ประเภทโอที</p><SettingsTable headers={["ประเภทโอที", "เริ่มนับเวลา (นาที)", "เวลาคำนวณ", "วิธีการคำนวณ", "ชั่วโมงโอทีสูงสุด", "การปัดเศษชั่วโมง"]}>{["โอทีล่วงเวลา (x1.0)", "โอทีล่วงเวลา (x1.5)", "โอทีวันหยุด (x2.0)", "โอทีล่วงเวลาวันหยุด (x3.0)"].map((type) => <tr key={type}><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center font-medium">{type}</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center">0</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2">เริ่มคำนวณทันที</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2">1 เท่าของค่าแรง</td><td className="border-r border-t border-[#d9d9d9] px-3 py-2">ตามกะการทำงาน</td><td className="border-t border-[#d9d9d9] px-3 py-2">ไม่ปัดเศษ</td></tr>)}</SettingsTable></SettingPanel>
        <SettingPanel title="ตั้งค่าใบหน้า">
          <div className="space-y-4">
            <div className="w-full max-w-[220px] rounded border border-[#d9d9d9] p-1 text-center"><div className="bg-[#fafafa] py-2 text-sm text-[rgba(0,0,0,0.65)]">กดที่รูปเพื่อเลือกใบหน้า</div><div className="flex aspect-square items-center justify-center bg-[#fafafa] text-sm text-black/45">เลือกไฟล์</div></div>
            <div className="flex items-center justify-between"><h2 className="text-xl font-normal text-[rgba(0,0,0,0.85)]">รูปที่ท่านเคยบันทึกข้อมูล</h2><span className="text-sm text-black/65">จัดเก็บรูปภาพใบหน้าได้สูงสุด 10 รูปภาพ</span></div>
          </div>
        </SettingPanel>
        <SettingPanel title="ตั้งค่าป้ายกำกับช่วงเวลา"><div className="mb-2 flex items-center justify-between gap-3"><label className="text-sm text-[rgba(0,0,0,0.65)]">ป้ายกำกับช่วงเวลา</label><button type="button" className="text-sm text-[#1890ff]">ตั้งค่าป้ายกำกับช่วงเวลา ↗</button></div><SettingSelect placeholder="เลือก ป้ายกำกับช่วงเวลา" /><SettingsTable headers={["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]}><tr>{Array.from({ length: 7 }).map((_, index) => <td key={index} className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center text-[#d9d9d9] last:border-r-0">ไม่มีข้อมูล</td>)}</tr></SettingsTable></SettingPanel>
        <SettingPanel title="Cost Allocation"><div className="p-1"><p className="text-base font-medium text-black">ตั้งค่าเริ่มต้น Cost Distribution</p><p className="mt-1 text-sm text-black/65">การตั้งค่านี้จะถูกนำไปใช้เป็นข้อมูลตั้งต้นในการสร้าง Cost Distribution ในแต่ละรอบเดือน โดยระบบจะสร้างข้อมูลการกระจาย Cost Center ตามค่าที่กำหนดไว้โดยอัตโนมัติ</p><div className="mt-4 border border-[#d9d9d9] py-5 text-center"><p className="font-medium">ยังไม่มีการตั้งค่าเริ่มต้น Cost Distribution</p><p className="mt-1 text-sm text-black/65">คุณสามารถเลือกรายการได้ที่นี่</p><button type="button" className="mt-2 text-sm font-medium text-[#008cff]">⊕ เลือกรายการ</button></div></div></SettingPanel>
        <SettingPanel title="ตั้งค่าป้ายกำกับหน้าที่ปฏิบัติงาน"><div className="mb-2 flex items-center justify-between gap-3"><label className="text-sm text-[rgba(0,0,0,0.65)]">ป้ายกำกับหน้าที่ปฏิบัติงาน</label><button type="button" className="text-sm text-[#1890ff]">ตั้งค่าป้ายกำกับหน้าที่ปฏิบัติงาน ↗</button></div><SettingSelect placeholder="เลือก ป้ายกำกับหน้าที่ปฏิบัติงาน" /><SettingsTable headers={["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]}><tr>{Array.from({ length: 7 }).map((_, index) => <td key={index} className="border-r border-t border-[#d9d9d9] px-3 py-2 text-center text-[#d9d9d9] last:border-r-0">ไม่มีข้อมูล</td>)}</tr></SettingsTable></SettingPanel>
      </div>
    </div>
  );
}

function EmptyProfileTable({ headers }: { headers: string[] }) {
  return (
    <SettingsTable headers={headers}>
      <tr>
        <td colSpan={headers.length} className="border-t border-[#d9d9d9] px-3 py-8 text-center text-sm text-black/45">
          ไม่มีข้อมูล
        </td>
      </tr>
    </SettingsTable>
  );
}

function ProfileTextInput({ placeholder, value, onChange, className }: { placeholder?: string; value?: string; onChange?: (value: string) => void; className?: string }) {
  return <input type="text" placeholder={placeholder} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className={cn("w-full rounded border border-[#d9d9d9] bg-white px-[11px] font-[Kanit,sans-serif] text-sm leading-[22px] text-[rgba(0,0,0,0.65)] outline-none focus:border-[#1890ff]", className ?? "h-8")} />;
}

function AddressLocationAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: AddressLocation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<AddressLocation[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<number | null>(null);
  const optionsId = useId();

  useEffect(() => {
    const query = value.trim();
    if (!open || !query) {
      return;
    }

    const controller = new AbortController();
    void (async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/address/locations?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const items = response.ok ? await response.json() as AddressLocation[] : [];
        if (!controller.signal.aborted) {
          setLocations(items);
          setActiveIndex(items.length ? 0 : -1);
        }
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === "AbortError") && !controller.signal.aborted) setLocations([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [open, value]);

  const selectLocation = (location: AddressLocation) => {
    onSelect(location);
    setOpen(false);
    setLocations([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && Boolean(value.trim()) && locations.length > 0}
        aria-controls={optionsId}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) window.clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && locations.length) {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % locations.length);
          } else if (event.key === "ArrowUp" && locations.length) {
            event.preventDefault();
            setActiveIndex((index) => (index <= 0 ? locations.length - 1 : index - 1));
          } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            selectLocation(locations[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-[31.6px] w-full rounded border border-[#d9d9d9] bg-white px-[11px] font-[Kanit,sans-serif] text-sm leading-[22px] text-[rgba(0,0,0,0.65)] outline-none focus:border-[#1890ff]"
      />
      {open && Boolean(value.trim()) && (loading || locations.length > 0) && (
        <div id={optionsId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded border border-[#d9d9d9] bg-white py-1 shadow-[0_3px_6px_rgba(0,0,0,0.16)]">
          {loading && <div className="px-3 py-2 text-sm text-black/45">กำลังค้นหา...</div>}
          {!loading && locations.map((location, index) => (
            <button
              key={location.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectLocation(location)}
              className={cn("block w-full px-3 py-1.5 text-left font-[Kanit,sans-serif] text-sm leading-[22px] text-black/85", index === activeIndex ? "bg-[#e6f3fe]" : "hover:bg-[#f5f5f5]")}
            >
              {location.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAddressLocation(address: EmployeeDetail["addresses"][number] | undefined) {
  if (!address) return "";
  if (!address.subdistrict || !address.district || !address.province) return address.postalCode ?? "";
  const isBangkok = address.province === "กรุงเทพมหานคร";
  const subdistrict = address.subdistrict.startsWith(isBangkok ? "แขวง" : "ตำบล")
    ? address.subdistrict
    : `${isBangkok ? "แขวง" : "ตำบล"}${address.subdistrict}`;
  const district = address.district.startsWith(isBangkok ? "เขต" : "อำเภอ")
    ? address.district
    : `${isBangkok ? "เขต" : "อำเภอ"}${address.district}`;
  const province = isBangkok || address.province.startsWith("จังหวัด")
    ? address.province
    : `จังหวัด${address.province}`;
  return [subdistrict, district, province, address.postalCode].filter(Boolean).join(" ");
}

function getStoredAddressLocation(
  address: EmployeeDetail["addresses"][number] | undefined
): StoredAddressLocation | null {
  if (!address?.subdistrict || !address.district || !address.province) return null;

  return {
    subdistrict: address.subdistrict,
    district: address.district,
    province: address.province,
    postalCode: address.postalCode,
    subdistrictId: address.subdistrictId ?? "",
    districtId: address.districtId ?? "",
    provinceId: address.provinceId ?? "",
  };
}

function PersonalHistoryContent({ employee, employeeId, onSaved }: { employee: EmployeeDetail; employeeId: string; onSaved: (employee: EmployeeDetail) => void }) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const permanent = employee.addresses.find((address) => address.type === "permanent");
  const current = employee.addresses.find((address) => address.type === "current");
  const [addressValues, setAddressValues] = useState({
    permanent: permanent?.addressLine ?? "", current: current?.addressLine ?? "",
    permanentPostal: formatAddressLocation(permanent), currentPostal: formatAddressLocation(current),
  });
  const [selectedLocations, setSelectedLocations] = useState<{ permanent: StoredAddressLocation | null; current: StoredAddressLocation | null }>({
    permanent: getStoredAddressLocation(permanent),
    current: getStoredAddressLocation(current),
  });
  const save = async () => {
    setSaveState("saving");
    try {
      if ((addressValues.permanentPostal.trim() && !selectedLocations.permanent) || (addressValues.currentPostal.trim() && !selectedLocations.current)) {
        setSaveState("error");
        return;
      }
      const addressPayload = (type: "permanent" | "current", addressLine: string, location: StoredAddressLocation | null) => {
        return {
        type,
        addressLine,
        postalCode: location?.postalCode ?? null,
        province: location?.province || null,
        district: location?.district || null,
        subdistrict: location?.subdistrict || null,
        provinceId: location?.provinceId || null,
        districtId: location?.districtId || null,
        subdistrictId: location?.subdistrictId || null,
        };
      };
      const response = await fetch(`/api/employee/${employeeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresses: [
        addressPayload("permanent", addressValues.permanent, selectedLocations.permanent),
        addressPayload("current", addressValues.current, selectedLocations.current),
      ] }) });
      if (!response.ok) throw new Error("save failed");
      onSaved((await response.json()) as EmployeeDetail);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  };
  const addButton = <button type="button" className="mt-2 h-8 w-full rounded bg-[#1890ff] px-4 font-[Kanit,sans-serif] text-sm font-normal text-white hover:bg-[#40a9ff]">เพิ่ม</button>;
  const profileTablePanels = [
    { title: "ครอบครัว", headers: ["ความสัมพันธ์", "เลขประจำตัวประชาชน / ผู้เสียภาษี", "คำนำหน้าชื่อ", "ชื่อ", "นามสกุล", "วันเกิด", "เบอร์โทรศัพท์", "อีเมล", "ที่อยู่", ""] },
    { title: "ประวัติการทำงาน", headers: ["ตั้งแต่วันที่", "จนถึงวันที่", "ตำแหน่ง", "บริษัท", "สาเหตุที่ออก", ""] },
    { title: "ประวัติการศึกษา", headers: ["ปีการศึกษา", "ระดับการศึกษา", "สถานศึกษา", "สาขาวิชา", "เกรดเฉลี่ย", ""] },
    { title: "ความสามารถทางภาษา", headers: ["ความสามารถทางภาษา", "เขียน", "พูด", "อ่าน", ""] },
    { title: "ความสามารถทางด้านพิมพ์ดีด", headers: ["ภาษา", "คำ/นาที", ""] },
    { title: "ความสามารถพิเศษ", headers: ["ความสามารถพิเศษ", ""] },
    { title: "การขับยานพาหนะ และมีใบอนุญาตขับขี่", headers: ["รายการ", "ได้/ไม่ได้", "ใบอนุญาตเลขที่", ""] },
  ];

  return (
    <div className="bg-white pb-4 font-[Kanit,sans-serif]">
      <div className="w-[calc(100%+0.2px)] overflow-hidden rounded-[2px] border-x border-t border-b-0 border-[#d9d9d9] bg-[#fafafa]">
        <SettingPanel title="ที่อยู่" contentClassName="!p-2">
          <section>
            <div className="mb-[16.95px] mt-[15.05px] flex h-[25.144px] items-center text-base font-medium leading-[25.144px] text-[rgba(0,0,0,0.85)]"><span className="h-[0.8px] w-[4.25%] bg-black" /><span className="whitespace-nowrap px-4 tracking-[-0.1px]">ที่อยู่ตามบัตรประชาชน</span><span className="h-[0.8px] flex-1 bg-black" /></div>
            <div>
              <div className="p-1"><label className="block text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">ประเทศ</label><SettingSelect value="Thailand" /></div>
              <div className="p-1"><label className="block text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">ที่อยู่</label><ProfileTextInput className="h-[31.6px]" value={addressValues.permanent} onChange={(value) => setAddressValues((current) => ({ ...current, permanent: value }))} /></div>
              <div className="min-h-[62px] p-1"><label className="block text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">ระบุรหัสไปรษณีย์ หรือ ตำบล / แขวง</label><AddressLocationAutocomplete value={addressValues.permanentPostal} onChange={(value) => { setAddressValues((current) => ({ ...current, permanentPostal: value })); setSelectedLocations((current) => ({ ...current, permanent: null })); }} onSelect={(location) => { setAddressValues((current) => ({ ...current, permanentPostal: location.label })); setSelectedLocations((current) => ({ ...current, permanent: location })); }} /></div>
            </div>
          </section>
          <section>
            <div className="mb-[16.95px] mt-[15.05px] flex h-[25.144px] items-center text-base font-medium leading-[25.144px] text-[rgba(0,0,0,0.85)]"><span className="h-[0.8px] w-[4.25%] bg-black" /><span className="whitespace-nowrap px-4 tracking-[-0.1px]">ที่อยู่ปัจจุบัน</span><span className="h-[0.8px] flex-1 bg-black" /></div>
            <div>
              <div className="p-1"><label className="block text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">ประเทศ</label><SettingSelect value="Thailand" /></div>
              <div className="p-1"><label className="block text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">ที่อยู่</label><ProfileTextInput className="h-[31.6px]" value={addressValues.current} onChange={(value) => setAddressValues((current) => ({ ...current, current: value }))} /></div>
              <div className="min-h-[62px] p-1"><label className="block text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">ระบุรหัสไปรษณีย์ หรือ ตำบล / แขวง</label><AddressLocationAutocomplete value={addressValues.currentPostal} onChange={(value) => { setAddressValues((current) => ({ ...current, currentPostal: value })); setSelectedLocations((current) => ({ ...current, current: null })); }} onSelect={(location) => { setAddressValues((current) => ({ ...current, currentPostal: location.label })); setSelectedLocations((current) => ({ ...current, current: location })); }} /></div>
            </div>
            <div><label className="block text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">&nbsp;</label><button type="button" onClick={() => { setAddressValues((current) => ({ ...current, current: current.permanent, currentPostal: current.permanentPostal })); setSelectedLocations((current) => ({ ...current, current: current.permanent })); }} className="h-9 w-full rounded bg-[#039be5] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#0288d1]">ใช้ที่อยู่ตามบัตรประชาชน</button></div>
          </section>
          <div className="mt-2"><button type="button" onClick={save} disabled={saveState === "saving"} className="h-9 w-full rounded bg-[#03ae03] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#029b02] disabled:cursor-not-allowed disabled:opacity-70">{saveState === "saving" ? "กำลังบันทึก..." : saveState === "saved" ? "บันทึกแล้ว" : saveState === "error" ? "บันทึกไม่สำเร็จ" : "บันทึก"}</button></div>
        </SettingPanel>
        {profileTablePanels.map((panel) => (
          <SettingPanel key={panel.title} title={panel.title}>
            <div className="m-1 overflow-x-auto"><div className="min-w-[700px]"><EmptyProfileTable headers={panel.headers} /></div></div>
            {addButton}
          </SettingPanel>
        ))}
        <SettingPanel title="เอกสาร">
          <div className="grid gap-2 md:grid-cols-4">
            <div><label className="mb-1 block text-sm text-black/65">ประเภทเอกสาร</label><SettingSelect /></div>
            <div><label className="mb-1 block text-sm text-black/65">ชื่อเอกสาร</label><ProfileTextInput /></div>
            <div><label className="mb-1 block text-sm text-black/65">วันหมดอายุ</label><ProfileTextInput placeholder="เลือกวันที่" /></div>
            <div className="flex items-end gap-2"><button type="button" className="h-9 rounded bg-[#f5f5f5] px-4 text-sm text-black/85 shadow-sm">เลือกไฟล์</button><span className="pb-2 text-sm text-black/65">ยังไม่ได้เลือกไฟล์</span></div>
          </div>
          <button type="button" disabled className="mt-3 h-9 rounded bg-[#1890ff]/40 px-4 text-sm text-white">เพิ่ม</button>
          <div className="mt-3 max-h-[400px] overflow-y-auto"><EmptyProfileTable headers={["ลำดับ", "ประเภทเอกสาร", "ชื่อเอกสาร", "วันหมดอายุ", ""]} /></div>
        </SettingPanel>
      </div>
    </div>
  );
}

function SalaryAdjustmentHistoryContent() {
  const [adjustmentType, setAdjustmentType] = useState("all");
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("");
  const [, setSearched] = useState(false);
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];

  const exportExcel = () => {
    const rows = [["ประเภทการปรับ", "ปี", "เดือน"]];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ประวัติการปรับเงินเดือน-ปรับประเภท.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-18rem)] bg-transparent p-4 font-[Kanit,sans-serif] sm:p-6 lg:p-8">
      <section className="card-input-container mb-3 min-w-0 w-full overflow-hidden rounded-lg bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
        <header className="card-input-header p-3 text-[22px] font-normal leading-[34.573px] text-[rgba(0,0,0,0.87)]">ค้นหา</header>
        <div className="card-input-body px-2 py-4">
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">
              ประเภทการปรับ
              <span className="relative block">
                <select value={adjustmentType} onChange={(event) => setAdjustmentType(event.target.value)} className="h-8 w-full appearance-none rounded border border-[#d9d9d9] bg-white px-[11px] pr-9 text-sm leading-[22px] text-[rgba(0,0,0,0.65)] outline-none focus:border-[#1890ff]">
                  <option value="all">ทั้งหมด</option>
                  <option value="salary">ปรับเงินเดือน</option>
                  <option value="employee-type">ปรับประเภทพนักงาน</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[rgba(0,0,0,0.25)]" />
              </span>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">
              ปี
              <span className="relative block">
                <ThaiYearPicker value={year} onChange={(value) => { setYear(value); setMonth(""); }} className="h-[31.6px] w-full rounded border border-[#d9d9d9] bg-white px-[11px] py-1 pr-9 text-sm leading-[22px] text-[rgba(0,0,0,0.65)] outline-none focus:border-[#1890ff]" />
              </span>
            </label>
            <label className="flex min-w-0 flex-1 flex-col text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">
              เดือน
              <span className="relative block">
                <select value={month} disabled={adjustmentType === "all"} onChange={(event) => setMonth(event.target.value)} className="h-[31.6px] w-full appearance-none rounded border border-[#d9d9d9] bg-white px-[11px] py-1 pr-9 text-sm leading-[22px] text-[rgba(0,0,0,0.65)] outline-none placeholder:text-[#bfbfbf] focus:border-[#1890ff] disabled:cursor-not-allowed disabled:bg-[#f5f5f5]">
                  <option value="">เดือน</option>
                  {months.map((monthName, index) => <option key={monthName} value={String(index + 1)}>{monthName}</option>)}
                </select>
                <svg aria-hidden="true" viewBox="64 64 896 896" className="pointer-events-none absolute right-[11px] top-1/2 size-3.5 -translate-y-1/2 fill-current text-black/45"><path d="M880 184H712v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H384v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H144c-17.7 0-32 14.3-32 32v664c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V216c0-17.7-14.3-32-32-32zm-40 656H184V460h656v380zM184 392V256h128v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h256v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h128v136H184z" /></svg>
              </span>
            </label>
          </div>
        </div>
        <footer className="card-input-footer flex flex-wrap items-end justify-end gap-2 p-3">
          <button type="button" onClick={exportExcel} className="inline-flex h-[36.65px] w-[90.175px] items-center justify-center gap-2 rounded bg-[#4caf50] px-4 text-sm font-semibold leading-9 text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] hover:bg-[#43a047]">Excel <span className="text-[18px] leading-none">▦</span></button>
          <button type="button" onClick={() => setSearched(true)} className="h-9 w-[64.55px] rounded bg-[#2299ff] px-4 text-sm font-semibold leading-9 text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] hover:bg-[#1e88e5]">ค้นหา</button>
        </footer>
      </section>

      <section className="card-input-container mb-3 min-w-0 w-full rounded-lg bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]" />
    </div>
  );
}

const FIXED_INCOME_EXPENSE_ROWS = [
  { type: "รายรับ", item: "โบนัส", amount: "", startDate: "", endDate: "" },
  { type: "รายรับ", item: "ค่าเดินทาง/ ค่าน้ำมัน", amount: "5,000", startDate: "", endDate: "" },
  { type: "รายรับ", item: "เงินรับอื่นๆ", amount: "", startDate: "", endDate: "" },
  { type: "รายรับ", item: "ค่าโทรศัพท์", amount: "", startDate: "", endDate: "" },
  { type: "รายรับ", item: "ค่าเบี้ยเลี้ยง", amount: "", startDate: "", endDate: "" },
  { type: "รายรับ", item: "ค่าตอบแทนจากยอดขาย", amount: "", startDate: "", endDate: "" },
  { type: "รายรับ", item: "ค่าบำรุงรักษารถ", amount: "", startDate: "", endDate: "" },
  { type: "รายรับ", item: "ปรับเงินรับอื่นๆ", amount: "", startDate: "", endDate: "" },
];

function FixedIncomeExpenseContent() {
  return (
    <div className="min-h-[calc(100vh-18rem)] bg-white font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] table-auto border-collapse border border-[#f0f0f0]">
          <colgroup>
            <col className="w-1/5" />
            <col className="w-1/5" />
            <col className="w-1/5" />
            <col className="w-1/5" />
            <col className="w-1/5" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-[#61a8ff] text-center">
              {['ประเภท', 'รายการ', 'มูลค่า', 'วันที่เริ่ม', 'วันที่สิ้นสุด', ''].map((heading) => (
                <th key={heading || 'actions'} className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIXED_INCOME_EXPENSE_ROWS.map((row, index) => {
              const rowBackground = index % 2 === 0 ? "bg-white" : "bg-[#f2fafe]";
              return (
              <tr key={row.item} className={rowBackground}>
                <td className={`border border-[#f0f0f0] p-2 text-center leading-[22px] ${rowBackground}`}>{row.type}</td>
                <td className={`border border-[#f0f0f0] p-2 text-left leading-[22px] ${rowBackground}`}>{row.item}</td>
                <td className={`border border-[#f0f0f0] p-2 text-right leading-[22px] ${rowBackground}`}>{row.amount}</td>
                <td className={`border border-[#f0f0f0] p-2 text-center leading-[22px] ${rowBackground}`}>{row.startDate}</td>
                <td className={`border border-[#f0f0f0] p-2 text-center leading-[22px] ${rowBackground}`}>{row.endDate}</td>
                <td className={`border border-[#f0f0f0] p-2 text-center leading-[22px] ${rowBackground}`}>
                  <button type="button" className="m-0.5 inline-flex size-8 items-center justify-center rounded-full bg-[#a1ded7] text-white transition-all duration-[250ms] hover:border hover:border-[#a1ded7] hover:bg-white hover:text-[#a1ded7]" aria-label={`แก้ไข ${row.item}`}>
                    <svg viewBox="0 0 488.471 488.471" className="size-[14px] fill-current" aria-hidden="true">
                      <path d="m483.999 111.318-106.847-106.846c-5.962-5.962-15.621-5.962-21.584 0l-351.066 351.067c-2.862 2.862-4.472 6.738-4.472 10.792l-.03 106.876c0 4.04 1.61 7.93 4.472 10.792s6.752 4.472 10.792 4.472l106.876-.03c4.054 0 7.93-1.61 10.792-4.472l351.067-351.067c5.962-5.962 5.962-15.621 0-21.584zm-368.203 346.622-85.298.03.03-85.298 251.868-251.868 85.268 85.268c-.001 0-251.868 251.868-251.868 251.868zm273.453-273.453-85.268-85.267 62.371-62.371 85.268 85.268z" />
                    </svg>
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const AUTOMATIC_INCOME_EXPENSE_ROWS = [
  { type: "รายจ่าย", item: "ประกันสังคม" },
  { type: "รายจ่าย", item: "ภาษี" },
  { type: "รายจ่าย", item: "สาย" },
];

function AutomaticIncomeExpenseContent() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleItem = (item: string) => {
    setSelectedItems((items) => items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);
  };

  return (
    <div className="min-h-[calc(100vh-18rem)] bg-white font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <div className="w-[calc(100%-15.2px)]">
        <div className="w-full overflow-x-auto">
          <table className="w-[700px] min-w-full table-fixed border-collapse border border-[#f0f0f0]">
          <colgroup>
            <col className="w-[200px] min-w-[200px]" />
            <col className="w-[400px] min-w-[400px]" />
            <col className="w-[100px] min-w-[100px]" />
          </colgroup>
          <thead>
            <tr className="bg-[#61a8ff] text-center">
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">ประเภท</th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">รายการ</th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white" />
            </tr>
          </thead>
          <tbody>
            {AUTOMATIC_INCOME_EXPENSE_ROWS.map((row, index) => {
              const rowBackground = index % 2 === 0 ? "bg-white" : "bg-[#f2fafe]";
              const checked = selectedItems.includes(row.item);
              return (
                <tr key={row.item} className={rowBackground}>
                  <td className={`border border-[#f0f0f0] p-2 text-center leading-[22px] ${rowBackground}`}>{row.type}</td>
                  <td className={`border border-[#f0f0f0] p-2 text-left leading-[22px] ${rowBackground}`}>{row.item}</td>
                  <td className={`border border-[#f0f0f0] p-2 text-center leading-[22px] ${rowBackground}`}>
                    <label className="inline-flex size-4 cursor-pointer items-center justify-center">
                      <input type="checkbox" checked={checked} onChange={() => toggleItem(row.item)} className="sr-only" aria-label={`เลือก ${row.item}`} />
                      <span className={`relative block size-4 rounded-[2px] border transition-colors ${checked ? "border-[#1890ff] bg-[#1890ff]" : "border-[#d9d9d9] bg-white"}`}>
                        {checked && <span className="absolute left-[22%] top-1/2 block h-[9.14px] w-[5.71px] -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-white" />}
                      </span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
        <div className="mt-3 w-full">
          <button type="button" className="h-9 w-full rounded bg-[#039be5] px-4 text-sm font-semibold leading-9 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] hover:bg-[#0288d1]">
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

const FUND_ROWS = [
  { code: "provident", name: "กองทุนสำรองเลี้ยงชีพ" },
  { code: "provident3", name: "กองทุนสำรองเลี้ยงชีพ 3" },
];

const FUND_COLUMNS = [
  { key: "name", title: "ชื่อกองทุน", width: 180, align: "left" },
  { key: "number", title: "เลขที่กองทุน", width: 150, align: "left" },
  { key: "date", title: "วันที่สัญญากองทุน", width: 120, align: "center" },
  { key: "deductionMethod", title: "วิธีการหักเงิน", width: 120, align: "left" },
  { key: "deductionRate", title: "เรทกองทุน", width: 100, align: "right" },
  { key: "contributionMethod", title: "วิธีการสมทบ", width: 120, align: "left" },
  { key: "contributionRate", title: "บริษัทสมทบ", width: 100, align: "right" },
  { key: "employeeBalance", title: "ยอดสะสม", width: 100, align: "right" },
  { key: "companyBalance", title: "ยอดสะสมบริษัทสมทบ", width: 100, align: "right" },
  { key: "beneficiary", title: "ผู้ได้รับผลประโยชน์", width: 180, align: "left" },
  { key: "remark", title: "หมายเหตุ", width: 180, align: "left" },
  { key: "actions", title: "", width: 160, align: "center" },
] as const;

function FundContent() {
  return (
    <div className="min-h-[calc(100vh-18rem)] bg-white font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <div className="w-[calc(100%-15.2px)] overflow-x-scroll rounded-[2px]">
        <table className="w-[1590px] min-w-full table-fixed border-collapse border border-[#f0f0f0]">
          <colgroup>
            {FUND_COLUMNS.map((column) => <col key={column.key} style={{ width: column.width, minWidth: column.width }} />)}
          </colgroup>
          <thead>
            <tr className="bg-[#61a8ff] text-center">
              {FUND_COLUMNS.map((column) => (
                <th key={column.key} className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FUND_ROWS.map((fund, index) => {
              const rowBackground = index % 2 === 0 ? "bg-white" : "bg-[#f2fafe]";
              const cellClass = (align: "left" | "center" | "right") => `border border-[#f0f0f0] p-2 leading-[22px] ${rowBackground} ${align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"}`;
              return (
                <tr key={fund.code} className={rowBackground}>
                  <td className={cellClass("left")}><span>{fund.code}</span><br /><span>{fund.name}</span></td>
                  {FUND_COLUMNS.slice(1, -1).map((column) => <td key={column.key} className={cellClass(column.align)} />)}
                  <td className={cellClass("center")}>
                    <button type="button" className="m-0.5 inline-flex size-8 items-center justify-center rounded-full bg-[#a1ded7] text-white transition-all duration-[250ms] hover:border hover:border-[#a1ded7] hover:bg-white hover:text-[#a1ded7]" aria-label={`แก้ไข ${fund.name}`}>
                      <svg viewBox="0 0 488.471 488.471" className="size-[14px] fill-current" aria-hidden="true">
                        <path d="m483.999 111.318-106.847-106.846c-5.962-5.962-15.621-5.962-21.584 0l-351.066 351.067c-2.862 2.862-4.472 6.738-4.472 10.792l-.03 106.876c0 4.04 1.61 7.93 4.472 10.792s6.752 4.472 10.792 4.472l106.876-.03c4.054 0 7.93-1.61 10.792-4.472l351.067-351.067c5.962-5.962 5.962-15.621 0-21.584zm-368.203 346.622-85.298.03.03-85.298 251.868-251.868 85.268 85.268c-.001 0-251.868 251.868-251.868 251.868zm273.453-273.453-85.268-85.267 62.371-62.371 85.268 85.268z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TRAINING_COLUMNS = [
  { label: "วันที่", width: "15%" },
  { label: "ชื่อคอร์ส", width: "10%" },
  { label: "ค่าอบรม", width: "7%" },
  { label: "ชั่วโมง", width: "7%" },
  { label: "วิทยากร", width: "15%" },
  { label: "สถานที่", width: "15%" },
  { label: "รูปแบบการฝึกอบรม", width: "10%" },
  { label: "แจ้งกรมพัฒนาฝีมือแรงงาน", width: "15%" },
  { label: "ประเภท", width: "7%" },
  { label: "", width: "10%" },
] as const;

function TrainingContent() {
  return (
    <div className="flex flex-col bg-white font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <div className="flex flex-1 flex-col">
        <div className="w-full overflow-x-auto rounded-[2px]">
          <table className="w-full table-auto border-separate border-spacing-0 border border-[#f0f0f0]">
          <colgroup>
            {TRAINING_COLUMNS.map((column, index) => (
              <col key={`${column.label}-${index}`} style={{ width: column.width, minWidth: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-[#61a8ff] text-center">
              {TRAINING_COLUMNS.map((column, index) => (
                <th
                  key={`${column.label}-${index}`}
                  className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={TRAINING_COLUMNS.length} className="border border-[#f0f0f0] p-4 text-center">
                <div className="my-8 flex flex-col items-center text-[rgba(0,0,0,0.25)]">
                  <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                      <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                      <g fillRule="nonzero" fill="#fafafa" stroke="#d9d9d9">
                        <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                        <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                      </g>
                    </g>
                  </svg>
                  <p className="mb-0 mt-2 leading-[22px]">ไม่มีข้อมูล</p>
                </div>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
        <div className="m-4 flex flex-1 flex-col">
          <button type="button" className="h-8 rounded-[2px] border border-[#1890ff] bg-[#1890ff] px-[15px] py-1 text-sm font-normal leading-[22px] text-white shadow-[0_2px_0_rgba(0,0,0,0.043)] hover:border-[#40a9ff] hover:bg-[#40a9ff]">
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  );
}

const POSSESSION_COLUMNS: ReadonlyArray<{ label: string; width?: number }> = [
  { label: "วันที่", width: 150 },
  { label: "รายการ" },
  { label: "มูลค่า" },
  { label: "", width: 100 },
];

function PossessionContent() {
  return (
    <div className="flex flex-col bg-white font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <div className="flex flex-1 flex-col">
        <div className="w-full overflow-x-auto rounded-[2px]">
          <table className="w-full table-auto border-separate border-spacing-0 border border-[#f0f0f0]">
            <colgroup>
              {POSSESSION_COLUMNS.map((column, index) => (
                <col key={`${column.label}-${index}`} style={column.width ? { width: column.width, minWidth: column.width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-[#61a8ff] text-center">
                {POSSESSION_COLUMNS.map((column, index) => (
                  <th key={`${column.label}-${index}`} className="border-b border-r border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white last:border-r-0">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={POSSESSION_COLUMNS.length} className="p-4 text-center">
                  <div className="my-8 flex flex-col items-center text-[rgba(0,0,0,0.25)]">
                    <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                        <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                        <g fillRule="nonzero" fill="#fafafa" stroke="#d9d9d9">
                          <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                          <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                        </g>
                      </g>
                    </svg>
                    <p className="mb-0 mt-2 leading-[22px]">ไม่มีข้อมูล</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="m-4 flex flex-1 flex-col">
          <button type="button" className="h-8 rounded-[2px] border border-[#1890ff] bg-[#1890ff] px-[15px] py-1 text-sm font-normal leading-[22px] text-white shadow-[0_2px_0_rgba(0,0,0,0.043)] hover:border-[#40a9ff] hover:bg-[#40a9ff]">
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  );
}

const HOSPITAL_COLUMNS = [
  { label: "สิทธิ", width: 250 },
  { label: "โรงพยาบาลตามสิทธิ", width: 737 },
  { label: "", width: 100 },
] as const;

function HospitalContent() {
  return (
    <div className="flex flex-col bg-white font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <div className="flex flex-1 flex-col">
        <div className="w-full overflow-hidden rounded-[2px] border border-[#f0f0f0]">
          <div className="overflow-x-hidden overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-[600px] min-w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                {HOSPITAL_COLUMNS.map((column, index) => <col key={`${column.label}-${index}`} style={{ width: column.width, minWidth: column.width }} />)}
              </colgroup>
              <thead>
                <tr className="bg-[#61a8ff] text-center">
                  {HOSPITAL_COLUMNS.map((column, index) => (
                    <th key={`${column.label}-${index}`} className="border-b border-r border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white last:border-r-0">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
          <div className="max-h-[60vh] overflow-scroll">
            <table className="w-[600px] min-w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                {HOSPITAL_COLUMNS.map((column, index) => <col key={`${column.label}-${index}`} style={{ width: column.width, minWidth: column.width }} />)}
              </colgroup>
              <tbody>
                <tr>
                  <td colSpan={HOSPITAL_COLUMNS.length} className="border-b border-r border-[#f0f0f0] p-4 text-center">
                    <div className="sticky left-0 my-8 flex flex-col items-center overflow-hidden text-[rgba(0,0,0,0.25)]">
                      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                          <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                          <g fillRule="nonzero" fill="#fafafa" stroke="#d9d9d9">
                            <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                          </g>
                        </g>
                      </svg>
                      <p className="mb-0 mt-2 leading-[22px]">ไม่มีข้อมูล</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="m-4 flex flex-1 flex-col">
          <button type="button" className="h-8 rounded-[2px] border border-[#1890ff] bg-[#1890ff] px-[15px] py-1 text-sm font-normal leading-[22px] text-white shadow-[0_2px_0_rgba(0,0,0,0.043)] hover:border-[#40a9ff] hover:bg-[#40a9ff]">
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  );
}

const EDIT_HISTORY_COLUMNS = [
  { label: "ลำดับ", width: 80, align: "center" },
  { label: "แก้ไขของ", width: 150, align: "left" },
  { label: "แก้ไขโดย", width: 150, align: "left" },
  { label: "วันที่แก้ไข", width: 150, align: "center" },
  { label: "หมายเหตุ", width: 200, align: "left" },
] as const;

type EditHistoryRow = {
  date: string;
  note: readonly string[];
  editor?: string;
};

const EDIT_HISTORY_ROWS: readonly EditHistoryRow[] = [
  { date: "26/08/2569 22:08:22", note: ["แก้ไขข้อมูลพนักงาน (Manual)", 'Email เปลี่ยนจาก "cadirek@gmail.com" เป็น "micorganize@gmail.com"'] },
  { date: "24/08/2569 17:44:42", note: ['แก้ไขรายรับรายจ่ายคงที่ "ค่าตอบแทนจากยอดขาย" มูลค่า  บาท'] },
  { date: "03/08/2569 12:49:31", note: ["แก้ไขข้อมูลพนักงาน (Manual)", ' เปลี่ยนจาก "235/15 หมู่บ้าน ปรีชาราม 2 ถนน ราษฎร์พัฒนา" เป็น "47 ถ.เลียบคลองภาษีเจริญฝั่งใต้"', 'รหัสไปรษณีย์ เปลี่ยนจาก "10240" เป็น "10160"', ' เปลี่ยนจาก "235/15 หมู่บ้าน ปรีชาราม 2 ถนน ราษฎร์พัฒนา" เป็น "47 ถ.เลียบคลองภาษีเจริญฝั่งใต้"', 'อำเภอ/เขต เปลี่ยนจาก "เขตสะพานสูง" เป็น "เขตหนองแขม"', 'ตำบล/แขวง เปลี่ยนจาก "แขวงราษฎร์พัฒนา" เป็น "แขวงหนองแขม"', 'เลขไปรษณีย์ เปลี่ยนจาก "10240" เป็น "10160"'] },
  { date: "03/08/2569 12:46:09", note: ["แก้ไขข้อมูลพนักงาน (Manual)"], editor: "อดิเรก ฉ่ำชื่น" },
  { date: "29/05/2569 09:30:18", note: ["แก้ไขข้อมูลพนักงาน (Manual)", 'ประกันสังคม เปลี่ยนจาก "คิดตามฐานเงินเดือนจริงที่ได้รับ" เป็น "ไม่คิดประกันสังคม"'] },
  { date: "29/04/2569 18:59:16", note: ["แก้ไขข้อมูลพนักงาน (Multiple)"] },
  { date: "06/04/2569 04:17:17", note: ["แก้ไขข้อมูลพนักงาน (Manual)"] },
  { date: "27/03/2569 13:21:20", note: ['แก้ไขรายรับรายจ่ายคงที่ "ค่าเดินทาง/ ค่าน้ำมัน" มูลค่า 5000 บาท'] },
  { date: "27/03/2569 13:21:11", note: ['แก้ไขรายรับรายจ่ายคงที่ "ค่าบำรุงรักษารถ" มูลค่า  บาท'] },
  { date: "27/03/2569 13:20:20", note: ['แก้ไขรายรับรายจ่ายคงที่ "ค่าบำรุงรักษารถ" มูลค่า 5000 บาท'] },
  { date: "27/02/2569 19:15:14", note: ["แก้ไขข้อมูลพนักงาน (Manual)"] },
  { date: "27/02/2569 18:57:09", note: ['แก้ไขรายรับรายจ่ายคงที่ "ค่าเดินทาง/ ค่าน้ำมัน" มูลค่า 0 บาท'] },
  { date: "27/02/2569 18:56:16", note: ["แก้ไขข้อมูลพนักงาน (Manual)"] },
  { date: "27/02/2569 16:06:25", note: ['แก้ไขรายรับรายจ่ายคงที่ "ค่าเดินทาง/ ค่าน้ำมัน" มูลค่า 5000 บาท'] },
  { date: "27/02/2569 16:00:27", note: ["แก้ไขข้อมูลพนักงาน (Manual)"] },
  { date: "27/02/2569 15:57:35", note: ["แก้ไขข้อมูลพนักงาน (Manual)", 'เลขที่บัญชีธนาคาร เปลี่ยนจาก "" เป็น "0692223501"'] },
] as const;

function EditHistoryContent() {
  return (
    <div className="m-6 flex flex-row font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <div className="min-w-0 flex flex-1 flex-col">
        <div data-testid="org-employee-data-edit-table" className="w-full overflow-hidden rounded-t-[2px] border-l border-t border-[#f0f0f0]">
          <div className="overflow-x-hidden overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-[730px] min-w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                {EDIT_HISTORY_COLUMNS.map((column) => <col key={column.label} style={{ width: column.width, minWidth: column.width }} />)}
              </colgroup>
              <thead>
                <tr className="bg-[#61a8ff] text-white">
                  {EDIT_HISTORY_COLUMNS.map((column) => (
                    <th key={column.label} className="border-b border-r border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px]">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
          <div className="max-h-[60vh] overflow-scroll">
            <table className="w-[730px] min-w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                {EDIT_HISTORY_COLUMNS.map((column) => <col key={column.label} style={{ width: column.width, minWidth: column.width }} />)}
              </colgroup>
              <tbody>
                {EDIT_HISTORY_ROWS.map((row, index) => (
                  <tr key={`${row.date}-${index}`}>
                    <td className="border-b border-r border-[#f0f0f0] p-4 text-center leading-[22px]">{index + 1}</td>
                    <td className="border-b border-r border-[#f0f0f0] p-4 text-left leading-[22px]">อดิเรก ฉ่ำชื่น</td>
                    <td className="border-b border-r border-[#f0f0f0] p-4 text-left leading-[22px]">{row.editor ?? "Adirek Chumchuen"}</td>
                    <td className="border-b border-r border-[#f0f0f0] p-4 text-center leading-[22px]">{formatThaiDateTimeText(row.date)}</td>
                    <td className="border-b border-r border-[#f0f0f0] p-4 text-left leading-[22px]">
                      <p className="m-0 p-0">
                        {row.note.map((line, lineIndex) => (
                          <span key={`${line}-${lineIndex}`}>{lineIndex > 0 && <br />}{line}</span>
                        ))}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkInsuranceContent() {
  return (
    <div className="min-h-[calc(100vh-18rem)] bg-white font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <table className="w-[calc(100%-15.2px)] table-auto border-collapse border border-[#f0f0f0]">
        <colgroup>
          <col className="w-[10%] min-w-[10%]" />
          <col />
          <col className="w-[30%] min-w-[30%]" />
        </colgroup>
        <thead>
          <tr className="bg-[#61a8ff] text-center">
            {['ลำดับ', 'เดือน', 'ช่องทาง', 'มูลค่า', ''].map((heading) => (
              <th key={heading || 'actions'} className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5} className="border border-[#f0f0f0] p-2 text-center">
              <div className="my-8 flex flex-col items-center text-[rgba(0,0,0,0.25)]">
                <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                    <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                    <g fillRule="nonzero" fill="#fafafa" stroke="#d9d9d9">
                      <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                      <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill="#fafafa" />
                    </g>
                  </g>
                </svg>
                <p className="m-0 leading-[22px]">ไม่มีข้อมูล</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="m-4 w-[calc(100%-47.2px)]">
        <button type="button" className="h-8 w-full rounded-[2px] border border-[#1890ff] bg-[#1890ff] px-[15px] py-1 text-sm font-normal leading-[22px] text-white shadow-[0_2px_0_rgba(0,0,0,0.043)] hover:border-[#40a9ff] hover:bg-[#40a9ff]">เพิ่ม</button>
      </div>
    </div>
  );
}

function WelfareContent() {
  const [year, setYear] = useState("");

  return (
    <div className="min-h-[calc(100vh-18rem)] w-[calc(100%-15.2px)] bg-white p-4 px-6 font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <div className="flex items-center">
        <p className="my-auto mx-2.5 text-sm leading-[22px] text-[rgba(0,0,0,0.87)]">ปี</p>
        <span className="inline-flex h-[31.6px] w-[132px] items-center rounded border border-[#d9d9d9] bg-white px-[11px] py-1 focus-within:border-[#1890ff]">
          <input value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="เลือกวันที่" inputMode="numeric" size={12} className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm leading-[22px] text-[rgba(0,0,0,0.65)] outline-none placeholder:text-[#bfbfbf]" />
          <span className="ml-1 inline-flex size-[14px] shrink-0 text-[rgba(0,0,0,0.45)]" aria-hidden="true">
            <svg viewBox="64 64 896 896" focusable="false" fill="currentColor" className="size-full"><path d="M880 184H712v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H384v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H144c-17.7 0-32 14.3-32 32v664c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V216c0-17.7-14.3-32-32-32zm-40 656H184V460h656v380zM184 392V256h128v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h256v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h128v136H184z" /></svg>
          </span>
        </span>
      </div>
      <div className="mt-2.5">
        <table className="w-full table-auto border-collapse border border-[#f0f0f0]">
          <colgroup>
            {[7, 25, 11, 11, 13, 11, 11, 11].map((width, index) => <col key={index} style={{ width: `${width}%`, minWidth: `${width}%` }} />)}
          </colgroup>
          <thead>
            <tr className="bg-[#61a8ff] text-center">
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">ลำดับ</th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">รายการ</th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">ยกมา</th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">วงเงิน</th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">วงเงินต่อฉบับ <span className="inline-flex size-[14px] cursor-help align-[-2px]" title="วงเงินต่อฉบับ"><svg viewBox="64 64 896 896" className="size-full fill-current"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" /><path d="M464 336a48 48 0 1096 0 48 48 0 10-96 0zm72 112h-48c-4.4 0-8 3.6-8 8v272c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V456c0-4.4-3.6-8-8-8z" /></svg></span></th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">ใช้ไป</th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">คงเหลือ</th>
              <th className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} className="border border-[#f0f0f0] p-2 text-center">
                <div className="my-8 flex flex-col items-center text-[rgba(0,0,0,0.25)]">
                  <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fillRule="nonzero" fill="#fafafa" stroke="#d9d9d9"><path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill="#fafafa" /></g></g></svg>
                  <p className="m-0 leading-[22px]">ไม่มีข้อมูล</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TAX_ROWS = [
  { year: "2569", months: "9 เดือน", value: "63,500" },
  { year: "2568", months: "1 เดือน", value: "60,000" },
  { year: "2567", months: "1 เดือน", value: "0" },
];

function TaxContent() {
  return (
    <div className="min-h-[calc(100vh-18rem)] bg-white font-[Kanit,sans-serif] text-sm text-[rgba(0,0,0,0.65)]">
      <table className="w-[calc(100%-15.2px)] table-auto border-collapse border border-[#f0f0f0]">
        <colgroup>
          <col className="w-[15%] min-w-[15%]" />
          <col className="w-[20%] min-w-[20%]" />
          <col className="w-[20%] min-w-[20%]" />
          <col className="w-[10%] min-w-[10%]" />
        </colgroup>
        <thead>
          <tr className="bg-[#61a8ff] text-center">
            {['ปี', 'จำนวนเดือน', 'มูลค่า', ''].map((heading) => (
              <th key={heading || 'actions'} className="border border-[#f0f0f0] bg-transparent p-4 text-center text-sm font-medium leading-[22px] text-white">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TAX_ROWS.map((row, index) => {
            const rowBackground = index % 2 === 0 ? "bg-white" : "bg-[#f2fafe]";
            const cellClass = `border border-[#f0f0f0] p-2 text-center leading-[22px] ${rowBackground}`;
            return (
              <tr key={row.year} className={rowBackground}>
                <td className={cellClass}>{row.year}</td>
                <td className={cellClass}>{row.months}</td>
                <td className={cellClass}>{row.value}</td>
                <td className={cellClass}>
                  <div className="flex items-center justify-center">
                    <button type="button" className="m-0.5 inline-flex size-8 items-center justify-center rounded-full bg-[#a1ded7] text-white transition-all duration-[250ms] hover:border hover:border-[#a1ded7] hover:bg-white hover:text-[#a1ded7]" aria-label={`แก้ไขภาษีปี ${row.year}`}>
                      <svg viewBox="0 0 488.471 488.471" className="size-[14px] fill-current" aria-hidden="true"><path d="m483.999 111.318-106.847-106.846c-5.962-5.962-15.621-5.962-21.584 0l-351.066 351.067c-2.862 2.862-4.472 6.738-4.472 10.792l-.03 106.876c0 4.04 1.61 7.93 4.472 10.792s6.752 4.472 10.792 4.472l106.876-.03c4.054 0 7.93-1.61 10.792-4.472l351.067-351.067c5.962-5.962 5.962-15.621 0-21.584zm-368.203 346.622-85.298.03.03-85.298 251.868-251.868 85.268 85.268c-.001 0-251.868 251.868-251.868 251.868zm273.453-273.453-85.268-85.267 62.371-62.371 85.268 85.268z" /></svg>
                    </button>
                    <button type="button" className="m-0.5 inline-flex size-8 items-center justify-center rounded-full bg-[#f4a3a3] text-white transition-all duration-[250ms] hover:border hover:border-[#f4a3a3] hover:bg-white hover:text-[#f4a3a3]" aria-label={`ลบภาษีปี ${row.year}`}>
                      <svg viewBox="0 0 512 512" className="size-[14px] fill-current" aria-hidden="true"><path d="M17.4 76.9V117h41.8l33.1 376.7C93.2 504.1 101.9 512 112.3 512H399c10.4 0 19.1-7.9 20-18.3L452.2 117h42.4V76.9H17.4zm363.3 395H130.7L99.4 117h312.5l-31.2 354.9zM157.1 33.4v63.5h40.1V40.1h117.6v56.8h40.1V33.4C354.9 15 339.9 0 321.5 0h-131C172.1 0 157.1 15 157.1 33.4zM167.1 413.8l40.1-1.5-8.7-237.3-40.1 1.5 8.7 237.3zm68.8-.7H276V175.8h-40.1v237.3zm69-0.8 40.1 1.5 8.7-237.3-40.1-1.5-8.7 237.3z" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------- Helpers -------------------------------- */

/** Formats elapsed employment time as the reference header's month/day text. */
function employmentDuration(dateStr: string | null, showYears = false): string | null {
  if (!dateStr) return null;
  const now = new Date();
  const start = parseIsoDate(dateStr);
  if (!start) return null;
  if (Number.isNaN(start.getTime()) || start > now) return null;
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (!showYears) return `${months} เดือน ${days} วัน`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years} ปี ${remainingMonths} เดือน ${days} วัน`;
}

/* ------------------------------- Status cards ------------------------------ */

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <RefreshCw className="size-6 animate-spin" />
        <span className="text-sm">กำลังโหลดข้อมูล...</span>
      </CardContent>
    </Card>
  );
}

function NotFoundCard({ onBack }: { onBack?: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-base font-semibold text-foreground">ไม่พบข้อมูลพนักงาน</p>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              กลับไปยังหน้าข้อมูลพนักงาน
            </button>
          ) : (
            <Link
              href="/organization/organization-employee"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              กลับไปยังหน้าข้อมูลพนักงาน
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
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

/* ---------------------------------- Page ---------------------------------- */

export default function OrganizationEmployeeDetailPage({
  employeeId: selectedEmployeeId,
  selectedEmployee,
  initialEmployee,
  onBack,
}: {
  employeeId?: string;
  selectedEmployee?: OrgNode | null;
  /** Fully loaded data supplied by the employee picker to avoid a preview render. */
  initialEmployee?: EmployeeDetail | null;
  onBack?: () => void;
}) {
  const params = useParams<{ id?: string }>();
  const employeeId = selectedEmployeeId ?? params.id ?? "";
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabPagination, setTabPagination] = useState({ canGoBack: false, canGoForward: true });
  const [loadedEmp, setEmp] = useState<EmployeeDetail | null>(() =>
    initialEmployee ?? (selectedEmployee ? detailPreviewFromTreeNode(selectedEmployee) : null)
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pendingSavePayload, setPendingSavePayload] = useState<Record<string, FormDataEntryValue> | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(() => !initialEmployee);
  const [error, setError] = useState(false);
  // A selected ID can stay the same when the user picks the current employee
  // from the picker again. Keep a separate reload value so that action still
  // fetches the latest detail instead of being ignored by React's state bailout.
  const [reloadVersion, setReloadVersion] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/employee/${employeeId}`);
    if (!res.ok) return null;
    return (await res.json()) as EmployeeDetail;
  }, [employeeId]);

  useEffect(() => {
    if (initialEmployee?.id === employeeId) {
      setEmp(initialEmployee);
      setError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await load();
        if (!cancelled) setEmp(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId, initialEmployee, load, reloadVersion]);

  const retry = useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  const confirmSave = useCallback(async () => {
    if (!pendingSavePayload) return;

    const payload = pendingSavePayload;
    // SweetAlert closes as soon as the confirmation is accepted; the update
    // then continues in the page behind it.
    setPendingSavePayload(null);
    setSaveState("saving");
    try {
      const response = await fetch(`/api/employee/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("save failed");
      setEmp(await load());
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("error");
    }
  }, [employeeId, load, pendingSavePayload]);

  const updateTabPagination = useCallback(() => {
    const element = tabsScrollRef.current;
    if (!element) return;
    setTabPagination({
      canGoBack: element.scrollLeft > 0,
      canGoForward: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
  }, []);

  const moveTabs = useCallback((direction: -1 | 1) => {
    tabsScrollRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }, []);

  const isPreview = Boolean(
    selectedEmployee && selectedEmployee.id === employeeId && loadedEmp?.id !== employeeId
  );
  const emp = isPreview ? detailPreviewFromTreeNode(selectedEmployee!) : loadedEmp;

  if (loading && !emp) return <LoadingCard />;
  if (error) return <ErrorCard onRetry={retry} />;
  if (!emp) return <NotFoundCard onBack={onBack} />;

  const genderLabel =
    emp.gender === "male" ? "ชาย" : emp.gender === "female" ? "หญิง" : "ไม่ระบุ";
  const nationalityLabel =
    emp.nationality === "ไทย"
      ? "ไทย"
      : emp.nationality === "ต่างชาติ"
        ? "ต่างชาติ"
        : "ไม่ระบุสัญชาติ / บุคคลพื้นที่สูง";
  const orgLabel = [emp.companyName, emp.branchName].filter(Boolean).join(" - ");
  const startDuration = employmentDuration(emp.hireDate, true);
  const confirmationDuration = employmentDuration(emp.confirmationDate, true);
  const pendingValue = (loading && selectedEmployee) || isPreview ? "" : "-";

  return (
    <div
      className={cn(
        "h-[calc(100vh-70px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-white font-sans transition-[opacity,transform] duration-200 ease-out",
        isPreview ? "translate-y-0.5 opacity-75" : "translate-y-0 opacity-100"
      )}
      aria-busy={loading}
    >
      <div className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-4 sm:pt-4">
        <EmployeePageHeadingCard
          avatarSrc={`${USER_IMAGE_ORIGIN}/images/userPlaceHolder.png`}
          avatarAlt={`${emp.firstNameTH} ${emp.lastNameTH}`.trim()}
          onBack={onBack}
          backHref="/organization/organization-employee"
          employee={{
            name: `${emp.firstNameTH} ${emp.lastNameTH}`.trim(),
            position: emp.positionName ?? pendingValue,
            department: emp.departmentName ?? pendingValue,
            employmentType: emp.employmentType ?? pendingValue,
            startDate: `${formatThaiDateNumeric(emp.hireDate) || pendingValue}${startDuration ? ` (${startDuration})` : ""}`,
            confirmationDate: `${formatThaiDateNumeric(emp.confirmationDate) || pendingValue}${confirmationDuration ? ` (${confirmationDuration})` : ""}`,
            phone: formatPhone(emp.phone ?? pendingValue),
            email: emp.email,
          }}
        />
      </div>
      <div className="mx-auto mt-3 max-w-[1600px]">
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-3 px-4">

        {/* Sub-navigation tabs */}
        <div className="flex h-12 overflow-hidden rounded-t-xl border border-[#e5eaf2] bg-white font-[Kanit,sans-serif] text-sm font-semibold leading-[22px] text-[#65728a] shadow-[0_3px_12px_rgba(29,52,93,0.06)]">
          <button
            type="button"
            onClick={() => moveTabs(-1)}
            disabled={!tabPagination.canGoBack}
            className="flex h-12 w-9 shrink-0 items-center justify-center border-r border-[#edf0f5] text-[#718096] transition-colors hover:bg-[#f6f8fc] hover:text-[#1474ee] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          <div
            ref={tabsScrollRef}
            onScroll={updateTabPagination}
            className="h-12 min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
          >
            <div className="flex h-12 w-max">
              {TABS.map((tab) => {
                const active = tab === activeTab;
                const disabled = DISABLED_TABS.has(tab);
                const tabWidth = HEADER_TAB_WIDTHS[tab] ?? 160;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={disabled}
                    onClick={() => setActiveTab(tab)}
                    style={{ width: tabWidth, minWidth: tabWidth }}
                    className={cn(
                      "relative flex h-12 shrink-0 items-center justify-center overflow-hidden px-5 font-[Kanit,sans-serif] text-sm font-semibold leading-[22px] text-[#65728a] transition-colors",
                      NO_WRAP_TABS.has(tab) && "whitespace-nowrap",
                      active && "bg-[#f8fbff] !text-[#126fd5]",
                      active && "after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#1474ee]",
                      disabled
                        ? "cursor-default text-[#b1bac7]"
                        : "hover:bg-[#f6f8fc] hover:text-[#26344f]"
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => moveTabs(1)}
            disabled={!tabPagination.canGoForward}
            className="flex h-12 w-9 shrink-0 items-center justify-center border-l border-[#edf0f5] text-[#718096] transition-colors hover:bg-[#f6f8fc] hover:text-[#1474ee] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="ถัดไป"
          >
            <ChevronRight className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] space-y-3 px-4">

        {/* Form content */}
        {activeTab === "ข้อมูลพื้นฐาน" ? (
          <Card className="rounded-t-none rounded-b-xl xl:min-h-[1184.85px] border border-t-0 border-[#e7eaf0] bg-white shadow-[0_3px_12px_rgba(29,52,93,0.07)]">
            <CardContent className="p-0">
              <form
                key={`${emp.id}-${isPreview || loading ? "preview" : "loaded"}`}
                className="w-full space-y-0 px-3 pt-3 text-sm font-normal leading-5 sm:px-4 sm:pt-4 lg:mx-6 lg:w-[calc(100%-48px)] lg:px-0"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPendingSavePayload(Object.fromEntries(new FormData(event.currentTarget)));
                }}
              >
              {/* Row 1 */}
              <div className="grid w-full grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-[190.2125fr_190.2125fr_190.2125fr_187.578125fr_187.578125fr_190.20625fr]">
                <FieldShell label="รหัสพนักงาน">
                  <TextBox name="employeeCode" value={emp.employeeCode} />
                </FieldShell>
                <FieldShell label="รหัสลายนิ้วมือ">
                  <TextBox name="fingerprintCode" value={emp.fingerprintCode} placeholder="รหัสลายนิ้วมือ" />
                </FieldShell>
                <FieldShell label="เพศ">
                  <RadioRow name="gender" options={["ชาย", "หญิง", "ไม่ระบุ"]} value={genderLabel} />
                </FieldShell>
                <FieldShell label="สัญชาติ" className="xl:col-span-2">
                  <RadioRow options={["ไทย", "ไม่ระบุสัญชาติ / บุคคลพื้นที่สูง", "ต่างชาติ"]} value={nationalityLabel} />
                </FieldShell>
                <FieldShell label="สัญชาติ">
                  <SelectBox name="nationality" value={emp.nationality} placeholder="เลือกสัญชาติ" />
                </FieldShell>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-4">
                <FieldShell label="คำนำหน้าชื่อ" required>
                  <SelectBox name="title" value={emp.title} placeholder="เลือกคำนำหน้า" />
                </FieldShell>
                <FieldShell label="ชื่อ" required>
                  <TextBox name="firstNameTH" value={emp.firstNameTH} />
                </FieldShell>
                <FieldShell label="นามสกุล" required>
                  <TextBox name="lastNameTH" value={emp.lastNameTH} />
                </FieldShell>
                <FieldShell label="ชื่อเล่น">
                  <TextBox name="nickname" value={emp.nickname} placeholder="ชื่อเล่น" />
                </FieldShell>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[378.68125fr_378.6625fr_378.65625fr]">
                <FieldShell label="ชื่อ (ENG)">
                  <TextBox name="firstNameEN" value={emp.firstNameEN} placeholder="First Name" />
                </FieldShell>
                <FieldShell label="นามสกุล (ENG)">
                  <TextBox name="lastNameEN" value={emp.lastNameEN} placeholder="Last Name" />
                </FieldShell>
                <FieldShell label="ชื่อเล่น (ENG)">
                  <TextBox name="nicknameEN" value={emp.nicknameEN} placeholder="Nickname" />
                </FieldShell>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-[25%_12.4%_12.6%_25%_25%]">
                <FieldShell label="สถานะ">
                  <SelectBox name="maritalStatus" value={emp.maritalStatus} placeholder="เลือกสถานะ" />
                </FieldShell>
                <FieldShell label="วันเกิด">
                  <DateBox name="birthDate" value={emp.birthDate} />
                </FieldShell>
                <FieldShell label="อายุ">
                  <TextBox value={emp.age} disabled />
                </FieldShell>
                <FieldShell label="เบอร์โทรศัพท์">
                  <TextBox name="phone" value={formatPhone(emp.phone)} inputMode="numeric" maxLength={12} onChange={(event) => { event.currentTarget.value = formatPhone(event.currentTarget.value); }} />
                </FieldShell>
                <FieldShell label="อีเมล">
                  <TextBox name="email" value={emp.email} />
                </FieldShell>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-5">
                <FieldShell label="เลขประจำตัวประชาชน / ผู้เสียภาษี" required>
                  <TextBox name="citizenId" value={emp.citizenId} />
                </FieldShell>
                <FieldShell label="เลขประจำตัวซึ่งไม่มีสัญชาติไทย">
                  <TextBox name="alienIdNumber" value={emp.alienIdNumber} placeholder="" />
                </FieldShell>
                <FieldShell label="เลขหนังสือเดินทาง">
                  <TextBox name="passportNo" value={emp.passportNo} placeholder="" />
                </FieldShell>
                <FieldShell label="เลขที่ใบอนุญาตทำงาน">
                  <TextBox name="workPermitNo" value={emp.workPermitNo} placeholder="" />
                </FieldShell>
                <FieldShell label="เลขประจำตัวประกันสังคม">
                  <TextBox name="socialSecurityNumber" value={emp.socialSecurity?.ssoNumber} placeholder="เลขประจำตัวประกันสังคม" />
                </FieldShell>
              </div>

              {/* Row 6 */}
              <div className="grid w-full grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-6">
                <FieldShell label="โครงสร้างองค์กร" required>
                  <SelectBox value={orgLabel} placeholder="เลือกโครงสร้างองค์กร" />
                </FieldShell>
                <FieldShell label="ตำแหน่ง" required>
                  <SelectBox value={emp.positionName} placeholder="เลือกตำแหน่ง" />
                </FieldShell>
                <FieldShell label="ประเภทพนักงาน" required>
                  <SelectBox value={emp.employmentType} placeholder="เลือกประเภทพนักงาน" />
                </FieldShell>
                <FieldShell label="ค่าจ้าง">
                  <TextBox name="baseSalary" value={emp.baseSalary} />
                </FieldShell>
                <FieldShell label="เงินเบิกล่วงหน้า">
                  <SelectBox name="advanceType" value={emp.advanceType} placeholder="เลือกประเภท" />
                </FieldShell>
                <FieldShell label="วงเงินเบิกล่วงหน้า">
                  <TextBox name="advanceLimit" value={emp.advanceLimit} />
                </FieldShell>
              </div>

              {/* Row 7: Social security */}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[381.33125fr_381.3375fr_373.33125fr]">
                <FieldShell label={<HelpLabel label="ประกันสังคม" />}>
                  <SelectBox name="socialSecurityCalc" value={emp.socialSecurity?.calculationType} placeholder="เลือกรูปแบบคำนวณ" />
                </FieldShell>
                <FieldShell label="ค่าคงที่ของประกันสังคม">
                  <TextBox name="socialSecurityFixed" value={emp.socialSecurity?.fixedAmount} />
                </FieldShell>
                <FieldShell label="เดือนที่เริ่มคำนวณประกันสังคม">
                  <DateBox name="socialSecurityStart" value={emp.socialSecurity?.effectiveDate} placeholder="เลือกวันที่" />
                </FieldShell>
              </div>

              {/* Row 8: Tax */}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[378.6625fr_378.68125fr_378.65625fr]">
                <FieldShell label={<HelpLabel label="ภาษี" />}>
                  <SelectBox name="taxCalc" value={emp.taxInformation?.calculationType} placeholder="เลือกรูปแบบคำนวณ" />
                </FieldShell>
                <FieldShell label="จำนวนภาษีคงที่ต่อเดือน">
                  <TextBox name="taxFixed" value={emp.taxInformation?.fixedAmount} />
                </FieldShell>
                <FieldShell label="เดือนที่เริ่มคำนวณภาษี">
                  <DateBox name="taxStart" value={emp.taxInformation?.effectiveDate} placeholder="เลือกวันที่" />
                </FieldShell>
              </div>

              {/* Row 9: Dates & probation */}
              <div className="grid w-full grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-[189.33125fr_189.3375fr_189.325fr_189.3375fr_189.3375fr_189.33125fr]">
                <FieldShell label="วันที่เริ่มงาน" required>
                  <DateBox name="hireDate" value={emp.hireDate} />
                </FieldShell>
                <FieldShell label="วันที่บรรจุ">
                  <DateBox name="confirmationDate" value={emp.confirmationDate} />
                </FieldShell>
                <FieldShell label="วันที่หมดสัญญาจ้าง">
                  <DateBox name="contractEndDate" value={emp.contractEndDate} placeholder="mm/dd/yyyy" />
                </FieldShell>
                <FieldShell label="ปีที่เกษียณ">
                  <DateBox name="retirementDate" value={emp.retirementDate} placeholder="เลือกวันที่" />
                </FieldShell>
                <FieldShell label="ระยะเวลาทดลองงาน">
                  <TextBox name="probationDays" value={emp.probationDays != null ? String(emp.probationDays) : null} />
                </FieldShell>
                <FieldShell label="วันที่สิ้นสุดทดลองงาน">
                  <DateBox name="probationDate" value={emp.probationDate} placeholder="เลือกวันที่" />
                </FieldShell>
              </div>

              {/* Row 10: Payment */}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-5">
                <FieldShell label="ช่องทางการชำระเงิน">
                  <SelectBox name="paymentChannel" value={emp.paymentChannel} placeholder="เลือกช่องทาง" />
                </FieldShell>
                <FieldShell label="บัญชีบริษัทนำจ่าย">
                  <SelectBox name="companyPayoutAccount" value={emp.companyPayoutAccount} placeholder="เลือกบัญชี" />
                </FieldShell>
                <FieldShell label="ธนาคาร">
                  <SelectBox name="bankName" value={emp.bankAccount?.bankName} placeholder="เลือกธนาคาร" />
                </FieldShell>
                <FieldShell label="รหัสสาขาธนาคาร">
                  <TextBox name="bankBranchCode" value={emp.bankAccount?.branchCode} placeholder="รหัสสาขาธนาคาร" />
                </FieldShell>
                <FieldShell label="เลขที่บัญชี">
                  <TextBox name="bankAccountNumber" value={emp.bankAccount?.accountNumber} placeholder="เลขที่บัญชี" />
                </FieldShell>
              </div>

              {/* Row 11: Description */}
              <FieldShell label="รายละเอียด">
                <TextBox name="description" value={emp.description} placeholder="รายละเอียด" />
              </FieldShell>

              {/* Row 12: Hashtag */}
              <FieldShell label="Hashtag">
                <TextBox name="hashtag" value={emp.hashtag} placeholder="input # to mention tag" />
              </FieldShell>

              {/* Save */}
              <div className="pt-1 pb-[6px]">
                <button
                  ref={saveButtonRef}
                  id="btn-save-employee-data"
                  type="submit"
                  disabled={saveState === "saving"}
                  className="flex h-[36.65px] w-full items-center justify-center gap-2 rounded-lg bg-[#1474ee] px-4 text-sm font-medium leading-5 text-white shadow-[0_4px_12px_rgba(20,116,238,.24)] transition-colors hover:bg-[#0d65d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eaafa] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  บันทึก
                </button>
              </div>
              </form>
            </CardContent>
          </Card>
        ) : activeTab === "ตั้งค่า" ? (
          <EmployeeSettingsContent />
        ) : activeTab === "ประวัติส่วนตัว" ? (
          <PersonalHistoryContent key={emp.id} employee={emp} employeeId={employeeId} onSaved={setEmp} />
        ) : activeTab === "ประวัติการปรับเงินเดือน/ปรับประเภท" ? (
          <SalaryAdjustmentHistoryContent />
        ) : activeTab === "รายรับ/รายจ่ายคงที่" ? (
          <FixedIncomeExpenseContent />
        ) : activeTab === "รายรับ/รายจ่ายอัตโนมัติ" ? (
          <AutomaticIncomeExpenseContent />
        ) : activeTab === "กองทุน" ? (
          <FundContent />
        ) : activeTab === "เงินประกันการทำงาน" ? (
          <WorkInsuranceContent />
        ) : activeTab === "สวัสดิการ" ? (
          <WelfareContent />
        ) : activeTab === "ภาษี" ? (
          <TaxContent />
        ) : activeTab === "การฝึกอบรม" ? (
          <TrainingContent />
        ) : activeTab === "สินทรัพย์ถือครอง" ? (
          <PossessionContent />
        ) : activeTab === "โรงพยาบาลตามสิทธิ" ? (
          <HospitalContent />
        ) : activeTab === "ประวัติการแก้ไข" ? (
          <EditHistoryContent />
        ) : (
          <Card>
            <CardContent>
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                อยู่ระหว่างการพัฒนา
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
      <UpdateEmployeeConfirmationDialog
        open={pendingSavePayload !== null}
        saving={saveState === "saving"}
        onConfirm={confirmSave}
        onCancel={() => {
          if (saveState !== "saving") {
            setPendingSavePayload(null);
            setSaveState("idle");
            window.setTimeout(() => saveButtonRef.current?.focus(), 0);
          }
        }}
      />
    </div>
  );
}
