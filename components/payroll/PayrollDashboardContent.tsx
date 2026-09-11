import { Card, CardContent } from "@/components/ui/card";
import type { PayrollDashboardStats } from "@/lib/payroll/dashboard-client";
import { cn } from "@/lib/utils";

function DashboardCardHeader({ title, monthLabel }: { title: string; monthLabel: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-sm font-normal leading-[22px] text-[rgba(0,0,0,0.87)]">
        <p className="font-normal">&nbsp;{title}</p>
        <span className="shrink-0">(ณ {monthLabel})</span>
      </div>
    </>
  );
}

function DashboardDivider() {
  return <div className="my-4 h-[2px] w-full bg-[#f0f0f0]" />;
}

function DashboardNumber({ count, caption }: { count: number; caption: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="[font-size:3vw] font-bold leading-[56px] text-[rgba(0,0,0,0.87)]">{count}</span>
      <span className="[font-size:1.5vw] leading-[40px] text-[rgba(0,0,0,0.87)]">คน</span>
      <span className="text-[15px] leading-[23.5725px] text-[rgba(0,0,0,0.54)]">{caption}</span>
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
  const chartColors = ["#b5d9e9", "#75b9dc", "#8fca8b", "#e8bf77"];
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
    : "#b5d9e9";

  return (
    <div className="flex flex-col p-8">
      <div className="flex flex-col xl:flex-row">
        {/* พนักงานทั้งหมด */}
        <Card className="m-3 h-[248px] flex-[1_1_100%] rounded-lg border-0 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)] xl:max-w-[33.34%]">
          <CardContent className="h-full p-[16px_8px]">
            <DashboardCardHeader title="พนักงานทั้งหมด" monthLabel={monthLabel} />
            <DashboardDivider />
            <div className="flex gap-6">
              <DashboardNumber count={stats.salaryEmployees} caption="(ฐานข้อมูลเงินเดือน)" />
              {!isAccountingPeriodClosed && (
                <>
                  <span className="self-center [font-size:3vw] font-normal leading-[56px] text-[rgba(0,0,0,0.87)]">=</span>
                  <DashboardNumber count={stats.totalEmployees} caption="(ฐานข้อมูลพนักงาน)" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* สัดส่วนพนักงาน */}
        <Card className="m-3 h-[248px] flex-[1_1_100%] rounded-lg border-0 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)] xl:max-w-[66.66%]">
          <CardContent className="h-full p-[16px_8px]">
            <DashboardCardHeader title="สัดส่วนพนักงาน" monthLabel={monthLabel} />
            <DashboardDivider />
            <div className="flex h-[160.275px] flex-wrap">
              <div className="mr-3 flex flex-1 items-center justify-center">
                <div
                  role="img"
                  aria-label={`กราฟสัดส่วนพนักงาน: พนักงานรายเดือน ${stats.employeeTypes.monthly} คน`}
                  className="relative size-[150px] rounded-full bg-[#b5d9e9]"
                  style={{ background: chartBackground }}
                >
                  <span className="absolute left-1/2 top-[5px] h-[70px] w-[3px] -translate-x-1/2 rounded-full bg-white" />
                </div>
              </div>

              <div className="mr-3 flex flex-1 flex-col items-start justify-center text-[17px] leading-[26.7155px] text-[rgba(0,0,0,0.87)]">
                {employeeTypeStats.map((s, index) => (
                  <div key={s.label} className={cn("flex w-full items-start gap-3 first:gap-4", index === 0 && "relative -top-[3px]", index < 3 && "mb-[3px]")}>
                    <span className="flex-1 whitespace-nowrap">{s.label}</span>
                    <span className="w-[32.125px] shrink-0 whitespace-nowrap text-left">{s.count} คน</span>
                  </div>
                ))}
              </div>

              {statusBlocks.map((b, index) => (
                <div
                  key={b.label}
                  className={cn(
                    "flex flex-[1_1_15%] flex-col items-center justify-center text-center xl:max-w-[15%]",
                    index < statusBlocks.length - 1 && "mr-3"
                  )}
                >
                  <span className="text-[15px] leading-[23.5725px] text-[rgba(0,0,0,0.54)]">{b.label}</span>
                  <span className="[font-size:3vw] font-bold leading-[56px] text-[rgba(0,0,0,0.87)]">{b.count}</span>
                  <span className="[font-size:1.5vw] leading-[40px] text-[rgba(0,0,0,0.87)]">คน</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* คำแนะนำ */}
      {!isAccountingPeriodClosed && (
        <div className="flex">
          <Card className="m-3 h-[144px] flex-[1_1_0%] rounded-lg border-0 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
            <CardContent className="h-full p-[16px_8px]">
              <DashboardCardHeader title="คำแนะนำ" monthLabel={monthLabel} />
              <div className="flex h-[34px]"><DashboardDivider /></div>
              <div className="mb-3 flex h-[44.275px] items-center justify-center rounded-[4px] bg-[#fdff82] p-2 text-[18px] font-normal leading-[28.287px] text-black shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
                ใช้ได้เฉพาะแพ็คเกจ Professional เท่านั้น
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}