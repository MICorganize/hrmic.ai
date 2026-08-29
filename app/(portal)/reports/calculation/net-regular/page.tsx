"use client";

import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Inbox,
} from "lucide-react";

import { cn } from "@/lib/utils";

type ReportTab = "รายงานปกติ" | "รายงานกำหนดเอง";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-[15px] leading-5 text-[#525b66]">
      <span className="mb-0.5 block">{label}</span>
      {children}
    </label>
  );
}

function SelectLike({ placeholder = "", disabled = false }: { placeholder?: string; disabled?: boolean }) {
  return (
    <span className={cn("relative flex h-8 items-center rounded-sm border border-[#dfe3e8] bg-white", disabled && "bg-[#fafafa]") }>
      <span className={cn("truncate px-3 text-sm", placeholder ? "text-[#b8bfc7]" : "text-[#454d56]")}>{placeholder}</span>
      <ChevronDown className="absolute right-2 size-4 text-[#939ba5]" strokeWidth={1.5} />
    </span>
  );
}

function MonthField() {
  return (
    <span className="relative flex h-8 items-center rounded-sm border border-[#dfe3e8] bg-white">
      <span className="px-3 text-sm text-[#4c5560]">สิงหาคม 2026</span>
      <CalendarDays className="absolute right-2 size-3.5 text-[#68737e]" strokeWidth={1.5} />
    </span>
  );
}

function ExportButton({
  label,
  color,
  icon,
}: {
  label: string;
  color: "dark" | "green" | "blue";
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded px-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90",
        color === "dark" && "bg-[#454a5a]",
        color === "green" && "bg-[#45b854]",
        color === "blue" && "bg-[#2697ed]"
      )}
    >
      {label}
      {icon}
    </button>
  );
}

function SearchForm({ custom }: { custom: boolean }) {
  return (
    <section className="rounded-lg border border-[#e2e6ea] bg-white px-3 py-4 shadow-[0_2px_2px_rgba(0,0,0,0.14)] sm:px-4">
      <h2 className="mb-7 text-[23px] font-medium leading-none text-[#4d535b]">ค้นหา</h2>
      <div className="grid grid-cols-1 gap-x-2 gap-y-1.5 md:grid-cols-2">
        <Field label="โครงสร้างองค์กร">
          <SelectLike />
        </Field>
        <Field label="เดือน">
          <MonthField />
        </Field>
        <Field label="ประเภทพนักงาน">
          {custom ? (
            <div className="flex h-8 items-center gap-3 overflow-hidden rounded-sm border border-[#dfe3e8] bg-white px-3 text-sm text-[#4b535c]">
              {['พนักงานรายเดือน', 'พนักงานรายวัน', 'พนักงานพาร์ตไทม์', 'พนักงานเหมาจ่าย'].map((employeeType) => (
                <label key={employeeType} className="inline-flex shrink-0 items-center gap-1.5">
                  <input type="checkbox" className="size-3.5 rounded border-[#aeb7c1] accent-[#2697ed]" />
                  {employeeType}
                </label>
              ))}
            </div>
          ) : (
            <SelectLike placeholder="ทั้งหมด" disabled />
          )}
        </Field>
        {!custom && (
          <Field label="ช่องทางการชำระเงิน">
            <SelectLike />
          </Field>
        )}
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-2">
        {custom ? (
          <>
            <ExportButton label="Excel" color="green" icon={<FileSpreadsheet className="size-[18px]" strokeWidth={2.3} />} />
            <ExportButton label="ค้นหา" color="blue" />
          </>
        ) : (
          <>
            <ExportButton label="PDF" color="dark" icon={<FileText className="size-[18px]" strokeWidth={2.3} />} />
            <ExportButton label="Excel" color="green" icon={<FileSpreadsheet className="size-[18px]" strokeWidth={2.3} />} />
            <ExportButton label="Text" color="green" icon={<FileText className="size-[18px]" strokeWidth={2.3} />} />
            <ExportButton label="ค้นหา" color="blue" />
          </>
        )}
      </div>
    </section>
  );
}

function NormalReport() {
  return (
    <section className="rounded-lg border border-[#e2e6ea] bg-white px-3 py-4 shadow-[0_2px_2px_rgba(0,0,0,0.12)] sm:px-4">
      <h2 className="text-[23px] font-semibold leading-tight text-[#454b54]">
        รายงานผลการคำนวณเงินเดือนสุทธิงวดปกติประจำเดือน สิงหาคม 2026
      </h2>
      <div className="mt-7 flex h-44 items-center justify-center rounded-sm border border-[#edf0f3] text-center">
        <div className="text-[#c8cdd2]">
          <Inbox className="mx-auto size-12" strokeWidth={1} />
          <p className="mt-2 text-sm">ไม่มีข้อมูล</p>
        </div>
      </div>
    </section>
  );
}

export default function ReportCalculationNetRegularPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("รายงานปกติ");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#edf5fc]">
      <section className="h-40 border-b border-[#e0e7ef] bg-[#61a8f7] px-6 text-white">
        <div className="flex h-full flex-col justify-center">
          <p className="flex items-center gap-0.5 text-sm text-white/85">
            <span>รายงาน</span>
            <ChevronRight className="size-4" />
            <span>กลุ่มการคำนวณเงินเดือน</span>
          </p>
          <h1 className="mt-4 text-[28px] font-semibold leading-none">รายงานผลการคำนวณเงินเดือนสุทธิงวดปกติ</h1>
        </div>
      </section>

      <div className="h-12 border-b border-[#dce4ec] bg-white shadow-sm">
        <div className="flex h-full items-stretch gap-8 px-4 sm:px-6" role="tablist" aria-label="รูปแบบรายงาน">
          {(["รายงานปกติ", "รายงานกำหนดเอง"] as ReportTab[]).map((tab) => {
            const selected = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-1 pt-0.5 text-[15px] transition-colors",
                  selected ? "font-medium text-[#277fc4]" : "text-[#525961] hover:text-[#277fc4]"
                )}
              >
                {tab}
                {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#268fdf]" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-6 lg:p-8">
        <SearchForm custom={activeTab === "รายงานกำหนดเอง"} />
        {activeTab === "รายงานปกติ" && <NormalReport />}
      </div>
    </div>
  );
}
