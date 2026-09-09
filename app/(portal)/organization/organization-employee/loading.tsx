import { EmployeeDashboardSkeleton } from "./employee-dashboard-skeleton";

const SUBMENU_ITEMS = [
  "Dashboard", "นำเข้าข้อมูลพนักงาน", "รูปพนักงาน", "ข้อมูลพื้นฐาน", "ข้อมูลเงินเดือน", "ข้อมูลผู้ใช้", "ข้อมูลใบหน้า",
  "กำหนดผู้อนุมัติรายบุคคล", "ช่องทางการรับเงิน", "ตั้งค่ากะการทำงาน", "ตั้งค่าการมองเห็นกะการทำงาน",
  "ตั้งค่าวันทำงาน-วันหยุด", "ตั้งค่ากะการทำงาน-วันหยุด", "ตั้งค่าทั่วไป", "รายรับรายจ่ายคงที่", "รายรับรายจ่ายอัตโนมัติ",
  "กองทุน", "เงินสะสมย้อนหลัง", "เงินประกันการทำงาน", "ตั้งค่าการแก้ไขข้อมูล", "ตั้งค่า Hashtag", "ตั้งค่าสวัสดิการ",
  "ตั้งค่าการมองเห็นประเภทโอที", "ตั้งค่าการมองเห็นประเภทการลา", "ตั้งค่า Cost Distribution", "ตั้งค่าคำนวณโควตาการลา",
  "ลดหย่อนภาษี", "นำเข้าฝึกอบรม", "นำเข้าสินทรัพย์ถือครอง", "นำเข้าประวัติส่วนตัว", "ลบข้อมูลพนักงาน",
];

/**
 * This shell is prefetched with the route so clicking the Sidebar's
 * ข้อมูลพนักงาน item immediately reveals its Dashboard and submenu.
 */
export default function Loading() {
  return (
    <div data-employee-page aria-busy="true">
      <section className="relative flex h-40 items-center justify-between overflow-hidden border-b border-white/20 bg-[#61a8ff] p-6 tracking-[-0.1px] text-white">
        <div className="flex min-w-0 flex-col items-start">
          <div className="hidden items-center text-sm leading-[22.001px] text-white/70 md:flex"><span>ข้อมูลองค์กร</span><span className="mx-1">›</span><span>ข้อมูลพนักงาน</span></div>
          <h1 className="w-fit pr-[30px] text-2xl font-normal leading-[37.716px] text-white">ข้อมูลพนักงาน</h1>
          <div className="mt-1 hidden h-[36.65px] w-[170.8px] rounded-[4px] bg-white md:block" />
        </div>
        <div className="mx-16 hidden flex-1 flex-col items-center justify-center md:flex"><div className="h-2 w-full rounded-[4px] bg-[#c5c6cb]" /><span className="mt-1 w-full text-right text-sm font-normal leading-[22.001px] text-white">กำลังโหลดจำนวนพนักงาน…</span></div>
        <div className="mt-4 hidden h-[36.65px] w-[108px] rounded-[4px] bg-white md:block" />
      </section>

      <div className="relative min-h-[calc(100vh-10rem)] bg-[#f1f7fc] px-3 pb-8 pt-10 sm:px-4 lg:px-0 lg:pt-0">
        <div className="grid items-start gap-3 lg:grid-cols-[226.3375px_minmax(0,1fr)] lg:gap-0">
          <aside className="z-10 flex flex-col overflow-x-hidden overflow-y-auto border-none bg-[#fafafa] text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)] lg:mt-10 lg:w-fit" style={{ boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.35)" }}>
            <div className="border-none px-4 py-2"><h2 className="m-0 border-none text-xl font-normal leading-[31.425px] tracking-[-0.1px] text-[rgba(0,0,0,0.85)]">เมนูย่อย</h2></div>
            <div className="border-none p-2 px-4 text-sm font-normal leading-[22.001px] tracking-[-0.1px]">
              {SUBMENU_ITEMS.map((item) => <div key={item} className={`mb-3 block h-[41.2px] w-full rounded-[8px] border-[1.6px] px-2 py-2 text-center text-sm font-normal leading-[22.001px] tracking-[-0.1px] ${item === "Dashboard" ? "border-[#2299ff] bg-[#2299ff] text-white" : "border-[#2299ff] bg-transparent text-[rgba(0,0,0,0.87)]"}`}>{item}</div>)}
            </div>
          </aside>
          <div className="min-w-0 lg:-mt-[15px]"><EmployeeDashboardSkeleton /></div>
        </div>
      </div>
    </div>
  );
}
