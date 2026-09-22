import { Card, CardContent } from "@/components/ui/card";
import type { PayrollDashboardStats } from "@/lib/payroll/dashboard-client";
import { cn } from "@/lib/utils";

function DashboardCardHeader({ title, monthLabel }: { title: string; monthLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold leading-5 text-[#172348]">{title}</h2>
      <span className="shrink-0 text-xs font-normal leading-5 text-[#6f7b90]">ณ {monthLabel}</span>
    </div>
  );
}

function DashboardDivider() {
  return <div className="my-3 h-px w-full bg-[#edf0f4]" />;
}

function DashboardNumber({ count, caption }: { count: number; caption: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="text-4xl font-semibold leading-none text-[#172348]">{count}</span>
      <span className="mt-2 text-sm font-medium leading-5 text-[#34425c]">คน</span>
      <span className="mt-1 text-xs leading-5 text-[#7b8798]">{caption}</span>
    </div>
  );
}

export function PayrollDashboardContent({
  stats,
  monthLabel,
  isAccountingPeriodClosed,
}: {
  stats: PayrollDashboardStats;
  monthLabel: string;
  isAccountingPeriodClosed: boolean;
}) {
  const employeeTypeStats = [
    { label: "พนักงานรายเดือน", count: stats.employeeTypes.monthly },
    { label: "พนักงานรายวัน", count: stats.employeeTypes.daily },
    { label: "พนักงานพาร์ตไทม์", count: stats.employeeTypes.partTime },
    { label: "พนักงานเหมาจ่าย", count: stats.employeeTypes.contract },
  ];
  const statusBlocks = [
    { label: "พนักงานเข้าใหม่", count: stats.newEmployees },
    { label: "พนักงานลาออก", count: stats.terminatedEmployees },
    { label: "วันเกิดพนักงาน", count: stats.birthdays },
  ];
  const chartTotal = employeeTypeStats.reduce((total, item) => total + item.count, 0);
  const chartColors = ["#1474ee", "#20b889", "#ff9f1c", "#7657e8"];
  let chartOffset = 0;
  const chartBackground = chartTotal
    ? `conic-gradient(${employeeTypeStats
        .filter((item) => item.count > 0)
        .map((item, index) => {
          const start = chartOffset;
          chartOffset += (item.count / chartTotal) * 100;
          return `${chartColors[index]} ${start}% ${chartOffset}%`;
        })
        .join(", ")})`
    : "#dce9f8";

  return (
    <div className="flex flex-col gap-3 pb-3">
      <div className="grid gap-3 xl:grid-cols-[0.72fr_1.28fr]">
        {/* พนักงานทั้งหมด */}
        <Card className="min-h-[248px] rounded-xl border border-[#e7eaf0] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
          <CardContent className="flex h-full flex-col p-4">
            <DashboardCardHeader title="พนักงานทั้งหมด" monthLabel={monthLabel} />
            <DashboardDivider />
            <div className="flex flex-1 gap-6 py-3">
              <DashboardNumber count={stats.salaryEmployees} caption="(ฐานข้อมูลเงินเดือน)" />
              {!isAccountingPeriodClosed && (
                <>
                  <span className="self-center text-2xl font-normal text-[#9aa5b4]">=</span>
                  <DashboardNumber count={stats.totalEmployees} caption="(ฐานข้อมูลพนักงาน)" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* สัดส่วนพนักงาน */}
        <Card className="min-h-[248px] rounded-xl border border-[#e7eaf0] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
          <CardContent className="h-full p-4">
            <DashboardCardHeader title="สัดส่วนพนักงาน" monthLabel={monthLabel} />
            <DashboardDivider />
            <div className="grid min-h-[172px] gap-4 md:grid-cols-[160px_1fr_1.15fr]">
              <div className="flex items-center justify-center">
                <div
                  role="img"
                  aria-label={`กราฟสัดส่วนพนักงาน: พนักงานรายเดือน ${stats.employeeTypes.monthly} คน`}
                  className="relative size-[138px] rounded-full bg-[#dce9f8] shadow-inner"
                  style={{ background: chartBackground }}
                >
                  <span className="absolute inset-[34px] rounded-full bg-white shadow-[0_2px_8px_rgba(29,52,93,.08)]" />
                </div>
              </div>

              <div className="flex flex-col justify-center text-sm leading-5 text-[#4d5a6d]">
                {employeeTypeStats.map((s, index) => (
                  <div key={s.label} className={cn("flex w-full items-center justify-between gap-3 border-b border-[#edf0f4] py-2", index === employeeTypeStats.length - 1 && "border-b-0")}>
                    <span className="whitespace-nowrap">{s.label}</span>
                    <span className="shrink-0 whitespace-nowrap font-semibold text-[#172348]">{s.count} คน</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {statusBlocks.map((b) => (
                  <div key={b.label} className="flex min-w-0 flex-col items-center justify-center rounded-lg bg-[#f7f9fc] px-2 py-3 text-center">
                    <span className="text-xs leading-5 text-[#7b8798]">{b.label}</span>
                    <span className="mt-1 text-3xl font-semibold leading-none text-[#172348]">{b.count}</span>
                    <span className="mt-2 text-xs font-medium leading-5 text-[#5f6d80]">คน</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* คำแนะนำ */}
      {!isAccountingPeriodClosed && (
        <div>
          <Card className="rounded-xl border border-[#e7eaf0] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
            <CardContent className="p-4">
              <DashboardCardHeader title="คำแนะนำ" monthLabel={monthLabel} />
              <DashboardDivider />
              <div className="flex min-h-11 items-center justify-center rounded-lg border border-[#f3dda0] bg-[#fff9df] p-2 text-sm font-medium leading-5 text-[#755c18]">
                ใช้ได้เฉพาะแพ็คเกจ Professional เท่านั้น
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
