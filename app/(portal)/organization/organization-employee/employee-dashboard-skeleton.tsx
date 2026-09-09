export function EmployeeDashboardSkeleton() {
  return (
    <section className="ml-4 overflow-hidden rounded-lg border-none bg-white" aria-label="Dashboard พนักงาน" aria-busy="true">
      <div className="flex h-[59.3625px] items-center border-b border-black/[0.12] p-3 text-[22px]">Dashboard</div>
      <span role="status" className="sr-only">กำลังโหลดข้อมูลพนักงาน</span>
      <div className="space-y-10 px-8 py-10" aria-hidden="true">
        <div className="grid gap-8 xl:grid-cols-[1.3fr_.7fr_1fr]">
          {[0, 1, 2].map((index) => <div key={index} className="h-64 animate-pulse rounded-lg bg-[#f5f5f5]" />)}
        </div>
        <div className="grid gap-8 xl:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-[#f5f5f5]" />
          <div className="h-64 animate-pulse rounded-lg bg-[#f5f5f5]" />
        </div>
      </div>
    </section>
  );
}
