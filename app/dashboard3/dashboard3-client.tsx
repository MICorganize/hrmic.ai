"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileBarChart,
  FileText,
  Fingerprint,
  GraduationCap,
  Home,
  Inbox,
  ListChecks,
  Menu,
  MessageSquareText,
  Phone,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const NAV_ITEMS: Array<{ label: string; icon: Icon; href?: string; badge?: string }> = [
  { label: "ภาพรวม", icon: Home, href: "/dashboard3" },
  { label: "ข้อมูลพนักงาน", icon: Users, href: "/organization/organization-employee" },
  { label: "เวลาและการลา", icon: CalendarCheck2 },
  { label: "เงินเดือน", icon: WalletCards },
  { label: "เอกสาร", icon: FileText, badge: "2" },
  { label: "สรรหาบุคลากร", icon: UserPlus },
  { label: "การอบรม", icon: GraduationCap },
  { label: "รายงาน", icon: FileBarChart },
  { label: "ระบบอัตโนมัติ", icon: Zap },
  { label: "ตั้งค่า", icon: Settings },
];

const DOCUMENTS = [
  ["เปลี่ยนวันหยุด", "2", "bg-[#e9f9f3] text-[#25a97a]"],
  ["ลางาน", "0", "bg-[#eef0ff] text-[#5f50db]"],
  ["โอที", "0", "bg-[#fff0f2] text-[#e55770]"],
  ["เพิ่มเวลา", "0", "bg-[#eef7ff] text-[#3f83dc]"],
  ["เปลี่ยนกะ", "0", "bg-[#fff7e8] text-[#df982b]"],
];

const SUPPORT_MESSAGES = [
  ["คำขอลาพักร้อน", "กัญญารัตน์ สุขใจ", "2 นาที", "2"],
  ["สอบถามเงินเดือน", "ธนพล มีทรัพย์", "5 นาที", "1"],
  ["แก้ไขเวลาเข้างาน", "ปาริชาติ วัฒนะ", "12 นาที", ""],
  ["ขอหนังสือรับรอง", "วรพล แสงทอง", "18 นาที", ""],
  ["สวัสดิการพนักงาน", "ชุติมา รุ่งเรือง", "25 นาที", ""],
];

const ATTENDANCE = [
  ["08:30", "กัญญารัตน์ สุขใจ", "ลงเวลา/สแกนใบหน้า", "สำเร็จ"],
  ["08:42", "ธนพล มีทรัพย์", "ลงเวลา/สแกนใบหน้า", "สำเร็จ"],
  ["08:51", "ปาริชาติ วัฒนะ", "ลงเวลา/สแกนใบหน้า", "มาสาย"],
  ["09:00", "วรพล แสงทอง", "ลงเวลา/สแกนใบหน้า", "สำเร็จ"],
  ["09:12", "ชุติมา รุ่งเรือง", "ลงเวลา/สแกนใบหน้า", "มาสาย"],
];

const PAYROLL_ACTIVITY = [
  ["พนักงานรายเดือน", "คำนวณเงินเดือน ส.ค. 2569", "วันนี้"],
  ["ภาษี ภงด.1", "ยอดรวม 0.00 บาท", "วันนี้"],
  ["ประกันสังคม", "ยอดรวม 0.00 บาท", "เมื่อวาน"],
  ["เงินเดือนตามสำนักงาน", "อัปเดตผลคำนวณแล้ว", "2 วัน"],
  ["สรุปเวลาทำงาน", "ลงเวลา/สแกนใบหน้า 100%", "3 วัน"],
];

