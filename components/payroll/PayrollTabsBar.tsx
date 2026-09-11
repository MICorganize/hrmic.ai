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

const FIRST_TAB_WIDTH = "w-[116.6125px]";

export function PayrollTabsBar({
  activeTab,
  onChange,
}: {
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex h-10 items-stretch bg-[#61a8ff] px-6 text-sm leading-[22px] tracking-[-0.1px] text-white">
      {PAYROLL_TABS.map((tab, i) => {
        const active = tab === activeTab;
        return (
          <div
            key={tab}
            className={cn(
              "h-10 shrink-0 overflow-hidden",
              i === 0 && FIRST_TAB_WIDTH,
              active && "bg-[rgba(0,80,180,0.75)]",
              i === 0 && "rounded-tl-[8px]",
              i === PAYROLL_TABS.length - 1 && "rounded-tr-[8px]"
            )}
          >
            <button
              type="button"
              onClick={() => onChange(tab)}
              className={cn(
                "ml-0.5 block h-10 w-full whitespace-nowrap bg-[rgba(0,80,180,0.25)] px-4 py-2 text-left text-[16px] font-medium leading-6 tracking-[-0.1px] text-white transition-colors",
                active && "font-medium tracking-[0.3px]"
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