"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Grid3x3, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TABS = ["รายงานปกติ", "รายงานกำหนดเอง"] as const;
type Tab = (typeof TABS)[number];

type Filters = {
  orgStructure: string;
  position: string;
  dataType: string;
  employeeType: string;
  status: string;
  hashtag: string;
};

type SelectOption = { value: string; label: string };

const ALL_OPTION: SelectOption = { value: "", label: "ทั้งหมด" };

const INITIAL_FILTERS: Filters = {
  orgStructure: "",
  position: "",
  dataType: "ข้อมูลพื้นฐาน",
  employeeType: "",
  status: "",
  hashtag: "",
};

const DATA_TYPES: SelectOption[] = [
  { value: "ข้อมูลพื้นฐาน", label: "ข้อมูลพื้นฐาน" },
  { value: "ข้อมูลเงินเดือน", label: "ข้อมูลเงินเดือน" },
  { value: "ข้อมูลทั้งหมด", label: "ข้อมูลทั้งหมด" },
];
const EMPLOYEE_TYPES: SelectOption[] = [
  ALL_OPTION,
  { value: "permanent", label: "พนักงานรายเดือน" },
  { value: "dailyWage", label: "พนักงานรายวัน" },
  { value: "partTime", label: "พนักงานพาร์ตไทม์" },
  { value: "contract", label: "พนักงานเหมาจ่าย" },
  { value: "temporary", label: "พนักงานชั่วคราว" },
];
const STATUSES: SelectOption[] = [
  ALL_OPTION,
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "terminated", label: "Out" },
];

/* ------------------------------ Field helpers ------------------------------ */

function SelectBox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer appearance-none rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] pr-8 font-[Kanit,sans-serif] text-sm leading-[22px] text-[rgba(0,0,0,0.65)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#40a9ff]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8c8c8c]" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-[Kanit,sans-serif] text-sm leading-[22px] text-[rgba(0,0,0,0.65)]">{label}</label>
      {children}
    </div>
  );
}

/* ------------------------------ Search card -------------------------------- */

function SearchCard({
  filters,
  organizationOptions,
  positionOptions,
  onChange,
  onSearch,
  custom = false,
}: {
  filters: Filters;
  organizationOptions: SelectOption[];
  positionOptions: SelectOption[];
  onChange: (f: Filters) => void;
  onSearch: () => void;
  custom?: boolean;
}) {
  return (
    <Card className="mb-3 overflow-hidden rounded-lg border-0 bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]">
      <div className="flex h-[58.5625px] items-center p-3">
        <p className="font-[Kanit,sans-serif] text-[22px] font-normal leading-[34.573px] text-[rgba(0,0,0,0.65)]">ค้นหา</p>
      </div>
      <CardContent className="px-2 py-4">
        {/* Row 1: โครงสร้างองค์กร / ตำแหน่ง / ประเภทข้อมูล */}
        <div className="grid grid-cols-1 gap-x-2 gap-y-0 md:grid-cols-3">
          <Field label="โครงสร้างองค์กร">
            <SelectBox
              value={filters.orgStructure}
              options={organizationOptions}
              onChange={(v) => onChange({ ...filters, orgStructure: v })}
            />
          </Field>
          <Field label="ตำแหน่ง">
            <SelectBox
              value={filters.position}
              options={positionOptions}
              onChange={(v) => onChange({ ...filters, position: v })}
            />
          </Field>
          {custom ? (
            <Field label="ประเภทพนักงาน">
              <SelectBox
                value={filters.employeeType}
                options={EMPLOYEE_TYPES}
                onChange={(v) => onChange({ ...filters, employeeType: v })}
              />
            </Field>
          ) : (
            <Field label="ประเภทข้อมูล">
              <SelectBox
                value={filters.dataType}
                options={DATA_TYPES}
                onChange={(v) => onChange({ ...filters, dataType: v })}
              />
            </Field>
          )}
        </div>

        {/* Row 2: ประเภทพนักงาน / สถานะ / Hashtag */}
        <div className="grid grid-cols-1 gap-x-2 gap-y-0 md:grid-cols-3">
          {!custom && (
            <Field label="ประเภทพนักงาน">
              <SelectBox
                value={filters.employeeType}
                options={EMPLOYEE_TYPES}
                onChange={(v) => onChange({ ...filters, employeeType: v })}
              />
            </Field>
          )}
          <Field label="สถานะ">
            <SelectBox
              value={filters.status}
              options={STATUSES}
              onChange={(v) => onChange({ ...filters, status: v })}
            />
          </Field>
          <Field label="Hashtag">
            <Input
              value={filters.hashtag}
              onChange={(e) => onChange({ ...filters, hashtag: e.target.value })}
              placeholder="#Hashtag"
              className="h-8 rounded-[4px] border-[#d9d9d9] bg-white px-[11px] font-[Kanit,sans-serif] text-sm leading-[22px] text-[rgba(0,0,0,0.65)] shadow-none focus-visible:ring-1 focus-visible:ring-[#40a9ff]"
            />
          </Field>
          {custom && <div />}
        </div>

      </CardContent>
      {/* Footer — right-aligned buttons (12px padding / 8px gap in the reference). */}
      <div className="flex h-[60.65px] items-start justify-end gap-2 p-3">
        <Button className="h-9 rounded-[4px] bg-[#4caf50] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.2),0px_2px_2px_0px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)] hover:bg-[#4caf50]/90">
          EXCEL
          <Grid3x3 className="size-4" />
        </Button>
        <Button
          className="h-9 rounded-[4px] bg-[#2299ff] px-4 font-[Kanit,sans-serif] text-sm font-semibold leading-9 shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.2),0px_2px_2px_0px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)] hover:bg-[#2299ff]/90"
          onClick={onSearch}
        >
          ค้นหา
        </Button>
      </div>
    </Card>
  );
}

