"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Company = {
  id: string;
  code: string;
  nameTH: string;
  nameEN: string;
  portalUrl: string | null;
  planName: string;
  employeeCount: number;
  employeeLimit: number | null;
};

type CompaniesResponse = { companies?: Company[]; canCreate?: boolean; error?: string };

const plans = ["Free-Try", "Free-Forever", "PaySlip", "Lite", "Basic", "Standard", "Advanced", "Professional"];
const initialForm = { code: "", nameTH: "", nameEN: "", portalUrl: "", planName: "Standard", employeeLimit: "" };
const planCards: Record<string, { title: string; accent: string; description: string }> = {
  "Free-Try": { title: "Try", accent: "#ff9800", description: "การลงเวลาการทำงาน จัดกะ ยื่นเอกสาร คำนวณเงินเดือนได้ ครบทุกฟังก์ชันงาน HR" },
  "Free-Forever": { title: "Free", accent: "#ff8a86", description: "ลงเวลาการทำงาน จัดกะ ยื่นเอกสาร คำนวณเงินเดือนได้ มี Application ใช้งานฟรีไม่เกิน 10 คน" },
  PaySlip: { title: "PaySlip", accent: "#ffc944", description: "พนักงานดูสลิปเงินเดือนผ่าน Application สำหรับ HR และพนักงาน" },
  Lite: { title: "Lite", accent: "#64c9e9", description: "ลงเวลาการทำงาน ยื่นและอนุมัติเอกสาร ไม่มีคำนวณเงินเดือน" },
  Basic: { title: "Basic", accent: "#9a9a9a", description: "การลงเวลาการทำงาน จัดกะ คำนวณเงินเดือนได้ HR จัดการงานคนเดียว" },
  Standard: { title: "Standard", accent: "#61a8ff", description: "การลงเวลาการทำงาน จัดกะ ยื่นเอกสาร คำนวณเงินเดือนได้ มี Application" },
  Advanced: { title: "Advance", accent: "#9a6de0", description: "ลงเวลาการทำงาน จัดกะ ยื่นและอนุมัติเอกสาร คำนวณเงินเดือนได้ มี Application" },
  Professional: { title: "Professional", accent: "#55bf90", description: "การลงเวลาการทำงาน จัดกะ ยื่นเอกสาร คำนวณเงินเดือนได้ ครบทุกฟังก์ชันงาน HR" },
};

function AddPackageIcon() {
  return <svg aria-hidden="true" className="size-6 shrink-0 fill-current text-black/[0.12]" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 17 12Zm-5 5v4H7v2h4v4h2v-4h4v-2h-4V7h-2Z" /></svg>;
}

