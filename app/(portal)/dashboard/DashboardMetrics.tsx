import type { ComponentType, ReactNode } from "react";
import {
  ChevronDown,
  CircleUserRound,
  ContactRound,
  UserCheck,
  UserRound,
  Users,
  VenusAndMars,
} from "lucide-react";

import type { DashboardEmployeeSummary } from "@/lib/employee/summary";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("overflow-hidden rounded-xl border border-[#e7eaf0] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]", className)}>{children}</section>;
}

function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="flex h-[51px] items-center justify-between border-b border-[#e8ebf1] px-4"><h2 className="text-sm font-semibold text-[#172348]">{title}</h2>{children}</div>;
}

function DateControl({ children = "ส.ค. 2569" }: { children?: ReactNode }) {
  return <button type="button" className="inline-flex h-7 items-center justify-between gap-1.5 rounded-md border border-[#dfe4ec] bg-white px-2 text-xs text-[#546177]"><span>{children}</span><ChevronDown className="size-3" /></button>;
}

function Sparkline() {
  return <svg viewBox="0 0 140 45" className="h-11 w-full" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,38 14,29 27,34 42,23 57,31 72,18 88,24 104,12 120,17 138,6" fill="none" stroke="rgba(255,255,255,.92)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function KpiCard({ label, value, helper, icon: Icon, gradient }: { label: string; value: string; helper: string; icon: Icon; gradient: string }) {
  return <section className={cn("relative min-h-[124px] overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-[0_6px_16px_rgba(20,40,80,.18)]", gradient)}><Icon className="absolute right-3 top-3 size-9 text-white/70" strokeWidth={1.7} /><p className="pr-9 text-sm font-medium text-white/90">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-[10px] font-medium text-white/90">{helper}</p><div className="absolute inset-x-3 bottom-1 opacity-90"><Sparkline /></div></section>;
}

function donutGradient(rows: ReadonlyArray<{ value: number; color: string }>, total: number) {
  if (total <= 0) return "conic-gradient(#e9eef5 0 100%)";
  let cursor = 0;
  const stops = rows.map((row) => {
    const start = cursor;
    cursor += (row.value / total) * 100;
    return `${row.color} ${start}% ${Math.min(cursor, 100)}%`;
  });
  if (cursor < 100) stops.push(`#e9eef5 ${cursor}% 100%`);
  return `conic-gradient(${stops.join(", ")})`;
}

function EmployeeOverview({ summary }: { summary: DashboardEmployeeSummary }) {
  const values = [summary.byGender.male, summary.byGender.female, summary.byGender.other];
  const max = Math.max(...values, 1);
  const rows = [
    ["เพศชาย", summary.byGender.male, "#1474ee"],
    ["เพศหญิง", summary.byGender.female, "#ed2473"],
    ["ไม่ระบุ", summary.byGender.other, "#8156e9"],
  ] as const;
  return <Card><PanelHeader title="จำนวนพนักงาน / เพศ"><DateControl /></PanelHeader><div className="grid min-h-[200px] grid-cols-[150px_1fr] items-center gap-5 p-4"><div className="relative mx-auto size-[132px] rounded-full" style={{ background: donutGradient(rows.map(([, value, color]) => ({ value, color })), summary.total) }}><div className="absolute inset-[25px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner"><Users className="size-7 text-[#1a3768]" /><strong className="mt-1 text-lg text-[#172348]">{summary.total}</strong><span className="text-[10px] text-[#7b8697]">พนักงาน</span></div></div><div className="space-y-4">{rows.map(([label, value, color]) => <div key={label}><div className="mb-1 flex items-center justify-between text-xs"><span className="text-[#34415b]">{label}</span><strong className="text-[#172348]">{value} คน</strong></div><div className="h-2 overflow-hidden rounded-full bg-[#edf1f6]"><div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} /></div></div>)}</div></div></Card>;
}

function DonutSummary({ title, total, rows }: { title: string; total: number; rows: Array<{ label: string; value: number; color: string }> }) {
  return <Card><PanelHeader title={title}><DateControl /></PanelHeader><div className="grid min-h-[200px] grid-cols-[132px_1fr] items-center gap-3 p-4"><div className="relative mx-auto size-[118px] rounded-full" style={{ background: donutGradient(rows, total) }}><div className="absolute inset-[23px] flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-lg text-[#172348]">{total}</strong><span className="text-[10px] text-[#7b8697]">คน</span></div></div><div className="space-y-3">{rows.map((row) => <div key={row.label} className="flex items-center gap-2 text-xs"><i className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} /><span className="min-w-0 flex-1 truncate text-[#34415b]">{row.label}</span><strong className="text-[#172348]">{row.value}</strong></div>)}</div></div></Card>;
}

