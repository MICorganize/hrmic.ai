"use client";

import { cn } from "@/lib/utils";

/** Tab labels shared by the lightweight shell and the full payroll client. */
export const PAYROLL_TABS = [
  "Dashboard",
  "คำนวณเงินเดือนรายบุคคล",
  "คำนวณเงินเดือนทั้งองค์กร",
  "ปิดงวดบัญชี",
  "สรุปตั้งค่าทั้งองค์กร",
];

export function PayrollTabsBar({
  activeTab,
  onChange,
}: {
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex min-h-11 items-stretch overflow-x-auto border-t border-[#edf0f4] bg-white px-4 text-sm leading-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PAYROLL_TABS.map((tab) => {
        const active = tab === activeTab;
        return (
          <div
            key={tab}
            className="mr-7 shrink-0 last:mr-0"
          >
            <button
              type="button"
              onClick={() => onChange(tab)}
              className={cn(
                "relative block h-11 w-full whitespace-nowrap py-3 text-left text-sm font-semibold leading-[22px] transition-colors",
                active ? "text-[#1474ee] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#1474ee]" : "text-[#6f7b90] hover:text-[#34425c]"
              )}
            >
              {tab}
            </button>
          </div>
        );
      })}
    </div>
  );
}
