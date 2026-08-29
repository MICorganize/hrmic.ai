import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">404 — ไม่พบหน้านี้</h2>
      <p className="text-zinc-500">ไม่พบ Route หรือข้อมูลที่ต้องการ</p>
      <Link
        href="/"
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white"
      >
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
