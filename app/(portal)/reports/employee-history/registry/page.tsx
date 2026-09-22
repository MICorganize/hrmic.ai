"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, CircleHelp, FileSpreadsheet, RefreshCw, Search } from "lucide-react";

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
        className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-[#dfe4e8] bg-white px-3 pr-9 text-sm font-normal leading-5 text-[#34425c] transition-colors outline-none ring-[#5eaafa] focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[#738199]" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-medium leading-5 text-[#5e6b7c]">{label}</label>
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
    <Card className="mb-3 overflow-hidden rounded-xl border border-[#e7eaf0] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
      <div className="flex items-center gap-2 border-b border-[#edf0f4] px-4 py-3.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#eaf4ff] text-[#1474ee]">
          <Search className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold leading-5 text-[#172348]">ค้นหาข้อมูลพนักงาน</h2>
          <p className="text-xs leading-5 text-[#7b8798]">กำหนดเงื่อนไขสำหรับรายงานที่ต้องการ</p>
        </div>
      </div>
      <CardContent className="p-4">
        {/* Row 1: โครงสร้างองค์กร / ตำแหน่ง / ประเภทข้อมูล */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              className="h-10 rounded-lg border-[#dfe4e8] bg-white px-3 text-sm font-normal leading-5 text-[#34425c] shadow-none ring-[#5eaafa] placeholder:text-[#9aa5b4] focus-visible:ring-2 focus-visible:ring-[#5eaafa] focus-visible:ring-offset-0"
            />
          </Field>
          {custom && <div />}
        </div>

      </CardContent>
      {/* Footer — right-aligned buttons (12px padding / 8px gap in the reference). */}
      <div className="flex items-center justify-end gap-2 border-t border-[#edf0f4] px-4 py-3">
        <Button className="h-9 w-[130px] gap-2 rounded-lg bg-[#20a464] px-4 text-sm font-medium text-white shadow-[0_4px_12px_rgba(32,164,100,.2)] hover:bg-[#188b54]">
          EXCEL
          <FileSpreadsheet className="size-4" />
        </Button>
        <Button
          className="h-9 w-[130px] gap-2 rounded-lg bg-[#1474ee] px-4 text-sm font-medium text-white shadow-[0_4px_12px_rgba(20,116,238,.24)] hover:bg-[#0d65d8]"
          onClick={onSearch}
        >
          <Search className="size-4" />
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
    <div className="max-h-[650px] overflow-auto rounded-lg border border-[#e5eaf0] bg-white">
      <table className="min-w-full w-max table-fixed border-separate border-spacing-0 text-sm leading-5">
        <thead>
          <tr>
            {REPORT_COLUMNS.map((col) => (
              <th
                key={col.label}
                className={cn(
                  "sticky top-0 z-10 whitespace-nowrap border-b border-r border-[#2b88ef] bg-[#1474ee] px-4 py-3 text-xs font-semibold normal-case tracking-normal text-white last:border-r-0",
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
            <tr key={ri} className="bg-white transition-colors hover:bg-[#f7faff]">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "whitespace-nowrap border-b border-r border-[#edf0f4] px-4 py-3 text-sm font-normal text-[#4d5a6d] last:border-r-0",
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
    <Card className="mb-3 overflow-hidden rounded-xl border border-[#e7eaf0] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
      <div className="flex items-center justify-between border-b border-[#edf0f4] px-4 py-4">
        <div>
          <h2 className="text-sm font-semibold leading-5 text-[#172348]">รายงานทะเบียนพนักงาน</h2>
          <p className="mt-0.5 text-xs leading-5 text-[#7b8798]">ผลลัพธ์ตามเงื่อนไขการค้นหาที่เลือก</p>
        </div>
        {!loading && !error && rows.length > 0 && (
          <span className="rounded-full bg-[#eaf4ff] px-2.5 py-1 text-xs font-medium text-[#1474ee]">{rows.length} รายการ</span>
        )}
      </div>
      <CardContent className="p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 rounded-lg border border-[#e7eaf0] bg-[#f8faff] text-sm text-[#6f7b90]">
            <RefreshCw className="size-5 animate-spin text-[#1474ee]" />
            กำลังโหลดข้อมูล...
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-[#e7eaf0] bg-[#f8faff] text-center">
            <p className="text-sm text-[#34425c]">ไม่สามารถโหลดรายงานทะเบียนพนักงานได้</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1474ee] px-4 py-2 text-sm font-medium text-white shadow-[0_4px_12px_rgba(20,116,238,.24)] transition-colors hover:bg-[#0d65d8]"
            >
              <RefreshCw className="size-4" />
              ลองอีกครั้ง
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center rounded-lg border border-dashed border-[#dfe5ee] bg-[#fbfcfe]">
            <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                <g fill="#d9d9d9" fillRule="nonzero">
                  <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                  <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                </g>
              </g>
            </svg>
            <p className="mt-3 text-sm font-medium text-[#5f6d80]">ไม่มีข้อมูล</p>
            <p className="mt-1 text-xs text-[#929dac]">กำหนดเงื่อนไขแล้วกดค้นหาเพื่อแสดงรายงาน</p>
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
    <div className="min-h-[calc(100vh-70px)] bg-[#f3f6fb] font-sans">
      <div className="mx-auto max-w-[1600px] p-3 sm:p-4">
        <section className="mb-3 overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs font-normal leading-5 text-[#7b8798]">
                รายงาน
                <ChevronRight className="size-3.5" />
                กลุ่มประวัติพนักงาน
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-[#172348]">รายงานทะเบียนพนักงาน</h1>
                <button
                  type="button"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[#718096] transition-colors hover:bg-[#eef5ff] hover:text-[#1474ee]"
                  aria-label="ช่วยเหลือ"
                >
                  <CircleHelp className="size-4" />
                </button>
              </div>
              <p className="mt-0.5 text-xs leading-5 text-[#6f7b90]">ค้นหาและจัดทำรายงานข้อมูลพนักงานขององค์กร</p>
            </div>
          </div>

          <div className="flex border-t border-[#edf0f4] px-4" role="tablist">
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
