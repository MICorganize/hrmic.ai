"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { PayrollTabsBar } from "@/components/payroll/PayrollTabsBar";
import { INITIAL_PAYROLL_MONTH_KEY } from "@/lib/payroll/constants";
import { formatPayrollPeriod, monthLabel } from "@/lib/payroll/format";
import type { PayrollPageSnapshot } from "@/lib/payroll/snapshot";

const PayrollCalculationClient = dynamic(() => import("./PayrollCalculationClient"), {
  ssr: false,
  loading: () => <div className="min-h-[calc(100vh-10rem)] animate-pulse bg-[#eef6fd]" aria-busy="true" />,
});

export default function PayrollDashboardShellClient({
  initialSnapshot,
  dashboard,
}: {
  initialSnapshot?: PayrollPageSnapshot | null;
  /** Static dashboard markup rendered by the server component tree. */
  dashboard: ReactNode;
}) {
  const [handoff, setHandoff] = useState<{ tab: string; month: string; openPeriodSettings?: boolean } | null>(null);
  if (handoff) return <PayrollCalculationClient initialSnapshot={initialSnapshot} initialTab={handoff.tab} initialMonthKey={handoff.month} initialPeriodSettingsOpen={handoff.openPeriodSettings} />;

  const label = monthLabel(INITIAL_PAYROLL_MONTH_KEY);
  const period = initialSnapshot?.dashboard.period;
  const closed = initialSnapshot?.closePeriod.isClosed ?? false;
  return <div>
    <section className="h-[7.5rem] bg-[#61a8ff] px-6 text-sm leading-[22px] tracking-[-0.1px] text-white">
      <div className="flex h-full items-start justify-between pt-6">
        {/* Breadcrumb + title */}
        <div className="w-[240.875px] shrink-0">
          <p className="flex items-center gap-0 text-sm leading-[22px] tracking-[-0.1px] text-white/70">
            <span>การประมวลผลเงินเดือน</span>
            <ChevronRight className="size-4" />
            <span>คำนวณเงินเดือน</span>
          </p>
          <h1 className="inline-block text-[24px] font-normal leading-[37.716px] tracking-[-0.1px] text-white">คำนวณเงินเดือน</h1>
        </div>
        {!closed && <div className="max-w-xl bg-[#fdff82] p-3 text-sm text-black">คุณกำลังคำนวณเงินเดือนของเดือน &quot;{label}&quot; หากคำนวณเสร็จแล้ว กรุณาปิดงวดบัญชีด้วย <button className="text-[#039be5]" onClick={() => setHandoff({ tab: "ปิดงวดบัญชี", month: INITIAL_PAYROLL_MONTH_KEY })}>คลิกที่นี่</button></div>}
        <div className="w-80 shrink-0">
          <input aria-label="เลือกเดือนคำนวณเงินเดือน" type="month" value={INITIAL_PAYROLL_MONTH_KEY} onChange={(event) => setHandoff({ tab: "Dashboard", month: event.target.value })} className="h-[31.6px] w-full rounded-[4px] border-[0.8px] border-[#d9d9d9] bg-white px-[11px] text-black" />
          <div className="flex h-6 items-center justify-between">
            <span className="flex min-w-0 flex-1 justify-center whitespace-nowrap text-sm leading-[22px] tracking-[-0.1px] text-white">{period ? formatPayrollPeriod(period.start, period.end) : label}</span>
            {!closed && <button type="button" aria-label="ตั้งค่างวด" title="ตั้งค่างวด" onClick={() => setHandoff({ tab: "Dashboard", month: INITIAL_PAYROLL_MONTH_KEY, openPeriodSettings: true })} className="inline-flex size-6 items-center justify-center rounded-full hover:bg-white/20"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current"><path d="M19.4 13a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2.1-1.7-2-3.4-2.5 1a8.2 8.2 0 0 0-1.7-1L15 3.2h-4l-.4 2.7a8.2 8.2 0 0 0-1.7 1l-2.5-1-2 3.4L6.5 11a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2.1 1.7 2 3.4 2.5-1a8.2 8.2 0 0 0 1.7 1l.4 2.7h4l.4-2.7a8.2 8.2 0 0 0 1.7-1l2.5 1 2-3.4L19.4 13ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" /></svg></button>}
          </div>
        </div>
      </div>
    </section>
    <PayrollTabsBar activeTab="Dashboard" onChange={(tab) => tab !== "Dashboard" && setHandoff({ tab, month: INITIAL_PAYROLL_MONTH_KEY })} />
    <div className="min-h-[calc(100vh-10rem)] bg-[#eef6fd]">{dashboard}</div>
  </div>;
}