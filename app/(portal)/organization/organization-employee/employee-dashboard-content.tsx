"use client";

import { type ComponentType } from "react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { EmployeeSummaryData } from "@/lib/employee/summary-client";

type EmployeeStats = EmployeeSummaryData;

type GenderIcon = ComponentType<{ className?: string }>;

function MaleGenderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 19 18" fill="none" className={className} aria-hidden="true">
      <path d="M15.1667 3.66675V7.66675H13.8333V5.95008L11.1833 8.58342C11.3944 8.89453 11.5556 9.22508 11.6667 9.57508C11.7778 9.92508 11.8333 10.289 11.8333 10.6667C11.8333 11.689 11.4778 12.5556 10.7667 13.2667C10.0556 13.9779 9.18889 14.3334 8.16667 14.3334C7.14444 14.3334 6.27778 13.9779 5.56667 13.2667C4.85556 12.5556 4.5 11.689 4.5 10.6667C4.5 9.64453 4.85556 8.77786 5.56667 8.06675C6.27778 7.35564 7.14444 7.00008 8.16667 7.00008C8.53333 7.00008 8.89444 7.05286 9.25 7.15841C9.60556 7.26397 9.93333 7.42786 10.2333 7.65008L12.8833 5.00008H11.1667V3.66675H15.1667ZM8.16667 8.33342C7.52222 8.33342 6.97222 8.56119 6.51667 9.01675C6.06111 9.4723 5.83333 10.0223 5.83333 10.6667C5.83333 11.3112 6.06111 11.8612 6.51667 12.3167C6.97222 12.7723 7.52222 13.0001 8.16667 13.0001C8.81111 13.0001 9.36111 12.7723 9.81667 12.3167C10.2722 11.8612 10.5 11.3112 10.5 10.6667C10.5 10.0223 10.2722 9.4723 9.81667 9.01675C9.36111 8.56119 8.81111 8.33342 8.16667 8.33342Z" fill="currentColor" fillOpacity="0.65" />
    </svg>
  );
}

function FemaleGenderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path d="M8.33203 14.6666V13.3333H6.9987V11.9999H8.33203V10.5999C7.45425 10.4444 6.73481 10.0249 6.1737 9.34158C5.61259 8.65825 5.33203 7.86659 5.33203 6.96659C5.33203 5.95547 5.69036 5.09714 6.40703 4.39159C7.1237 3.68603 7.98759 3.33325 8.9987 3.33325C10.0098 3.33325 10.8737 3.68603 11.5904 4.39159C12.307 5.09714 12.6654 5.95547 12.6654 6.96659C12.6654 7.86659 12.3848 8.65825 11.8237 9.34158C11.2626 10.0249 10.5431 10.4444 9.66536 10.5999V11.9999H10.9987V13.3333H9.66536V14.6666H8.33203ZM8.9987 9.33325C9.64314 9.33325 10.1931 9.10547 10.6487 8.64992C11.1043 8.19436 11.332 7.64436 11.332 6.99992C11.332 6.35547 11.1043 5.80547 10.6487 5.34992C10.1931 4.89436 9.64314 4.66659 8.9987 4.66659C8.35425 4.66659 7.80425 4.89436 7.3487 5.34992C6.89314 5.80547 6.66536 6.35547 6.66536 6.99992C6.66536 7.64436 6.89314 8.19436 7.3487 8.64992C7.80425 9.10547 8.35425 9.33325 8.9987 9.33325Z" fill="currentColor" fillOpacity="0.65" />
    </svg>
  );
}

function OtherGenderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 19 18" fill="none" className={className} aria-hidden="true">
      <path d="M13.8359 2.66675L10.5026 6.00008M13.8359 2.66675H11.1693M13.8359 2.66675V5.33341M8.5026 11.3334V15.3334M6.5026 13.3334H10.5026M5.83594 8.00008C5.83594 8.70733 6.11689 9.3856 6.61699 9.8857C7.11708 10.3858 7.79536 10.6667 8.5026 10.6667C9.20985 10.6667 9.88813 10.3858 10.3882 9.8857C10.8883 9.3856 11.1693 8.70733 11.1693 8.00008C11.1693 7.29284 10.8883 6.61456 10.3882 6.11446C9.88813 5.61437 9.20985 5.33341 8.5026 5.33341C7.79536 5.33341 7.11708 5.61437 6.61699 6.11446C6.11689 6.61456 5.83594 7.29284 5.83594 8.00008Z" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GENDERS: { label: string; key: keyof EmployeeStats["byGender"]; icon: GenderIcon; iconClass: string; countClass: string }[] = [
  { label: "ชาย", key: "male", icon: MaleGenderIcon, iconClass: "text-[#61a8ff]", countClass: "text-[#61a8ff]" },
  { label: "หญิง", key: "female", icon: FemaleGenderIcon, iconClass: "text-[#d87093]", countClass: "text-[#d87093]" },
  { label: "อื่นๆ", key: "other", icon: OtherGenderIcon, iconClass: "text-[#757575]", countClass: "text-[#757575]" },
];

