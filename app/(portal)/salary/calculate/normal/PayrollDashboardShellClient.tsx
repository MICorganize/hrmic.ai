"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { PayrollTabsBar } from "@/components/payroll/PayrollTabsBar";
import { ThaiMonthPicker } from "@/components/ui/thai-date-picker";
import { INITIAL_PAYROLL_MONTH_KEY } from "@/lib/payroll/constants";
import { formatPayrollPeriod, monthLabel } from "@/lib/payroll/format";
import type { PayrollPageSnapshot } from "@/lib/payroll/snapshot";

const PayrollCalculationClient = dynamic(() => import("./PayrollCalculationClient"), {
  ssr: false,
  loading: () => <div className="min-h-[calc(100vh-70px)] animate-pulse bg-[#f3f6fb]" aria-busy="true" />,
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
  return <div className="min-h-[calc(100vh-70px)] bg-[#f3f6fb] font-sans">
    <div className="mx-auto max-w-[1600px] p-3 sm:p-4">
      <section className="mb-3 overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
          <div className="min-w-[220px] shrink-0">
            <p className="flex items-center gap-1 text-xs font-normal leading-5 text-[#7b8798]">
            <span>ประมวลผลเงินเดือน</span>
            <ChevronRight className="size-3.5" />
            <span>คำนวณเงินเดือน</span>
          </p>
            <h1 className="text-xl font-semibold tracking-tight text-[#172348]">คำนวณเงินเดือน</h1>
          </div>

          {!closed && <div className="flex-1 rounded-lg border border-[#f3dda0] bg-[#fff9df] px-3 py-2 text-xs leading-5 text-[#755c18]">คุณกำลังคำนวณเงินเดือนของเดือน &quot;{label}&quot; เมื่อคำนวณเสร็จแล้ว กรุณาปิดงวดบัญชี <button className="font-medium text-[#1474ee] hover:underline" onClick={() => setHandoff({ tab: "ปิดงวดบัญชี", month: INITIAL_PAYROLL_MONTH_KEY })}>คลิกที่นี่</button></div>}

          <div className="w-full shrink-0 sm:w-80">
            <ThaiMonthPicker aria-label="เลือกเดือนคำนวณเงินเดือน" value={INITIAL_PAYROLL_MONTH_KEY} onChange={(month) => setHandoff({ tab: "Dashboard", month })} className="h-10 w-full rounded-lg border border-[#dfe4e8] bg-white px-3 text-sm font-normal text-[#34425c] outline-none ring-[#5eaafa] focus:ring-2" />
            <div className="mt-1 flex h-6 items-center justify-between">
              <span className="flex min-w-0 flex-1 justify-center whitespace-nowrap text-xs leading-5 text-[#6f7b90]">{period ? formatPayrollPeriod(period.start, period.end) : label}</span>
              {!closed && <button type="button" aria-label="ตั้งค่างวด" title="ตั้งค่างวด" onClick={() => setHandoff({ tab: "Dashboard", month: INITIAL_PAYROLL_MONTH_KEY, openPeriodSettings: true })} className="inline-flex size-7 items-center justify-center rounded-lg text-[#718096] hover:bg-[#eef5ff] hover:text-[#1474ee]"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current"><path d="M19.4 13a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2.1-1.7-2-3.4-2.5 1a8.2 8.2 0 0 0-1.7-1L15 3.2h-4l-.4 2.7a8.2 8.2 0 0 0-1.7 1l-2.5-1-2 3.4L6.5 11a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2.1 1.7 2 3.4 2.5-1a8.2 8.2 0 0 0 1.7 1l.4 2.7h4l.4-2.7a8.2 8.2 0 0 0 1.7-1l2.5 1 2-3.4L19.4 13ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" /></svg></button>}
            </div>
          </div>
        </div>
        <PayrollTabsBar activeTab="Dashboard" onChange={(tab) => tab !== "Dashboard" && setHandoff({ tab, month: INITIAL_PAYROLL_MONTH_KEY })} />
      </section>
      {dashboard}
    </div>
  </div>;
}
