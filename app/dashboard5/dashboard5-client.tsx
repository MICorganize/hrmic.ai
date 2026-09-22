"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  AlarmClock,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Download,
  FileBarChart,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Menu,
  MoreVertical,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  X,
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

const NAV_GROUPS: Array<{ title: string; items: Array<{ label: string; icon: Icon; href?: string }> }> = [
  { title: "", items: [{ label: "แดชบอร์ด", icon: LayoutDashboard, href: "/dashboard5" }] },
  {
    title: "จัดการบุคลากร",
    items: [
  { label: "ข้อมูลพนักงาน", icon: Users, href: "/organization/organization-employee" },
      { label: "งานและคำขอ", icon: ClipboardList },
      { label: "ทีม", icon: UserRound },
      { label: "แผนก", icon: FolderKanban },
      { label: "เวลาทำงาน", icon: Clock3 },
      { label: "เอกสาร", icon: FileText },
    ],
  },
  {
    title: "พื้นที่ทำงาน",
    items: [
      { label: "ปฏิทิน", icon: CalendarDays },
      { label: "เงินเดือน", icon: WalletCards },
      { label: "รายงาน", icon: FileBarChart },
    ],
  },
  {
    title: "ข้อมูลเชิงลึก",
    items: [
      { label: "วิเคราะห์ข้อมูล", icon: BarChart3 },
      { label: "ประสิทธิภาพ", icon: Gauge },
    ],
  },
];

const EMPLOYEE_ROWS = [
  { name: "กัญญารัตน์ สุขใจ", department: "บริหารบุคคล", due: "18 ก.ย. 2569", progress: 75, status: "กำลังดำเนินการ", priority: "สูง" },
  { name: "ธนพล มีทรัพย์", department: "พัฒนาระบบ", due: "20 ก.ย. 2569", progress: 45, status: "กำลังดำเนินการ", priority: "ปานกลาง" },
  { name: "ปาริชาติ วัฒนะ", department: "ฝ่ายสร้างสรรค์", due: "24 ก.ย. 2569", progress: 100, status: "เสร็จแล้ว", priority: "ต่ำ" },
  { name: "วรพล แสงทอง", department: "การตลาด", due: "28 ก.ย. 2569", progress: 20, status: "รอตรวจสอบ", priority: "ปานกลาง" },
  { name: "ชุติมา รุ่งเรือง", department: "การเงิน", due: "30 ก.ย. 2569", progress: 10, status: "ต้องติดตาม", priority: "สูง" },
];

const TONES = [
  "from-[#466bda] to-[#243d99]",
  "from-[#df8054] to-[#99452d]",
  "from-[#34aa8d] to-[#20745f]",
  "from-[#c95e92] to-[#86375f]",
  "from-[#7256d8] to-[#493393]",
];

function Avatar({ name, index, small = false }: { name: string; index: number; small?: boolean }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white", TONES[index % TONES.length], small ? "size-7 text-[9px]" : "size-9 text-[10px]")}>
      {name.replace(/\s+/g, "").slice(0, 2)}
    </span>
  );
}

