"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const avatarUrl = "https://hmsstorage001.blob.core.windows.net/profile/20240110BD54E69536B7/profile_pic/bWQF9XYCiu8Xxi6SNd04.png";

function PermissionIcon() {
  return <svg aria-hidden="true" className="relative top-1 h-4 w-[18px] shrink-0" viewBox="0 0 18 16" fill="none"><path d="M6.857 6.737c1.894 0 3.429-1.508 3.429-3.369S8.751 0 6.857 0 3.429 1.507 3.429 3.368s1.534 3.369 3.428 3.369ZM6.857 1.684c.455 0 .891.178 1.212.493a1.68 1.68 0 0 1 .502 1.191c0 .447-.18.875-.502 1.191a1.73 1.73 0 0 1-1.212.493c-.951 0-1.714-.75-1.714-1.684s.771-1.684 1.714-1.684ZM6.231 13.474H0v-2.527c0-2.248 4.569-3.368 6.857-3.368.892 0 2.143.177 3.309.514-.737.286-1.423.682-2.023 1.17-.429-.05-.857-.084-1.286-.084-2.545 0-5.228 1.23-5.228 1.768v.927h4.56c-.017.042-.043.084-.069.126l-.248.632.248.632c.034.067.077.134.111.21Zm6.626-1.684c.48 0 .857.37.857.842a.85.85 0 0 1-.857.842.85.85 0 0 1-.857-.842c0-.471.377-.842.857-.842Zm0-2.527c-2.34 0-4.337 1.398-5.143 3.369C8.52 14.602 10.517 16 12.857 16S17.194 14.602 18 12.632c-.806-1.971-2.803-3.369-5.143-3.369Zm0 5.474a2.16 2.16 0 0 1-1.515-.617 2.09 2.09 0 0 1-.628-1.488c0-.558.226-1.094.628-1.489a2.16 2.16 0 0 1 1.515-.617c.568 0 1.114.222 1.515.617.402.395.628.931.628 1.489 0 .557-.226 1.093-.628 1.488a2.16 2.16 0 0 1-1.515.617Z" fill="black" fillOpacity=".65" /></svg>;
}

function MenuIcon({ type }: { type: "company" | "language" | "logout" }) {
  const path = type === "company"
    ? "M16.75 14.875H15.5v1.25h1.25m0-3.75H15.5v1.25h1.25M18 17.375h-5v-1.25h1.25v-1.25H13v-1.25h1.25v-1.25H13v-1.25h5m-6.25-1.25H10.5v-1.25h1.25m0 3.75H10.5v-1.25h1.25m0 2.5H10.5v-1.25h1.25m0 2.5H10.5v-1.25h1.25M9.25 9.875H8v-1.25h1.25m0 3.75H8v-1.25h1.25m0 2.5H8v-1.25h1.25m3.75-5V7.375H6.75v11.25h12.5v-8.75h-6.25Z"
    : type === "language"
      ? "M12.994 7C9.682 7 7 9.688 7 13s2.682 6 5.994 6C16.312 19 19 16.312 19 13s-2.688-6-6.006-6Zm4.158 3.6h-1.77a10.49 10.49 0 0 0-.828-2.136 4.81 4.81 0 0 1 2.598 2.136ZM13 8.224c.498.72.888 1.518 1.146 2.376h-2.292C12.112 9.742 12.502 8.944 13 8.224ZM8.356 14.2A4.89 4.89 0 0 1 8.2 13c0-.414.06-.816.156-1.2h2.028A10.1 10.1 0 0 0 10.3 13c0 .408.036.804.084 1.2H8.356Zm.492 1.2h1.77c.192.75.468 1.47.828 2.136a4.8 4.8 0 0 1-2.598-2.136Zm1.77-4.8h-1.77a4.8 4.8 0 0 1 2.598-2.136 10.5 10.5 0 0 0-.828 2.136ZM13 17.776a10.1 10.1 0 0 1-1.146-2.376h2.292A10.1 10.1 0 0 1 13 17.776Zm1.404-3.576h-2.808A9.9 9.9 0 0 1 11.5 13c0-.408.042-.81.096-1.2h2.808c.054.39.096.792.096 1.2 0 .408-.042.804-.096 1.2Zm.15 3.336a10.5 10.5 0 0 0 .828-2.136h1.77a4.8 4.8 0 0 1-2.598 2.136Zm1.062-3.336c.048-.396.084-.792.084-1.2 0-.408-.036-.808-.084-1.2h2.028c.096.384.156.786.156 1.2 0 .414-.06.816-.156 1.2h-2.028Z"
      : "M14.435 19.125h-4.372c-.691 0-1.25-.719-1.25-1.607V9.481c0-.887.559-1.606 1.25-1.606h4.375M16 15.688l2.188-2.188L16 11.313m-4.063 2.185h6.25";
  return <svg aria-hidden="true" className="size-[26px] shrink-0" viewBox="0 0 26 26" fill="none"><rect width="26" height="26" rx="13" fill="#CACBCC" />{type === "logout" ? <path d={path} stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : <path d={path} fill="black" />}</svg>;
}

