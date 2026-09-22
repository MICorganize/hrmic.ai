"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  Cake,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Gauge,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatThaiYear } from "@/lib/date/thai-date";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

type DashboardSummary = {
  total: number;
  byGender: { male: number; female: number; other: number };
  byEmploymentType: Record<string, number>;
  byNationality: { nationality: string; count: number }[];
};

const EMPTY_SUMMARY: DashboardSummary = {
  total: 0,
  byGender: { male: 0, female: 0, other: 0 },
  byEmploymentType: {},
  byNationality: [],
};

const NAV_ITEMS: Array<{ label: string; icon: Icon; href?: string }> = [
  { label: "ภาพรวม", icon: Gauge, href: "/dashboard4" },
  { label: "ข้อมูลพนักงาน", icon: Users, href: "/organization/organization-employee" },
  { label: "เวลาทำงาน", icon: CalendarCheck2 },
  { label: "การลา", icon: ClipboardList },
  { label: "เงินเดือน", icon: WalletCards },
  { label: "ประสิทธิภาพ", icon: BarChart3 },
  { label: "สรรหาบุคลากร", icon: UserPlus },
  { label: "รายงาน", icon: FileBarChart },
  { label: "ตั้งค่า", icon: Settings },
];

const RECENT_EMPLOYEES = [
  { name: "อัครเดช ทองดี", department: "ผลิตภัณฑ์", position: "UX/UI Designer", status: "ทำงานอยู่" },
  { name: "สโรชา บุญมี", department: "การตลาด", position: "Marketing Manager", status: "ทำงานอยู่" },
  { name: "อุสมาน มาลิก", department: "ฝ่ายขาย", position: "Sales Executive", status: "ทำงานอยู่" },
  { name: "หทัยรัตน์ ศรีสุข", department: "ทรัพยากรบุคคล", position: "HR Specialist", status: "ลางาน" },
  { name: "ริศวาน อาหมัด", department: "การเงิน", position: "Accountant", status: "ทำงานอยู่" },
];

const BIRTHDAYS = [
  { name: "สโรชา บุญมี", date: "25 ก.ย." },
  { name: "อุสมาน มาลิก", date: "28 ก.ย." },
  { name: "หทัยรัตน์ ศรีสุข", date: "02 ต.ค." },
  { name: "ริศวาน อาหมัด", date: "05 ต.ค." },
];

const AVATAR_TONES = [
  "from-[#4c66d8] to-[#273d9e]",
  "from-[#dd8c5f] to-[#9f4f36]",
  "from-[#42a9a1] to-[#24766f]",
  "from-[#d46d92] to-[#8e355a]",
  "from-[#8b6bde] to-[#55419d]",
];

function Avatar({ name, index, size = "md" }: { name: string; index: number; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm",
        AVATAR_TONES[index % AVATAR_TONES.length],
        size === "sm" ? "size-8 text-[10px]" : "size-9 text-[11px]",
      )}
    >
      {name.replace(/\s+/g, "").slice(0, 2)}
    </span>
  );
}

