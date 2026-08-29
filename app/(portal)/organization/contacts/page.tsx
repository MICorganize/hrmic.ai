"use client";

import { ChevronLeft, ChevronRight, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

const contacts = [
  {
    id: "SVOA002",
    name: "นพดล ฟุ้งศรีสถิตย์กุล (null)",
    email: "dolreddevil@gmail.com",
    phone: "0616656479",
    position: "Product Consultant (PC)",
    hashtag: "",
    active: true,
  },
];

export default function OrganizationContactsPage() {
  const [keyword, setKeyword] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [status, setStatus] = useState("เฉพาะที่ Active");
  const [submitted, setSubmitted] = useState({ keyword: "", hashtag: "", status: "เฉพาะที่ Active" });
  const results = useMemo(() => {
    const term = submitted.keyword.trim().toLowerCase();
    const tag = submitted.hashtag.trim().toLowerCase();
    return contacts.filter((contact) => {
      const haystack = [contact.id, contact.name, contact.email, contact.phone, contact.position].join(" ").toLowerCase();
      return (!term || haystack.includes(term)) && (!tag || contact.hashtag.toLowerCase().includes(tag)) && (submitted.status !== "เฉพาะที่ Active" || contact.active);
    });
  }, [submitted]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#e7eff8]">
      <section className="min-h-40 bg-[#61a8ff] px-6 pb-6 pt-12 text-white">
        <div className="flex items-center gap-1 text-sm text-white/90"><span>ข้อมูลองค์กร</span><ChevronRight className="size-4" /><span>ข้อมูลผู้ติดต่อ</span></div>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">ข้อมูลผู้ติดต่อ</h1>
      </section>

      <section className="px-8 py-8">
        <form onSubmit={(event) => { event.preventDefault(); setSubmitted({ keyword, hashtag, status }); }} className="rounded-b-lg bg-white px-3 pb-2 pt-3 shadow-[0_1px_2px_rgba(58,81,106,0.08)]">
          <div className="grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-12">
            <label className="block text-sm font-medium text-[#40454a] md:col-span-6">โครงสร้างองค์กร<input placeholder="โครงสร้างองค์กร" disabled className="mt-1 block h-8 w-full rounded border border-[#d8d8d8] bg-white px-3 text-sm font-normal outline-none placeholder:text-[#c9c9c9] disabled:cursor-not-allowed" /></label>
            <label className="block text-sm font-medium text-[#40454a] md:col-span-6">ตำแหน่ง<input placeholder="ตำแหน่ง" disabled className="mt-1 block h-8 w-full rounded border border-[#d8d8d8] bg-white px-3 text-sm font-normal outline-none placeholder:text-[#c9c9c9] disabled:cursor-not-allowed" /></label>
            <label className="block text-sm font-medium text-[#40454a] md:col-span-4">สถานะ<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 block h-8 w-full rounded border border-[#d8d8d8] bg-white px-3 text-sm font-normal outline-none"><option>เฉพาะที่ Active</option><option>ทั้งหมด</option><option>เฉพาะที่ Inactive</option></select></label>
            <label className="block text-sm font-medium text-[#40454a] md:col-span-4">คำค้นหา<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="คำค้นหา" className="mt-1 block h-8 w-full rounded border border-[#d8d8d8] bg-white px-3 text-sm font-normal outline-none placeholder:text-[#c9c9c9]" /></label>
            <label className="block text-sm font-medium text-[#40454a] md:col-span-4">Hashtag<input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#Hashtag" className="mt-1 block h-8 w-full rounded border border-[#d8d8d8] bg-white px-3 text-sm font-normal outline-none placeholder:text-[#c9c9c9]" /></label>
            <button type="submit" className="inline-flex h-[38px] items-center justify-center rounded bg-[#168fe9] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#087fd8] md:col-start-12 md:justify-self-end"><Search className="mr-1.5 size-4" />ค้นหา</button>
          </div>
        </form>

        <div className="mt-3 overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(58,81,106,0.2)]">
          <table className="w-full min-w-[760px] border-collapse text-sm text-[#4a4e52]">
            <thead className="bg-[#61a8f6] text-white"><tr className="h-[54px] font-semibold"><th className="w-[35%] border-r border-white/50 px-3 text-center">ชื่อ</th><th className="w-[20%] border-r border-white/50 px-3 text-center">อีเมล</th><th className="w-[11%] border-r border-white/50 px-3 text-center">เบอร์โทรศัพท์</th><th className="w-[20%] border-r border-white/50 px-3 text-center">ตำแหน่ง</th><th className="w-[14%] px-3 text-center">Hashtag</th></tr></thead>
            <tbody>{results.length ? results.map((contact) => <tr key={contact.id} className="h-[58px] border-b border-[#e4edf4] bg-white"><td className="border-r border-[#edf1f5] px-5"><div className="flex items-center gap-4"><span className="flex size-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#d6d6d6] text-[#5c5c5c]"><UserRound className="size-9 translate-y-1" fill="currentColor" /></span><span>{contact.id}: {contact.name}</span></div></td><td className="border-r border-[#edf1f5] px-3 text-center">{contact.email}</td><td className="border-r border-[#edf1f5] px-3 text-center">{contact.phone}</td><td className="border-r border-[#edf1f5] px-3 text-center">{contact.position}</td><td className="px-3 text-center">{contact.hashtag}</td></tr>) : <tr className="h-[58px]"><td colSpan={5} className="text-center text-[#737b82]">ไม่มีข้อมูล</td></tr>}</tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end gap-2"><button type="button" disabled aria-label="หน้าก่อน" className="flex size-8 items-center justify-center border border-[#d7dce1] bg-white text-[#9aa2aa] disabled:cursor-not-allowed"><ChevronLeft className="size-4" /></button><button type="button" aria-current="page" className="flex size-8 items-center justify-center border border-[#168fe9] bg-white text-[#168fe9]">1</button><button type="button" disabled aria-label="หน้าถัดไป" className="flex size-8 items-center justify-center border border-[#d7dce1] bg-white text-[#9aa2aa] disabled:cursor-not-allowed"><ChevronRight className="size-4" /></button></div>
      </section>
    </div>
  );
}
