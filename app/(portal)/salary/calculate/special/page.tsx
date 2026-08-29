"use client";

import { CalendarDays, ChevronRight, Plus, X } from "lucide-react";
import { useState } from "react";

function EmptyState() {
  return (
    <div className="sticky left-0 flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
          <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
          <g fill="#d9d9d9" fillRule="nonzero">
            <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill="#fafafa" />
          </g>
        </g>
      </svg>
      <p className="mt-2 text-sm text-[#999]">ไม่มีข้อมูล</p>
    </div>
  );
}

export default function SpecialPayrollCalculationPage() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-[#e7eff8]">
      <section className="flex min-h-40 items-start justify-between gap-5 bg-[#61a8ff] px-6 pb-6 pt-12 text-white">
        <div>
          <div className="flex items-center gap-1 text-sm text-white/90"><span>การประมวลผลเงินเดือน</span><ChevronRight className="size-4" /><span>คำนวณงวดพิเศษ</span></div>
          <h1 className="mt-1 text-[26px] font-bold leading-tight">คำนวณงวดพิเศษ</h1>
        </div>
        <button type="button" className="mt-4 flex h-8 w-[180px] items-center justify-between rounded bg-white px-3 text-sm font-semibold text-[#4b4f53] shadow-sm">กันยายน 2026<CalendarDays className="size-4 text-[#66717b]" /></button>
      </section>

      <section className="px-8 py-8">
        <div className="overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(58,81,106,0.2)]">
          <div className="h-[218px] overflow-auto">
            <table className="w-[1350px] table-fixed border-collapse text-sm text-[#4a4e52]">
              <thead className="sticky top-0 z-10 bg-[#61a8f6] text-white"><tr className="h-[54px] font-semibold"><th className="w-[163px] border-r border-white/50 px-3 text-center">งวดที่</th><th className="w-[271px] border-r border-white/50 px-3 text-center">ชื่องวดพิเศษ</th><th className="w-[203px] border-r border-white/50 px-3 text-center">วันที่จ่าย</th><th className="w-[205px] border-r border-white/50 px-3 text-center">พนักงาน</th><th className="w-[161px] border-r border-white/50 px-3 text-center">สิ้นสุดการคำนวณ</th><th className="w-[347px]" /></tr></thead>
              <tbody><tr className="h-[151px] bg-[#f1f9ff]"><td colSpan={6}><EmptyState /></td></tr></tbody>
            </table>
          </div>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className="mt-3 flex h-9 w-full items-center justify-center rounded bg-[#168fe9] text-sm font-semibold text-white shadow-sm hover:bg-[#087fd8]">เพิ่มงวดพิเศษ</button>
      </section>

      {addOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4"><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-lg bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><h2 className="text-xl font-semibold text-[#303943]">เพิ่มงวดพิเศษ</h2><button type="button" onClick={() => setAddOpen(false)} aria-label="ปิด"><X className="size-5" /></button></div><div className="space-y-4 px-6 py-5"><label className="block text-sm font-medium text-slate-700">ชื่องวดพิเศษ<input className="mt-1 h-10 w-full rounded border border-slate-300 px-3 font-normal outline-none" /></label><label className="block text-sm font-medium text-slate-700">วันที่จ่าย<input className="mt-1 h-10 w-full rounded border border-slate-300 px-3 font-normal outline-none" /></label></div><div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4"><button type="button" onClick={() => setAddOpen(false)} className="h-9 rounded border border-slate-300 px-4 text-sm">ยกเลิก</button><button type="button" onClick={() => setAddOpen(false)} className="h-9 rounded bg-[#168ee8] px-4 text-sm text-white">บันทึก</button></div></div></div>}
    </div>
  );
}