function Logo() {
  return (
    <Link href="/dashboard3" className="flex items-center gap-2.5" aria-label="HRMic.ai Dashboard">
      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#8a50f3] to-[#486df0] shadow-[0_8px_24px_rgba(102,65,224,.35)]">
        <Sparkles className="size-5 text-white" />
      </span>
      <span className="text-xl font-semibold tracking-tight text-white">HRMic<span className="text-[#a986ff]">.ai</span></span>
    </Link>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <button type="button" onClick={onClose} className="fixed inset-0 z-40 bg-[#060829]/60 backdrop-blur-sm lg:hidden" aria-label="ปิดเมนู" />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col bg-[#11134e] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-[76px] items-center justify-between px-4"><Logo /><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden" aria-label="ปิดเมนู"><X className="size-5" /></button></div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 [scrollbar-width:none]" aria-label="เมนูหลัก">
          {NAV_ITEMS.map((item) => {
            const NavIcon = item.icon;
            const active = item.label === "ภาพรวม";
            const classes = cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors", active ? "bg-[#2b286f] text-white shadow-[inset_3px_0_0_#8c5af2]" : "text-[#c3c7e1] hover:bg-white/[0.06] hover:text-white");
            const body = <><NavIcon className={cn("size-[18px]", active ? "text-[#a382ff]" : "text-[#979fc8]")} /><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.badge && <span className="flex size-5 items-center justify-center rounded-full bg-[#29bd83] text-[10px] font-bold text-white">{item.badge}</span>}</>;
            return item.href ? <Link key={item.label} href={item.href} onClick={onClose} className={classes} aria-current={active ? "page" : undefined}>{body}</Link> : <button key={item.label} type="button" onClick={onClose} className={classes}>{body}</button>;
          })}
        </nav>
        <div className="mx-3 mb-4 rounded-xl border border-[#373778] bg-[#1a1c5c] p-3">
          <div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-full bg-[#7652e8]"><Bot className="size-5" /></span><div><p className="text-sm font-semibold">HRMic Assistant</p><p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#8ee3bd]"><i className="size-1.5 rounded-full bg-[#38d797]" />ออนไลน์</p></div></div>
          <div className="mt-3 flex h-8 items-center gap-0.5" aria-hidden="true">{[10,18,8,24,14,30,18,26,12,20,8,16,26,12,20,7,15,23,11,17].map((height, index) => <i key={index} className="w-1 rounded-full bg-gradient-to-t from-[#6d50e7] to-[#48b8f0]" style={{ height }} />)}</div>
        </div>
      </aside>
    </>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <Card className={cn("overflow-hidden rounded-xl border-[#e8e9f1] bg-white shadow-[0_5px_20px_rgba(29,31,77,.045)]", className)}><CardHeader className="flex-row items-center justify-between gap-3 px-4 pb-3 pt-4"><CardTitle className="text-base font-bold text-[#1e2441]">{title}</CardTitle>{action}</CardHeader>{children}</Card>;
}

function KpiCard({ label, value, detail, icon: KpiIcon, tone, change, down = false }: { label: string; value: string; detail: string; icon: Icon; tone: string; change: string; down?: boolean }) {
  return <Card className="rounded-xl border-[#e8e9f1] bg-white shadow-[0_5px_20px_rgba(29,31,77,.045)]"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><span className={cn("flex size-9 items-center justify-center rounded-lg", tone)}><KpiIcon className="size-[18px]" /></span><MoreDots /></div><p className="mt-4 text-sm font-medium text-[#667088]">{label}</p><p className="mt-1.5 text-[28px] font-bold tracking-tight text-[#151a36]">{value}</p><p className={cn("mt-2 flex items-center gap-1 text-xs font-medium", down ? "text-[#e2546e]" : "text-[#20aa77]")}>{down ? "↓" : "↑"} <strong>{change}</strong><span className="font-normal text-[#939bad]">{detail}</span></p></CardContent></Card>;
}

function MoreDots() {
  return <span className="text-lg leading-none tracking-[2px] text-[#a1a7b6]" aria-hidden="true">···</span>;
}

function Avatar({ name, index }: { name: string; index: number }) {
  const colors = ["bg-[#6d4bd8]", "bg-[#e47b53]", "bg-[#3396c5]", "bg-[#d14f83]", "bg-[#24a77f]"];
  return <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white", colors[index % colors.length])}>{name.replace(/\s+/g, "").slice(0, 2)}</span>;
}

function MiniLineChart() {
  const points = "0,112 34,78 68,64 102,76 136,48 170,36 204,58 238,68 272,40 306,20 340,32 374,12 408,36 442,18 476,8";
  return <div className="relative h-[150px]"><div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">{[0,1,2,3].map((line) => <span key={line} className="border-t border-dashed border-[#e9eaf1]" />)}</div><svg viewBox="0 0 476 125" preserveAspectRatio="none" className="absolute inset-0 h-[125px] w-full" role="img" aria-label="กราฟประวัติผลการคำนวณเงินเดือน"><defs><linearGradient id="dashboard3-ai-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7957e9" stopOpacity=".24" /><stop offset="1" stopColor="#7957e9" stopOpacity="0" /></linearGradient></defs><polygon points={`0,125 ${points} 476,125`} fill="url(#dashboard3-ai-area)" /><polyline points={points} fill="none" stroke="#7653e7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg><div className="absolute inset-x-0 bottom-0 flex justify-between text-xs text-[#7e879b]"><span>ม.ค.</span><span>มี.ค.</span><span>พ.ค.</span><span>ก.ค.</span><span>ก.ย.</span><span>พ.ย.</span></div></div>;
}

function AssistantCard({ active, onToggle, total }: { active: boolean; onToggle: () => void; total: number }) {
  return <Card className="overflow-hidden rounded-2xl border-[#deddf1] bg-white shadow-[0_18px_45px_rgba(36,35,100,.16)]"><div className="relative overflow-hidden bg-gradient-to-br from-[#6e3bea] via-[#575bf0] to-[#2789ef] p-5 text-white"><div className="absolute -right-8 -top-8 size-28 rounded-full border border-white/15" /><div className="absolute -bottom-12 left-10 size-32 rounded-full border border-white/10" /><p className="text-base font-bold">HRMic Assistant</p><p className="mt-1 text-[13px] font-medium text-white/80">พร้อมช่วยงาน HR ตลอดเวลา</p><div className="relative mx-auto mt-4 flex size-24 items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,.14)]"><span className="flex size-[72px] items-center justify-center rounded-full bg-white text-[#5b4fe5] shadow-xl"><Bot className="size-10" /></span><i className="absolute left-2 top-2 size-2 rounded-full bg-[#60f2c0] shadow-[0_0_12px_#60f2c0]" /></div></div><button type="button" onClick={onToggle} className="flex w-full items-center gap-2 border-b border-[#ececf3] px-4 py-3 text-sm font-medium text-[#36405a]"><i className={cn("size-2 rounded-full", active ? "bg-[#29be84]" : "bg-[#aab0bd]")} />{active ? "กำลังรับฟังและพร้อมช่วย" : "หยุดรับคำสั่งชั่วคราว"}<span className="ml-auto font-semibold text-[#7a55e9]">{active ? "เปิด" : "ปิด"}</span></button><CardContent className="space-y-3 p-4 text-sm"><div className="flex justify-between text-[#697188]"><span>พนักงานทั้งหมด</span><strong className="text-[#202741]">{total}</strong></div><div className="flex justify-between text-[#697188]"><span>เอกสารวันนี้</span><strong className="text-[#202741]">2</strong></div><div className="flex justify-between text-[#697188]"><span>รออนุมัติ</span><strong className="text-[#202741]">0</strong></div><div className="flex justify-between text-[#697188]"><span>ความพร้อมของระบบ</span><strong className="text-[#202741]">99%</strong></div></CardContent></Card>;
}

export default function Dashboard3Client({ summary: suppliedSummary, companyName, loading = false }: { summary?: DashboardSummary | null; companyName?: string | null; loading?: boolean }) {
  const summary = suppliedSummary ?? EMPTY_SUMMARY;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantActive, setAssistantActive] = useState(true);
  const [period, setPeriod] = useState("ส.ค. 2569");
  const employeeTypes = useMemo(() => [
    ["พนักงานรายเดือน", summary.byEmploymentType.permanent ?? 0, "bg-[#6c55e6]"],
    ["พนักงานเหมาจ่าย", (summary.byEmploymentType.contract ?? 0) + (summary.byEmploymentType.temporary ?? 0), "bg-[#23b887]"],
    ["พนักงานรายวัน", summary.byEmploymentType.dailyWage ?? 0, "bg-[#f3a03c]"],
    ["พนักงานพาร์ตไทม์", summary.byEmploymentType.partTime ?? 0, "bg-[#4f91e7]"],
  ] as const, [summary]);
  const nationalities = summary.byNationality.length ? summary.byNationality.slice(0, 5) : [{ nationality: "ไม่มีข้อมูล", count: 0 }];

  return (
    <div className="min-h-screen bg-[#f7f7fc] font-sans">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:pl-[220px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-[#e8e9f0] bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setSidebarOpen(true)} className="flex size-10 items-center justify-center rounded-lg border border-[#e2e3eb] text-[#343b55] lg:hidden" aria-label="เปิดเมนู"><Menu className="size-5" /></button>
          <div className="min-w-0"><h1 className="text-[22px] font-bold tracking-tight text-[#171c38]">สวัสดีตอนเช้า, มนัสวี 👋</h1><p className="mt-0.5 truncate text-sm font-medium text-[#7d869a]">{companyName ? `ภาพรวมของ ${companyName}` : "ภาพรวมข้อมูลบุคลากรของคุณวันนี้"}</p></div>
          <div className="ml-auto flex items-center gap-2"><button type="button" onClick={() => setPeriod((value) => value === "ส.ค. 2569" ? "ก.ค. 2569" : "ส.ค. 2569")} className="hidden h-10 items-center gap-2 rounded-lg border border-[#e3e4ec] bg-white px-3 text-sm font-medium text-[#4e5770] sm:flex"><CalendarDays className="size-4" />{period}<ChevronDown className="size-3.5" /></button><button type="button" className="relative flex size-10 items-center justify-center rounded-lg text-[#39415b] hover:bg-[#f1f2f7]" aria-label="การแจ้งเตือน"><Bell className="size-5" /><span className="absolute right-1.5 top-1 size-4 rounded-full bg-[#ef4b6f] text-center text-[9px] font-bold leading-4 text-white">3</span></button><button type="button" className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#f39a63] to-[#754032] text-sm font-semibold text-white">MP</button></div>
        </header>

        <div className="mx-auto max-w-[1580px] p-4 sm:p-5 lg:p-6"><div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_250px]">
          <div className="min-w-0">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="ตัวชี้วัดหลัก">
              <KpiCard label="พนักงานทั้งหมด" value={loading ? "—" : String(summary.total)} detail="จากเดือนก่อน" change="8%" icon={Users} tone="bg-[#eeeaff] text-[#684be2]" />
              <KpiCard label="พนักงานรายเดือน" value={loading ? "—" : String(summary.byEmploymentType.permanent ?? 0)} detail="จากเดือนก่อน" change="12%" icon={UserCheck} tone="bg-[#e9f9f3] text-[#20a978]" />
              <KpiCard label="เอกสารทั้งหมด" value="2" detail="จากเมื่อวาน" change="2" icon={FileText} tone="bg-[#fff0f2] text-[#e85270]" down />
              <KpiCard label="เงินเดือนเดือนนี้" value="฿0" detail="คำนวณล่าสุด" change="0%" icon={WalletCards} tone="bg-[#eaf3ff] text-[#367fda]" />
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-3">
              <Panel title="การลงเวลาล่าสุด" action={<button type="button" className="text-[13px] font-semibold text-[#7352df]">ดูทั้งหมด</button>}><CardContent className="divide-y divide-[#eef0f5] px-4 pb-3 pt-0">{ATTENDANCE.map(([time, name, method, status], index) => <div key={`${time}-${name}`} className="grid grid-cols-[48px_32px_1fr_auto] items-center gap-2 py-2.5"><span className="text-[13px] font-medium text-[#505970]">{time}</span><Avatar name={name} index={index} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#293149]">{name}</p><p className="truncate text-xs text-[#7f879a]">{method}</p></div><Badge className={cn("rounded-md border-0 px-1.5 py-0.5 text-[11px] font-medium", status === "สำเร็จ" ? "bg-[#e8f8f1] text-[#20946b]" : "bg-[#fff0e8] text-[#df7936]")}>{status}</Badge></div>)}</CardContent></Panel>
              <Panel title="กล่องข้อความ HR" action={<Badge className="rounded-md border-0 bg-[#eeeaff] text-[11px] font-medium text-[#6850d6]">3 ยังไม่อ่าน</Badge>}><CardContent className="divide-y divide-[#eef0f5] px-4 pb-3 pt-0">{SUPPORT_MESSAGES.map(([subject, name, time, unread], index) => <div key={subject} className="flex items-center gap-2.5 py-2.5"><Avatar name={name} index={index + 1} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-[#293149]">{name}</p><span className="ml-auto text-xs text-[#8b93a5]">{time}</span></div><p className="mt-0.5 truncate text-xs text-[#6f788e]">{subject}</p></div>{unread && <span className="flex size-5 items-center justify-center rounded-full bg-[#28bf87] text-[11px] font-bold text-white">{unread}</span>}</div>)}</CardContent><button type="button" className="flex w-full items-center justify-center gap-1 border-t border-[#eceef4] py-2.5 text-[13px] font-semibold text-[#7150dd]">เปิดข้อความทั้งหมด<ChevronRight className="size-3.5" /></button></Panel>
              <Panel title="เอกสารและคำขอ" action={<span className="text-[13px] text-[#7d8699]">รวม <strong className="text-[#674bdd]">2</strong> ฉบับ</span>}><CardContent className="divide-y divide-[#eef0f5] px-4 pb-3 pt-0">{DOCUMENTS.map(([label, value, tone], index) => <div key={label} className="flex items-center gap-3 py-3"><span className={cn("flex size-8 items-center justify-center rounded-lg", tone)}>{index === 0 ? <CalendarDays className="size-4" /> : index === 1 ? <Clock3 className="size-4" /> : index === 2 ? <ClipboardCheck className="size-4" /> : index === 3 ? <Fingerprint className="size-4" /> : <ListChecks className="size-4" />}</span><span className="flex-1 text-sm font-medium text-[#4b556d]">{label}</span><strong className="text-sm font-semibold text-[#242c45]">{value} ฉบับ</strong></div>)}</CardContent><div className="border-t border-[#eceef4] px-4 py-2.5 text-xs font-medium text-[#278e6b]">✓ ระบบติดตามสถานะอัตโนมัติเปิดใช้งาน</div></Panel>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[.9fr_.9fr_1.35fr]">
              <Panel title="ประเภทพนักงาน" action={<span className="text-xs font-medium text-[#7d8699]">{summary.total} คน</span>}><CardContent className="space-y-3 px-4 pb-4 pt-1">{employeeTypes.map(([label, count, tone]) => <div key={label} className="flex items-center gap-3"><span className={cn("size-2.5 rounded-full", tone)} /><span className="min-w-0 flex-1 truncate text-sm font-medium text-[#5b6479]">{label}</span><strong className="text-sm font-semibold text-[#273048]">{count} คน</strong></div>)}<div className="mt-4 flex h-20 items-end justify-around gap-3 border-b border-[#e7e9ef] px-2">{[34,68,45,82,56,92].map((height, index) => <span key={index} className="w-5 rounded-t bg-gradient-to-t from-[#7651e6] to-[#a88cf5]" style={{ height: `${height}%` }} />)}</div><p className="text-center text-xs text-[#7f889b]">สัดส่วนพนักงานตามประเภท</p></CardContent></Panel>
              <Panel title="สัญชาติ" action={<button type="button" className="text-xs font-semibold text-[#7150dd]">ดูทั้งหมด</button>}><CardContent className="divide-y divide-[#eef0f5] px-4 pb-3 pt-0">{nationalities.map((item, index) => <div key={`${item.nationality}-${index}`} className="flex items-center gap-2.5 py-3"><span className={cn("flex size-7 items-center justify-center rounded-full text-[11px] font-semibold text-white", ["bg-[#7051df]", "bg-[#2db488]", "bg-[#e89539]", "bg-[#3d8ed8]", "bg-[#dc5a89]"][index % 5])}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-[#515b71]">{item.nationality}</span><strong className="text-sm font-semibold text-[#293149]">{item.count} คน</strong></div>)}</CardContent></Panel>
              <Panel title="ประวัติผลการคำนวณเงินเดือน" action={<button type="button" className="flex items-center gap-1 rounded-md border border-[#e1e3eb] px-2 py-1 text-xs font-medium text-[#697287]">2569<ChevronDown className="size-3" /></button>}><CardContent className="px-4 pb-3 pt-0"><MiniLineChart /><div className="grid grid-cols-4 gap-2 border-t border-[#eceef4] pt-3">{[["เงินเดือน", "฿0", "+0%"], ["ภาษี", "฿0", "+0%"], ["ประกันสังคม", "฿0", "+0%"], ["ลงเวลา", "100%", "+100%"]].map(([label, value, change]) => <div key={label}><p className="text-xs text-[#7f889b]">{label}</p><p className="mt-1 text-base font-semibold text-[#293149]">{value}</p><p className="mt-0.5 text-xs font-medium text-[#23956c]">{change}</p></div>)}</div></CardContent></Panel>
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Panel title="กิจกรรมเงินเดือนล่าสุด" action={<button type="button" className="text-[13px] font-semibold text-[#7150dd]">ดูทั้งหมด</button>}><CardContent className="divide-y divide-[#eef0f5] px-4 pb-3 pt-0">{PAYROLL_ACTIVITY.map(([title, detail, time], index) => <div key={title} className="flex items-center gap-3 py-3"><span className={cn("flex size-8 items-center justify-center rounded-lg", ["bg-[#eeeaff] text-[#694ddb]", "bg-[#e9f9f3] text-[#22a477]", "bg-[#fff5e7] text-[#de9133]", "bg-[#eaf3ff] text-[#377fd6]", "bg-[#fcebf2] text-[#d74e80]"][index])}>{index === 0 ? <WalletCards className="size-4" /> : index === 1 ? <FileText className="size-4" /> : index === 2 ? <Users className="size-4" /> : index === 3 ? <BarChart3 className="size-4" /> : <Fingerprint className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#2a3249]">{title}</p><p className="mt-0.5 truncate text-xs text-[#7d8699]">{detail}</p></div><span className="text-xs text-[#8b93a5]">{time}</span></div>)}</CardContent></Panel>
              <Panel title="การทำงานอัตโนมัติ" action={<Badge className="rounded-md border-0 bg-[#e9f9f3] text-[11px] font-medium text-[#218e68]">ทำงานปกติ</Badge>}><CardContent className="p-4 pt-1"><div className="grid grid-cols-3 gap-3">{[[UserPlus,"ข้อมูลใหม่"],[Bot,"AI ตรวจสอบ"],[CalendarCheck2,"จัดตาราง"],[Phone,"ติดตาม"],[Bell,"แจ้งเตือน"],[ClipboardCheck,"สรุปผล"]].map(([WorkflowIcon,label], index) => { const FlowIcon = WorkflowIcon as Icon; return <div key={String(label)} className="relative flex flex-col items-center rounded-lg bg-[#faf9ff] px-2 py-3 text-center"><span className={cn("flex size-9 items-center justify-center rounded-lg", index % 3 === 0 ? "bg-[#eeeaff] text-[#6c4bdb]" : index % 3 === 1 ? "bg-[#eaf3ff] text-[#3e83d5]" : "bg-[#e9f9f3] text-[#26a279]")}><FlowIcon className="size-4" /></span><span className="mt-2 text-xs font-medium text-[#566078]">{String(label)}</span>{index !== 2 && index !== 5 && <ChevronRight className="absolute -right-2 top-6 size-3 text-[#a58fe7]" />}</div>; })}</div><div className="mt-4 rounded-lg bg-gradient-to-r from-[#6f4cdd] to-[#4b83e7] p-3 text-white"><p className="text-sm font-semibold">ลดเวลางานซ้ำซ้อนด้วย HRMic AI</p><p className="mt-1 text-xs font-medium text-white/80">ประมวลผลข้อมูลและแจ้งเตือนอัตโนมัติทุกวัน</p></div></CardContent></Panel>
            </section>
          </div>

          <aside className="space-y-4 2xl:sticky 2xl:top-[92px] 2xl:self-start"><AssistantCard active={assistantActive} onToggle={() => setAssistantActive((value) => !value)} total={summary.total} /><Panel title="ทางลัด" action={<Zap className="size-4 text-[#7452e5]" />}><CardContent className="space-y-1 px-3 pb-3 pt-0">{[[CalendarCheck2,"ส่งแจ้งเตือนลงเวลา"],[MessageSquareText,"ประกาศถึงพนักงาน"],[FileBarChart,"สร้างรายงาน"],[UserPlus,"เพิ่มพนักงาน"]].map(([QuickIcon,label]) => { const ItemIcon = QuickIcon as Icon; return <button key={String(label)} type="button" className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-[#4f5971] hover:bg-[#f5f3ff]"><span className="flex size-7 items-center justify-center rounded-lg bg-[#f0ecff] text-[#6e4cdc]"><ItemIcon className="size-3.5" /></span><span className="flex-1">{String(label)}</span><ChevronRight className="size-3.5 text-[#9aa1b1]" /></button>; })}</CardContent></Panel><Panel title="ค้นหาในระบบ" action={<Search className="size-4 text-[#7a55e9]" />}><CardContent className="px-3 pb-3 pt-0"><label className="relative block"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#9ba2b2]" /><input placeholder="พนักงาน เอกสาร หรือรายงาน" className="h-10 w-full rounded-lg border border-[#e4e5ed] bg-[#fafbfc] pl-8 pr-3 text-[13px] font-medium outline-none focus:border-[#7a56e7]" /></label></CardContent></Panel></aside>
        </div></div>
      </main>
    </div>
  );
}