/* --------------------- Report table (รายงานปกติ) --------------------------- */

type CellAlign = "left" | "center" | "right";

const REPORT_COLUMNS: { label: string; align: CellAlign; headerAlign?: CellAlign }[] = [
  { label: "ลำดับ", align: "center" },
  { label: "สถานะ", align: "center" },
  { label: "คำนำหน้าชื่อ", align: "left" },
  { label: "ชื่อ", align: "left" },
  { label: "นามสกุล", align: "left" },
  { label: "ชื่อเล่น", align: "left" },
  { label: "คำนำหน้าชื่อ(EN)", align: "left" },
  { label: "ชื่อ(EN)", align: "left" },
  { label: "นามสกุล(EN)", align: "left" },
  { label: "ชื่อเล่น(EN)", align: "left" },
  { label: "สัญชาติ", align: "center" },
  { label: "ระดับตำแหน่ง", align: "center" },
  { label: "รหัสพนักงาน", align: "center" },
  { label: "รหัสลายนิ้วมือ", align: "center" },
  { label: "บริษัท", align: "left" },
  { label: "สำนักงานสาขา", align: "left" },
  { label: "แผนก", align: "left" },
  { label: "ฝ่ายงาน", align: "left" },
  { label: "หน่วยงาน", align: "left" },
  { label: "ตำแหน่ง", align: "left" },
  { label: "ประเภทพนักงาน", align: "center" },
  { label: "กลุ่มพนักงาน", align: "center" },
  { label: "เบอร์โทร", align: "left" },
  { label: "Email", align: "left" },
  { label: "วันเกิด", align: "right", headerAlign: "center" },
  { label: "อายุ", align: "right", headerAlign: "center" },
  { label: "เพศ", align: "center" },
  { label: "วันที่บรรจุ", align: "right" },
  { label: "อายุงานวันที่บรรจุ", align: "right" },
  { label: "วันที่เริ่มงาน", align: "right" },
  { label: "อายุงาน วันที่เริ่มงาน", align: "right" },
  { label: "วันที่หมดสัญญาจ้าง", align: "center" },
  { label: "วันที่ลาออก", align: "right" },
  { label: "แบล็กลิสต์", align: "center" },
  { label: "เลขบัตรประจำตัวประชาชน / ผู้เสียภาษี", align: "center" },
  { label: "เลขประจำตัวคนซึ่งไม่มีสัญชาติไทย", align: "center" },
  { label: "เลขหนังสือเดินทาง", align: "center" },
  { label: "เลขใบอนุญาตทำงาน", align: "center" },
  { label: "เลขประจำตัวประกันสังคม", align: "center" },
  { label: "ธนาคาร", align: "center" },
  { label: "เลขที่บัญชี", align: "center" },
  { label: "ที่อยู่ตามบัตร", align: "left" },
  { label: "ที่อยู่ปัจจุบัน", align: "left" },
  { label: "เงินเดือน", align: "right" },
  { label: "เงินประจำสัปดาห์", align: "right" },
];

