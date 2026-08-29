"use client";

import { ChevronRight, Pencil, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

type ShiftGroup =
  | "กำหนดเวลาเข้าออก ในวันเดียวกัน"
  | "กำหนดเวลาเข้าออก ข้ามเที่ยงคืนของพรุ่งนี้"
  | "กำหนดเวลาเข้าออก ข้ามเที่ยงคืนของเมื่อวาน"
  | "กำหนดชั่วโมงการทำงานรวม"
  | "กำหนดกะการทำงานโดยไม่ต้องลงเวลา"
  | "กำหนดควบกะการทำงาน";

type WorkShift = {
  id: string;
  group: ShiftGroup;
  code: string;
  schedule: string;
  rateType: string;
  rate: string;
  rounding: string;
  active: boolean;
  locked?: boolean;
};

const shiftGroups: ShiftGroup[] = [
  "กำหนดเวลาเข้าออก ในวันเดียวกัน",
  "กำหนดเวลาเข้าออก ข้ามเที่ยงคืนของพรุ่งนี้",
  "กำหนดเวลาเข้าออก ข้ามเที่ยงคืนของเมื่อวาน",
  "กำหนดชั่วโมงการทำงานรวม",
  "กำหนดกะการทำงานโดยไม่ต้องลงเวลา",
  "กำหนดควบกะการทำงาน",
];

const initialShifts: WorkShift[] = [
  { id: "1", group: shiftGroups[0], code: "SV001", schedule: "10:00-12:00-13:00-19:00", rateType: "คำนวณตามเงินเดือน", rate: "0.00 บาท", rounding: "ไม่ปัดเศษ", active: true, locked: true },
  { id: "2", group: shiftGroups[0], code: "SV002", schedule: "11:00-15:00-16:00-20:00", rateType: "คำนวณตามเงินเดือน", rate: "0.00 บาท", rounding: "ไม่ปัดเศษ", active: true, locked: true },
];

function StatusToggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={checked ? "ปิดกะการทำงาน" : "เปิดกะการทำงาน"} disabled={disabled} onClick={onChange} className={`relative inline-flex h-5 w-12 items-center rounded-full ${checked ? "bg-[#1591eb]" : "bg-[#aebdc8]"} ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}><span className="absolute left-2 text-[10px] font-bold text-white">{checked ? "เปิด" : "ปิด"}</span><span className={`size-[18px] rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[29px]" : "translate-x-0.5"}`} /></button>;
}

function ShiftDialog({ shift, onClose }: { shift: WorkShift | null; onClose: () => void }) {
  const [shiftType, setShiftType] = useState<ShiftGroup>(shift?.group ?? shiftGroups[0]);
  const [rounding, setRounding] = useState("ไม่ปัดเศษ");
  const descriptions: Record<ShiftGroup, string> = {
    "กำหนดเวลาเข้าออก ในวันเดียวกัน": "คือ เข้าออกงานตามเวลาที่กำหนด ในวันเดียวกัน",
    "กำหนดเวลาเข้าออก ข้ามเที่ยงคืนของพรุ่งนี้": "คือ เข้าออกงานตามเวลาที่กำหนด ข้ามเที่ยงคืนของพรุ่งนี้",
    "กำหนดเวลาเข้าออก ข้ามเที่ยงคืนของเมื่อวาน": "คือ เข้าออกงานตามเวลาที่กำหนด ข้ามเที่ยงคืนของเมื่อวาน",
    "กำหนดชั่วโมงการทำงานรวม": "คือ เข้าออกงานเมื่อไหร่ก็ได้ แต่ชั่วโมงต่อวันต้องได้ตามที่กำหนด",
    "กำหนดกะการทำงานโดยไม่ต้องลงเวลา": "คือ เข้าออกงานตามเวลาที่กำหนด ซึ่งจะไม่จำเป็นต้องลงเวลาการทำงาน",
    "กำหนดควบกะการทำงาน": "คือ ใน 1 วันทำงาน สามารถมีได้มากกว่า 1 กะการทำงาน",
  };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/25 px-4 py-8"><div role="dialog" aria-modal="true" aria-labelledby="shift-dialog-title" className="mx-auto w-full max-w-[43rem] rounded-lg bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><h2 id="shift-dialog-title" className="text-xl font-semibold text-[#303943]">กะการทำงาน</h2><button type="button" onClick={onClose} aria-label="ปิด" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button></div><div className="space-y-5 px-6 py-5 text-sm text-[#4b5560]"><label className="block font-medium">รหัสกะการทำงาน<input defaultValue={shift?.code} className="mt-1.5 h-10 w-full rounded border border-slate-300 px-3 outline-none focus:border-[#168ee8]" /><span className="mt-1 block text-xs font-normal text-slate-500">กรุณาตั้งรหัสเป็นภาษาอังกฤษ หรือ ตัวเลขเท่านั้น ห้ามซ้ำกับสิ่งที่มีอยู่แล้ว</span></label><fieldset><legend className="mb-2 font-medium">ประเภทกะการทำงาน</legend><div className="space-y-2.5">{shiftGroups.map((group) => <label key={group} className="flex items-start gap-2"><input type="radio" name="shiftType" checked={shiftType === group} onChange={() => setShiftType(group)} className="mt-0.5 accent-[#168ee8]" /><span><b className="font-normal">{group}</b> {descriptions[group]}</span></label>)}</div></fieldset><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[["เริ่มทำงาน", "10:00"], ["เวลาเริ่มพัก", "12:00"], ["เวลาหยุดพัก", "13:00"], ["เลิกทำงาน", "19:00"]].map(([label, example]) => <label key={label} className="block font-medium">{label}<input defaultValue={shift ? example : ""} placeholder={`Ex. ${example}`} className="mt-1.5 h-10 w-full rounded border border-slate-300 px-3 font-normal outline-none focus:border-[#168ee8]" /></label>)}</div><div className="grid gap-3 sm:grid-cols-2"><label className="block font-medium">ประเภทมูลค่ากะการทำงาน<select defaultValue="คำนวณตามเงินเดือน" className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 font-normal outline-none focus:border-[#168ee8]"><option>คำนวณตามเงินเดือน</option><option>กำหนดจำนวนเงิน</option></select></label><label className="block font-medium">มูลค่ากะการทำงาน<input defaultValue={shift?.rate ?? "0.00"} className="mt-1.5 h-10 w-full rounded border border-slate-300 px-3 font-normal outline-none focus:border-[#168ee8]" /></label></div><fieldset><legend className="mb-2 font-medium">ปัดเศษจำนวนเงิน</legend><div className="flex gap-5">{["ไม่ปัดเศษ", "ปัดเศษ"].map((option) => <label key={option} className="flex items-center gap-2"><input type="radio" name="rounding" checked={rounding === option} onChange={() => setRounding(option)} className="accent-[#168ee8]" />{option}</label>)}</div></fieldset><div className="grid gap-3 sm:grid-cols-2"><label className="block font-medium">สีตัวอักษร<input type="color" defaultValue="#0f8ee9" className="mt-1.5 block h-10 w-full rounded border border-slate-300 bg-white p-1" /></label><label className="block font-medium">สีพื้นหลัง<input type="color" defaultValue="#e6f6ff" className="mt-1.5 block h-10 w-full rounded border border-slate-300 bg-white p-1" /></label></div></div><div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4"><button type="button" onClick={onClose} className="h-9 rounded border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button><button type="button" onClick={onClose} className="h-9 rounded bg-[#168ee8] px-4 text-sm font-medium text-white hover:bg-[#087fd8]">บันทึก</button></div></div></div>;
}

function ShiftGroupRows({ group, shifts, onEdit, onToggle }: { group: ShiftGroup; shifts: WorkShift[]; onEdit: (shift: WorkShift) => void; onToggle: (id: string) => void }) {
  return <><tr className="h-9 border-b border-[#d6e6f7] bg-[#c5e0fb]"><td colSpan={7} className="px-2 font-medium text-[#465c70]">{group}</td></tr>{shifts.length ? shifts.map((shift, index) => <tr key={shift.id} className={`h-[58px] border-b border-[#e2edf5] ${index % 2 ? "bg-white" : "bg-[#eff8ff]"}`}><td className="px-3 text-center"><StatusToggle checked={shift.active} disabled={shift.locked} onChange={() => onToggle(shift.id)} /></td><td className="px-4 text-center"><span className={`inline-flex min-w-36 justify-center rounded-sm px-3 py-1 font-semibold ${index % 2 ? "bg-[#e8f8ff] text-[#10d8d0]" : "bg-[#e5f4fb] text-[#0d92e9]"}`}>{shift.code}</span></td><td className="px-3 text-center">{shift.schedule}</td><td className="px-3 text-center">{shift.rateType}</td><td className="px-3 text-center">{shift.rate}</td><td className="px-3 text-center">{shift.rounding}</td><td className="px-3 text-center"><button type="button" aria-label={`แก้ไข ${shift.code}`} onClick={() => onEdit(shift)} className="inline-flex size-8 items-center justify-center rounded-full bg-[#a5e1dc] text-white transition-transform hover:scale-105"><Pencil className="size-4" strokeWidth={2.5} /></button></td></tr>) : <tr className="h-10 bg-[#e9f3fc]"><td colSpan={7} className="text-center text-[#4d555d]">ไม่มีกะการทำงานประเภทนี้</td></tr>}</>;
}

export default function AttendancePage() {
  const [shifts, setShifts] = useState(initialShifts);
  const [query, setQuery] = useState("");
  const [dialogShift, setDialogShift] = useState<WorkShift | null | undefined>(undefined);
  const filteredShifts = useMemo(() => { const keyword = query.trim().toLowerCase(); return keyword ? shifts.filter((shift) => [shift.code, shift.schedule, shift.rateType, shift.group].some((value) => value.toLowerCase().includes(keyword))) : shifts; }, [query, shifts]);
  const toggle = (id: string) => setShifts((items) => items.map((item) => item.id === id ? { ...item, active: !item.active } : item));
  return <div className="min-h-[calc(100vh-4rem)] bg-[#e7eff8]"><section className="flex min-h-40 items-start justify-between gap-5 bg-[#61a8ff] px-6 pb-6 pt-12 text-white"><div><div className="flex items-center gap-1 text-sm text-white/90"><span>ข้อมูลองค์กร</span><ChevronRight className="size-4" /><span>ข้อมูลกะการทำงาน</span></div><h1 className="mt-1 text-[26px] font-bold leading-tight">กะการทำงาน</h1></div><div className="mt-2 flex items-center gap-8"><label className="relative hidden sm:block"><Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#707b85]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา" className="h-12 w-[min(30rem,39vw)] rounded-full bg-white pl-14 pr-5 text-sm text-[#4b5563] outline-none placeholder:text-[#727b84] shadow-sm" /></label><button type="button" onClick={() => setDialogShift(null)} className="inline-flex h-10 shrink-0 items-center rounded-md bg-white px-4 text-sm font-semibold text-[#4e4e4e] shadow-md hover:bg-slate-50"><Plus className="mr-1 size-4" />เพิ่มกะการทำงาน</button></div></section><section className="px-8 py-8"><label className="relative mb-4 block sm:hidden"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#707b85]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา" className="h-11 w-full rounded-full bg-white pl-10 pr-4 text-sm outline-none" /></label><div className="overflow-hidden rounded-sm bg-white shadow-[0_2px_7px_rgba(58,81,106,0.18)]"><div className="max-h-[calc(100vh-17.75rem)] overflow-auto"><table className="w-full min-w-[1497px] border-collapse text-sm text-[#4d555d]"><thead className="sticky top-0 z-10 bg-[#61a8f6] text-white"><tr className="h-[54px] font-semibold"><th className="w-[12%] border-r border-white/50 px-3 text-center">สถานะการใช้งาน</th><th className="w-[16%] border-r border-white/50 px-3 text-center">รหัสกะการทำงาน</th><th className="w-[25%] border-r border-white/50 px-3 text-center">ช่วงเวลาทำงาน</th><th className="w-[22%] border-r border-white/50 px-3 text-center">ประเภทมูลค่ากะการทำงาน</th><th className="w-[12%] border-r border-white/50 px-3 text-center">มูลค่ากะการทำงาน</th><th className="w-[14%] border-r border-white/50 px-3 text-center">ปัดเศษจำนวนเงิน</th><th className="w-[6%]" /></tr></thead><tbody>{shiftGroups.map((group) => <ShiftGroupRows key={group} group={group} shifts={filteredShifts.filter((shift) => shift.group === group)} onEdit={setDialogShift} onToggle={toggle} />)}</tbody></table></div></div></section>{dialogShift !== undefined && <ShiftDialog shift={dialogShift} onClose={() => setDialogShift(undefined)} />}</div>;
}
