"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, FileText, Grid3x3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ORG_STRUCTURES = ["", "สำนักงานใหญ่", "สาขา 1"];
const POSITIONS = ["", "พนักงานปฏิบัติการ", "หัวหน้างาน", "ผู้จัดการ"];
const DOCUMENT_TYPES = ["ทั้งหมด", "บัตรประชาชน", "หนังสือเดินทาง", "ใบอนุญาตทำงาน"];

function SelectBox({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full cursor-pointer appearance-none rounded-[3px] border border-[#d9d9d9] bg-white pl-2.5 pr-8 text-sm text-[#555] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#40a9ff]">
        {options.map((option) => <option key={option || "empty"} value={option}>{option}</option>)}
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
    <div className="flex h-[151px] flex-col items-center justify-center bg-[#f4fcff]">
      <svg className="-translate-y-px" width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
          <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
          <g fill="#d9d9d9" fillRule="nonzero">
            <path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
          </g>
        </g>
      </svg>
      <p className="relative -top-0.5 mt-2 text-sm text-[#666]">ไม่มีข้อมูล</p>
    </div>
  );
}

export default function ReportEmployeeRenewalsPage() {
  const [organization, setOrganization] = useState("");
  const [position, setPosition] = useState("");
  const [employee, setEmployee] = useState("");
  const [documentType, setDocumentType] = useState("ทั้งหมด");

  return (
    <div>
      <section className="relative h-40 border-b border-border bg-[#51A0F5] p-6 text-white">
        <div className="flex h-full flex-col items-start justify-center">
          <p className="flex items-center gap-0.5 text-sm text-white/85">รายงาน<ChevronRight className="size-4" />กลุ่มประวัติพนักงาน</p>
          <h1 className="mt-4 text-2xl font-bold text-white">รายงานเอกสารต่ออายุ</h1>
        </div>
      </section>

      <div className="space-y-2 bg-[#f2f5fa] p-6 pt-[31px]">
        <Card className="min-w-[1165px] overflow-hidden">
          <div className="flex h-[59px] items-center px-3"><p className="text-xl font-medium text-[#555]">ค้นหา</p></div>
          <CardContent className="px-4 pb-[15px] pt-4">
            <div className="grid grid-cols-1 gap-x-2 md:grid-cols-3">
              <Field label="โครงสร้างองค์กร"><SelectBox value={organization} options={ORG_STRUCTURES} onChange={setOrganization} /></Field>
              <Field label="ตำแหน่ง"><SelectBox value={position} options={POSITIONS} onChange={setPosition} /></Field>
              <Field label="พนักงาน"><input value={employee} onChange={(event) => setEmployee(event.target.value)} className="h-8 w-full rounded-[3px] border border-[#d9d9d9] bg-white px-2.5 text-sm text-[#555] shadow-sm outline-none focus:border-[#40a9ff]" /></Field>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-x-2 md:grid-cols-3">
              <Field label="ตั้งแต่วันที่ - จนถึงวันที่"><button type="button" className="flex h-8 w-full items-center rounded-[3px] border border-[#d9d9d9] bg-white px-2.5 text-sm text-[#555] shadow-sm"><span>23/08/2026</span><span className="mx-auto text-[#999]">→</span><span>23/08/2026</span><CalendarDays className="ml-auto size-4 text-[#8c8c8c]" /></button></Field>
              <Field label="ประเภทเอกสาร"><SelectBox value={documentType} options={DOCUMENT_TYPES} onChange={setDocumentType} /></Field>
              <div />
            </div>
            <div className="mt-7 flex justify-end gap-2">
              <Button className="h-9 w-[86px] rounded-[3px] bg-[#485166] px-3.5 text-sm shadow-sm hover:bg-[#485166]/90">PDF<FileText className="size-4" /></Button>
              <Button className="h-9 w-[95px] rounded-[3px] bg-[#43b14b] px-3.5 text-sm shadow-sm hover:bg-[#43b14b]/90">Excel<Grid3x3 className="size-4" /></Button>
              <Button className="h-9 w-[65px] rounded-[3px] bg-[#1890ff] px-3.5 text-sm shadow-sm hover:bg-[#1890ff]/90">ค้นหา</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[1165px]">
          <CardContent className="px-2 pb-0 pt-0">
            <table className="w-[1136px] table-fixed border-collapse text-sm">
              <thead><tr className="h-[55px] bg-[#5aa8f8] text-white"><th className="w-[175px] border-r border-white/60 font-medium">ลำดับ</th><th className="w-[437px] border-r border-white/60 font-medium">ชื่อเอกสาร</th><th className="w-[262px] border-r border-white/60 font-medium">วันหมดอายุ</th><th className="w-[262px] font-medium">รูปภาพ</th></tr></thead>
              <tbody><tr><td colSpan={4} className="p-0"><EmptyState /></td></tr></tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