function Logo() {
  return (
    <Link href="/dashboard5" className="flex items-center gap-2.5" aria-label="HRMic Hive dashboard">
      <span className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff537f] to-[#ff3372] shadow-[0_8px_20px_rgba(255,55,116,.3)]">
        <span className="absolute size-4 rotate-45 rounded-[3px] border-2 border-white" />
        <Sparkles className="absolute -right-1 -top-1 size-3 text-[#a38aff]" />
      </span>
      <span className="leading-tight"><strong className="block text-base font-bold text-white">HRMic Hive</strong><span className="block text-[10px] font-medium text-[#9ca8c2]">Plan. Track. Grow.</span></span>
    </Link>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <button type="button" onClick={onClose} className="fixed inset-0 z-40 bg-[#06142f]/65 backdrop-blur-sm lg:hidden" aria-label="ปิดเมนู" />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[218px] flex-col bg-[#071b3c] text-white shadow-2xl transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-[66px] items-center justify-between px-4"><Logo /><button type="button" onClick={onClose} className="p-1 text-white/70 lg:hidden" aria-label="ปิดเมนู"><X className="size-5" /></button></div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:none]" aria-label="เมนูหลัก">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.title || "main"} className={cn(groupIndex > 0 && "mt-4 border-t border-white/[.08] pt-3")}>
              {group.title && <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[.06em] text-[#7f8dab]">{group.title}</p>}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const active = item.label === "แดชบอร์ด";
                  const classes = cn("flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium transition", active ? "bg-gradient-to-r from-[#ff596e] to-[#ff3d9d] text-white shadow-[0_7px_18px_rgba(255,62,137,.25)]" : "text-[#b6c0d6] hover:bg-white/[.06] hover:text-white");
                  const content = <><ItemIcon className="size-[15px]" strokeWidth={1.9} /><span>{item.label}</span></>;
                  return item.href ? <Link key={item.label} href={item.href} onClick={onClose} className={classes} aria-current={active ? "page" : undefined}>{content}</Link> : <button key={item.label} type="button" onClick={onClose} className={classes}>{content}</button>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="m-3 overflow-hidden rounded-xl bg-gradient-to-br from-[#5c2dc1] via-[#7639d4] to-[#d43690] p-3 shadow-lg">
          <div className="flex items-start gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-white/15"><Sparkles className="size-4" /></span><div><p className="text-sm font-semibold">HRMic AI</p><p className="mt-0.5 text-xs font-medium leading-5 text-white/80">สรุปข้อมูลและติดตามงานให้อัตโนมัติ</p></div></div>
          <button type="button" className="mt-3 flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-white text-xs font-semibold text-[#6f35c2]">เริ่มใช้งาน<ChevronRight className="size-3.5" /></button>
        </div>
      </aside>
    </>
  );
}

function Kpi({ title, value, icon: KpiIcon, tone, detail, alt }: { title: string; value: string; icon: Icon; tone: string; detail: string; alt: string }) {
  return (
    <Card className="rounded-xl border-[#e8ebf4] bg-white shadow-[0_6px_22px_rgba(24,38,70,.045)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3"><span className={cn("flex size-9 items-center justify-center rounded-lg", tone)}><KpiIcon className="size-[18px]" /></span><MoreVertical className="size-4 text-[#a5adbd]" /></div>
        <p className="mt-3 text-sm font-medium text-[#68738a]">{title}</p><p className="mt-1 text-[28px] font-bold tracking-tight text-[#17213d]">{value}</p>
        <div className="mt-2 flex items-center justify-between text-xs font-medium"><span className="flex items-center gap-1 text-[#249b70]"><i className="size-1.5 rounded-full bg-[#28c28a]" />{detail}</span><span className="font-normal text-[#838c9f]">{alt}</span></div>
      </CardContent>
    </Card>
  );
}

function LineChart({ total }: { total: number }) {
  const values = [0.31, 0.43, 0.57, 0.48, 0.65, 0.73, 0.9, 0.71, 0.66, 0.84, 0.76];
  const points = values.map((value, index) => `${(index / 10) * 500},${150 - value * 120}`).join(" ");
  return (
    <div className="relative mt-4 h-[188px]" role="img" aria-label={`กราฟภาพรวมงานของพนักงาน ${total} คน`}>
      <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">{[120,90,60,30,0].map((value) => <div key={value} className="flex items-center gap-2"><span className="w-7 text-right text-[11px] text-[#7e879a]">{value}</span><i className="flex-1 border-t border-dashed border-[#e9ebf2]" /></div>)}</div>
      <svg viewBox="0 0 500 155" preserveAspectRatio="none" className="absolute left-8 top-0 h-[155px] w-[calc(100%-2rem)]" aria-hidden="true"><defs><linearGradient id="dashboard5-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7b50ef" stopOpacity=".3" /><stop offset="1" stopColor="#7b50ef" stopOpacity="0" /></linearGradient></defs><polygon points={`0,155 ${points} 500,155`} fill="url(#dashboard5-area)" /><polyline points={points} fill="none" stroke="#7047e7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />{values.map((value,index)=><circle key={index} cx={(index/10)*500} cy={150-value*120} r="3" fill="#7047e7" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}</svg>
      <div className="absolute inset-x-8 bottom-0 flex justify-between text-[11px] font-medium text-[#7e879a]">{["จ.","อ.","พ.","พฤ.","ศ.","ส.","อา."].map(day=><span key={day}>{day}</span>)}</div>
    </div>
  );
}

function Donut({ total, completed, progress, pending, review }: { total: number; completed: number; progress: number; pending: number; review: number }) {
  const safeTotal = Math.max(total, 1);
  const a = (completed / safeTotal) * 100;
  const b = a + (progress / safeTotal) * 100;
  const c = b + (pending / safeTotal) * 100;
  const background = total ? `conic-gradient(#6847e8 0 ${a}%, #2789ef ${a}% ${b}%, #ff9c20 ${b}% ${c}%, #ef4b72 ${c}% 100%)` : "conic-gradient(#eceef5 0 100%)";
  const items = [["เสร็จแล้ว",completed,"#6847e8"],["กำลังดำเนินการ",progress,"#2789ef"],["รอดำเนินการ",pending,"#ff9c20"],["ตรวจสอบ",review,"#ef4b72"]] as const;
  return <div className="mt-5 grid items-center gap-4 sm:grid-cols-[130px_1fr]"><div className="relative mx-auto flex size-[126px] items-center justify-center rounded-full" style={{background}}><div className="flex size-[75px] flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl font-bold text-[#1e2945]">{total}</strong><span className="text-[11px] font-medium text-[#7f889b]">รายการทั้งหมด</span></div></div><div className="space-y-2.5">{items.map(([label,count,color])=><div key={label} className="grid grid-cols-[7px_1fr_auto] items-center gap-2 text-xs"><i className="size-2 rounded-full" style={{backgroundColor:color}}/><span className="font-medium text-[#5d687f]">{label}</span><strong className="text-[#303a54]">{count} ({Math.round((count/safeTotal)*100)}%)</strong></div>)}</div></div>;
}

function TeamBars({ total }: { total: number }) {
  const rows = [["ทีมบริหารบุคคล",92,"#7546eb"],["ทีมพัฒนาระบบ",72,"#238de8"],["ทีมการตลาด",55,"#f19925"],["ทีมสร้างสรรค์",42,"#2ab47f"]] as const;
  return <div className="mt-5 space-y-4">{rows.map(([label,width,color],index)=><div key={label}><div className="mb-1.5 flex items-center gap-2"><Avatar name={label} index={index} small/><span className="flex-1 text-xs font-medium text-[#526078]">{label}</span><strong className="text-xs font-semibold text-[#303a52]">{Math.max(0,Math.round(total*(width/100)))} ชม.</strong></div><div className="ml-9 h-1.5 overflow-hidden rounded-full bg-[#eef0f5]"><i className="block h-full rounded-full" style={{width:`${width}%`,backgroundColor:color}} /></div></div>)}</div>;
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <Card className={cn("rounded-xl border-[#e8ebf4] bg-white shadow-[0_6px_22px_rgba(24,38,70,.045)]",className)}><CardHeader className="flex-row items-center justify-between gap-3 px-4 pb-0 pt-4"><CardTitle className="text-base font-bold text-[#202a44]">{title}</CardTitle>{action}</CardHeader><CardContent className="px-4 pb-4 pt-0">{children}</CardContent></Card>;
}

export default function Dashboard5Client({ summary: suppliedSummary, companyName, loading = false }: { summary?: DashboardSummary | null; companyName?: string | null; loading?: boolean }) {
  const summary = suppliedSummary ?? EMPTY_SUMMARY;
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [range,setRange] = useState("16–22 ก.ย. 2569");
  const [query,setQuery] = useState("");
  const [exported,setExported] = useState(false);
  const filteredRows = useMemo(()=>EMPLOYEE_ROWS.filter(row=>`${row.name} ${row.department} ${row.status}`.toLowerCase().includes(query.toLowerCase())),[query]);
  const taskTotal = Math.max(summary.total * 3, 0);
  const completed = Math.round(taskTotal * .5);
  const progress = Math.round(taskTotal * .33);
  const pending = Math.round(taskTotal * .13);
  const review = Math.max(0, taskTotal-completed-progress-pending);

  return (
    <div className="min-h-screen bg-[#f7f8fc] font-sans">
      <Sidebar open={sidebarOpen} onClose={()=>setSidebarOpen(false)} />
      <main className="min-h-screen lg:pl-[218px]">
        <header className="sticky top-0 z-30 flex h-[66px] items-center gap-3 border-b border-[#e6e9f1] bg-white/95 px-4 backdrop-blur sm:px-5">
          <button type="button" onClick={()=>setSidebarOpen(true)} className="flex size-9 items-center justify-center rounded-lg border border-[#e4e7ef] text-[#37425b] lg:hidden" aria-label="เปิดเมนู"><Menu className="size-4" /></button>
          <label className="relative hidden w-full max-w-[330px] sm:block"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#98a1b3]"/><input value={query} onChange={event=>setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-[#e4e7ef] bg-[#fafbfe] pl-9 pr-3 text-sm font-medium outline-none focus:border-[#7750ea]" placeholder="ค้นหาพนักงาน งาน หรือเอกสาร..." /></label>
          <div className="ml-auto flex items-center gap-2"><button type="button" onClick={()=>setRange(value=>value.startsWith("16")?"9–15 ก.ย. 2569":"16–22 ก.ย. 2569")} className="hidden h-10 items-center gap-2 rounded-lg border border-[#e4e7ef] bg-white px-3 text-[13px] font-medium text-[#4f5a72] md:flex"><CalendarDays className="size-3.5"/>{range}<ChevronDown className="size-3"/></button><button type="button" className="relative flex size-9 items-center justify-center rounded-lg text-[#44506a] hover:bg-[#f1f3f8]" aria-label="การแจ้งเตือน"><Bell className="size-[18px]"/><span className="absolute right-1.5 top-1 size-3.5 rounded-full bg-[#f13f69] text-center text-[8px] leading-[14px] text-white">4</span></button><Avatar name="อเล็กซ์ มอร์แกน" index={1}/><div className="hidden sm:block"><p className="text-[13px] font-semibold text-[#28334d]">อเล็กซ์ มอร์แกน</p><p className="text-[11px] font-medium text-[#7f899c]">ผู้ดูแลระบบ</p></div><ChevronDown className="hidden size-3 text-[#8c95a8] sm:block"/></div>
        </header>

        <div className="mx-auto max-w-[1550px] p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-[22px] font-bold tracking-tight text-[#18223d]">สวัสดีตอนเช้า, อเล็กซ์! 👋</h1><p className="mt-1 text-sm font-medium text-[#7b8599]">ติดตามงานบุคลากรและภาพรวมของ {companyName ?? "HRMic.ai"}</p></div><div className="flex gap-2"><button type="button" onClick={()=>setExported(true)} className="flex h-10 items-center gap-2 rounded-lg border border-[#e0e4ed] bg-white px-3 text-[13px] font-semibold text-[#4a556e] shadow-sm"><Download className="size-3.5"/>{exported?"ส่งออกรายงานแล้ว":"ส่งออกรายงาน"}</button><Link href="/organization/organization-employee" className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#7142e7] to-[#7c35ea] px-3 text-[13px] font-semibold text-white shadow-[0_7px_18px_rgba(112,59,225,.24)]"><Plus className="size-3.5"/>เพิ่มพนักงาน</Link></div></div>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="ตัวชี้วัดหลัก">
            <Kpi title="พนักงานทั้งหมด" value={loading?"—":summary.total.toLocaleString("th-TH")} icon={BriefcaseBusiness} tone="bg-[#efe9ff] text-[#7448e7]" detail="2 เอกสารใหม่" alt="ข้อมูลล่าสุด" />
            <Kpi title="งานทั้งหมด" value={loading?"—":taskTotal.toLocaleString("th-TH")} icon={ClipboardCheck} tone="bg-[#e7f0ff] text-[#287edc]" detail={`${completed} เสร็จแล้ว`} alt={`${pending} รอดำเนินการ`} />
            <Kpi title="ประมาณการเงินเดือน" value="฿0" icon={CircleDollarSign} tone="bg-[#e6f8ec] text-[#27a761]" detail="0% เดือนนี้" alt="รอคำนวณ" />
            <Kpi title="เวลาทำงานรวม" value={`${summary.total*8} ชม.`} icon={AlarmClock} tone="bg-[#fff0de] text-[#ee891b]" detail="100% ลงเวลา" alt="สัปดาห์นี้" />
          </section>

          <section className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_.9fr_1fr]">
            <Panel title="ภาพรวมงานบุคลากร" action={<button type="button" className="flex items-center gap-1 rounded-md border border-[#e4e7ee] px-2 py-1 text-xs font-medium text-[#657087]">สัปดาห์นี้<ChevronDown className="size-3"/></button>}><LineChart total={summary.total}/></Panel>
            <Panel title="สถานะงาน" action={<button type="button" className="text-xs font-medium text-[#727c91]">รายละเอียด</button>}><Donut total={taskTotal} completed={completed} progress={progress} pending={pending} review={review}/></Panel>
            <Panel title="เวลาทำงานตามทีม" action={<button type="button" className="flex items-center gap-1 text-xs font-medium text-[#657087]">สัปดาห์นี้<ChevronDown className="size-3"/></button>}><TeamBars total={summary.total}/></Panel>
          </section>

          <section className="mt-3">
            <Panel title="กิจกรรมพนักงานล่าสุด" action={<div className="flex items-center gap-2"><label className="relative hidden sm:block"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#a0a7b5]"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="ค้นหาพนักงาน..." className="h-9 w-48 rounded-md border border-[#e5e8ef] pl-8 pr-2 text-xs font-medium outline-none focus:border-[#7750ea]"/></label><button type="button" className="flex h-9 items-center gap-1 rounded-md border border-[#e5e8ef] px-2.5 text-xs font-medium text-[#667087]">ทุกสถานะ<ChevronDown className="size-3"/></button></div>}>
              <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[940px] border-collapse text-left"><thead><tr className="border-y border-[#edf0f4] bg-[#fafbfc] text-xs font-semibold text-[#727c91]"><th className="px-3 py-3">ชื่อพนักงาน</th><th className="px-3 py-3">แผนก</th><th className="px-3 py-3">กำหนดเสร็จ</th><th className="px-3 py-3">ความคืบหน้า</th><th className="px-3 py-3">สถานะ</th><th className="px-3 py-3">ความสำคัญ</th><th className="px-3 py-3 text-right">จัดการ</th></tr></thead><tbody>{filteredRows.map((row,index)=><tr key={row.name} className="border-b border-[#eff1f5] last:border-0"><td className="px-3 py-3"><div className="flex items-center gap-2"><Avatar name={row.name} index={index} small/><span className="text-sm font-semibold text-[#334059]">{row.name}</span></div></td><td className="px-3 py-3 text-[13px] font-medium text-[#5e6980]">{row.department}</td><td className="px-3 py-3 text-[13px] text-[#5e6980]">{row.due}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#edf0f5]"><i className="block h-full rounded-full" style={{width:`${row.progress}%`,backgroundColor:["#7448e8","#3188e6","#25aa75","#f2a126","#ef506e"][index]}}/></div><span className="text-xs font-semibold text-[#59647a]">{row.progress}%</span></div></td><td className="px-3 py-3"><Badge className={cn("border-0 px-2 py-1 text-[11px] font-semibold",row.status==="เสร็จแล้ว"?"bg-[#e8f8ee] text-[#26995a]":row.status==="ต้องติดตาม"?"bg-[#ffebef] text-[#df4966]":"bg-[#eaf1ff] text-[#367bd4]")}>{row.status}</Badge></td><td className="px-3 py-3"><span className={cn("rounded px-2 py-1 text-[11px] font-medium",row.priority==="สูง"?"bg-[#fff0f2] text-[#e34e65]":row.priority==="ปานกลาง"?"bg-[#fff5e4] text-[#d88919]":"bg-[#eaf8ef] text-[#2a9958]")}>{row.priority}</span></td><td className="px-3 py-3 text-right"><button type="button" className="rounded p-1.5 text-[#8e97a8] hover:bg-[#f1f3f7]" aria-label={`จัดการ ${row.name}`}><MoreVertical className="size-4"/></button></td></tr>)}</tbody></table>{!filteredRows.length&&<p className="py-10 text-center text-sm text-[#7f899c]">ไม่พบข้อมูลที่ค้นหา</p>}</div>
              <div className="mt-3 flex items-center justify-between text-xs font-medium text-[#727c91]"><span>แสดง {filteredRows.length} จาก {EMPLOYEE_ROWS.length} รายการ</span><div className="flex items-center gap-1"><button type="button" className="flex size-8 items-center justify-center rounded border border-[#e4e7ee]"><ChevronLeft className="size-3.5"/></button><button type="button" className="size-8 rounded bg-[#7448e7] font-semibold text-white">1</button><button type="button" className="size-8 rounded border border-transparent text-[#5f6b82]">2</button><button type="button" className="flex size-8 items-center justify-center rounded border border-[#e4e7ee]"><ChevronRight className="size-3.5"/></button></div></div>
            </Panel>
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-3">
            {[[TimerReset,"การลงเวลา","สแกนใบหน้า 100%","bg-[#e7f1ff] text-[#2a7dde]"],[ShieldCheck,"ความพร้อมระบบ","ทำงานปกติ 99.9%","bg-[#e7f8ed] text-[#28a15b]"],[FileText,"เอกสารรออนุมัติ","0 ฉบับ","bg-[#fff0e2] text-[#e8891d]"]].map(([ItemIcon,title,value,tone])=>{const FeatureIcon=ItemIcon as Icon;return <Card key={String(title)} className="rounded-xl border-[#e8ebf4] bg-white"><CardContent className="flex items-center gap-3 p-4"><span className={cn("flex size-9 items-center justify-center rounded-lg",String(tone))}><FeatureIcon className="size-[18px]"/></span><div><p className="text-xs font-medium text-[#737d91]">{String(title)}</p><p className="mt-1 text-sm font-semibold text-[#334059]">{String(value)}</p></div></CardContent></Card>})}
          </section>
        </div>
      </main>
    </div>
  );
}
