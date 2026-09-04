"use client";

import { CalendarDays, Check, ChevronDown, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { DOCUMENTATION_ORIGIN } from "@/lib/external-assets";

function Field({ label, placeholder, children }: { label: string; placeholder?: string; children?: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-[#444b51]">
      {label}
      {children ?? <input placeholder={placeholder} className="mt-1 block h-8 w-full rounded border border-[#d8d8d8] bg-white px-3 text-sm font-normal outline-none placeholder:text-[#c8c8c8] focus:border-[#168ee8]" />}
    </label>
  );
}

function SelectField({ label, value }: { label: string; value: string }) {
  return <Field label={label}><span className="relative mt-1 block"><select defaultValue={value} className="h-8 w-full appearance-none rounded border border-[#d8d8d8] bg-white px-3 text-sm font-normal outline-none"><option>{value}</option></select><ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-[#7d858c]" /></span></Field>;
}

function DocumentManagementPage({ documentType }: { documentType: "leave" | "overtime" | "time-adjust" | "work-cycle" | "holiday" }) {
  const [searched, setSearched] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [allSelected, setAllSelected] = useState(false);
  const isCompactDocument = documentType !== "leave";
  const documentTitle = documentType === "overtime" ? "โอที" : documentType === "time-adjust" ? "จัดการเพิ่มเวลา" : documentType === "work-cycle" ? "กะการทำงาน" : documentType === "holiday" ? "วันหยุด" : "ลางาน";
  const requestLabel = documentType === "overtime" ? "ขอโอที" : documentType === "time-adjust" ? "ขอเพิ่มเวลา" : documentType === "work-cycle" ? "ขอเปลี่ยนกะการทำงาน" : documentType === "holiday" ? "ขอเปลี่ยนวันหยุด" : "ขอลางาน";
  const requestTypeLabel = documentType === "overtime" ? "ประเภทการทำโอที" : documentType === "time-adjust" ? "ประเภทการเพิ่มเวลา" : documentType === "work-cycle" ? "กะการทำงาน" : documentType === "holiday" ? "วันหยุด" : "ประเภทการลา";
  const requestDetailLabel = documentType === "overtime" ? "รายละเอียดการทำโอที" : documentType === "time-adjust" ? "รายละเอียดการเพิ่มเวลา" : documentType === "work-cycle" ? "รายละเอียดการเปลี่ยนกะการทำงาน" : documentType === "holiday" ? "รายละเอียดการเปลี่ยนวันหยุด" : "รายละเอียด";
  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-[#e7eff8]">
      <section className="flex min-h-40 items-start justify-between gap-5 bg-[#61a8ff] px-6 pb-6 pt-12 text-white">
        <div><div className="flex items-center gap-1 text-sm text-white/90"><span>การประมวลผลเงินเดือน</span><ChevronRight className="size-4" /><span>จัดการเอกสาร</span></div><h1 className="mt-1 text-[26px] font-bold leading-tight">{documentTitle}</h1></div>
        <button type="button" onClick={() => setRequestOpen(true)} className="mt-3 inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-[#4e4e4e] shadow-md hover:bg-slate-50">{requestLabel}</button>
      </section>
      <section className="px-8 py-8">
        <p className="mb-[2px] text-sm text-[#535b62]">เรียนรู้เพิ่มเติมวิธีการขออนุมัติเอกสารต่างๆ ไปคู่มือที่นี้ <a href={`${DOCUMENTATION_ORIGIN}/docs/SubmitDocuments`} className="text-[#168fe9] hover:underline">Link</a></p>
        <form onSubmit={(event) => { event.preventDefault(); setSearched(true); }} className={isCompactDocument ? "rounded-b-lg bg-white px-4 pb-4 pt-[14px] shadow-[0_1px_3px_rgba(58,81,106,0.18)]" : "rounded-b-lg bg-white px-4 pb-[27px] pt-5 shadow-[0_1px_3px_rgba(58,81,106,0.18)]"}>
          <h2 className={isCompactDocument ? "mb-[25px] text-[22px] font-medium text-[#2f353a]" : "mb-7 text-[22px] font-medium text-[#2f353a]"}>ค้นหา</h2>
          <div className="grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-4"><Field label="โครงสร้างองค์กร" placeholder="โครงสร้างองค์กร" /><Field label="ตำแหน่ง" placeholder="ตำแหน่ง" /><Field label="พนักงาน" placeholder="พนักงาน" /><Field label="Hashtag" placeholder="#Hashtag" /></div>
          <div className={isCompactDocument ? "mt-[5px] grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-4" : "mt-[7px] grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-5"}>{!isCompactDocument && <SelectField label="ประเภทการลา" value="ทั้งหมด" />}<SelectField label="ปี" value="2026" /><Field label="ตั้งแต่วันที่ - จนถึงวันที่"><span className="relative mt-1 block"><input placeholder="วันเริ่มต้น     →     วันสิ้นสุด" className="h-8 w-full rounded border border-[#d8d8d8] bg-white px-3 pr-9 text-sm font-normal outline-none placeholder:text-[#c8c8c8]" /><CalendarDays className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-[#6b737a]" /></span></Field><SelectField label="สถานะพนักงาน" value="เฉพาะที่ Active" /><SelectField label="สถานะการอนุมัติ" value="รออนุมัติ" /></div>
          <div className={isCompactDocument ? "mt-2 flex justify-end" : "mt-[14px] flex justify-end"}><button type="submit" className="inline-flex h-[38px] items-center rounded bg-[#168fe9] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#087fd8]"><Search className="mr-1.5 size-4" />ค้นหา</button></div>
        </form>
        <div className="relative mt-9 overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(58,81,106,0.2)]">
          <div className="max-h-[calc(100vh-34rem)] overflow-auto"><table className="w-full min-w-[850px] border-collapse text-sm text-[#4a4e52]"><thead className="sticky top-0 z-10 bg-[#61a8f6] text-white"><tr className="h-[54px] font-semibold"><th className="w-[10%] border-r border-white/50 px-3 text-center"><input aria-label="เลือกรายการทั้งหมด" type="checkbox" checked={allSelected} onChange={(event) => setAllSelected(event.target.checked)} className="size-4 accent-white" /></th><th className="w-[40%] border-r border-white/50 px-3 text-center">รายละเอียด</th><th className="w-[40%] border-r border-white/50 px-3 text-center">สถานะ</th><th className="w-[10%]" /></tr></thead><tbody><tr className={isCompactDocument ? "h-[151px] bg-[#f1f9ff]" : "h-40 bg-[#f1f9ff]"}><td colSpan={4}><div className="sticky left-0 flex h-full w-full flex-col items-center justify-center overflow-hidden"><svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fill="#d9d9d9" fillRule="nonzero"><path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill="#fafafa" /></g></g></svg><p className="mt-2 text-sm text-[#999]">{searched ? "ไม่มีข้อมูล" : "ไม่มีข้อมูล"}</p></div></td></tr></tbody></table></div>
          <div className={isCompactDocument ? "absolute right-3 top-[89px] flex gap-4" : "absolute right-3 top-[68px] flex gap-4"}><button type="button" onClick={() => setAllSelected(true)} className="inline-flex h-9 items-center rounded bg-white px-4 text-sm font-semibold text-[#29a44c] shadow-md"><Check className="mr-1 size-5" />อนุมัติ</button><button type="button" onClick={() => setAllSelected(false)} className="inline-flex h-9 items-center rounded bg-white px-4 text-sm font-semibold text-[#e84242] shadow-md"><X className="mr-1 size-5" />ไม่อนุมัติ</button><button type="button" onClick={() => setAllSelected(false)} className="inline-flex h-9 items-center rounded bg-white px-4 text-sm font-semibold text-[#d49400] shadow-md"><RefreshCw className="mr-1 size-5" />ตรวจสอบ</button></div>
        </div>
      </section>
      {requestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-[#303943]">{requestLabel}</h2>
              <button type="button" onClick={() => setRequestOpen(false)} aria-label="ปิด"><X className="size-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <Field label={requestTypeLabel}><select className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3"><option>{`เลือก${requestTypeLabel}`}</option></select></Field>
              <Field label={isCompactDocument ? (documentType === "overtime" ? "วันที่ทำโอที" : documentType === "time-adjust" ? "วันที่เพิ่มเวลา" : documentType === "work-cycle" ? "วันที่เปลี่ยนกะการทำงาน" : "วันที่เปลี่ยนวันหยุด") : "วันที่ลา"} placeholder="วันเริ่มต้น - วันสิ้นสุด" />
              <Field label={requestDetailLabel}><textarea className="mt-1 min-h-24 w-full rounded border border-slate-300 p-3" /></Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4"><button type="button" onClick={() => setRequestOpen(false)} className="h-9 rounded border border-slate-300 px-4 text-sm">ยกเลิก</button><button type="button" onClick={() => setRequestOpen(false)} className="h-9 rounded bg-[#168ee8] px-4 text-sm text-white">บันทึก</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdvanceManagementPage() {
  const [searched, setSearched] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [allSelected, setAllSelected] = useState(false);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-[#e7eff8]">
      <section className="flex min-h-40 items-start justify-between gap-5 bg-[#61a8ff] px-6 pb-6 pt-12 text-white">
        <div>
          <div className="flex items-center gap-1 text-sm text-white/90"><span>การประมวลผลเงินเดือน</span><ChevronRight className="size-4" /><span>เงินเบิกล่วงหน้า</span></div>
          <h1 className="mt-1 text-[26px] font-bold leading-tight">เงินเบิกล่วงหน้า</h1>
        </div>
        <button type="button" onClick={() => setRequestOpen(true)} className="mt-3 inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-[#4e4e4e] shadow-md hover:bg-slate-50">ขอเงินเบิกล่วงหน้า</button>
      </section>

      <section className="px-8 py-8">
        <p className="mb-[2px] text-sm text-[#535b62]">เรียนรู้เพิ่มเติมวิธีการขออนุมัติเอกสารต่างๆ ไปคู่มือที่นี้ <a href={`${DOCUMENTATION_ORIGIN}/docs/SubmitDocuments`} className="text-[#168fe9] hover:underline">Link</a></p>
        <form onSubmit={(event) => { event.preventDefault(); setSearched(true); }} className="rounded-b-lg bg-white px-2 pb-[14px] pt-[14px] shadow-[0_1px_3px_rgba(58,81,106,0.18)]">
          <h2 className="mb-[25px] text-[22px] font-medium text-[#2f353a]">ค้นหา</h2>
          <div className="grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-4"><Field label="โครงสร้างองค์กร" placeholder="โครงสร้างองค์กร" /><Field label="ตำแหน่ง" placeholder="ตำแหน่ง" /><Field label="พนักงาน" placeholder="พนักงาน" /><Field label="Hashtag" placeholder="#Hashtag" /></div>
          <div className="mt-1.5 grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-3"><SelectField label="ปี" value="2026" /><SelectField label="เดือน" value="สิงหาคม" /><SelectField label="สถานะ" value="รออนุมัติ" /></div>
          <div className="mt-[14px] flex justify-end"><button type="submit" className="inline-flex h-9 items-center rounded bg-[#168fe9] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#087fd8]"><Search className="mr-1.5 size-4" />ค้นหา</button></div>
        </form>

        <p className="mt-3 text-sm font-medium text-[#e53935]">*หากเลือกรายการที่มีพนักงานแบ่งงวด จะไม่สามารถเลือกวันที่อนุมัติในงวดที่ปิดไปแล้วได้</p>
        <div className="relative mt-1 overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(58,81,106,0.2)]">
          <div className="max-h-[calc(100vh-35rem)] overflow-auto"><table className="w-[1690px] table-fixed border-collapse text-sm text-[#4a4e52]"><thead className="sticky top-0 z-10 bg-[#61a8f6] text-white"><tr className="h-[76px] font-semibold"><th className="w-[50px] border-r border-white/50 px-3 text-center"><input aria-label="เลือกรายการทั้งหมด" type="checkbox" checked={allSelected} onChange={(event) => setAllSelected(event.target.checked)} className="size-4 accent-white" /></th><th className="w-[250px] border-r border-white/50 px-3 text-center">ชื่อพนักงาน</th><th className="w-[150px] border-r border-white/50 px-3 text-center">แผนก</th><th className="w-[150px] border-r border-white/50 px-3 text-center">ตำแหน่ง</th><th className="w-[150px] border-r border-white/50 px-3 text-center">วันที่</th><th className="w-[200px] border-r border-white/50 px-3 text-center">ยอดเงินเบิกล่วงหน้าจาก<br />พนักงาน</th><th className="w-[160px] border-r border-white/50 px-3 text-center">วงเงินคงเหลือ</th><th className="w-[150px] border-r border-white/50 px-3 text-center">วันที่อนุมัติ</th><th className="w-[140px] border-r border-white/50 px-3 text-center">สถานะ</th><th className="w-[180px] border-r border-white/50 px-3 text-center">ผู้อัพเดตล่าสุด</th><th className="w-[60px]" /></tr></thead><tbody><tr className="h-[151px] bg-[#f1f9ff]"><td colSpan={11}><div className="sticky left-0 flex h-full w-full flex-col items-center justify-center overflow-hidden"><svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fill="#d9d9d9" fillRule="nonzero"><path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill="#fafafa" /></g></g></svg><p className="mt-2 text-sm text-[#999]">{searched ? "ไม่มีข้อมูล" : "ไม่มีข้อมูล"}</p></div></td></tr></tbody></table></div>
          <div className="absolute right-3 top-[94px] flex gap-4"><button type="button" onClick={() => setAllSelected(true)} className="inline-flex h-9 items-center rounded bg-white px-4 text-sm font-semibold text-[#29a44c] shadow-md"><Check className="mr-1 size-5" />อนุมัติ</button><button type="button" onClick={() => setAllSelected(false)} className="inline-flex h-9 items-center rounded bg-white px-4 text-sm font-semibold text-[#e84242] shadow-md"><X className="mr-1 size-5" />ไม่อนุมัติ</button></div>
        </div>
      </section>

      {requestOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4"><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-lg bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><h2 className="text-xl font-semibold text-[#303943]">ขอเงินเบิกล่วงหน้า</h2><button type="button" onClick={() => setRequestOpen(false)} aria-label="ปิด"><X className="size-5" /></button></div><div className="space-y-4 px-6 py-5"><Field label="จำนวนเงิน" placeholder="จำนวนเงิน" /><Field label="เดือนที่ต้องการเบิก" placeholder="เลือกเดือน" /><Field label="รายละเอียด"><textarea className="mt-1 min-h-24 w-full rounded border border-slate-300 p-3" /></Field></div><div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4"><button type="button" onClick={() => setRequestOpen(false)} className="h-9 rounded border border-slate-300 px-4 text-sm">ยกเลิก</button><button type="button" onClick={() => setRequestOpen(false)} className="h-9 rounded bg-[#168ee8] px-4 text-sm text-white">บันทึก</button></div></div></div>}
    </div>
  );
}

export default function PayrollDocumentsPage() {
  const [activeDocument, setActiveDocument] = useState<"leave" | "overtime" | "time-adjust" | "work-cycle" | "holiday" | "advance" | null>(null);
  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash;
      setActiveDocument(hash === "#time-leave" ? "leave" : hash === "#ot" ? "overtime" : hash === "#time-adjust" ? "time-adjust" : hash === "#work-cycle" ? "work-cycle" : hash === "#holiday" ? "holiday" : hash === "#advance" ? "advance" : null);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  if (activeDocument === "advance") return <AdvanceManagementPage />;
  if (activeDocument) return <DocumentManagementPage documentType={activeDocument} />;
  return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground">อยู่ระหว่างการพัฒนา</div>;
}
