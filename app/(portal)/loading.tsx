export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]" aria-busy="true" aria-label="กำลังเปิดหน้า">
      <div className="h-16 animate-pulse border-b border-black/10 bg-white" />
      <div className="flex">
        <div className="hidden h-[calc(100vh-4rem)] w-20 animate-pulse border-r border-black/10 bg-white lg:block" />
        <main className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
          <div className="h-9 w-56 animate-pulse rounded bg-black/10" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-white shadow-sm" />)}
          </div>
          <div className="h-80 animate-pulse rounded-lg bg-white shadow-sm" />
        </main>
      </div>
    </div>
  );
}