function MenuArrow() {
  return <svg aria-hidden="true" className="size-6 shrink-0" viewBox="0 0 24 24"><path d="m9.29 6.71 4.59 4.59a1 1 0 0 1 0 1.41l-4.59 4.59-1.41-1.41L11.47 12 7.88 8.12l1.41-1.41Z" fill="currentColor" /></svg>;
}

function SelectedCompanyIcon() {
  return <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 14 15" fill="none"><path fill="#008CFF" fillRule="evenodd" clipRule="evenodd" d="M7 14.5C7.91925 14.5 8.8295 14.3189 9.67878 13.9672C10.5281 13.6154 11.2997 13.0998 11.9497 12.4497C12.5998 11.7997 13.1154 11.0281 13.4672 10.1788C13.8189 9.3295 14 8.41925 14 7.5C14 6.58075 13.8189 5.6705 13.4672 4.82122C13.1154 3.97194 12.5998 3.20026 11.9497 2.55025C11.2997 1.90024 10.5281 1.38463 9.67878 1.03284C8.8295 0.68106 7.91925 0.5 7 0.5C5.14348 0.5 3.36301 1.2375 2.05025 2.55025C0.737498 3.86301 0 5.64348 0 7.5C0 9.35652 0.737498 11.137 2.05025 12.4497C3.36301 13.7625 5.14348 14.5 7 14.5ZM6.81956 10.3311L10.7084 5.66444L9.51378 4.66889L6.16933 8.68144L4.43878 6.95011L3.339 8.04989L5.67233 10.3832L6.27433 10.9852L6.81956 10.3311Z" /></svg>;
}

type CompanyOption = { id: string; name: string; code: string | null };

