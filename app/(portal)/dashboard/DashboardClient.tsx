import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
} from "lucide-react";

import { HRMicWordmark } from "@/components/hrmic-wordmark";
import { SUPPORT_ASSET_ORIGIN } from "@/lib/external-assets";
import { cn } from "@/lib/utils";

import { DashboardMetricsSection } from "./DashboardMetricsSection";
import { DashboardShellTelemetry } from "./DashboardShellTelemetry";

function DateControl({ children = "ส.ค. 2026", wide = false }: { children?: ReactNode; wide?: boolean }) {
  return (
    <button type="button" className={cn("inline-flex h-8 items-center justify-between gap-2 rounded border border-[#dfe4e8] bg-white px-2 text-sm font-medium leading-[22.001px] text-[#66717c]", wide ? "w-[185px]" : "w-[80px]") }>
      <span className="truncate">{children}</span>
      <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.5} />
    </button>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("overflow-hidden rounded-lg border border-[#e5e9ed] bg-white text-sm font-medium leading-[22.001px] shadow-[0_1px_2px_rgba(0,0,0,0.14)]", className)}>{children}</section>;
}

function SalaryHistory() {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const labels = ["16,000", "14,000", "12,000", "10,000", "8,000", "6,000", "4,000", "2,000", "0"];
  return (
    <Card className="h-[388px] p-[15.2px]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="whitespace-nowrap text-base font-bold leading-[25.144px] text-[#414852]">ประวัติผลการคำนวณเงินเดือน</h2>
        <div className="flex shrink-0 gap-0.5 pt-[5px]">
          <button type="button" className="flex h-8 w-[185px] items-center justify-between rounded border border-[#dfe4e8] px-3 text-sm font-medium leading-[22.001px] text-[#6b737d]">เงินเดือน<ChevronDown className="size-4" /></button>
          <DateControl>2026</DateControl>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[43px_1fr]">
        <div className="flex h-[272px] flex-col justify-between pb-5 text-right text-xs text-[#707a84]">{labels.map((label) => <span key={label}>{label}</span>)}</div>
        <div className="relative h-[272px]">
          <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">{labels.map((label) => <span key={label} className="border-t border-[#e3e7eb]" />)}</div>
          <svg className="absolute inset-x-0 top-0 h-[250px] w-full" preserveAspectRatio="none" viewBox="0 0 400 250" aria-label="กราฟประวัติผลการคำนวณเงินเดือน">
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
    <Card className={cn("h-[388px] p-[15.2px]", className)}>
      <div className="flex items-start justify-between"><h2 className="text-base font-bold leading-[25.144px] text-[#414852]">{title}</h2><DateControl>2026</DateControl></div>
      <div className="mt-16 flex h-44 items-end justify-center gap-6"><div className="h-20 w-12 rounded-t bg-[#129cf0]" /><div className="h-3 w-12 rounded-t bg-[#ff7900]" /></div>
      <div className="flex justify-center gap-5 text-sm text-[#69737e]"><span className="inline-flex items-center gap-1"><i className="size-3 bg-[#129cf0]" />เข้าใหม่</span><span className="inline-flex items-center gap-1"><i className="size-3 bg-[#ff7900]" />ลาออก</span></div>
    </Card>
  );
}

function SummaryLine({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#edf0f3] py-2 text-[13px] leading-[19px] text-[#56616b] last:border-0">
      <span>{label}{detail && <small className="ml-1 text-[#8a939c]">{detail}</small>}</span>
      <strong className="font-medium text-[#4b545d]">{value}</strong>
    </div>
  );
}

function DocumentsSummary() {
  const documents = [["ลางาน", "0"], ["โอที", "0"], ["เพิ่มเวลา", "0"], ["เปลี่ยนกะการทำงาน", "0"], ["เปลี่ยนวันหยุด", "2"], ["เบิกเงินล่วงหน้า", "0"]];
  return (
    <Card className="h-[388px] p-[15.2px]">
      <div className="flex items-start justify-between"><h2 className="text-base font-bold leading-[25.144px] text-[#414852]">เอกสารทั้งหมด</h2><span className="text-sm text-[#65707b]">เอกสาร <b className="ml-1 text-[#139def]">2</b> ฉบับ</span></div>
      <div className="mt-7 grid grid-cols-2 gap-x-8">{documents.map(([label, value]) => <SummaryLine key={label} label={label} value={`${value} ฉบับ`} />)}</div>
      <h3 className="mt-7 text-sm font-semibold text-[#535c65]">เอกสารที่ยังไม่ได้รับการอนุมัติ</h3>
      <div className="mt-2 grid grid-cols-2 gap-x-8"><SummaryLine label="โอที" value="0 ฉบับ" /><SummaryLine label="ลางาน" value="0 ฉบับ" /></div>
    </Card>
  );
}

function CompactSummaryCard({ title, rows, accent = "#139def" }: { title: string; rows: { label: string; value: string; detail?: string }[]; accent?: string }) {
  return (
    <Card className="h-[388px] p-[15.2px]">
      <h2 className="text-base font-bold leading-[25.144px] text-[#414852]">{title}</h2>
      <div className="mt-6 space-y-0.5">{rows.map((row, index) => <div key={row.label} className="border-b border-[#edf0f3] py-3 last:border-0"><p className="text-sm text-[#64707b]">{row.label}</p><p className="mt-1 text-xl font-medium leading-6" style={{ color: index === 0 ? accent : "#515b64" }}>{row.value}{row.detail && <span className="ml-1 text-sm text-[#68737d]">{row.detail}</span>}</p></div>)}</div>
    </Card>
  );
}

function ServiceHeader() {
  return (
    <header className="flex h-[119.4875px] flex-col justify-between gap-[5px] border-b border-[#d8e0e9] bg-white">
      <div className="mb-[5px] min-h-0 basis-[10%]" />
      <div className="mb-[5px] flex min-h-0 basis-[80%] items-stretch">
        <div className="flex basis-1/5 flex-col items-center justify-center">
          <div className="scale-90 translate-x-[9.6px] translate-y-[-1.225px]"><HRMicWordmark /></div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex w-full">
            <div className="flex w-3/5 justify-end">
              <div className="flex w-1/3 items-center justify-center gap-[10px]">
                <div className="mr-[10px] flex items-center justify-center"><img src={`${SUPPORT_ASSET_ORIGIN}/assets/images/logos/widget/hms_new.svg`} alt="" loading="lazy" decoding="async" className="size-10 rounded-full" /></div>
                <div className="flex flex-col items-center text-xs leading-[18px] text-[#313131]"><span className="font-semibold text-[#008cff]">Customer Service</span><span>HRMic Team&nbsp;</span><a href="tel:1537" className="text-[#008cff]">1537</a></div>
              </div>
            </div>
            <div className="flex w-2/5 items-end justify-end gap-3 text-xs text-[#313131]">
              <div className="mr-3 flex w-[200px] cursor-pointer flex-col items-center justify-center"><img src={`${SUPPORT_ASSET_ORIGIN}/assets/images/logos/widget/messenger.svg`} alt="icon phone" loading="lazy" decoding="async" className="size-[35px]" /><span>HRMic</span></div>
              <div className="mr-3 flex w-[200px] cursor-pointer flex-col items-center justify-center"><img src={`${SUPPORT_ASSET_ORIGIN}/assets/images/logos/widget/line.svg`} alt="icon phone" loading="lazy" decoding="async" className="size-[35px]" /><span>@HRMic</span></div>
              <div className="flex w-[200px] cursor-pointer flex-col items-center justify-center"><img src={`${SUPPORT_ASSET_ORIGIN}/assets/images/logos/widget/livechat.svg`} alt="icon phone" loading="lazy" decoding="async" className="size-[35px]" /><span>Live Chat</span></div>
            </div>
          </div>
        </div>
        <div className="flex basis-[15%] flex-col items-end justify-center gap-[5px] p-[5px] text-right text-xs text-[#313131]">
          <div className="flex items-center justify-end gap-[10px]"><span className="mr-[10px] text-base font-medium">Widget(Beta)</span><svg className="size-5 cursor-pointer" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M22.2133 6.02663L25.9867 9.79996L22.2133 13.5733L18.44 9.79996L22.2133 6.02663ZM12 6.66663V12H6.66667V6.66663H12ZM25.3333 20V25.3333H20V20H25.3333ZM12 20V25.3333H6.66667V20H12ZM22.2133 2.2533L14.6667 9.78663L22.2133 17.3333L29.76 9.78663L22.2133 2.2533ZM14.6667 3.99996H4V14.6666H14.6667V3.99996ZM28 17.3333H17.3333V28H28V17.3333ZM14.6667 17.3333H4V28H14.6667V17.3333Z" fill="#515151" /></svg></div>
          <div className="flex w-full justify-end"><span>ข้อมูลอัพเดทล่าสุดวันที่ 25 ส.ค. 2026</span></div>
        </div>
      </div>
      <div className="flex min-h-0 basis-[10%] items-center justify-center"><p className="-translate-y-1.5 text-xs leading-[18px] text-[#313131]">เปิดทำการทุกวัน เวลาทำการ 08.30 - 17.30 น.</p></div>
    </header>
  );
}

export default function DashboardClient() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#e9f3fc] [font-family:Anuphan,var(--font-kanit),sans-serif]">
      <DashboardShellTelemetry />
      <ServiceHeader />
      <div className="grid gap-3 px-[34px] py-[18px] lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3"><SalaryHistory /><SmallChartCard title={<>เงินเดือน<br />ตามสำนักงาน</>} /></div>
        <DashboardMetricsSection />
        <DocumentsSummary />
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
          <CompactSummaryCard title="ภาษี ภงด.1" rows={[{ label: "ประจำเดือน ส.ค.", value: "0.00", detail: "บาท" }, { label: "ภาษี ภงด.3", value: "0.00", detail: "บาท" }, { label: "ภาษี ภงด.1ก", value: "0.00", detail: "บาท" }]} />
          <CompactSummaryCard title="เงินสมทบประกันสังคม" rows={[{ label: "ประจำเดือน ส.ค.", value: "0.00", detail: "บาท" }, { label: "ประจำปี 2026", value: "0.00", detail: "บาท" }]} accent="#34a6eb" />
          <CompactSummaryCard title="ประเภทการลงเวลา" rows={[{ label: "ลงเวลา/สแกนใบหน้า", value: "100", detail: "%" }, { label: "Wifi", value: "0", detail: "%" }, { label: "สแกน QR Code", value: "0", detail: "%" }]} />
          <CompactSummaryCard title="การลงเวลาตามเงื่อนไข" rows={[{ label: "จำนวน", value: "0", detail: "ครั้ง" }, { label: "มาสาย", value: "0", detail: "ครั้ง" }, { label: "กลับก่อน", value: "0", detail: "ครั้ง" }]} accent="#65717b" />
        </div>
      </div>
    </div>
  );
}
