"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileSpreadsheet,
  FileText,
  Inbox,
} from "lucide-react";

import { ThaiMonthPicker } from "@/components/ui/thai-date-picker";
import { cn } from "@/lib/utils";

type ReportTab = "รายงานปกติ" | "รายงานกำหนดเอง";
type ExportKind = "pdf" | "excel" | "text";

const exportFormats = ["รูปแบบ-1", "รูปแบบ-2", "รูปแบบ-3", "รูปแบบ-4", "รูปแบบ-5", "รูปแบบ-6", "รูปแบบ-7"] as const;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createSimplePdf(text: string) {
  const stream = `BT /F1 14 Tf 48 780 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = ["0000000000 65535 f "];
  objects.forEach((object, index) => {
    offsets.push(`${String(pdf.length).padStart(10, "0")} 00000 n `);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n${offsets.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function downloadReport(kind: ExportKind, format?: string) {
  const suffix = format ? `-${format.replace("รูปแบบ-", "format-")}` : "";
  const title = "รายงานผลการคำนวณเงินเดือนสุทธิงวดปกติ";
  const rows = [
    ["รายงาน", title],
    ["เดือน", "สิงหาคม 2569"],
    ["สถานะ", "ไม่มีข้อมูล"],
  ];

  if (kind === "text") {
    const content = rows.map(([label, value]) => `${label}\t${value}`).join("\n");
    triggerDownload(new Blob([content], { type: "text/plain;charset=utf-8" }), `report-net-regular${suffix}.txt`);
    return;
  }

  if (kind === "excel") {
    const content = `\ufeff<table>${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}</table>`;
    triggerDownload(new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8" }), `report-net-regular${suffix}.xls`);
    return;
  }

  const pdfContent = createSimplePdf("Net regular payroll report - August 2569 - No data");
  triggerDownload(new Blob([pdfContent], { type: "application/pdf" }), `report-net-regular${suffix || "-format-1"}.pdf`);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-normal leading-[22.001px] text-black/65">{label}</label>
      {children}
    </div>
  );
}

function SelectLike({ placeholder = "", disabled = false }: { placeholder?: string; disabled?: boolean }) {
  return (
    <span className={cn("relative flex h-8 items-center rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white leading-[22.001px]", disabled && "bg-[#fafafa]") }>
      <span className="truncate px-[11px] text-sm font-normal leading-[22.001px] text-black/65">{placeholder}</span>
      <ChevronDown className="pointer-events-none absolute right-[9.6px] size-3 text-black/[0.54]" />
    </span>
  );
}

function MonthField() {
  const [month, setMonth] = useState("2026-08");
  return (
    <ThaiMonthPicker value={month} onChange={setMonth} />
  );
}

function ExportButton({
  label,
  color,
  icon,
  onClick,
  ariaHaspopup,
  ariaExpanded,
}: {
  label: string;
  color: "dark" | "green" | "blue";
  icon?: ReactNode;
  onClick?: () => void;
  ariaHaspopup?: "menu";
  ariaExpanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup={ariaHaspopup}
      aria-expanded={ariaExpanded}
      className={cn(
        "relative -left-[5px] inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium leading-5 text-white transition-opacity hover:opacity-90",
        color === "dark" && "bg-[#3c4252] shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]",
        color === "green" && "bg-[#4caf50] shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]",
        color === "blue" && "bg-[#2299ff] shadow-[0_3px_1px_-2px_rgba(0,0,0,.2),0_2px_2px_rgba(0,0,0,.14),0_1px_5px_rgba(0,0,0,.12)]"
      )}
    >
      {label}
      {icon}
    </button>
  );
}

function ExportMenuButton({ kind, label, color, icon }: { kind: "pdf" | "excel"; label: string; color: "dark" | "green"; icon: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <ExportButton
        label={label}
        color={color}
        icon={icon}
        onClick={() => setOpen((value) => !value)}
        ariaHaspopup="menu"
        ariaExpanded={open}
      />
      {open && (
        <div role="menu" aria-label={`${label} รูปแบบการส่งออก`} className="absolute right-0 top-full z-30 mt-1 min-w-[116px] rounded-md border border-[#e1e5eb] bg-white py-2 shadow-[0_4px_12px_rgba(0,0,0,.18)]">
          {exportFormats.map((format) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              className="block min-h-12 w-full whitespace-nowrap px-4 py-0 text-left text-sm font-normal leading-12 text-[#26344f] hover:bg-[#f1f5fb]"
              onClick={() => {
                setOpen(false);
                downloadReport(kind, format);
              }}
            >
              {format}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeTypeOptions() {
  return (
    <div className="flex h-[59.6px] flex-wrap content-start items-start gap-x-3 overflow-hidden rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-3 py-1 text-sm font-normal leading-[22.001px] text-black/65">
      {["พนักงานรายเดือน", "พนักงานรายวัน", "พนักงานพาร์ตไทม์", "พนักงานเหมาจ่าย"].map((employeeType) => (
        <label key={employeeType} className="inline-flex shrink-0 items-center gap-1.5 font-normal leading-[22.001px]">
          <input type="checkbox" className="size-3.5 rounded border-[#aeb7c1] accent-[#1474ee]" />
          {employeeType}
        </label>
      ))}
    </div>
  );
}

function SearchForm({ custom, onSearch }: { custom: boolean; onSearch: () => void }) {
  return (
    <section className="mb-3 overflow-hidden rounded-lg border-0 bg-white text-sm leading-[22.001px] shadow-[0_2px_1px_-1px_rgba(0,0,0,.2),0_1px_1px_rgba(0,0,0,.14),0_1px_3px_rgba(0,0,0,.12)]">
      <div className="flex h-[58.5625px] items-start px-[17px] pt-[13px]">
        <h2 className="text-xl font-[300] leading-7 tracking-[-1px] text-[#172348]">ค้นหา</h2>
      </div>

      <div className="-mt-[35px]">
        <div className={cn("grid grid-cols-1 gap-x-2 gap-y-0 px-[17px] py-4", custom ? "md:grid-cols-3" : "md:grid-cols-2")}>
          <Field label="โครงสร้างองค์กร">
            <SelectLike />
          </Field>
          <Field label="เดือน">
            <MonthField />
          </Field>
          <Field label="ประเภทพนักงาน">
            {custom ? <EmployeeTypeOptions /> : <SelectLike placeholder="ทั้งหมด" disabled />}
          </Field>
          {!custom && (
            <Field label="ช่องทางการชำระเงิน">
              <SelectLike />
            </Field>
          )}
        </div>

        <div className="-mt-[7px] flex items-center justify-end gap-2 px-3 pt-[2px] pb-3">
          {custom ? (
            <ExportMenuButton kind="excel" label="Excel" color="green" icon={<FileSpreadsheet className="size-4" />} />
          ) : (
            <>
              <ExportMenuButton kind="pdf" label="PDF" color="dark" icon={<FileText className="size-4" />} />
              <ExportMenuButton kind="excel" label="Excel" color="green" icon={<FileSpreadsheet className="size-4" />} />
              <ExportButton label="Text" color="green" icon={<FileText className="size-4" />} onClick={() => downloadReport("text")} />
            </>
          )}
          <ExportButton label="ค้นหา" color="blue" onClick={onSearch} />
        </div>
      </div>
    </section>
  );
}

function NormalReport({ searched }: { searched: boolean }) {
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-[#e7eaf0] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
      <div className="flex h-[58.5625px] items-center border-b border-[#edf0f4] px-4">
        <h2 className="text-xl font-[300] leading-7 tracking-[-1px] text-black/65">รายงานผลการคำนวณเงินเดือนสุทธิงวดปกติประจำเดือน สิงหาคม 2569</h2>
      </div>
      <div className="p-4">
        <div className="flex h-52 flex-col items-center justify-center rounded-lg border border-dashed border-[#dfe5ee] bg-[#fbfcfe]">
          <Inbox className="size-12 text-[#c8cdd2]" strokeWidth={1} />
          <p className="mt-3 text-sm font-medium text-[#5f6d80]">ไม่มีข้อมูล</p>
          <p className="mt-1 text-xs text-[#929dac]">{searched ? "ไม่พบข้อมูลตามเงื่อนไขที่เลือก" : "กำหนดเงื่อนไขแล้วกดค้นหาเพื่อแสดงรายงาน"}</p>
        </div>
      </div>
    </section>
  );
}

export default function ReportCalculationNetRegularPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("รายงานปกติ");
  const [searched, setSearched] = useState(false);

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#f3f6fb] font-sans">
      <div className="mx-auto max-w-[1600px] p-3 sm:p-4">
        <section className="mb-3 overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-0 text-sm font-normal leading-[22.001px] text-[#7b8798]">
                <span>รายงาน</span>
                <ChevronRight className="size-4" />
                <span>กลุ่มการคำนวณเงินเดือน</span>
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-[#172348]">รายงานผลการคำนวณเงินเดือนสุทธิงวดปกติ</h1>
                <button type="button" className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[#718096] transition-colors hover:bg-[#eef5ff] hover:text-[#1474ee]" aria-label="ช่วยเหลือ">
                  <CircleHelp className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex border-t border-[#edf0f4] px-4" role="tablist" aria-label="รูปแบบรายงาน">
            {(["รายงานปกติ", "รายงานกำหนดเอง"] as ReportTab[]).map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearched(false);
                  }}
                  className={cn(
                    "relative mr-7 whitespace-nowrap py-3 text-sm leading-5 transition-colors last:mr-0",
                    active ? "font-medium text-[#1474ee]" : "font-normal text-[#6f7b90] hover:text-[#34425c]"
                  )}
                >
                  {tab}
                  {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#1474ee]" />}
                </button>
              );
            })}
          </div>
        </section>

        <SearchForm custom={activeTab === "รายงานกำหนดเอง"} onSearch={() => setSearched(true)} />
        {activeTab === "รายงานปกติ" && <NormalReport searched={searched} />}
      </div>
    </div>
  );
}
