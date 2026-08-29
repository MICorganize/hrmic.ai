"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, FileText, Grid3x3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ORG_STRUCTURES = ["ทั้งหมด", "สำนักงานใหญ่", "สาขา 1"];
const POSITIONS = ["ทั้งหมด", "พนักงานปฏิบัติการ", "หัวหน้างาน", "ผู้จัดการ"];

function SelectBox({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full cursor-pointer appearance-none rounded-[3px] border border-[#d9d9d9] bg-white pl-2.5 pr-8 text-sm text-[#555] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#40a9ff]">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8c8c8c]" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-0.5 block text-xs leading-5 text-[#666]">{label}</label>{children}</div>;
}

function EmptyState() {
  return (
    <div className="flex h-[151px] flex-col items-center justify-center rounded-sm border border-[#e7edf3] bg-[#f4fcff]">
      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
          <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
          <g fill="#d9d9d9" fillRule="nonzero">
            <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
          </g>
        </g>
      </svg>
      <p className="mt-2 text-sm text-[#666]">ไม่มีข้อมูล</p>
    </div>
  );
}

export default function ReportEmployeeProbationPage() {
  const [organization, setOrganization] = useState("ทั้งหมด");
  const [position, setPosition] = useState("ทั้งหมด");
  const [hashtag, setHashtag] = useState("");
  const [searched, setSearched] = useState(false);

  return (
    <div>
      <section className="relative h-40 border-b border-border bg-[#51A0F5] p-6 text-white">
        <div className="flex h-full flex-col items-start justify-center">
          <p className="flex items-center gap-0.5 text-sm text-white/85">รายงาน<ChevronRight className="size-4" />กลุ่มประวัติพนักงาน</p>
          <h1 className="mt-4 text-2xl font-bold text-white">รายงานพนักงานทดลองงาน</h1>
        </div>
      </section>

      <div className="space-y-2 bg-[#f2f5fa] p-6 pt-[31px]">
        <Card className="min-w-[1163px] overflow-hidden">
          <div className="flex h-[59px] items-center px-3"><p className="text-xl font-medium text-[#555]">ค้นหา</p></div>
          <CardContent className="px-4 pb-[15px] pt-4">
            <div className="grid grid-cols-1 gap-x-2 md:grid-cols-3">
              <Field label="โครงสร้างองค์กร"><SelectBox value={organization} options={ORG_STRUCTURES} onChange={setOrganization} /></Field>
              <Field label="ตำแหน่ง"><SelectBox value={position} options={POSITIONS} onChange={setPosition} /></Field>
              <Field label="Hashtag"><input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#Hashtag" className="h-8 w-full rounded-[3px] border border-[#d9d9d9] bg-white px-2.5 text-sm text-[#555] shadow-sm outline-none placeholder:text-[#bfbfbf] focus:border-[#40a9ff]" /></Field>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-x-2 md:grid-cols-3">
              <Field label="วันที่เริ่มต้น - วันที่สิ้นสุด">
                <button type="button" className="flex h-8 w-full items-center rounded-[3px] border border-[#d9d9d9] bg-white px-2.5 text-sm text-[#bfbfbf] shadow-sm">
                  <span>วันเริ่มต้น</span><span className="mx-auto text-[#999]">→</span><span>วันสิ้นสุด</span><CalendarDays className="ml-auto size-4 text-[#8c8c8c]" />
                </button>
              </Field>
              <Field label="เดือนที่ครบทดลองงาน">
                <button type="button" className="flex h-8 w-full items-center gap-2 rounded-[3px] border border-[#d9d9d9] bg-white px-2.5 text-left text-sm text-[#bfbfbf] shadow-sm"><span>เดือน</span><CalendarDays className="ml-auto size-4 text-[#8c8c8c]" /></button>
              </Field>
              <div />
            </div>
            <div className="mt-[27px] flex justify-end gap-2">
              <Button disabled={!searched} className="h-9 w-[86px] rounded-[3px] bg-[#485166] px-3.5 text-sm shadow-sm hover:bg-[#485166]/90 disabled:bg-[#485166] disabled:text-white disabled:opacity-100">PDF<FileText className="size-4" /></Button>
              <Button disabled={!searched} className="h-9 w-[90px] rounded-[3px] bg-[#43b14b] px-3.5 text-sm shadow-sm hover:bg-[#43b14b]/90 disabled:bg-[#a5d6a7] disabled:text-white disabled:opacity-100">Excel<Grid3x3 className="size-4" /></Button>
              <Button onClick={() => setSearched(true)} className="h-9 w-[65px] rounded-[3px] bg-[#1890ff] px-3.5 text-sm shadow-sm hover:bg-[#1890ff]/90">ค้นหา</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[1163px]">
          <div className="flex h-[59px] items-center px-3"><p className="-translate-y-px text-[22px] font-bold leading-8 text-[#4d4d4d]">รายงานพนักงานทดลองงาน</p></div>
          <CardContent className="px-2 pb-2 pt-[17px]"><EmptyState /></CardContent>
        </Card>
      </div>
    </div>
  );
}