function ReportTable({ rows }: { rows: string[][] }) {
  return (
    <div className="max-h-[650px] overflow-auto border border-[#e8e8e8] bg-white">
      <table className="min-w-full w-max table-fixed border-separate border-spacing-0 font-[Kanit,sans-serif] text-sm leading-[22px]">
        <thead>
          <tr>
            {REPORT_COLUMNS.map((col) => (
              <th
                key={col.label}
                className={cn(
                  "sticky top-0 z-10 whitespace-nowrap border-b border-r border-[#e8e8e8] bg-[#61a8ff] px-4 py-4 text-sm font-medium normal-case tracking-normal text-white last:border-r-0",
                  (col.headerAlign ?? col.align) === "center" && "text-center",
                  (col.headerAlign ?? col.align) === "right" && "text-right"
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="bg-white">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "whitespace-nowrap border-b border-r border-[#e8e8e8] px-4 py-4 text-sm font-normal text-[rgba(0,0,0,0.65)] last:border-r-0",
                    REPORT_COLUMNS[ci].align === "center" && "text-center",
                    REPORT_COLUMNS[ci].align === "right" && "text-right"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NormalReportCard({
  rows,
  loading,
  error,
  onRetry,
}: {
  rows: string[][];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className="mb-3 overflow-hidden rounded-lg border-0 bg-white shadow-[0px_2px_1px_-1px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_1px_3px_0px_rgba(0,0,0,0.12)]">
      <div className="flex h-[58.5625px] items-center p-3">
        <p className="font-[Kanit,sans-serif] text-[22px] font-bold leading-[34.573px] text-[rgba(0,0,0,0.65)]">รายงานทะเบียนพนักงาน</p>
      </div>
      <CardContent className="px-2 py-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 rounded-md border border-border bg-[#f8f9fa] text-sm text-muted-foreground">
            <RefreshCw className="size-5 animate-spin" />
            กำลังโหลดข้อมูล...
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-md border border-border bg-[#f8f9fa] text-center">
            <p className="text-sm text-foreground">ไม่สามารถโหลดรายงานทะเบียนพนักงานได้</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#2563eb] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8]"
            >
              <RefreshCw className="size-4" />
              ลองอีกครั้ง
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-[163.6px] flex-col items-center justify-center border border-[#f0f0f0] bg-white">
            <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                <g fill="#d9d9d9" fillRule="nonzero">
                  <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                  <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                </g>
              </g>
            </svg>
            <p className="mt-2 text-sm text-[#666]">ไม่มีข้อมูล</p>
          </div>
        ) : (
          <ReportTable rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Page ----------------------------------- */

export default function ReportEmployeeRegistryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("รายงานปกติ");
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [organizationOptions, setOrganizationOptions] = useState<SelectOption[]>([ALL_OPTION]);
  const [positionOptions, setPositionOptions] = useState<SelectOption[]>([ALL_OPTION]);
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/report/employee-registry?metadata=1")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as {
          departments: Array<{ id: string; code: string; name: string }>;
          positions: Array<{ id: string; code: string; name: string }>;
        };
      })
      .then((data) => {
        if (cancelled) return;
        setOrganizationOptions([
          ALL_OPTION,
          ...data.departments.map((department) => ({
            value: department.id,
            label: `${department.code}: ${department.name}`,
          })),
        ]);
        setPositionOptions([
          ALL_OPTION,
          ...data.positions.map((position) => ({
            value: position.id,
            label: `${position.code}: ${position.name}`,
          })),
        ]);
      })
      .catch(() => {
        // Keep the default "ทั้งหมด" option when report metadata is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadData = useCallback(async (f: Filters) => {
    setLoading(true);
      setError(false);
    try {
      const params = new URLSearchParams();
      if (f.status) params.set("status", f.status);
      if (f.employeeType) params.set("employmentType", f.employeeType);
      if (f.orgStructure) params.set("departmentId", f.orgStructure);
      if (f.position) params.set("positionId", f.position);
      if (f.hashtag.trim()) params.set("hashtag", f.hashtag.trim());
      const res = await fetch(`/api/report/employee-registry?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: string[][] };
      setRows(data.rows);
    } catch {
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      {/* Blue banner — matches the reference: full-width, h-160 (160px), p-24 (24px) */}
      <section className="relative h-40 border-b border-border bg-[#51A0F5] p-6 text-white">
        <div className="flex h-full flex-col items-start justify-center">
          {/* Breadcrumb: รายงาน > กลุ่มประวัติพนักงาน */}
          <p className="flex items-center gap-0.5 text-sm text-white/85">
            รายงาน
            <ChevronRight className="size-4" />
            กลุ่มประวัติพนักงาน
          </p>

          {/* Title + tooltip */}
          <div className="mt-4 flex items-center gap-2.5">
            <h1 className="font-[Kanit,sans-serif] text-2xl font-normal leading-[37.716px] text-white">รายงานทะเบียนพนักงาน</h1>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-full border border-white/70 text-sm font-bold leading-none text-white transition-colors hover:bg-white/20"
              aria-label="ช่วยเหลือ"
            >
              ?
            </button>
          </div>
        </div>
      </section>

      {/* Tabs nav — antd-style: tabs with an ink-bar underline on the active tab */}
      <div className="border-b border-border bg-white">
        <div className="flex px-4" role="tablist">
          {TABS.map((tab) => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative mr-8 whitespace-nowrap p-3 text-sm leading-[22px] transition-colors last:mr-0",
                  active ? "font-medium text-[#1976d2]" : "text-[#616161] hover:text-foreground"
                )}
              >
                {tab}
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#1976d2]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-[#f0f2f5] px-6 pb-6 pt-[32.8px]">
          <SearchCard
            filters={filters}
            organizationOptions={organizationOptions}
            positionOptions={positionOptions}
            onChange={setFilters}
          onSearch={() => loadData(filters)}
          custom={activeTab === "รายงานกำหนดเอง"}
        />
        <NormalReportCard
          rows={rows}
          loading={loading}
          error={error}
          onRetry={() => loadData(filters)}
        />
      </div>
    </div>
  );
}
