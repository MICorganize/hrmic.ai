import { Suspense, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { DashboardMetricsFallback, DashboardMetricsSection } from "./DashboardMetricsSection";
import { DashboardShellTelemetry } from "./DashboardShellTelemetry";

function DateControl({ children = "ส.ค. 2569", wide = false }: { children?: ReactNode; wide?: boolean }) {
  return (
    <button type="button" className={cn("inline-flex h-7 items-center justify-between gap-1.5 rounded-md border border-[#dfe4e8] bg-white px-2 text-xs font-normal leading-5 text-[#66717c]", wide ? "w-[185px]" : "w-[80px]") }>
      <span className="truncate">{children}</span>
      <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.5} />
    </button>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("overflow-hidden rounded-xl border border-[#e7eaf0] bg-white text-sm font-normal leading-5 shadow-[0_3px_12px_rgba(29,52,93,.07)]", className)}>{children}</section>;
}

function SalaryHistory() {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const labels = ["16,000", "14,000", "12,000", "10,000", "8,000", "6,000", "4,000", "2,000", "0"];
  return (
    <Card className="h-[320px] p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="whitespace-nowrap text-sm font-semibold leading-5 text-[#172348]">ประวัติผลการคำนวณเงินเดือน</h2>
        <div className="flex shrink-0 gap-0.5 pt-[5px]">
          <button type="button" className="flex h-7 w-[185px] items-center justify-between rounded-md border border-[#dfe4e8] px-3 text-xs font-normal leading-5 text-[#6b737d]">เงินเดือน<ChevronDown className="size-3" /></button>
          <DateControl>2569</DateControl>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[43px_1fr]">
        <div className="flex h-[212px] flex-col justify-between pb-5 text-right text-xs text-[#707a84]">{labels.map((label) => <span key={label}>{label}</span>)}</div>
        <div className="relative h-[212px]">
          <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">{labels.map((label) => <span key={label} className="border-t border-[#e3e7eb]" />)}</div>
          <svg className="absolute inset-x-0 top-0 h-[190px] w-full" preserveAspectRatio="none" viewBox="0 0 400 250" aria-label="กราฟประวัติผลการคำนวณเงินเดือน">
            <path d="M0 246 L35 246 L70 246 L105 246 L140 132 L175 18 L210 17 L245 25 L280 246 L315 246 L350 246 L400 246 L400 250 L0 250 Z" fill="#4bb0ef" fillOpacity="0.14" />
            <polyline points="0,246 35,246 70,246 105,246 140,132 175,18 210,17 245,25 280,246 315,246 350,246 400,246" fill="none" stroke="#1d9de5" strokeWidth="1.5" />
            {[0,35,70,105,140,175,210,245,280,315,350,400].map((x, i) => <circle key={x} cx={x} cy={[246,246,246,246,132,18,17,25,246,246,246,246][i]} r="3" fill="#109be8" />)}
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-[#63707c]">{months.map((month) => <span key={month}>{month}</span>)}</div>
        </div>
      </div>
    </Card>
  );
}

function SmallChartCard({ title, className }: { title: ReactNode; className?: string }) {
  return (
    <Card className={cn("h-[320px] p-4", className)}>
      <div className="flex items-start justify-between"><h2 className="text-sm font-semibold leading-5 text-[#172348]">{title}</h2><DateControl>2569</DateControl></div>
      <div className="mt-10 flex h-40 items-end justify-center gap-6"><div className="h-20 w-12 rounded-t bg-[#1474ee]" /><div className="h-3 w-12 rounded-t bg-[#ff9418]" /></div>
      <div className="flex justify-center gap-5 text-xs font-medium text-[#69737e]"><span className="inline-flex items-center gap-1"><i className="size-3 bg-[#129cf0]" />เข้าใหม่</span><span className="inline-flex items-center gap-1"><i className="size-3 bg-[#ff7900]" />ลาออก</span></div>
    </Card>
  );
}

function SummaryLine({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#edf0f3] py-2 text-xs font-normal leading-5 text-[#56616b] last:border-0">
      <span>{label}{detail && <small className="ml-1 text-[#8a939c]">{detail}</small>}</span>
      <strong className="font-semibold text-[#4b545d]">{value}</strong>
    </div>
  );
}

function DocumentsSummary() {
  const documents = [["ลางาน", "0"], ["โอที", "0"], ["เพิ่มเวลา", "0"], ["เปลี่ยนกะการทำงาน", "0"], ["เปลี่ยนวันหยุด", "2"], ["เบิกเงินล่วงหน้า", "0"]];
  return (
    <Card className="h-[320px] p-4">
      <div className="flex items-start justify-between"><h2 className="text-sm font-semibold leading-5 text-[#172348]">เอกสารทั้งหมด</h2><span className="text-xs font-normal text-[#65707b]">เอกสาร <b className="ml-1 font-semibold text-[#139def]">2</b> ฉบับ</span></div>
      <div className="mt-7 grid grid-cols-2 gap-x-8">{documents.map(([label, value]) => <SummaryLine key={label} label={label} value={`${value} ฉบับ`} />)}</div>
      <h3 className="mt-7 text-sm font-semibold text-[#535c65]">เอกสารที่ยังไม่ได้รับการอนุมัติ</h3>
      <div className="mt-2 grid grid-cols-2 gap-x-8"><SummaryLine label="โอที" value="0 ฉบับ" /><SummaryLine label="ลางาน" value="0 ฉบับ" /></div>
    </Card>
  );
}

function CompactSummaryCard({ title, rows, accent = "#139def" }: { title: string; rows: { label: string; value: string; detail?: string }[]; accent?: string }) {
  return (
    <Card className="min-h-[250px] p-4">
      <h2 className="text-sm font-semibold leading-5 text-[#172348]">{title}</h2>
      <div className="mt-6 space-y-0.5">{rows.map((row, index) => <div key={row.label} className="border-b border-[#edf0f3] py-3 last:border-0"><p className="text-xs font-normal text-[#64707b]">{row.label}</p><p className="mt-1 text-lg font-semibold leading-6" style={{ color: index === 0 ? accent : "#515b64" }}>{row.value}{row.detail && <span className="ml-1 text-xs font-normal text-[#68737d]">{row.detail}</span>}</p></div>)}</div>
    </Card>
  );
}

export default function DashboardClient() {
  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#f3f6fb] font-sans">
      <DashboardShellTelemetry />
      <div className="mx-auto max-w-[1600px] p-3 sm:p-4">
        <div className="mb-3 h-[123px] w-full overflow-hidden rounded-xl border border-[#e5eaf2] bg-white px-4 py-3 shadow-[0_3px_12px_rgba(29,52,93,0.07)]">
          <div><h1 className="text-xl font-semibold tracking-tight text-[#172348]">Dashboard</h1><p className="mt-0.5 text-xs text-[#6f7b90]">ภาพรวมการบริหารทรัพยากรบุคคลขององค์กร</p></div>
        </div>

        <Suspense fallback={<DashboardMetricsFallback />}>
          <DashboardMetricsSection />
        </Suspense>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.45fr_.9fr_1fr]">
          <SalaryHistory />
          <DocumentsSummary />
          <SmallChartCard title={<>เงินเดือน<br />ตามสำนักงาน</>} />
        </div>
        <div className="mt-3 grid gap-3 pb-3 sm:grid-cols-2 xl:grid-cols-4">
          <CompactSummaryCard title="ภาษี ภงด.1" rows={[{ label: "ประจำเดือน ส.ค.", value: "0.00", detail: "บาท" }, { label: "ภาษี ภงด.3", value: "0.00", detail: "บาท" }, { label: "ภาษี ภงด.1ก", value: "0.00", detail: "บาท" }]} />
          <CompactSummaryCard title="เงินสมทบประกันสังคม" rows={[{ label: "ประจำเดือน ส.ค.", value: "0.00", detail: "บาท" }, { label: "ประจำปี 2569", value: "0.00", detail: "บาท" }]} accent="#34a6eb" />
          <CompactSummaryCard title="ประเภทการลงเวลา" rows={[{ label: "ลงเวลา/สแกนใบหน้า", value: "100", detail: "%" }, { label: "Wifi", value: "0", detail: "%" }, { label: "สแกน QR Code", value: "0", detail: "%" }]} />
          <CompactSummaryCard title="การลงเวลาตามเงื่อนไข" rows={[{ label: "จำนวน", value: "0", detail: "ครั้ง" }, { label: "มาสาย", value: "0", detail: "ครั้ง" }, { label: "กลับก่อน", value: "0", detail: "ครั้ง" }]} accent="#65717b" />
        </div>
      </div>
    </div>
  );
}