function NewHireChart() {
  return <Card><PanelHeader title="เข้าใหม่ / ลาออก"><DateControl>ปี 2569</DateControl></PanelHeader><div className="px-4 pb-4 pt-5"><div className="flex h-[130px] items-end justify-around gap-4 border-b border-[#dfe5ee] px-6">{[30, 48, 34, 65, 43, 76, 55].map((value, index) => <div key={index} className="flex h-full flex-1 items-end gap-1"><div className="w-1/2 rounded-t bg-[#1474ee]" style={{ height: `${value}%` }} /><div className="w-1/2 rounded-t bg-[#ff9418]" style={{ height: `${Math.max(8, value - 32)}%` }} /></div>)}</div><div className="mt-3 flex justify-center gap-5 text-xs text-[#65728a]"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#1474ee]" />เข้าใหม่</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#ff9418]" />ลาออก</span></div></div></Card>;
}

function SalarySummary({ summary }: { summary: DashboardEmployeeSummary }) {
  const rows = [["พนักงานรายเดือน", summary.byEmploymentType.permanent ?? 0], ["พนักงานรายวัน", summary.byEmploymentType.dailyWage ?? 0], ["พนักงานพาร์ตไทม์", summary.byEmploymentType.partTime ?? 0]] as const;
  return <Card><PanelHeader title="เงินเดือน"><DateControl>ปี 2569</DateControl></PanelHeader><div className="p-4"><div className="grid grid-cols-2 gap-4 rounded-lg bg-[#f6f8fc] p-3"><div><p className="text-xs text-[#6f7b90]">เงินเดือน</p><p className="mt-1 text-xl font-semibold text-[#1474ee]">— <span className="text-xs">บาท</span></p></div><div><p className="text-xs text-[#6f7b90]">เดือน ส.ค.</p><p className="mt-1 text-xl font-semibold text-[#172348]">0 <span className="text-xs">บาท</span></p></div></div><div className="mt-2 divide-y divide-[#edf0f4]">{rows.map(([label, value]) => <div key={label} className="flex h-9 items-center justify-between text-xs"><span className="text-[#4b5870]">{label}</span><strong className="text-[#172348]">{value} คน</strong></div>)}</div></div></Card>;
}

export default function DashboardMetrics({ summary }: { summary: DashboardEmployeeSummary }) {
  const permanent = summary.byEmploymentType.permanent ?? 0;
  const contract = summary.byEmploymentType.contract ?? 0;
  const nationalityRows = summary.byNationality.length > 0
    ? summary.byNationality.slice(0, 4).map((item, index) => ({ label: item.nationality, value: item.count, color: ["#1474ee", "#30b750", "#ff9418", "#8156e9"][index] }))
    : [{ label: "ไม่มีข้อมูล", value: 0, color: "#1474ee" }];

  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <KpiCard label="พนักงานทั้งหมด" value={`${summary.total} คน`} helper="ข้อมูลพนักงานปัจจุบัน" icon={Users} gradient="from-[#5848ed] to-[#7339f3]" />
      <KpiCard label="พนักงานชาย" value={`${summary.byGender.male} คน`} helper="ข้อมูลตามเพศ" icon={UserRound} gradient="from-[#03a759] to-[#0bc479]" />
      <KpiCard label="พนักงานหญิง" value={`${summary.byGender.female} คน`} helper="ข้อมูลตามเพศ" icon={CircleUserRound} gradient="from-[#ff8b16] to-[#ffa415]" />
      <KpiCard label="ไม่ระบุเพศ" value={`${summary.byGender.other} คน`} helper="ข้อมูลตามเพศ" icon={VenusAndMars} gradient="from-[#1474ee] to-[#1497f4]" />
      <KpiCard label="พนักงานรายเดือน" value={`${permanent} คน`} helper="ข้อมูลประเภทพนักงาน" icon={UserCheck} gradient="from-[#ed2473] to-[#f20b9a]" />
      <KpiCard label="พนักงานเหมาจ่าย" value={`${contract} คน`} helper="ข้อมูลประเภทพนักงาน" icon={ContactRound} gradient="from-[#09aeb5] to-[#13c3c4]" />
    </div>

    <div className="mt-3 grid gap-3 xl:grid-cols-[1.45fr_.9fr_1fr]">
      <EmployeeOverview summary={summary} />
      <DonutSummary title="ประเภทพนักงาน" total={summary.total} rows={[{ label: "รายเดือน", value: permanent, color: "#1474ee" }, { label: "เหมาจ่าย", value: contract, color: "#30b750" }, { label: "รายวัน", value: summary.byEmploymentType.dailyWage ?? 0, color: "#ff9418" }, { label: "พาร์ตไทม์", value: summary.byEmploymentType.partTime ?? 0, color: "#8156e9" }]} />
      <DonutSummary title="สัญชาติ" total={summary.total} rows={nationalityRows} />
    </div>

    <div className="mt-3 grid gap-3 xl:grid-cols-2">
      <NewHireChart />
      <SalarySummary summary={summary} />
    </div>
  </>;
}
