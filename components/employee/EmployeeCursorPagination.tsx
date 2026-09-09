"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function EmployeeCursorPagination({
  page,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
}: {
  page: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <nav className="flex h-16 items-center justify-end gap-3 px-4" aria-label="แบ่งหน้ารายชื่อพนักงาน">
      <button type="button" disabled={!hasPreviousPage} onClick={onPrevious} className="inline-flex size-8 items-center justify-center rounded border border-[#d9d9d9] disabled:text-black/25" aria-label="หน้าก่อนหน้า"><ChevronLeft className="size-4" /></button>
      <span className="flex size-8 items-center justify-center rounded-[2px] border border-[#1890ff] bg-white text-sm text-[#1890ff]">{page}</span>
      <button type="button" disabled={!hasNextPage} onClick={onNext} className="inline-flex size-8 items-center justify-center rounded border border-[#d9d9d9] disabled:text-black/25" aria-label="หน้าถัดไป"><ChevronRight className="size-4" /></button>
    </nav>
  );
}