const EMPLOYEE_TYPES: { label: string; key: string }[] = [
  { label: "พนักงานรายเดือน", key: "permanent" },
  { label: "พนักงานรายวัน", key: "dailyWage" },
  { label: "พนักงานพาร์ตไทม์", key: "partTime" },
  // เหมาจ่าย = contract + temporary (ไม่มีแยกในฟอร์ม)
  { label: "พนักงานเหมาจ่าย", key: "contract" },
];

/** Count for a type bucket; contract merges contract + temporary. */
function typeCount(stats: EmployeeStats, key: string): number {
  if (key === "contract") {
    return (stats.byEmploymentType.contract ?? 0) + (stats.byEmploymentType.temporary ?? 0);
  }
  return stats.byEmploymentType[key] ?? 0;
}

export function DashboardContent({
  stats,
  historyPage,
  onHistoryPageChange,
}: {
  stats: EmployeeStats;
  historyPage: number;
  onHistoryPageChange: (page: number) => void;
}) {
  const historyPageCount = Math.max(1, Math.ceil(stats.historyTotal / 10));
  const historyPageNumbers = (() => {
    if (historyPageCount <= 7) return Array.from({ length: historyPageCount }, (_, index) => index + 1);
    if (historyPage <= 3) return [1, 2, 3, 4, 5, historyPageCount];
    if (historyPage >= historyPageCount - 2) return [1, historyPageCount - 4, historyPageCount - 3, historyPageCount - 2, historyPageCount - 1, historyPageCount];
    return [1, historyPage - 1, historyPage, historyPage + 1, historyPageCount];
  })();
  return (
    <Card
      className="ml-4 overflow-hidden rounded-lg border-none bg-white text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)] xl:h-[1752.625px]"
      style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
    >
      {/* Card header with title and ? button */}
      <div className="flex h-[59.3625px] items-center border-b border-[rgba(0,0,0,0.12)] p-3 text-[22px] font-normal leading-[34.573px] tracking-[-0.1px]">
        <span>Dashboard</span>
        <button
          type="button"
          className="hidden"
          aria-label="ข้อมูลเพิ่มเติม"
        >
          ?
        </button>
      </div>

      {/* Card body */}
      <div className="border-none px-2 py-4">
        {/* Row 1: เพศ, ประเภทพนักงาน, พนักงานแต่ละสาขา */}
        <div className="flex flex-col px-6 py-6 xl:h-[336.825px] xl:flex-row xl:gap-12">
          {/* เพศ */}
          <div className="min-w-0 xl:h-[288.825px] xl:w-[378px] xl:shrink-0">
            <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">เพศ</p>
            <div
              className="my-2 h-[242.425px] rounded-[8px] border-none bg-white p-3 text-base font-bold leading-[25.144px] tracking-[-0.1px]"
              style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
            >
              <div className="flex h-[155.7125px] items-center justify-center text-center text-2xl leading-[37.716px]">
                {GENDERS.map((g) => (
                  <div key={g.key} className={cn("flex flex-1 flex-col items-center justify-center", g.iconClass)}>
                    <g.icon className="size-[118px] font-normal leading-6" />
                    <span className={cn("font-bold leading-[37.716px]", g.countClass)}>
                      {stats.byGender[g.key]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="my-3 h-px bg-[#f0f0f0]" />
              <div className="flex h-[37.7125px] items-center justify-center text-2xl font-bold leading-[37.716px]">
                รวม{"\u00A0\u00A0"}<span className="font-bold text-[#5ca6f4]">{stats.total}</span>{"\u00A0\u00A0"}คน
              </div>
            </div>
          </div>

          {/* ประเภทพนักงาน */}
          <div className="min-w-0 xl:h-[288.825px] xl:w-[209.825px] xl:shrink-0">
            <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">ประเภทพนักงาน</p>
            <div>
              {EMPLOYEE_TYPES.map((t) => (
                <div
                  key={t.key}
                  className="my-2 flex h-[49.1375px] items-center rounded-[8px] border-none bg-white p-3 text-base font-bold leading-[25.144px] tracking-[-0.1px]"
                  style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
                >
                  <div className="flex w-full justify-between gap-3">
                    <span>{t.label}</span>
                    <span className="shrink-0">
                      {typeCount(stats, t.key)}{"\u00A0\u00A0"}คน
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* พนักงานแต่ละสาขา */}
          <div className="min-w-0 xl:h-[288.825px] xl:w-[209.8375px] xl:shrink-0">
            <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">พนักงานแต่ละสาขา</p>
            <div
              className="my-2 min-h-[49.1375px] rounded-[8px] border-none bg-white p-3 text-base font-bold leading-[25.144px] tracking-[-0.1px]"
              style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
            >
              {stats.byBranch.length === 0 ? (
                <div className="py-4 text-center text-base text-muted-foreground">ไม่มีข้อมูล</div>
              ) : (
                <div>
                  {stats.byBranch.map((b) => (
                    <div key={b.name} className="flex w-full justify-between gap-3">
                      <span>{b.name}</span>
                      <span className="shrink-0">{b.count}{"\u00A0\u00A0"}คน</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: สัญชาติ (48% width) */}
        <div className="flex xl:h-[193.975px]">
          <div className="ml-6 min-w-0 xl:h-[193.975px] xl:w-[451.9875px] xl:shrink-0">
            <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">สัญชาติ</p>
            <div
              className="my-2 h-[149.7px] rounded-[8px] border-none bg-white p-3 text-center text-base font-bold leading-[25.144px] tracking-[-0.1px]"
              style={{ boxShadow: "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)" }}
            >
              <div className="flex h-[125.7px] items-center justify-center gap-0 text-center text-xl leading-[31.43px]">
              <div className="w-[150px]">
                <span>ไทย</span>
                <div className="text-base">
                  <span className="font-bold text-[#5ca6f4]">{stats.byNationality.find(n => n.nationality === "ไทย")?.count ?? 0}</span>{"\u00A0\u00A0"}คน
                </div>
              </div>
              <div className="w-[160px]">
                <span>ต่างชาติ</span>
                <div className="text-base">
                  <span className="font-bold text-[#5ca6f4]">{stats.byNationality.find(n => n.nationality === "ต่างชาติ")?.count ?? 0}</span>{"\u00A0\u00A0"}คน
                </div>
              </div>
              <div className="flex-1">
                <span className="text-base leading-5">ไม่ระบุสัญชาติ / บุคคลพื้นที่สูง</span>
                <div className="text-base">
                  <span className="font-bold text-[#5ca6f4]">{stats.byNationality.find(n => n.nationality !== "ไทย" && n.nationality !== "ต่างชาติ")?.count ?? 0}</span>{"\u00A0\u00A0"}คน
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Row 3: เอกสารหมดอายุ */}
        <div className="flex xl:h-[294.675px]">
          <div className="m-6 min-w-0 xl:h-[246.675px] xl:w-[976px] xl:shrink-0">
          <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">เอกสารหมดอายุ</p>
          <div className="w-full overflow-x-auto xl:w-[976px]">
            <div className="overflow-hidden rounded-[8px] border border-[#f0f0f0]">
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                  <TableHead className="w-20 bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">ลำดับ</TableHead>
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">ประเภทเอกสาร</TableHead>
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">ชื่อเอกสาร</TableHead>
                  <TableHead className="w-[150px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">วันหมดอายุ</TableHead>
                  <TableHead className="w-[150px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">หมดอายุภายใน</TableHead>
                  <TableHead className="w-20 bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-[150.8px] hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <div className="flex h-[150.8px] flex-col items-center justify-center gap-2 text-muted-foreground">
                      <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <g transform="translate(0 1)" fill="none" fillRule="evenodd">
                          <ellipse cx="32" cy="33" rx="32" ry="7" fill="#f5f5f5" />
                          <g fillRule="nonzero" stroke="#d9d9d9">
                            <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
                            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" />
                          </g>
                        </g>
                      </svg>
                      <span className="text-sm">ไม่มีข้อมูล</span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
          </div>
          </div>
        </div>

        {/* Row 4: ประวัติการแก้ไขข้อมูลพนักงาน */}
        <div className="flex">
          <div className="m-6 min-w-0 xl:w-[916px] xl:shrink-0">
          <p className="text-lg font-bold leading-[28.275px] tracking-[-0.1px]">ประวัติการแก้ไขข้อมูลพนักงาน</p>
          <div className="w-full overflow-x-auto xl:w-[916px]">
            <div className="overflow-hidden rounded-[8px] border border-[#f0f0f0]">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="h-[54.8px] bg-[#61a8ff] hover:bg-[#61a8ff]">
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">แก้ไขของ</TableHead>
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">แก้ไขโดย</TableHead>
                  <TableHead className="w-[150px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">วันที่แก้ไข</TableHead>
                  <TableHead className="w-[250px] bg-transparent p-4 text-center text-sm font-medium tracking-[-0.1px] text-white">หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.history.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4}>
                      <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
                        <span className="text-sm">ไม่มีข้อมูล</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.history.map((row, i) => (
                    <TableRow key={row.id} className={cn("h-[60.8px]", i % 2 === 0 ? "bg-[#f2fafe]" : "bg-white")}>
                      <TableCell className="p-2 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]">{row.subject}</TableCell>
                      <TableCell className="p-2 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]">{row.by}</TableCell>
                      <TableCell className="whitespace-nowrap p-2 text-center text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]">{row.date}</TableCell>
                      <TableCell className="p-2 text-sm font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)]"><p className="m-0 p-0">{row.note}</p></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
          {stats.historyTotal > 10 && (
            <nav className="mt-4 flex items-center justify-end gap-2 text-sm leading-[22.001px]" aria-label="แบ่งหน้าประวัติการแก้ไขข้อมูลพนักงาน">
              <button type="button" onClick={() => onHistoryPageChange(historyPage - 1)} disabled={historyPage === 1} aria-label="หน้าก่อนหน้า" className="flex size-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-black/[0.54] disabled:cursor-not-allowed disabled:text-black/25">
                <svg aria-hidden="true" viewBox="64 64 896 896" className="size-3 fill-current"><path d="M724 218.3V141c0-6.7-7.7-10.4-12.9-6.3L260.3 486.8a31.86 31.86 0 000 50.3l450.8 352.1c5.2 4.1 12.9.4 12.9-6.3v-77.3c0-4.9-2.3-9.6-6.2-12.6L361.2 512l356.6-280.8c3.9-3.1 6.2-7.7 6.2-12.9z" /></svg>
              </button>
              {historyPageNumbers.map((page, index) => (
                <span key={page} className="contents">
                  {index > 0 && page - historyPageNumbers[index - 1] > 1 && <span className="flex size-8 items-center justify-center text-black/45">•••</span>}
                  <button type="button" onClick={() => onHistoryPageChange(page)} aria-current={page === historyPage ? "page" : undefined} className={cn("flex size-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-sm font-normal leading-[30px] text-black/65", page === historyPage ? "border-[#1890ff] font-medium text-[#039be5]" : "hover:border-[#1890ff] hover:text-[#1890ff]")}>{page}</button>
                </span>
              ))}
              <button type="button" onClick={() => onHistoryPageChange(historyPage + 1)} disabled={historyPage === historyPageCount} aria-label="หน้าถัดไป" className="flex size-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-black/[0.54] disabled:cursor-not-allowed disabled:text-black/25">
                <svg aria-hidden="true" viewBox="64 64 896 896" className="size-3 fill-current"><path d="M765.7 486.8 314.9 134.7c-5.2-4.1-12.9-.4-12.9 6.3v77.3c0 4.9 2.3 9.6 6.2 12.6L664.8 512 308.2 793.2c-3.9 3.1-6.2 7.7-6.2 12.6v77.3c0 6.7 7.7 10.4 12.9 6.3l450.8-352.1a31.86 31.86 0 000-50.3z" /></svg>
              </button>
            </nav>
          )}
          </div>
        </div>
      </div>
    </Card>
  );
}

