"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, Grid3x3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ORG_STRUCTURES = ["ทั้งหมด", "สำนักงานใหญ่", "สาขา 1"];
const DATA_TYPES = ["ทั้งหมด", "เงินเดือน", "เงินประจำตำแหน่ง"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-0.5 block text-xs leading-5 text-[#666]">{label}</label>{children}</div>;
}

function EmptyState() {
  return <div className="flex h-[151px] flex-col items-center justify-center rounded-sm border border-[#e7edf3] bg-[#f4fcff]"><svg className="-translate-y-px" width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(0 1)" fill="none" fillRule="evenodd"><ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" /><g fill="#d9d9d9" fillRule="nonzero"><path d="M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" /><path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" /></g></g></svg><p className="relative -top-0.5 mt-2 text-sm text-[#666]">ไม่มีข้อมูล</p></div>;
}

export default function ReportEmployeeSalaryAdjustmentPage() {
  const [organization, setOrganization] = useState("ทั้งหมด");
  const [month, setMonth] = useState("สิงหาคม 2026");
  const [dataType, setDataType] = useState("ทั้งหมด");

  return (
    <div>
      <section className="relative h-40 border-b border-border bg-[#51A0F5] p-6 text-white"><div className="flex h-full flex-col items-start justify-center"><p className="flex items-center gap-0.5 text-sm text-white/85">รายงาน<ChevronRight className="size-4" />กลุ่มประวัติพนักงาน</p><h1 className="mt-4 text-2xl font-bold text-white">รายงานการปรับเงินเดือน</h1></div></section>
      <div className="space-y-2 bg-[#f2f5fa] p-6 pt-[31px]">
        <Card className="min-w-[1165px] overflow-hidden">
          <div className="flex h-[59px] items-center px-3"><p className="text-xl font-medium text-[#555]">ค้นหา</p></div>
          <CardContent className="px-4 pb-4 pt-4">
            <div className="grid grid-cols-1 gap-x-2 md:grid-cols-4">
              <Field label="โครงสร้างองค์กร"><div className="relative"><select value={organization} onChange={(event) => setOrganization(event.target.value)} className="h-8 w-full appearance-none rounded-[3px] border border-[#d9d9d9] bg-white pl-2.5 pr-8 text-sm text-[#555] shadow-sm">{ORG_STRUCTURES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8c8c8c]" /></div></Field>
              <Field label="ปี"><button type="button" disabled className="flex h-8 w-full items-center rounded-[3px] border border-[#d9d9d9] bg-[#f5f5f5] px-2.5 text-sm text-[#bfbfbf] shadow-sm">ปี<CalendarDays className="ml-auto size-4 text-[#8c8c8c]" /></button></Field>
              <Field label="เดือน"><button type="button" onClick={() => setMonth(month === "สิงหาคม 2026" ? "กันยายน 2026" : "สิงหาคม 2026")} className="flex h-8 w-full items-center rounded-[3px] border border-[#d9d9d9] bg-white px-2.5 text-sm text-[#555] shadow-sm">{month}<CalendarDays className="ml-auto size-4 text-[#8c8c8c]" /></button></Field>
              <Field label="ประเภทข้อมูล"><div className="relative"><select value={dataType} onChange={(event) => setDataType(event.target.value)} className="h-8 w-full appearance-none rounded-[3px] border border-[#d9d9d9] bg-white pl-2.5 pr-8 text-sm text-[#555] shadow-sm">{DATA_TYPES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8c8c8c]" /></div></Field>
            </div>
            <div className="relative -left-[3px] mt-7 flex justify-end gap-2"><Button className="h-9 w-[90px] rounded-[3px] bg-[#43b14b] px-3.5 text-sm shadow-sm hover:bg-[#43b14b]/90">Excel<Grid3x3 className="size-4" /></Button><Button className="h-9 w-[65px] rounded-[3px] bg-[#1890ff] px-3.5 text-sm shadow-sm hover:bg-[#1890ff]/90">ค้นหา</Button></div>
          </CardContent>
        </Card>
        <Card className="min-w-[1165px]"><CardContent className="px-2 pb-2 pt-0"><EmptyState /></CardContent></Card>
      </div>
    </div>
  );
}