function Brand() {
  return (
    <Link href="/dashboard4" className="flex items-center gap-2.5" aria-label="HRMic dashboard">
      <span className="relative flex size-9 items-center justify-center text-[#8c63ff]">
        <Users className="size-8 fill-current" strokeWidth={1.8} />
        <Sparkles className="absolute -right-1 -top-0.5 size-3 text-[#d5c7ff]" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">
        HRMic<span className="text-[#8c63ff]">.ai</span>
      </span>
    </Link>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#080d22]/60 backdrop-blur-sm lg:hidden"
          aria-label="ปิดเมนู"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col bg-[#111a36] text-white shadow-[14px_0_38px_rgba(10,18,44,.12)] transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[78px] items-center justify-between px-6">
          <Brand />
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/70 lg:hidden" aria-label="ปิดเมนู">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-3 [scrollbar-width:none]" aria-label="เมนูหลัก">
          {NAV_ITEMS.map((item) => {
            const NavIcon = item.icon;
            const active = item.label === "ภาพรวม";
            const className = cn(
              "flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 text-sm font-medium transition-colors",
              active
                ? "bg-gradient-to-r from-[#6e50ed] to-[#8559ff] text-white shadow-[0_8px_20px_rgba(113,78,238,.28)]"
                : "text-[#aeb7d0] hover:bg-white/[.06] hover:text-white",
            );
            const body = (
              <>
                <NavIcon className="size-[18px]" strokeWidth={1.8} />
                <span>{item.label}</span>
              </>
            );
            return item.href ? (
              <Link key={item.label} href={item.href} onClick={onClose} className={className} aria-current={active ? "page" : undefined}>
                {body}
              </Link>
            ) : (
              <button key={item.label} type="button" onClick={onClose} className={className}>
                {body}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button type="button" className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[.05]">
            <Avatar name="มนัสวี พรชัย" index={1} />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-semibold text-white">มนัสวี พรชัย</strong>
              <span className="mt-0.5 block text-[10px] text-[#98a4c1]">HR Manager</span>
            </span>
            <ChevronRight className="size-4 text-[#8c97b4]" />
          </button>
        </div>
      </aside>
    </>
  );
}

function KpiCard({ title, value, change, icon: KpiIcon, tone, negative = false }: { title: string; value: string; change: string; icon: Icon; tone: string; negative?: boolean }) {
  return (
    <Card className="rounded-2xl border-[#e8eaf2] bg-white shadow-[0_8px_26px_rgba(24,35,65,.045)]">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#6e778c]">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#17213c]">{value}</p>
          <p className={cn("mt-2 flex items-center gap-1 text-[11px]", negative ? "text-[#ef5f62]" : "text-[#27aa68]")}>
            {negative ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
            <strong>{change}</strong>
            <span className="text-[#9299a9]">เทียบเดือนก่อน</span>
          </p>
        </div>
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", tone)}>
          <KpiIcon className="size-6" strokeWidth={1.8} />
        </span>
      </CardContent>
    </Card>
  );
}

function EmployeeOverviewChart({ total }: { total: number }) {
  const ceiling = Math.max(total, 1);
  const monthly = [0.44, 0.51, 0.64, 0.49, 0.62, 0.57, 0.78, 0.6, 0.86, 0.69, 0.77, 1, 0.86];
  const points = monthly.map((ratio, index) => `${(index / 12) * 600},${196 - ratio * 155}`).join(" ");
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  return (
    <div className="relative mt-5 h-[230px] overflow-hidden" role="img" aria-label={`กราฟจำนวนพนักงาน สูงสุด ${ceiling} คน`}>
      <div className="absolute inset-x-0 top-1 bottom-8 flex flex-col justify-between" aria-hidden="true">
        {[ceiling, Math.round(ceiling * 0.75), Math.round(ceiling * 0.5), Math.round(ceiling * 0.25), 0].map((label, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <span className="w-8 text-right text-[10px] text-[#99a1b3]">{label}</span>
            <i className="flex-1 border-t border-dashed border-[#e9ebf2]" />
          </div>
        ))}
      </div>
      <svg viewBox="0 0 600 205" preserveAspectRatio="none" className="absolute left-10 right-0 top-0 h-[197px] w-[calc(100%-2.5rem)]" aria-hidden="true">
        <defs>
          <linearGradient id="dashboard4-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7658f5" stopOpacity=".22" />
            <stop offset="1" stopColor="#7658f5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,196 ${points} 600,196`} fill="url(#dashboard4-area)" />
        <polyline points={points} fill="none" stroke="#7658f5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {monthly.map((ratio, index) => (
          <circle key={index} cx={(index / 12) * 600} cy={196 - ratio * 155} r="4" fill="#7658f5" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="absolute inset-x-10 bottom-0 flex justify-between text-[9px] text-[#8f97aa]">
        {months.map((month) => <span key={month}>{month}</span>)}
      </div>
    </div>
  );
}

function DistributionChart({ groups, total }: { groups: Array<{ label: string; count: number; color: string }>; total: number }) {
  let accumulated = 0;
  const stops = groups.map((group) => {
    const start = accumulated;
    accumulated += total ? (group.count / total) * 100 : 0;
    return `${group.color} ${start}% ${accumulated}%`;
  });
  const donut = total ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#eceef5 0 100%)";

  return (
    <div className="mt-5 grid items-center gap-6 sm:grid-cols-[148px_1fr]">
      <div className="relative mx-auto flex size-[148px] items-center justify-center rounded-full" style={{ background: donut }}>
        <div className="flex size-[92px] flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_#f0f1f5]">
          <strong className="text-2xl font-bold text-[#19233e]">{total}</strong>
          <span className="text-[10px] text-[#9299aa]">ทั้งหมด</span>
        </div>
      </div>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label} className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-xs">
            <i className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} />
            <span className="truncate text-[#667087]">{group.label}</span>
            <strong className="font-semibold text-[#39435c]">{total ? Math.round((group.count / total) * 100) : 0}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("rounded-2xl border-[#e8eaf2] bg-white shadow-[0_8px_26px_rgba(24,35,65,.045)]", className)}>
      <CardHeader className="flex-row items-center justify-between gap-3 px-5 pb-1 pt-5">
        <CardTitle className="text-[15px] font-semibold text-[#1d2741]">{title}</CardTitle>
        {action}
      </CardHeader>
      {children}
    </Card>
  );
}

export default function Dashboard4Client({ summary: suppliedSummary, companyName, loading = false }: { summary?: DashboardSummary | null; companyName?: string | null; loading?: boolean }) {
  const summary = suppliedSummary ?? EMPTY_SUMMARY;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [year, setYear] = useState(2026);
  const [query, setQuery] = useState("");

  const permanent = summary.byEmploymentType.permanent ?? 0;
  const daily = summary.byEmploymentType.dailyWage ?? 0;
  const contract = (summary.byEmploymentType.contract ?? 0) + (summary.byEmploymentType.temporary ?? 0);
  const partTime = summary.byEmploymentType.partTime ?? 0;
  const classified = permanent + daily + contract + partTime;
  const other = Math.max(0, summary.total - classified);
  const groups = useMemo(() => [
    { label: "รายเดือน", count: permanent, color: "#7058f4" },
    { label: "รายวัน", count: daily, color: "#37c4ac" },
    { label: "สัญญาจ้าง", count: contract, color: "#ffc13d" },
    { label: "พาร์ตไทม์", count: partTime, color: "#f25e87" },
    { label: "อื่น ๆ", count: other, color: "#5a8ff0" },
  ], [contract, daily, other, partTime, permanent]);
  const filteredEmployees = RECENT_EMPLOYEES.filter((employee) => `${employee.name} ${employee.department} ${employee.position}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f8f9fd] font-sans">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:pl-[232px]">
        <header className="sticky top-0 z-30 flex h-[78px] items-center gap-3 border-b border-[#e9ebf2] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-7">
          <button type="button" onClick={() => setSidebarOpen(true)} className="flex size-10 items-center justify-center rounded-xl border border-[#e4e7ef] text-[#39435c] lg:hidden" aria-label="เปิดเมนู">
            <Menu className="size-5" />
          </button>
          <label className="relative hidden w-full max-w-[340px] md:block">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9aa2b4]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-[#e5e7ef] bg-[#fafbfe] pl-10 pr-4 text-sm text-[#2f3953] outline-none transition focus:border-[#8568f2] focus:ring-2 focus:ring-[#8568f2]/10" placeholder="ค้นหาพนักงาน..." />
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="relative flex size-10 items-center justify-center rounded-xl text-[#4b556f] hover:bg-[#f3f4f8]" aria-label="การแจ้งเตือน">
              <Bell className="size-5" />
              <i className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-[#ef5465]" />
            </button>
            <Avatar name="มนัสวี พรชัย" index={1} size="sm" />
          </div>
        </header>

        <div className="mx-auto max-w-[1540px] p-4 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#17213b]">ภาพรวมองค์กร</h1>
              <p className="mt-1 text-sm text-[#81899c]">ยินดีต้อนรับกลับ, มนัสวี · {companyName ?? "HRMic.ai"}</p>
            </div>
            <button type="button" onClick={() => setYear((value) => value === 2026 ? 2025 : 2026)} className="flex h-10 w-fit items-center gap-2 rounded-xl border border-[#e1e4ec] bg-white px-3.5 text-xs font-medium text-[#596278] shadow-sm">
              <CalendarDays className="size-4 text-[#7558ef]" />ปี {formatThaiYear(year)}<ChevronDown className="size-3.5" />
            </button>
          </div>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="ตัวชี้วัดหลัก">
            <KpiCard title="พนักงานทั้งหมด" value={loading ? "—" : summary.total.toLocaleString("th-TH")} change="8.5%" icon={Users} tone="bg-[#efeaff] text-[#7152ef]" />
            <KpiCard title="มาทำงานวันนี้" value={loading ? "—" : summary.total.toLocaleString("th-TH")} change="6.3%" icon={UserCheck} tone="bg-[#e6f8e8] text-[#34ad5a]" />
            <KpiCard title="ลางานวันนี้" value="0" change="2.1%" icon={UserMinus} tone="bg-[#fff0e6] text-[#f07a2d]" negative />
            <KpiCard title="ตำแหน่งที่เปิดรับ" value="2" change="3.0%" icon={BriefcaseBusiness} tone="bg-[#e9f0ff] text-[#4b72e9]" />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <Panel title="ภาพรวมจำนวนพนักงาน" action={<button type="button" onClick={() => setYear((value) => value === 2026 ? 2025 : 2026)} className="flex items-center gap-1 rounded-lg border border-[#e4e6ee] px-2.5 py-1.5 text-[11px] text-[#687187]">ปี {formatThaiYear(year)}<ChevronDown className="size-3" /></button>}>
              <CardContent className="px-5 pb-5 pt-0"><EmployeeOverviewChart total={summary.total} /></CardContent>
            </Panel>
            <Panel title="สัดส่วนประเภทพนักงาน" action={<Badge className="border-0 bg-[#f0ecff] text-[10px] font-medium text-[#6d50e6]">ข้อมูลปัจจุบัน</Badge>}>
              <CardContent className="px-5 pb-6 pt-0"><DistributionChart groups={groups} total={summary.total} /></CardContent>
            </Panel>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
      <Panel title="พนักงานล่าสุด" action={<Link href="/organization/organization-employee" className="flex items-center gap-1 text-xs font-semibold text-[#6e50e8]">ดูพนักงานทั้งหมด<ChevronRight className="size-3.5" /></Link>}>
              <CardContent className="overflow-x-auto px-5 pb-4 pt-2">
                <table className="w-full min-w-[650px] border-collapse text-left">
                  <thead><tr className="border-b border-[#eceef4] text-[11px] font-medium text-[#9299aa]"><th className="pb-3">ชื่อพนักงาน</th><th className="pb-3">แผนก</th><th className="pb-3">ตำแหน่ง</th><th className="pb-3 text-right">สถานะ</th></tr></thead>
                  <tbody>
                    {filteredEmployees.map((employee, index) => (
                      <tr key={employee.name} className="border-b border-[#f0f1f5] last:border-0">
                        <td className="py-3"><div className="flex items-center gap-3"><Avatar name={employee.name} index={index} size="sm" /><span className="text-xs font-semibold text-[#303a53]">{employee.name}</span></div></td>
                        <td className="py-3 text-xs text-[#697287]">{employee.department}</td>
                        <td className="py-3 text-xs text-[#697287]">{employee.position}</td>
                        <td className="py-3 text-right"><Badge className={cn("border-0 text-[10px] font-medium", employee.status === "ทำงานอยู่" ? "bg-[#e9f8ed] text-[#2b9e51]" : "bg-[#fff0f0] text-[#df575d]")}>{employee.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredEmployees.length && <p className="py-10 text-center text-sm text-[#9098aa]">ไม่พบพนักงานที่ค้นหา</p>}
              </CardContent>
            </Panel>

            <Panel title="วันเกิดที่กำลังมาถึง" action={<button type="button" className="text-xs font-semibold text-[#6e50e8]">ดูทั้งหมด</button>}>
              <CardContent className="divide-y divide-[#eff0f5] px-5 pb-3 pt-2">
                {BIRTHDAYS.map((employee, index) => (
                  <div key={employee.name} className="flex items-center gap-3 py-3">
                    <Avatar name={employee.name} index={index + 1} size="sm" />
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#303a53]">{employee.name}</p><p className="mt-0.5 text-[10px] text-[#9299aa]">พนักงานในองค์กร</p></div>
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#606980]"><Cake className="size-3.5 text-[#7658ee]" />{employee.date}</span>
                  </div>
                ))}
              </CardContent>
            </Panel>
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { title: "เอกสารทั้งหมด", value: "2 ฉบับ", detail: "เปลี่ยนวันหยุด 2 ฉบับ", icon: ClipboardList, tone: "bg-[#f0ecff] text-[#6f50e9]" },
              { title: "ความพร้อมระบบ", value: "99.9%", detail: "ทุกบริการทำงานปกติ", icon: ShieldCheck, tone: "bg-[#e9f8ed] text-[#2ba45a]" },
              { title: "สัญชาติพนักงาน", value: `${summary.byNationality.length || 1} กลุ่ม`, detail: summary.byNationality[0]?.nationality ?? "ไม่มีข้อมูล", icon: Users, tone: "bg-[#eaf1ff] text-[#5078e4]" },
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                <Card key={item.title} className="rounded-2xl border-[#e8eaf2] bg-white shadow-[0_8px_26px_rgba(24,35,65,.045)]">
                  <CardContent className="flex items-center gap-4 p-5"><span className={cn("flex size-11 items-center justify-center rounded-xl", item.tone)}><ItemIcon className="size-5" /></span><div><p className="text-xs text-[#7c8599]">{item.title}</p><p className="mt-1 text-lg font-bold text-[#25304a]">{item.value}</p><p className="mt-0.5 text-[10px] text-[#9aa1b0]">{item.detail}</p></div></CardContent>
                </Card>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}