function AddCompanyIcon() {
  return <svg aria-hidden="true" className="size-6 shrink-0 fill-current text-[#2778c4]" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2Z" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden="true" className="size-6 shrink-0 fill-current text-[#747474]" viewBox="0 0 24 24"><path d="M9.5 3A6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.04-1.42L19.49 20l1.41-1.41-5.47-5.47A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" /></svg>;
}

function ChevronDownIcon() {
  return <svg aria-hidden="true" className="size-5 fill-current" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5H7Z" /></svg>;
}

function DeveloperBoardIcon() {
  return <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24"><path d="M22 9V7h-2v2h-2V7h-2v2h-2V7h-2V7H8v2H6V7H4v2H2v10h20V9Zm-2 8H4v-6h2v2h2v-2h2v2h2v-2h2v2h2v-2h2v6Z" /></svg>;
}

function EditIcon() {
  return <svg aria-hidden="true" className="size-5 fill-current" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" /></svg>;
}

function PeopleIcon() {
  return <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" /></svg>;
}

function DomainIcon() {
  return <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24"><path d="M4 6v12h16V6H4Zm4 10H6v-2h2v2Zm0-4H6v-2h2v2Zm0-4H6V8h2v2Zm5 8h-3v-2h3v2Zm0-4h-3v-2h3v2Zm0-4h-3V8h3v2Zm5 8h-3v-2h3v2Zm0-4h-3v-2h3v2Zm0-4h-3V8h3v2Z" /></svg>;
}

function RemoveCircleIcon() {
  return <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 11H7v-2h10v2Z" /></svg>;
}

function AddCircleIcon() {
  return <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2Z" /></svg>;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [managedCompany, setManagedCompany] = useState<Company | null>(null);
  const [managedCode, setManagedCode] = useState("");
  const [managedPlan, setManagedPlan] = useState("Standard");
  const [managedLimit, setManagedLimit] = useState(0);
  const [editingCompanyCode, setEditingCompanyCode] = useState(false);
  const [packageMenuOpen, setPackageMenuOpen] = useState(false);
  const [planFilterMenuOpen, setPlanFilterMenuOpen] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/company-data", { cache: "no-store" });
      const data = (await response.json()) as CompaniesResponse;
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถโหลดข้อมูลบริษัทได้");
      setCompanies(data.companies ?? []);
      setCanCreate(Boolean(data.canCreate));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลบริษัทได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCompanies(); }, [loadCompanies]);

  const packageSummary = useMemo(() => plans.map((name) => {
    const matching = companies.filter((company) => company.planName === name);
    return { name, used: matching.reduce((total, company) => total + company.employeeCount, 0), total: matching.reduce((total, company) => total + (company.employeeLimit ?? 0), 0) };
  }), [companies]);

  const visibleCompanies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return companies.filter((company) => {
      const matchesQuery = !needle || [company.code, company.nameTH, company.nameEN].some((value) => value.toLowerCase().includes(needle));
      return matchesQuery && (planFilter === "all" || company.planName === planFilter);
    });
  }, [companies, planFilter, query]);

  const createCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/company-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, employeeLimit: form.employeeLimit || null }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถสร้างบริษัทได้");
      setDialogOpen(false);
      setForm(initialForm);
      await loadCompanies();
      setMessage("สร้างบริษัทและกำหนดสิทธิ์เจ้าของเรียบร้อยแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถสร้างบริษัทได้");
    } finally {
      setSaving(false);
    }
  };

  const enterCompany = async (company: Company) => {
    try {
      const response = await fetch("/api/active-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถเข้าสู่บริษัทได้");
      router.push(`/organization/organization-employee?companyId=${encodeURIComponent(company.id)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถเข้าสู่บริษัทได้");
    }
  };

  const openCompanyManagement = (company: Company) => {
    setManagedCompany(company);
    setManagedCode(company.code);
    setManagedPlan(company.planName);
    setManagedLimit(company.employeeLimit ?? Math.max(company.employeeCount, 1));
    setEditingCompanyCode(false);
    setPackageMenuOpen(false);
  };

  const saveCompanyManagement = async () => {
    if (!managedCompany) return;
    setSaving(true);
    try {
      const response = await fetch(`/company-data/${managedCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: managedCode, planName: managedPlan, employeeLimit: managedLimit }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถบันทึกการจัดการบริษัทได้");
      setManagedCompany(null);
      await loadCompanies();
      setMessage("บันทึกการจัดการบริษัทเรียบร้อยแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกการจัดการบริษัทได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f5f5f5] px-3 pb-3 pt-[2px] font-[HumansoftKanit,Kanit,sans-serif] text-[14px] font-normal leading-[22.001px] tracking-[-0.1px] text-black/[0.87]">
      <div className="mx-auto -translate-x-[55px] -mt-[17px] max-w-[1232px] px-7">
        <div className="flex flex-row">
          <div className="mr-4 flex w-[352.8px] shrink-0 overflow-hidden rounded-[10px]">
            <section className="flex-1 rounded-[10px] border-[0.8px] border-[#ccc] bg-white p-4">
              <h1 className="m-0 text-[20px] font-normal leading-[31.43px]">Packages</h1>
              <div className="mt-2 flex flex-col">
                {packageSummary.map((packageItem, index) => {
                  const percent = packageItem.total === 0 ? 0 : Math.min(100, (packageItem.used / packageItem.total) * 100);
                  const isLast = index === packageSummary.length - 1;
                  return <div key={packageItem.name} className={isLast ? "flex flex-1 flex-col" : "mb-2 flex flex-1 flex-col"}>
                    <div className="flex h-[25.1375px] flex-row"><div className="flex h-[25.1375px] max-w-[95%] flex-1 items-stretch justify-between"><h2 className="m-0 h-[25.1375px] text-[16px] font-normal leading-[25.144px]">{packageItem.name}</h2><span className="h-[25.1375px] text-[14px] font-normal leading-[22.001px]">{packageItem.used}/{packageItem.total || "-"}</span></div></div>
                    <div className="flex flex-row items-center"><div className="mr-1 box-border h-[21.6px] max-w-[95%] flex-1 rounded-[16px] border-[0.8px] border-black/[0.54] p-[2px]"><div className="box-border flex h-4 min-w-8 items-center rounded-[16px] bg-[#61a8ff] px-4 text-right text-[11px] leading-none" style={{ width: `${percent}%` }}><p className="m-0 ml-auto text-right text-[11px] leading-none text-white">{packageItem.used}</p></div></div><AddPackageIcon /></div>
                  </div>;
                })}
              </div>
              <div className="mt-4 flex h-11 items-center justify-center"><span className="text-[14px] font-normal leading-[22.001px] text-[#008000]">สำหรับการอัพเกรดหรือต่ออายุแพ็กเกจ ติดต่อทีมงานเราได้ที่ 1537 หรือแชทหาพวกเราได้ทุกช่องทางค่ะ</span></div>
              <div className="mt-4 flex h-[29.7px] items-center justify-center"><button type="button" className="mr-2 h-[29.7px] rounded-[20px] border-[0.8px] border-[#fc9a12] bg-[#fc9a12] px-3 py-[6px] text-[14px] font-normal leading-[16.1px] tracking-normal text-white">คำนวณ Package</button><button type="button" className="h-[29.7px] rounded-[20px] border-[0.8px] border-[#61a8ff] bg-[#61a8ff] px-3 py-[6px] text-[14px] font-normal leading-[16.1px] tracking-normal text-white">ประวัติการสั่งซื้อ</button></div>
            </section>
          </div>

          <section className="min-h-[695.35px] flex-1 rounded-[10px] border-[0.8px] border-[#ccc] bg-white">
            <div className="flex items-center justify-between gap-[10px] p-4">
              <div className="flex items-center text-[20px] font-normal leading-[31.43px]"><span>Company</span><button type="button" aria-label="Add Company" title="Add Company" onClick={() => { if (canCreate) setDialogOpen(true); else setMessage("คุณไม่มีสิทธิ์เพิ่มบริษัท"); }} className="ml-2 inline-flex size-6 items-center justify-center text-[#2778c4] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2778c4]/40"><AddCompanyIcon /></button></div>
              <div className="flex items-center"><div className="flex items-end gap-[10px]"><label className="flex h-[41.6px] w-[484.025px] items-center rounded-[1000px] border-[0.8px] border-[#d9d9d9] px-[10px]"><SearchIcon /><input id="input-filter-companyName" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-[369.9375px] border-0 bg-white px-4 text-[14px] font-normal leading-[16.1px] tracking-normal outline-none" placeholder="ค้นหาบริษัท" /></label><div className="relative"><button type="button" aria-label="Package" aria-haspopup="menu" aria-expanded={planFilterMenuOpen} onClick={() => setPlanFilterMenuOpen((value) => !value)} className="flex h-[41.6px] w-[104.8875px] items-center justify-between rounded-[20px] border-[0.8px] border-[#d9d9d9] bg-white px-4 text-[14px] font-normal leading-[22.001px] tracking-normal text-black/[0.65]"><span>{planFilter === "all" ? "Package" : planFilter}</span><ChevronDownIcon /></button>{planFilterMenuOpen && <div role="menu" className="absolute right-0 top-[calc(100%+4px)] z-20 w-[160px] overflow-hidden rounded-[4px] bg-white py-1 shadow-[0_3px_8px_rgba(0,0,0,0.28)]"><button role="menuitem" type="button" onClick={() => { setPlanFilter("all"); setPlanFilterMenuOpen(false); }} className="block w-full px-4 py-2 text-left text-[14px] hover:bg-black/[0.04]">Package</button>{plans.map((plan) => <button key={plan} role="menuitem" type="button" onClick={() => { setPlanFilter(plan); setPlanFilterMenuOpen(false); }} className="block w-full px-4 py-2 text-left text-[14px] hover:bg-black/[0.04]">{plan}</button>)}</div>}</div></div><button type="button" aria-label="Edit View" className="ml-2 flex size-10 items-center justify-center rounded-full text-black/[0.87]"><DeveloperBoardIcon /></button></div>
            </div>

            {message && <p role="alert" className="mx-4 rounded border border-[#eb8794] bg-[#fff3f4] px-3 py-2 text-sm text-[#ad3242]">{message}</p>}
            <div className="company-widget-group flex max-h-[85vh] flex-row flex-wrap overflow-y-scroll pl-4 pr-[13.6px] pb-4">
              {loading ? <p className="w-full py-10 text-center text-sm text-black/60">กำลังโหลดข้อมูลบริษัท...</p> : visibleCompanies.length === 0 ? <p className="w-full py-10 text-center text-sm text-black/60">ไม่พบข้อมูลบริษัท</p> : visibleCompanies.map((company) => {
                const percent = company.employeeLimit ? Math.min(100, (company.employeeCount / company.employeeLimit) * 100) : 0;
                return <div key={company.id} className="flex h-[269.6px] basis-1/2 p-3"><article className="h-[245.6px] flex-1 rounded-[10px] border-[0.8px] border-[#ccc] bg-white px-6 py-4"><div className={company.code.length > 12 ? "-mb-2 text-[calc(2em+0.3vw)] leading-[1.5715] text-[#2778c4]" : "-mb-2 text-[calc(2em+1vw)] leading-[1.5715] text-[#2778c4]"}>{company.code}</div><div className="h-[31.425px] truncate text-[20px] font-medium leading-[31.43px] text-black/[0.54]">{company.nameEN}</div><div className="mt-6 flex h-[25.1375px] justify-between text-[16px] font-normal leading-[25.144px] text-black/[0.54]"><span>{company.planName}</span><span>{company.employeeCount}/{company.employeeLimit ?? "-"}</span></div><div className="box-border h-[21.6px] rounded-[16px] border-[0.8px] border-black/[0.54] p-[2px]"><div className="box-border flex h-4 min-w-8 items-center rounded-[16px] bg-[#61a8ff] px-4 text-right text-[11px] leading-none" style={{ width: `${percent}%` }}><p className="m-0 ml-auto text-right text-[11px] leading-none text-white">{company.employeeCount}</p></div></div><div className="mt-5 flex h-[29.7px] items-center justify-center"><button type="button" onClick={() => openCompanyManagement(company)} className="mr-2 h-[29.7px] w-[120px] rounded-[20px] border-[0.8px] border-[#fc9a12] bg-white px-3 py-[6px] text-[14px] font-normal leading-[16.1px] tracking-normal text-[#fc9a12]">จัดการบริษัท</button><button type="button" onClick={() => void enterCompany(company)} className="h-[29.7px] w-[120px] rounded-[20px] border-[0.8px] border-[#61a8ff] bg-white px-3 py-[6px] text-[14px] font-normal leading-[16.1px] tracking-normal text-[#61a8ff]">เข้าสู่ระบบบริษัท</button></div></article></div>;
              })}
            </div>
          </section>
        </div>
      </div>

      {managedCompany && (
        <section role="dialog" aria-modal="true" aria-labelledby="manage-company-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-[800px] overflow-hidden rounded-[8px] bg-white shadow-[0_11px_15px_rgba(0,0,0,0.2)]">
            <header className="flex h-[60.275px] items-center bg-[#61a8ff] px-6 text-[18px] font-normal text-white"><h2 id="manage-company-title">จัดการบริษัท</h2></header>
            <div className="min-h-[237.662px] px-6 py-4 text-[14px] leading-[22px] text-black/[0.87]">
              <div className="flex justify-between gap-12">
                <div className="min-w-[250px]">
                  <div>ชื่อย่อบริษัท :</div>
                  <div className="flex h-7 items-center text-[16px] font-medium text-[#2778c4]">
                    {editingCompanyCode ? <input aria-label="ชื่อย่อบริษัท" value={managedCode} onChange={(event) => setManagedCode(event.target.value.toUpperCase())} className="h-7 w-36 border-b border-[#2778c4] bg-transparent outline-none" /> : <span>{managedCode}</span>}
                    <button type="button" onClick={() => setEditingCompanyCode((value) => !value)} aria-label="แก้ไขชื่อย่อบริษัท" className="ml-1 grid size-7 place-items-center text-[#2778c4]" title="Edit Company Name"><EditIcon /></button>
                  </div>
                  <div className="-mt-1">จำนวนพนักงานปัจจุบัน : {managedCompany.employeeCount}</div>
                </div>
                <div className="min-w-[180px]">
                  <div>แพ็คเกจ :</div>
                  <div className="text-[16px] font-medium text-[#2778c4]">{managedPlan}</div>
                  <div className="relative mt-1 flex justify-center">
                    <button type="button" aria-expanded={packageMenuOpen} onClick={() => setPackageMenuOpen((value) => !value)} className="h-[29.7px] rounded-[20px] border border-[#61a8ff] bg-white px-4 text-[14px] text-[#2778c4]">เปลี่ยนแพ็คเกจ</button>
                    {packageMenuOpen && <div role="menu" className="absolute right-0 top-9 z-10 w-40 overflow-hidden rounded bg-white py-2 shadow-[0_3px_8px_rgba(0,0,0,0.28)]">{plans.map((plan) => <button key={plan} role="menuitem" type="button" onClick={() => { setManagedPlan(plan); setPackageMenuOpen(false); }} className="block w-full px-4 py-2 text-left text-[14px] hover:bg-black/[0.04]">{plan}</button>)}</div>}
                  </div>
                </div>
              </div>
              <div className="mt-5 px-8">
                <div className="flex justify-between px-5"><PeopleIcon /><DomainIcon /></div>
                <div className="flex justify-between px-8 text-[#2778c4]"><span>{managedCompany.employeeCount}/{Math.max(150, managedLimit)}</span><span>{managedCompany.employeeCount}/ {managedLimit}</span></div>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <button type="button" aria-label="ลดจำนวนที่นั่ง" onClick={() => setManagedLimit((value) => Math.max(managedCompany.employeeCount, value - 1))} className="grid size-8 place-items-center text-red-500"><RemoveCircleIcon /></button>
                  <input aria-label="จำนวนที่นั่ง" type="range" min={managedCompany.employeeCount} max={Math.max(150, managedCompany.employeeCount)} value={managedLimit} onChange={(event) => setManagedLimit(Number(event.target.value))} className="h-1.5 w-[90%] accent-[#2778c4]" />
                  <button type="button" aria-label="เพิ่มจำนวนที่นั่ง" onClick={() => setManagedLimit((value) => Math.min(Math.max(150, managedCompany.employeeCount), value + 1))} className="grid size-8 place-items-center text-green-600"><AddCircleIcon /></button>
                </div>
              </div>
            </div>
            <footer className="flex h-[68.8px] items-center justify-end bg-white px-6 py-4">
              <button type="button" onClick={() => setManagedCompany(null)} className="mr-2 h-[29.7px] rounded-[3px] bg-[#e0e0e0] px-5 text-[14px] text-black/[0.87]">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void saveCompanyManagement()} className="h-[29.7px] rounded-[3px] bg-[#2778c4] px-5 text-[14px] text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
            </footer>
          </div>
        </section>
      )}

      {dialogOpen && (
        <section role="dialog" aria-modal="true" aria-labelledby="create-company-title" className="fixed inset-x-0 bottom-0 top-16 z-10 overflow-y-auto bg-[#f5f5f5] lg:pl-80">
          <div className="h-40 bg-[#61a8ff]">
            <div className="mx-auto flex h-full max-w-[715px] items-end px-6 pb-4 text-white">
              <button type="button" onClick={() => { setDialogOpen(false); setForm(initialForm); }} aria-label="กลับไปจัดการบริษัท" className="mr-4 text-[34px] font-light leading-none">‹</button>
              <h2 id="create-company-title" className="text-[24px] font-normal leading-[37.716px]">เพิ่มบริษัท</h2>
            </div>
          </div>

          <form onSubmit={createCompany} className="mx-auto mt-4 mb-10 w-[min(715px,calc(100%-32px))] rounded-[10px] border border-[#e0e0e0] bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.14)]">
            <label className="block text-[14px] font-normal leading-[22px] text-black/[0.87]">
              ชื่อย่อบริษัท
              <input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className="mt-1 block h-[31.6px] w-full rounded-[3px] border border-[#d9d9d9] px-3 text-sm font-normal leading-[16.1px] outline-none transition-shadow placeholder:text-black/[0.25] focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" placeholder="ชื่อย่อบริษัท" />
            </label>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const detail = planCards[plan];
                const selected = form.planName === plan;
                return (
                  <button key={plan} type="button" onClick={() => setForm({ ...form, planName: plan })} aria-pressed={selected} className="relative h-[356px] overflow-hidden rounded-[7px] border bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-shadow hover:shadow-[0_3px_8px_rgba(0,0,0,0.24)]" style={{ borderColor: selected ? detail.accent : "#d9d9d9", boxShadow: selected ? `0 0 0 2px ${detail.accent}` : undefined }}>
                    <span aria-hidden="true" className="block h-6" style={{ backgroundColor: detail.accent }} />
                    <span className="block px-5 pt-9 text-[28px] font-semibold leading-[35px]" style={{ color: detail.accent }}>{detail.title}</span>
                    <span className="mt-2 block min-h-[112px] px-5 text-[14px] font-normal leading-[23px] text-[#6f6f6f]">{detail.description}</span>
                    <span className="mx-5 mt-3 block border-t-2" style={{ borderColor: detail.accent }} />
                    <span className="mt-3 block px-5 text-[14px] font-bold leading-[22px] text-black/[0.87]">สามารถใช้งานผ่าน :</span>
                    <span className="mt-2 flex gap-2 px-5">{[0, 1, 2].map((icon) => <span key={icon} aria-hidden="true" className="grid size-8 place-items-center rounded-full text-xs text-white" style={{ backgroundColor: detail.accent }}>{icon === 0 ? "▣" : icon === 1 ? "▯" : "◷"}</span>)}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t border-[#e0e0e0] pt-6">
              <h3 className="text-[18px] font-normal leading-[28px] text-black/[0.87]">ข้อมูลการเชื่อมต่อ</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">ชื่อบริษัท (ไทย)<input required value={form.nameTH} onChange={(event) => setForm({ ...form, nameTH: event.target.value })} className="mt-1 h-[31.6px] w-full rounded-[3px] border border-[#d9d9d9] px-3 outline-none focus:border-[#40a9ff]" /></label>
                <label className="text-sm">ชื่อบริษัท (อังกฤษ)<input required value={form.nameEN} onChange={(event) => setForm({ ...form, nameEN: event.target.value })} className="mt-1 h-[31.6px] w-full rounded-[3px] border border-[#d9d9d9] px-3 outline-none focus:border-[#40a9ff]" /></label>
                <label className="text-sm sm:col-span-2">Portal URL<input required type="url" value={form.portalUrl} onChange={(event) => setForm({ ...form, portalUrl: event.target.value })} className="mt-1 h-[31.6px] w-full rounded-[3px] border border-[#d9d9d9] px-3 outline-none focus:border-[#40a9ff]" placeholder="https://company.example.com/welcome" /></label>
                <label className="text-sm">จำนวนพนักงานสูงสุด<input min="1" type="number" value={form.employeeLimit} onChange={(event) => setForm({ ...form, employeeLimit: event.target.value })} className="mt-1 h-[31.6px] w-full rounded-[3px] border border-[#d9d9d9] px-3 outline-none focus:border-[#40a9ff]" placeholder="ไม่จำกัด" /></label>
              </div>
            </div>

            <footer className="mt-6 flex justify-end gap-2 border-t border-[#e0e0e0] pt-4">
              <button type="button" onClick={() => { setDialogOpen(false); setForm(initialForm); }} className="h-[29.7px] rounded-[20px] border border-[#a6a6a6] bg-white px-5 text-[14px] font-normal text-[#6f6f6f]">ปิด</button>
              <button disabled={saving} type="submit" className="h-[29.7px] rounded-[20px] border border-[#61a8ff] bg-[#61a8ff] px-5 text-[14px] font-normal text-white disabled:opacity-60">{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
            </footer>
          </form>
        </section>
      )}
    </main>
  );
}
