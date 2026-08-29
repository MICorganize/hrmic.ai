"use client";

import { ChevronRight, Loader2, Pencil, Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

type CalculationGroup = "monthly" | "daily" | "partTime" | "contract";
type TaxMethod = "tax" | "withholding" | "none";

type EmployeeType = {
  id: string;
  calculationGroup: CalculationGroup;
  code: string;
  nameTH: string;
  nameEN: string;
  taxMethod: TaxMethod;
  taxSection: string | null;
  enabled: boolean;
  locked: boolean;
};

type EmployeeTypeResponse = { employeeTypes: EmployeeType[]; error?: string };

const groups: Array<{ id: CalculationGroup; label: string }> = [
  { id: "monthly", label: "ประเภทพนักงานรายเดือน" },
  { id: "daily", label: "ประเภทพนักงานรายวัน" },
  { id: "partTime", label: "ประเภทพาร์ตไทม์" },
  { id: "contract", label: "ประเภทเหมาจ่าย" },
];

const groupLabel = (group: CalculationGroup) => groups.find((item) => item.id === group)?.label ?? group;
const taxLabel = (item: Pick<EmployeeType, "taxMethod" | "taxSection">) =>
  item.taxMethod === "withholding" ? "หัก ณ ที่จ่าย" : item.taxMethod === "tax" ? item.taxSection ?? "" : "";

async function requestEmployeeTypes(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
  const response = await fetch("/api/employee-type-definition", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as EmployeeTypeResponse | null;
  if (!response.ok) throw new Error(data?.error ?? "ไม่สามารถบันทึกข้อมูลได้");
  return data?.employeeTypes ?? [];
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={checked ? "ปิดประเภทพนักงาน" : "เปิดประเภทพนักงาน"} disabled={disabled} onClick={onChange} className={`relative inline-flex h-5 w-11 items-center rounded-full transition-colors ${checked ? "bg-[#1591eb]" : "bg-[#b9c3ca]"} ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}>
      <span className="absolute left-2 text-[10px] font-bold leading-none text-white">{checked ? "Y" : "N"}</span>
      <span className={`size-[18px] rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[25px]" : "translate-x-0.5"}`} />
    </button>
  );
}

type EmployeeTypeValue = Pick<EmployeeType, "calculationGroup" | "nameTH" | "nameEN" | "taxMethod" | "taxSection">;

function EmployeeTypeDialog({ item, onClose, onSave, onDelete }: { item: EmployeeType | null; onClose: () => void; onSave: (value: EmployeeTypeValue) => Promise<boolean>; onDelete: () => void }) {
  const [calculationGroup, setCalculationGroup] = useState<CalculationGroup>(item?.calculationGroup ?? "monthly");
  const [nameTH, setNameTH] = useState(item?.nameTH ?? "");
  const [nameEN, setNameEN] = useState(item?.nameEN ?? "");
  const [taxMethod, setTaxMethod] = useState<TaxMethod>(item?.taxMethod ?? "tax");
  const [taxSection, setTaxSection] = useState(item?.taxSection ?? "40(1)");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    const saved = await onSave({ calculationGroup, nameTH, nameEN, taxMethod, taxSection: taxMethod === "tax" ? taxSection : null });
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="employee-type-dialog-title" className="flex max-h-[calc(100vh-72px)] w-[min(1300px,calc(100vw-32px))] translate-y-8 flex-col overflow-hidden rounded-[11px] bg-white text-sm text-black/87 shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]">
        <header className="h-[85.7px] shrink-0 bg-[#61a8ff] px-6 py-6 text-[22px] font-bold text-white"><h2 id="employee-type-dialog-title">ตั้งค่าประเภทพนักงาน</h2></header>
        <div className="overflow-y-auto px-7 py-7">
          <fieldset><legend className="mb-1.5 text-sm text-black/87">รูปแบบการคำนวณ</legend><div role="radiogroup" className="flex flex-wrap">{groups.map((group) => <label key={group.id} className={`flex h-8 items-center border border-[#d9d9d9] px-4 text-sm transition-colors ${calculationGroup === group.id ? "border-[#40a9ff] bg-white text-[#168ee8] shadow-[0_0_0_2px_rgba(24,144,255,0.12)]" : "bg-[#fafafa] text-black/65"} ${item ? "cursor-not-allowed" : "cursor-pointer"}`}><input type="radio" name="calculation" checked={calculationGroup === group.id} disabled={Boolean(item)} onChange={() => setCalculationGroup(group.id)} className="sr-only" />{group.label}</label>)}</div></fieldset>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="block text-sm text-black/87">ชื่อประเภทพนักงาน<input value={nameTH} onChange={(event) => setNameTH(event.target.value)} placeholder="ชื่อประเภทพนักงาน" className="mt-1 block h-8 w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 text-sm text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" /></label>
            <label className="block text-sm text-black/87">ชื่อประเภทพนักงาน (Eng)<input value={nameEN} onChange={(event) => setNameEN(event.target.value)} placeholder="ชื่อประเภทพนักงาน (Eng)" className="mt-1 block h-8 w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 text-sm text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" /></label>
          </div>
          <div className="mt-2 space-y-2 text-sm text-black/87"><div className="flex flex-wrap gap-x-5 gap-y-2"><label className="flex items-center gap-2"><input type="checkbox" checked={taxMethod === "tax"} disabled={taxMethod === "withholding"} onChange={(event) => setTaxMethod(event.target.checked ? "tax" : "none")} className="size-4 accent-[#168ee8] disabled:cursor-not-allowed" />ภาษี</label><label className="flex items-center gap-2"><input type="checkbox" checked={taxMethod === "withholding"} disabled={taxMethod === "tax"} onChange={(event) => setTaxMethod(event.target.checked ? "withholding" : "none")} className="size-4 accent-[#168ee8] disabled:cursor-not-allowed" />หัก ณ ที่จ่าย</label></div><div className="ml-2 flex flex-wrap gap-x-4 gap-y-2">{(["40(1)", "40(2)", "40(3)"] as const).map((option) => <label key={option} className="flex items-center gap-1.5"><input type="radio" name="tax" checked={taxMethod === "tax" && taxSection === option} disabled={taxMethod !== "tax"} onChange={() => setTaxSection(option)} className="size-4 accent-[#168ee8] disabled:cursor-not-allowed" />{option}</label>)}</div></div>
        </div>
        <footer className="flex h-[60.8px] shrink-0 items-center justify-end gap-2 border-t border-black/30 bg-white px-3 py-3"><button type="button" onClick={onClose} disabled={saving} className="h-9 rounded-[4px] bg-[#8390a3] px-4 text-sm font-bold text-white shadow hover:bg-[#748195] disabled:opacity-60">ยกเลิก</button>{item && <button type="button" disabled={item.locked || saving} onClick={onDelete} className="h-9 rounded-[4px] bg-[#eb8794] px-4 text-sm font-bold text-white shadow hover:bg-[#e57988] disabled:cursor-not-allowed disabled:opacity-60">ลบ</button>}<button type="button" disabled={saving} onClick={() => void submit()} className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] bg-[#00b900] px-4 text-sm font-bold text-white shadow hover:bg-[#00a800] disabled:opacity-60">{saving && <Loader2 className="size-4 animate-spin" />}{saving ? "กำลังบันทึก..." : "บันทึก"}</button></footer>
      </div>
    </div>
  );
}

function DeleteEmployeeTypeDialog({ item, onCancel, onConfirm }: { item: EmployeeType; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/25 px-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="delete-employee-type-title" className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl"><h2 id="delete-employee-type-title" className="text-lg font-semibold text-[#303943]">ลบประเภทพนักงาน</h2><p className="mt-3 text-sm text-slate-600">ต้องการลบประเภทพนักงาน {item.code} ใช่หรือไม่</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className="h-9 rounded border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">ยกเลิก</button><button type="button" onClick={onConfirm} className="h-9 rounded bg-[#ee7d8a] px-4 text-sm font-medium text-white hover:bg-[#df6877]">ลบ</button></div></div></div>;
}

function TypeRow({ item, index, onToggle, onEdit, toggling }: { item: EmployeeType; index: number; onToggle: (id: string) => void; onEdit: (item: EmployeeType) => void; toggling: boolean }) {
  return <tr className={`h-[52px] border-b border-[#e2edf5] ${index % 2 ? "bg-[#eff8ff]" : "bg-white"}`}><td className="px-3 text-center"><Toggle checked={item.enabled} disabled={item.locked || toggling} onChange={() => onToggle(item.id)} /></td><td className="px-3 text-center">{item.code}</td><td className="px-3 text-center">{item.nameTH}</td><td className="px-3 text-center">{item.nameEN}</td><td className="px-3 text-center">{taxLabel(item)}</td><td className="px-3 text-center"><button type="button" onClick={() => onEdit(item)} aria-label={`แก้ไข ${item.code}`} className="inline-flex size-8 items-center justify-center rounded-full bg-[#a5e1dc] text-white transition-transform hover:scale-105"><Pencil className="size-[15px]" strokeWidth={2.25} /></button></td></tr>;
}

export default function OrganizationEmployeeTypesPage() {
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [dialogItem, setDialogItem] = useState<EmployeeType | null | undefined>(undefined);
  const [deleteItem, setDeleteItem] = useState<EmployeeType | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/employee-type-definition", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as EmployeeTypeResponse | null;
      if (!response.ok) throw new Error(data?.error ?? "ไม่สามารถโหลดข้อมูลประเภทพนักงานได้");
      setEmployeeTypes(data?.employeeTypes ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อมูลประเภทพนักงานได้"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filteredTypes = useMemo(() => {
    const keyword = submittedQuery.trim().toLowerCase();
    return keyword ? employeeTypes.filter((item) => [item.code, item.nameTH, item.nameEN, taxLabel(item), groupLabel(item.calculationGroup)].some((value) => value.toLowerCase().includes(keyword))) : employeeTypes;
  }, [employeeTypes, submittedQuery]);
  const toggle = async (id: string) => { setSavingId(id); setError(""); try { setEmployeeTypes(await requestEmployeeTypes("PATCH", { id, action: "toggle" })); } catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถเปลี่ยนสถานะได้"); } finally { setSavingId(null); } };
  const save = async (value: EmployeeTypeValue) => { setError(""); try { setEmployeeTypes(dialogItem ? await requestEmployeeTypes("PATCH", { id: dialogItem.id, ...value }) : await requestEmployeeTypes("POST", value)); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึกข้อมูลได้"); return false; } };
  const remove = async () => { if (!deleteItem) return; setError(""); try { setEmployeeTypes(await requestEmployeeTypes("DELETE", { id: deleteItem.id })); setDeleteItem(undefined); setDialogItem(undefined); } catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถลบข้อมูลได้"); setDeleteItem(undefined); } };
  const searchInput = "h-10 w-[min(30rem,38vw)] rounded-full bg-white pl-11 pr-5 text-sm text-[#4b5563] outline-none placeholder:text-[#727b84] shadow-sm";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#e7eff8]">
      <section className="flex h-40 min-h-40 flex-col items-center justify-center gap-4 bg-[#61a8ff] p-6 text-white md:flex-row md:justify-between"><div className="flex flex-col items-center md:items-start"><div className="hidden items-center text-sm text-white/70 md:flex"><span>ข้อมูลองค์กร</span><ChevronRight className="size-4" /><span>ข้อมูลกลุ่มประเภทพนักงาน</span></div><div className="flex items-center text-2xl font-normal leading-[37.716px]"><h1 className="pr-[30px]">ข้อมูลกลุ่มประเภทพนักงาน</h1><button type="button" className="hidden" aria-label="ข้อมูลเพิ่มเติม">?</button></div></div><label className="relative mx-8 hidden md:block"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#707b85]" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setSubmittedQuery(query)} placeholder="ค้นหา" className={searchInput} /></label><button type="button" onClick={() => setDialogItem(null)} className="inline-flex h-9 shrink-0 items-center rounded-[4px] bg-white px-4 text-sm font-semibold text-[#4e4e4e] shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-colors hover:bg-slate-50">เพิ่มประเภทพนักงาน</button></section>
      <section className="px-8 py-8 lg:px-8"><label className="relative mb-4 block md:hidden"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#707b85]" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setSubmittedQuery(query)} placeholder="ค้นหา" className="h-11 w-full rounded-full bg-white pl-10 pr-4 text-sm outline-none" /></label>{error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<div className="overflow-hidden rounded-sm bg-white shadow-[0_2px_7px_rgba(58,81,106,0.18)]"><div className="max-h-[calc(100vh-17.75rem)] overflow-auto"><table className="w-full min-w-[820px] border-collapse text-sm text-[#4d555d]"><thead className="sticky top-0 z-10 bg-[#61a8f6] text-white"><tr className="h-[54px] font-semibold"><th className="w-[12%] border-r border-white/50 px-3 text-center">เปิด/ปิด</th><th className="w-[12%] border-r border-white/50 px-3 text-center">รหัสอ้างอิง</th><th className="w-[23%] border-r border-white/50 px-3 text-center">ชื่อประเภทพนักงาน</th><th className="w-[23%] border-r border-white/50 px-3 text-center">ตั้งค่าประเภทพนักงาน (ENG)</th><th className="w-[18%] border-r border-white/50 px-3 text-center">ภาษี</th><th className="w-[7%]" /></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="h-40 text-center text-slate-500"><Loader2 className="mx-auto size-5 animate-spin" />กำลังโหลดข้อมูล...</td></tr> : submittedQuery ? filteredTypes.map((item, index) => <TypeRow key={item.id} item={item} index={index} onToggle={(id) => void toggle(id)} onEdit={setDialogItem} toggling={savingId === item.id} />) : groups.map((group) => { const items = filteredTypes.filter((item) => item.calculationGroup === group.id); return items.length ? <Fragment key={group.id}><tr className="h-9 border-b border-[#d2e6f7] bg-[#b9dafa]"><td colSpan={6} className="px-2 font-medium text-[#4b6883]">{group.label}</td></tr>{items.map((item, index) => <TypeRow key={item.id} item={item} index={index} onToggle={(id) => void toggle(id)} onEdit={setDialogItem} toggling={savingId === item.id} />)}</Fragment> : null; })}{!loading && !filteredTypes.length && <tr><td colSpan={6} className="h-32 text-center text-slate-500">ไม่มีข้อมูล</td></tr>}</tbody></table></div></div></section>
      {dialogItem !== undefined && <EmployeeTypeDialog key={dialogItem?.id ?? "new"} item={dialogItem} onClose={() => setDialogItem(undefined)} onSave={save} onDelete={() => dialogItem && setDeleteItem(dialogItem)} />}{deleteItem && <DeleteEmployeeTypeDialog item={deleteItem} onCancel={() => setDeleteItem(undefined)} onConfirm={() => void remove()} />}
    </div>
  );
}
