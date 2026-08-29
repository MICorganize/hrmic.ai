"use client";

import { useCallback, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Grid3x3, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const INITIAL_FILTERS: Filters = {
  orgStructure: "ทั้งหมด",
  position: "ทั้งหมด",
  dataType: "ข้อมูลพื้นฐาน",
  employeeType: "ทั้งหมด",
  status: "ทั้งหมด",
  hashtag: "",
};

const ORG_STRUCTURES = ["ทั้งหมด", "สำนักงานใหญ่", "สาขา 1"];
const POSITIONS = ["ทั้งหมด", "พนักงานปฏิบัติการ", "หัวหน้างาน", "ผู้จัดการ"];
const DATA_TYPES = ["ข้อมูลพื้นฐาน", "ข้อมูลเงินเดือน", "ข้อมูลทั้งหมด"];
const EMPLOYEE_TYPES = ["ทั้งหมด", "พนักงานรายเดือน", "พนักงานรายวัน", "พนักงานพาร์ตไทม์"];
const STATUSES = ["ทั้งหมด", "ทำงาน", "ลาออก"];

/** Map the search card values to the API query params. */
function statusQuery(value: string): string | undefined {
  switch (value) {
    case "ทำงาน":
      return "active";
    case "ลาออก":
      return "terminated";
    default:
      return undefined;
  }
}

function employmentTypeQuery(value: string): string | undefined {
  const map: Record<string, string> = {
    "พนักงานรายเดือน": "permanent",
    "พนักงานรายวัน": "dailyWage",
    "พนักงานพาร์ตไทม์": "partTime",
    "พนักงานเหมาจ่าย": "contract",
  };
  return map[value];
}

/* ------------------------------ Field helpers ------------------------------ */

function SelectBox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer appearance-none rounded-[3px] border border-[#d9d9d9] bg-white pl-2.5 pr-8 text-sm text-[#555] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#40a9ff]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
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
      <label className="mb-0.5 block text-xs leading-5 text-[#666]">{label}</label>
      {children}
    </div>
  );
}

/* ------------------------------ Search card -------------------------------- */

function SearchCard({
  filters,
  onChange,
  onSearch,
  custom = false,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onSearch: () => void;
  custom?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex h-[59px] items-center px-3">
        <p className="text-xl font-medium text-[#555]">ค้นหา</p>
      </div>
      <CardContent className="px-[7px] pb-3 pt-[15px]">
        {/* Row 1: โครงสร้างองค์กร / ตำแหน่ง / ประเภทข้อมูล */}
        <div className="grid grid-cols-1 gap-x-2 gap-y-[7px] md:grid-cols-3">
          <Field label="โครงสร้างองค์กร">
            <SelectBox
              value={filters.orgStructure}
              options={ORG_STRUCTURES}
              onChange={(v) => onChange({ ...filters, orgStructure: v })}
            />
          </Field>
          <Field label="ตำแหน่ง">
            <SelectBox
              value={filters.position}
              options={POSITIONS}
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
        <div className="mt-0 grid grid-cols-1 gap-x-2 gap-y-[7px] md:grid-cols-3">
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
              className="h-8 rounded-[3px] border-[#d9d9d9] bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-[#40a9ff]"
            />
          </Field>
          {custom && <div />}
        </div>

        {/* Footer — right-aligned buttons (mr-8 per reference) */}
        <div className="mt-7 flex justify-end gap-2">
          <Button className="h-9 rounded-[3px] bg-[#43b14b] px-3.5 text-sm shadow-sm hover:bg-[#43b14b]/90">
            EXCEL
            <Grid3x3 className="size-4" />
          </Button>
          <Button
            className="h-9 rounded-[3px] bg-[#1890ff] px-3.5 text-sm shadow-sm hover:bg-[#1890ff]/90"
            onClick={onSearch}
          >
            ค้นหา
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------- Report table (รายงานปกติ) --------------------------- */

type CellAlign = "left" | "center" | "right";

const REPORT_COLUMNS: { label: string; align: CellAlign }[] = [
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
  { label: "วันเกิด", align: "right" },
  { label: "อายุ", align: "right" },
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
    <div className="max-h-[650px] overflow-auto rounded-md border border-border">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {REPORT_COLUMNS.map((col) => (
              <TableHead
                key={col.label}
                className={cn(
                  "whitespace-nowrap border-r border-white/20 bg-[#55b0ff] py-2.5 text-sm font-medium normal-case tracking-normal text-white last:border-r-0",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right"
                )}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow
              key={ri}
              className={cn(ri % 2 === 1 && "bg-muted/40", "hover:bg-muted/40")}
            >
              {row.map((cell, ci) => (
                <TableCell
                  key={ci}
                  className={cn(
                    "whitespace-nowrap border-r border-border py-2 text-sm font-light text-foreground last:border-r-0",
                    REPORT_COLUMNS[ci].align === "center" && "text-center",
                    REPORT_COLUMNS[ci].align === "right" && "text-right"
                  )}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
    <Card>
      <div className="px-3 pb-3 pt-4">
        <p className="text-xl font-bold text-[#4d4d4d]">รายงานทะเบียนพนักงาน</p>
      </div>
      <CardContent className="px-2 pb-2 pt-[21px]">
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
          <div className="flex h-[151px] flex-col items-center justify-center rounded-sm border border-[#e7edf3] bg-[#f4fcff]">
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
          <>
            <ReportTable rows={rows} />

            {/* Pagination — right-aligned, single page */}
            <div className="mt-4 flex items-center justify-end gap-1.5">
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
                className="size-8 rounded-md bg-[#2563eb] text-sm font-medium text-white shadow-sm"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Page ----------------------------------- */

export default function ReportEmployeeRegistryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("รายงานปกติ");
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      const status = statusQuery(f.status);
      const employmentType = employmentTypeQuery(f.employeeType);
      if (status) params.set("status", status);
      if (employmentType) params.set("employmentType", employmentType);
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
            <h1 className="text-2xl font-bold text-white">รายงานทะเบียนพนักงาน</h1>
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
        <div className="flex gap-8 px-6" role="tablist">
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
                  "relative whitespace-nowrap py-3.5 text-sm transition-colors",
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
      <div className="space-y-2.5 bg-[#f2f5fa] p-6 pt-[30px]">
        <SearchCard
          filters={filters}
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