export function UserDropdown({
  activeCompany,
  companies,
  companiesLoading,
  switchingCompanyId,
  onRequestCompanies,
  onSelectCompany,
}: {
  activeCompany: CompanyOption | null;
  companies: CompanyOption[];
  companiesLoading: boolean;
  switchingCompanyId: string | null;
  onRequestCompanies: () => void;
  onSelectCompany: (company: CompanyOption) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    if (!open) onRequestCompanies();
    setOpen((value) => !value);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCompany = async (company: CompanyOption) => {
    if (company.id === activeCompany?.id) {
      setCompanyMenuOpen(false);
      return;
    }
    await onSelectCompany(company);
    setCompanyMenuOpen(false);
    setOpen(false);
  };

  const currentCompany = activeCompany ?? { id: "", code: "MIC_ORGANIZE", name: "MIC ORGANIZE CO., LTD." };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Circular avatar with the reference's orange ring + white bold initials (previous size) */}
        <div className="flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 border-[#f59e0b] bg-[#4d4d4d] text-xs font-bold text-white">
          AC
        </div>
        <div className="hidden text-left leading-tight sm:block">
          <p className="text-sm font-light text-foreground">Adirek Chumchuen</p>
          <p className="text-xs font-medium text-muted-foreground">Admin (Owner)</p>
        </div>
        <ChevronDown
          className={cn(
            "hidden size-3.5 text-muted-foreground transition-transform sm:block",
            open && "rotate-180"
          )}
        />
      </button>

      {open && <div style={{ fontFamily: "HumansoftKanit, Kanit, sans-serif" }} className="mat-menu-content absolute right-[14px] top-full z-50 mt-[12.0125px] box-border h-auto min-h-0 w-[284px] max-w-[284px] overflow-visible rounded-[4px] bg-white py-2 text-sm font-normal leading-[22.001px] tracking-[-0.1px] shadow-[0_2px_4px_-1px_rgba(0,0,0,0.2),0_4px_5px_rgba(0,0,0,0.14),0_1px_10px_rgba(0,0,0,0.12)]" role="menu">
        <div className="sub-user-profile-menu m-3 flex items-start justify-between gap-3">
          <div className="flex h-[62.4px] w-[210px] items-center"><img className="mr-3 size-[51px] shrink-0 rounded-[50px] border border-[#ff6100] object-cover" src={avatarUrl} alt="" loading="lazy" decoding="async" /><div className="w-[147px]"><div className="text-[16px] font-medium leading-[normal] text-black/[0.87]">Adirek Chumchuen</div><div className="text-[13px] font-normal leading-[normal] text-black/[0.87]">cadirek@gmail.com</div><div className="text-[13px] font-normal leading-[normal] text-black/[0.87]">Admin (Owner)</div></div></div>
          <PermissionIcon />
        </div>
        <div className="mx-[15px] h-px w-[256px] bg-[#e0e0e0]" />
        <div className="sub-company-profile-menu flex flex-col gap-2.5 px-5 py-3"><div className="flex flex-col"><span className="text-[16px] font-medium leading-[normal] text-black/[0.87]">{currentCompany.code || "-"}</span><span className="text-[13px] font-normal leading-[normal] text-black/[0.87]">{currentCompany.name}</span></div><div className="leading-[22.001px]"><span className="text-sm font-medium leading-[normal] text-black">Package: Standard</span><br /><span className="text-xs font-normal leading-[normal] text-[#0aa34a]">อายุคงเหลือ 218 วัน</span><br /><span className="text-xs font-normal leading-[normal] text-[#212121]">จำนวนพนักงาน: 9/10 คน</span></div></div>
        <div className="mx-[15px] h-px w-[256px] bg-[#e0e0e0]" />
        <div className="select-company-language flex flex-col">
          <div className="relative">
            <button type="button" onClick={() => setCompanyMenuOpen((value) => !value)} className="flex h-[50px] w-full items-center justify-between p-3 text-sm font-normal leading-[16.1px] text-black/[0.87] hover:bg-black/[0.04]"><span className="flex items-center gap-3"><MenuIcon type="company" />เลือกบริษัท</span><MenuArrow /></button>
            {companyMenuOpen && <div className="absolute right-[calc(100%+3px)] -top-[10px] z-[100] max-h-[calc(100vh-32px)] w-[236px] overflow-x-hidden overflow-y-auto rounded-[4px] bg-white py-2 [font-family:kanit] text-sm leading-[22.001px] shadow-[0_2px_4px_-1px_rgba(0,0,0,0.2),0_4px_5px_rgba(0,0,0,0.14),0_1px_10px_rgba(0,0,0,0.12)]"><div className="flex h-14 items-center px-4 text-[16.8px] font-medium leading-[22.001px] text-black/[0.87]">เลือกบริษัท</div><div className="mx-4 h-[0.8px] bg-[#e0e0e0]" /><div>{companiesLoading ? <div className="flex h-12 items-center px-6 text-sm text-black/[0.54]">กำลังโหลดรายชื่อบริษัท...</div> : companies.length > 0 ? companies.map((company) => { const selected = company.id === currentCompany.id; const switching = company.id === switchingCompanyId; return <div key={company.id} className="w-full"><button type="button" disabled={switchingCompanyId !== null} onClick={() => void selectCompany(company)} className={cn("flex h-12 min-h-0 w-full box-border items-center justify-between gap-[10px] px-6 py-3 text-left text-sm leading-[48px] tracking-normal hover:bg-[#f5f5f5] disabled:cursor-wait", selected && "bg-[linear-gradient(0deg,rgba(0,140,255,0.2),rgba(0,140,255,0.2)),#fff]")}><span className="max-w-[170px] truncate">{switching ? "กำลังเปิดข้อมูลบริษัท..." : company.code || "-"}</span>{selected && <SelectedCompanyIcon />}</button></div>; }) : <div className="flex h-12 items-center px-6 text-sm text-black/[0.54]">ไม่พบบริษัทที่คุณมีสิทธิ์ใช้งาน</div>}</div><div className="mx-4 h-[0.8px] bg-[#e0e0e0]" /><Link href="/organization/companies" onClick={() => { setCompanyMenuOpen(false); setOpen(false); }} className="flex h-12 w-full items-center px-6 text-sm leading-[48px] tracking-normal text-black/[0.87] hover:bg-[#f5f5f5]">ระบบจัดการบริษัท</Link></div>}
          </div>
          <button type="button" className="flex h-[50px] w-full items-center justify-between p-3 text-sm font-normal leading-[16.1px] text-black/[0.87] hover:bg-black/[0.04]"><span className="flex items-center gap-3"><MenuIcon type="language" />ภาษา: TH</span><MenuArrow /></button>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex h-[50px] w-full items-center justify-between p-3 text-sm font-normal leading-[16.1px] text-black/[0.87] hover:bg-black/[0.04]"><span className="flex items-center gap-3"><MenuIcon type="logout" />ออกจากระบบ</span></button>
        </div>
      </div>}
    </div>
  );
}
