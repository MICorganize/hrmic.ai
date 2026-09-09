"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import {
  getPreloadedDashboardEmployeeSummary,
  preloadDashboardEmployeeSummary,
  type DashboardEmployeeSummary,
} from "@/lib/employee/dashboard-summary-client";
import { cn } from "@/lib/utils";

const EMPTY_SUMMARY: DashboardEmployeeSummary = {
  total: 0,
  byGender: { male: 0, female: 0, other: 0 },
  byEmploymentType: {},
  byNationality: [],
};

function DateControl({ children = "ส.ค. 2026" }: { children?: React.ReactNode }) {
  return <button type="button" className="inline-flex h-8 w-[80px] items-center justify-between gap-2 rounded border border-[#dfe4e8] bg-white px-2 text-sm font-medium leading-[22.001px] text-[#66717c]"><span className="truncate">{children}</span><CalendarDays className="size-3.5 shrink-0" strokeWidth={1.5} /></button>;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("overflow-hidden rounded-lg border border-[#e5e9ed] bg-white text-sm font-medium leading-[22.001px] shadow-[0_1px_2px_rgba(0,0,0,0.14)]", className)}>{children}</section>;
}

function EmployeeAge({ summary }: { summary: DashboardEmployeeSummary }) {
  const ages = ["มากกว่า 60 ปี", "46 - 60 ปี", "31 - 45 ปี", "21 - 30 ปี", "15 - 20 ปี", "ไม่ระบุวันเกิด"];
  return <Card className="h-[188px] p-[15.2px]"><div className="flex items-center justify-between"><h2 className="text-base font-bold leading-[25.144px] text-[#414852]">จำนวนพนักงาน/ช่วงอายุ</h2><DateControl /></div><div className="mt-3 grid grid-cols-[158px_1fr] gap-3"><div className="grid grid-cols-3 text-center"><div><p className="text-[29px] leading-none text-[#8ec5fc]">♂</p><b className="text-xl text-[#63aff1]">{summary.byGender.male}</b></div><div><p className="text-[29px] leading-none text-[#ef9fbd]">♀</p><b className="text-xl text-[#de789f]">{summary.byGender.female}</b></div><div><p className="text-[29px] leading-none text-[#999]">⚥</p><b className="text-xl text-[#777]">{summary.byGender.other}</b></div><p className="col-span-3 mt-3 text-[20px] font-semibold text-[#4d555e]">รวม <span className="text-[#61aef1]">{summary.total}</span> คน</p></div><div><div className="mb-2 flex justify-end gap-4 text-xs text-[#555d66]"><span className="inline-flex items-center gap-1"><i className="size-3 rounded-full bg-[#0b9df4]" />เพศชาย</span><span className="inline-flex items-center gap-1"><i className="size-3 rounded-full bg-[#f77b84]" />เพศหญิง</span><span className="inline-flex items-center gap-1"><i className="size-3 rounded-full bg-[#818181]" />ไม่ระบุ</span></div><div className="grid grid-cols-[65px_1fr] text-xs"><div className="flex h-[107px] flex-col justify-between text-right text-[#606973]">{ages.map((age) => <span key={age}>{age}</span>)}</div><div className="relative ml-2 h-[107px] border-l border-[#e3e7eb]" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0, transparent 25%, #e8ebed 25.5%, transparent 26%)" }}><div className="absolute left-0 top-[30px] h-2 w-full bg-[#0b99ed]" /><span className="absolute -bottom-4 left-0 text-[11px] text-[#777]">0</span><span className="absolute -bottom-4 right-0 text-[11px] text-[#777]">0.6</span></div></div></div></div></Card>;
}

function Donut({ color, items, total }: { color: string; items: { name: string; value: string; dot: string }[]; total: number }) {
  return <div className="flex items-center gap-3"><div className="relative size-[108px] shrink-0 rounded-full" style={{ background: `conic-gradient(${color} 0 360deg, #dcedfb 0)` }}><div className="absolute inset-[15px] grid place-items-center rounded-full bg-white text-[16px] font-semibold text-[#353b42]">{total} คน</div></div><div className="min-w-0 space-y-0.5 text-[13px] leading-4 text-[#515963]">{items.map((item) => <p key={item.name} className="flex items-center gap-1"><i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.dot }} /><span>{item.name}</span><span className="ml-auto">{item.value}</span></p>)}</div></div>;
}

