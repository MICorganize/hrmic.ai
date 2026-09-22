export function EmployeeDashboardSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e7e8ec] bg-white" aria-label="Dashboard พนักงาน" aria-busy="true">
      <span role="status" className="sr-only">กำลังโหลดข้อมูลพนักงาน</span>
      <div className="flex items-center justify-between gap-4 px-5 py-4" aria-hidden="true">
        <div className="flex gap-2"><div className="h-10 w-14 animate-pulse rounded-md bg-[#f0f1f4]" /><div className="h-10 w-56 animate-pulse rounded-md bg-[#f0f1f4]" /></div>
        <div className="flex gap-2"><div className="h-10 w-32 animate-pulse rounded-md bg-[#f0f1f4]" /><div className="h-10 w-28 animate-pulse rounded-md bg-[#f0f1f4]" /></div>
      </div>
      <div className="mx-5 h-11 animate-pulse bg-[#f0f0f4]" aria-hidden="true" />
      <div className="space-y-px px-5 pb-4" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((index) => <div key={index} className="h-[66px] animate-pulse border-b border-[#eeeef1] bg-white"><div className="mt-5 h-4 w-3/4 rounded bg-[#f3f4f6]" /></div>)}
      </div>
    </section>
  );
}