function SummaryCard({ title, type, summary }: { title: string; type: "employee" | "nationality"; summary: DashboardEmployeeSummary }) {
  const employee = [{ name: "พนักงานรายเดือน", value: `${summary.byEmploymentType.permanent ?? 0} คน`, dot: "#9fd6f9" }, { name: "พนักงานเหมาจ่าย", value: `${summary.byEmploymentType.contract ?? 0} คน`, dot: "#0d5ca8" }, { name: "พนักงานรายวัน", value: `${summary.byEmploymentType.dailyWage ?? 0} คน`, dot: "#f7a44d" }, { name: "พนักงานพาร์ตไทม์", value: `${summary.byEmploymentType.partTime ?? 0} คน`, dot: "#e9d66b" }];
  const nationality = summary.byNationality.length ? summary.byNationality.slice(0, 3).map((item, index) => ({ name: item.nationality, value: `${item.count} คน`, dot: ["#159cf0", "#ff9d22", "#83d2f4"][index] })) : [{ name: "ไม่มีข้อมูล", value: "0 คน", dot: "#159cf0" }];
  return <Card className="h-[188px] p-[15.2px]"><div className="mb-2 flex items-center justify-between"><h2 className="text-base font-bold leading-[25.144px] text-[#414852]">{title}</h2><DateControl /></div><Donut color={type === "employee" ? "#9fd6f9" : "#159cf0"} total={summary.total} items={type === "employee" ? employee : nationality} /></Card>;
}

function SmallChartCard() {
  return <Card className="h-[388px] p-[15.2px]"><div className="flex items-start justify-between"><h2 className="text-base font-bold leading-[25.144px] text-[#414852]">เข้าใหม่/ลาออก</h2><DateControl>2026</DateControl></div><div className="mt-16 flex h-44 items-end justify-center gap-6"><div className="h-20 w-12 rounded-t bg-[#129cf0]" /><div className="h-3 w-12 rounded-t bg-[#ff7900]" /></div><div className="flex justify-center gap-5 text-sm text-[#69737e]"><span className="inline-flex items-center gap-1"><i className="size-3 bg-[#129cf0]" />เข้าใหม่</span><span className="inline-flex items-center gap-1"><i className="size-3 bg-[#ff7900]" />ลาออก</span></div></Card>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-[#edf0f3] py-2 text-[13px] leading-[19px] text-[#56616b] last:border-0"><span>{label}</span><strong className="font-medium text-[#4b545d]">{value}</strong></div>;
}

function SalarySummary({ summary }: { summary: DashboardEmployeeSummary }) {
  return <Card className="h-[388px] p-[15.2px]"><div className="flex items-start justify-between"><h2 className="text-base font-bold leading-[25.144px] text-[#414852]">เงินเดือน</h2><DateControl>ปี 2026</DateControl></div><div className="mt-9 grid grid-cols-2 gap-8 border-b border-[#e8edf1] pb-7"><div><p className="text-sm text-[#69737e]">เงินเดือน</p><p className="mt-2 text-[29px] font-medium leading-none text-[#1a9dec]">— <span className="text-base">บาท</span></p></div><div><p className="text-sm text-[#69737e]">เดือน ส.ค.</p><p className="mt-2 text-[29px] font-medium leading-none text-[#69737e]">0 <span className="text-base">บาท</span></p></div></div><div className="mt-4"><SummaryLine label="พนักงานรายเดือน" value={`${summary.byEmploymentType.permanent ?? 0} คน`} /><SummaryLine label="พนักงานรายวัน" value={`${summary.byEmploymentType.dailyWage ?? 0} คน`} /><SummaryLine label="พนักงานพาร์ตไทม์" value={`${summary.byEmploymentType.partTime ?? 0} คน`} /></div></Card>;
}

export default function DashboardMetrics() {
  const [summary, setSummary] = useState<DashboardEmployeeSummary>(() => getPreloadedDashboardEmployeeSummary() ?? EMPTY_SUMMARY);
  const [summaryPending, setSummaryPending] = useState(() => !getPreloadedDashboardEmployeeSummary());
  useEffect(() => {
    // The lazy-state initializers above already consume a snapshot that was
    // available during render. Avoid a synchronous effect update, which would
    // add a needless render to the dashboard's first paint.
    if (getPreloadedDashboardEmployeeSummary()) return;
    let cancelled = false;
    void preloadDashboardEmployeeSummary().then((value) => { if (!cancelled) setSummary(value.summary); }).catch(() => undefined).finally(() => { if (!cancelled) setSummaryPending(false); });
    return () => { cancelled = true; };
  }, []);
  return <><div aria-busy={summaryPending} className={cn("space-y-3", summaryPending && "animate-pulse")}><EmployeeAge summary={summary} /><div className="grid gap-3 sm:grid-cols-2"><SummaryCard title="ประเภทพนักงาน" type="employee" summary={summary} /><SummaryCard title="สัญชาติ" type="nationality" summary={summary} /></div><SmallChartCard /></div><div aria-busy={summaryPending} className={cn(summaryPending && "animate-pulse")}><SalarySummary summary={summary} /></div></>;
}
