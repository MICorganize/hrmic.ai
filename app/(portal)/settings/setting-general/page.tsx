"use client";

import {
  CalendarDays,
  CircleAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Split,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { PagePlaceholder } from "@/components/layouts/PagePlaceholder";
import { normalizePayrollCutoffDay } from "@/lib/payroll/period-default";

type Option = { label: string; value: string };
const SETTINGS_TABS = [
  "คำนวณเงินเดือน",
  "โควตา",
  "ตั้งค่ากะการทำงาน /วันหยุด",
  "การลงเวลาการทำงาน",
  "การแจ้งเตือน",
  "แบบฟอร์ม",
  "สิทธิการมองเห็น",
  "โครงสร้างองค์กร",
  "อื่นๆ",
] as const;

type SectionIcon = typeof CalendarDays;

const PAY_PERIOD_OPTIONS: Option[] = [
  { value: "eom", label: "ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)" },
  ...Array.from({ length: 15 }, (_, index) => {
    const startDate = index + 2;
    return { value: String(startDate), label: `ตั้งแต่วันที่ ${startDate} จนถึงวันที่ ${startDate - 1}` };
  }),
];

function PayPeriodDropdown({ value, onChange, selectClass }: {
  value: string;
  onChange: (value: string) => void;
  selectClass: string;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = PAY_PERIOD_OPTIONS.find((option) => option.value === value) ?? PAY_PERIOD_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(selectClass, "flex items-center justify-between text-left", open && "border-[#1890ff] shadow-[0_0_0_2px_rgb(24_144_255_/_20%)]")}
        onClick={() => setOpen((isOpen) => !isOpen)}
        type="button"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={cn("pointer-events-none ml-2 size-4 shrink-0 text-black/[.35] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div aria-label="รอบการจ่ายเงินเดือน" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[280px] overflow-y-auto rounded-[3px] border border-[#d9d9d9] bg-white p-1 shadow-[0_3px_6px_-4px_rgba(0,0,0,0.12),0_6px_16px_0_rgba(0,0,0,0.08)]" role="listbox">
          {PAY_PERIOD_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <button
                aria-selected={selected}
                className={cn(
                  "block w-full rounded-[2px] px-3 py-1.5 text-left text-sm leading-[22px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40a9ff]/40",
                  selected ? "bg-[#e6f7ff] font-medium text-[#1890ff]" : "bg-white text-black/[.65] hover:bg-[#f5f5f5]",
                )}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RadioGroup({ name, options, value, onChange, disabled = false }: {
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {options.map((option) => (
        <label key={option.value} className={cn("flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[14px] leading-[22px] text-black/[.72]", disabled && "cursor-not-allowed text-black/[.25]")}>
          <input
            checked={value === option.value}
            className="size-4 appearance-none rounded-full border border-[#d9d9d9] bg-white transition before:block before:size-2 before:translate-[3px] before:rounded-full before:bg-white checked:border-[#1890ff] checked:bg-[#1890ff] disabled:border-[#d9d9d9] disabled:bg-[#f5f5f5]"
            disabled={disabled}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={cn("-ml-px h-8 min-w-0 rounded-none border px-[15px] text-sm transition-colors first:ml-0 first:rounded-l-[4px] last:rounded-r-[4px]", active ? "border-[#1890ff] bg-[#e6f7ff] text-[#1890ff]" : "border-[#d9d9d9] bg-white text-black/[.65]")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Row({ children, note, title, description, icon: Icon, flushTitle = false, className }: {
  children: React.ReactNode;
  note: React.ReactNode;
  title: string;
  description?: string;
  icon?: SectionIcon;
  flushTitle?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("relative left-[0.8px] grid w-[calc(100%-1.6px)] grid-cols-[minmax(0,60.4fr)_minmax(0,39.6fr)] border-t border-[#eeeeee] max-md:grid-cols-1", className)}>
      <div className="min-w-0 px-6 pb-[12.9375px] pt-[11.2px]">
        <div className={cn("flex items-center gap-[5px]", !Icon && "ml-[25px]", !Icon && !description && !flushTitle && "mb-1 mt-1")}>
          {Icon && <Icon className="size-5 shrink-0 self-start text-[#0c7ef1]" strokeWidth={1.8} />}
          <label className="whitespace-nowrap tracking-[-0.1px] text-base font-medium leading-[25px] text-black/[.87]">{title}</label>
        </div>
        {description && <p className="mb-[7px] ml-[25px] mt-1 whitespace-nowrap tracking-[-0.1px] text-sm leading-[22px] text-[rgba(33,33,33,0.65)]">{description}</p>}
        <div className="ml-[25px] w-full">{children}</div>
      </div>
      <div className="px-0 py-4 tracking-[-0.1px] text-sm leading-[22px] text-[rgba(33,33,33,0.65)] max-md:px-6 max-md:pt-0">{note}</div>
    </section>
  );
}

export default function GeneralSettingsPage() {
  const [period, setPeriod] = useState("eom");
  const [paymentSplit, setPaymentSplit] = useState("1");
  const [workDays, setWorkDays] = useState("30");
  const [workHours, setWorkHours] = useState("8");
  const [joinLeaveDays, setJoinLeaveDays] = useState("actual");
  const [adjustmentDays, setAdjustmentDays] = useState("actual");
  const [otProtection, setOtProtection] = useState(true);
  const [currency, setCurrency] = useState("THB | บาท");
  const [rounding, setRounding] = useState(false);
  const [holidayPay, setHolidayPay] = useState(true);
  const [partTimeMode, setPartTimeMode] = useState("total");
  const [partTimeRounding, setPartTimeRounding] = useState("none");
  const [employeeRate, setEmployeeRate] = useState("5");
  const [employerRate, setEmployerRate] = useState("5");
  const [changeSettingsOpen, setChangeSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof SETTINGS_TABS)[number]>(SETTINGS_TABS[0]);
  const tabViewportRef = useRef<HTMLDivElement>(null);
  const [canScrollTabsBack, setCanScrollTabsBack] = useState(false);
  const [canScrollTabsForward, setCanScrollTabsForward] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGeneralSettings() {
      try {
        const response = await fetch("/api/settings/general", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load general settings");
        const data = (await response.json()) as { payrollCutoffDay?: unknown };
        const cutoffDay = normalizePayrollCutoffDay(data.payrollCutoffDay);
        if (cutoffDay !== null) setPeriod(cutoffDay === 1 ? "eom" : String(cutoffDay));
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") console.error("Unable to load general settings:", error);
      }
    }

    void loadGeneralSettings();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const viewport = tabViewportRef.current;
    if (!viewport) return;

    const updateScrollState = () => {
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      setCanScrollTabsBack(viewport.scrollLeft > 1);
      setCanScrollTabsForward(viewport.scrollLeft < maxScroll - 1);
    };

    updateScrollState();
    viewport.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      viewport.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  function scrollTabs(direction: "back" | "forward") {
    tabViewportRef.current?.scrollBy({ left: direction === "back" ? -260 : 260, behavior: "smooth" });
  }

  async function saveGeneralSettings() {
    if (savingSettings) return;
    setSavingSettings(true);
    try {
      const payrollCutoffDay = period === "eom" ? 1 : Number(period);
      const response = await fetch("/api/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollCutoffDay }),
      });
      if (!response.ok) throw new Error("Unable to save general settings");
      setChangeSettingsOpen(false);
    } catch (error) {
      console.error("Unable to save general settings:", error);
    } finally {
      setSavingSettings(false);
    }
  }

  const selectClass = "h-8 w-full appearance-none rounded-[3px] border border-[#d9d9d9] bg-white px-3 pr-8 text-sm leading-8 text-black/[.65] outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgb(24_144_255_/_20%)]";

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#e7eff8] font-[var(--font-kanit)] text-black/[.87]" data-testid="general-settings-page">
      <header className="mx-3 mt-3 h-[123px] overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)] sm:mx-4 sm:mt-4">
        <div className="flex h-full items-center px-4 py-3">
          <div className="min-w-0 self-start">
            <p className="flex items-center gap-0 text-sm font-normal leading-[22.001px] text-[#7b8798]"><span>ตั้งค่า</span><ChevronRight className="size-4" /><span>ตั้งค่าการคำนวณ</span></p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[#172348]">ตั้งค่าทั่วไป</h1>
          </div>
        </div>
      </header>

      <div className="mt-3 px-3 sm:px-4">
        <div className="flex h-12 overflow-hidden rounded-t-xl border border-[#e5eaf2] bg-white font-[Kanit,sans-serif] text-sm font-semibold leading-[22px] text-[#65728a] shadow-[0_3px_12px_rgba(29,52,93,0.06)]">
          <button
            type="button"
            onClick={() => scrollTabs("back")}
            disabled={!canScrollTabsBack}
            className="flex h-12 w-9 shrink-0 items-center justify-center border-r border-[#edf0f5] text-[#718096] transition-colors hover:bg-[#f6f8fc] hover:text-[#1474ee] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          <div ref={tabViewportRef} className="h-12 min-w-0 flex-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="เมนูการตั้งค่าทั่วไป">
            <div className="flex h-12 w-max">
              {SETTINGS_TABS.map((tab) => {
                const active = tab === activeTab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative flex h-12 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap px-5 text-sm font-semibold leading-[22px] text-[#65728a] transition-colors",
                      active ? "bg-[#f8fbff] !text-[#126fd5] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#1474ee]" : "hover:bg-[#f6f8fc] hover:text-[#26344f]",
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            disabled={!canScrollTabsForward}
            onClick={() => scrollTabs("forward")}
            className="flex h-12 w-9 shrink-0 items-center justify-center border-l border-[#edf0f5] text-[#718096] transition-colors hover:bg-[#f6f8fc] hover:text-[#1474ee] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="ถัดไป"
          >
            <ChevronRight className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-w-0 flex-1 pt-0 pb-4">
          {activeTab === "คำนวณเงินเดือน" ? (
            <form className="mb-3 flow-root w-full rounded-b-xl bg-white shadow-[0_2px_1px_-1px_rgb(0_0_0_/_20%),0_1px_1px_rgb(0_0_0_/_14%),0_1px_3px_rgb(0_0_0_/_12%)]" onSubmit={(event) => { event.preventDefault(); setChangeSettingsOpen(true); }}>
            <div className="my-2 px-6 py-[5px]">
              <h2 className="mb-[16.88px] mt-[16.08px] text-xl font-normal leading-[37.716px] text-black/[.85]">คำนวณเงินเดือน</h2>

            <Row icon={CalendarDays} title="รอบการจ่ายเงินเดือน" description="วันที่ตัดรอบการจ่ายเงินเดือน" note={<><span>Ex. ตั้งแต่วันที่ 2 จนถึงวันที่ 1</span><br />วันที่ 2 มกราคม ถึง วันที่ 1 กุมภาพันธ์<br />วันที่ 2 กุมภาพันธ์ ถึง วันที่ 1 มีนาคม</>}>
              <div className="relative w-[80%] min-w-[250px]">
                <PayPeriodDropdown onChange={setPeriod} selectClass={selectClass} value={period} />
              </div>
            </Row>

            <Row icon={Split} title="แบ่งงวดจ่าย" description="การแบ่งจ่ายเงินเดือนเป็นงวด" note="Ex. ระบุไว้ 2 งวด งวดที่ 1 ตั้งแต่วันที่ 1-15 / งวดที่ 2 ตั้งแต่วันที่ 16- สิ้นเดือน">
              <RadioGroup name="payment-split" onChange={setPaymentSplit} options={[{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} value={paymentSplit} />
            </Row>

            <Row title="วิธีการคำนวณแบ่งงวด" note={<>ต้องการเปลี่ยนวิธีคำนวณแบ่งงวดกรุณาติดต่อเจ้าหน้าที่<br />HumanSoft</>}>
              <RadioGroup disabled name="split-calculation" onChange={() => undefined} options={[{ value: "last", label: "งวดสุดท้าย = งวดเต็ม - ผลรวมของงวดแยกก่อนหน้า" }, { value: "sum", label: "งวดเต็ม = ผลรวมของงวดแยก" }]} value="last" />
            </Row>

            <Row icon={CalendarDays} title="จำนวนวันที่ทำงาน" description="นำไปหารค่าแรงต่อวัน" note="Ex. ค่าแรงต่อวัน = เงินเดือน / จำนวนวันทำงาน">
              <RadioGroup name="work-days" onChange={setWorkDays} options={[{ value: "26", label: "26 วัน" }, { value: "30", label: "30 วัน" }, { value: "actual", label: "ตามจริง" }]} value={workDays} />
            </Row>

            <Row icon={Clock3} title="จำนวนชั่วโมงการทำงาน" description="นำไปหารค่าแรงต่อชั่วโมง" note="Ex. ค่าแรงต่อชั่วโมง = ค่าแรงต่อวัน / จำนวนชั่วโมงการทำงาน">
              <RadioGroup name="work-hours" onChange={setWorkHours} options={[{ value: "8", label: "8 ชั่วโมง" }, { value: "8.5", label: "8 ชั่วโมง 30 นาที" }, { value: "9", label: "9 ชั่วโมง" }, { value: "actual", label: "ตามจริง" }]} value={workHours} />
            </Row>

            <Row title="จำนวนวันทำงาน กรณีพนักงาน เข้าใหม่/ลาออก ระหว่างเดือน" description="จะคำนวณออกมาเป็นค่าแรงต่อวันแล้วนำไปคูณกับจำนวนวันที่ทำงานที่มาจริง" note={<>กรณีพนักงาน เข้าใหม่/ลาออก จะไม่ได้ค่าแรงเต็มเดือน<br />Ex. ค่าแรงต่อวัน = เงินเดือน / จำนวนวันทำงาน</>}>
              <RadioGroup name="join-leave-days" onChange={setJoinLeaveDays} options={[{ value: "26", label: "26 วัน" }, { value: "30", label: "30 วัน" }, { value: "actual", label: "ตามจริง" }, { value: "deduct", label: "30 วัน หักวันที่ยังไม่เริ่มงาน/ลาออก" }]} value={joinLeaveDays} />
            </Row>

            <Row title="จำนวนวันทำงาน กรณีพนักงานปรับเงินเดือน" description="จะคำนวณออกมาเป็นค่าแรงต่อวัน แล้วนำไปคูณกับจำนวนวันทำงานก่อนปรับ และหลังปรับ" note={<>กรณีปรับเงินเดือน ระหว่างเดือน<br />Ex. ค่าแรงต่อวัน = เงินเดือน / จำนวนวันทำงาน</>}>
              <RadioGroup name="adjustment-days" onChange={setAdjustmentDays} options={[{ value: "26", label: "26 วัน" }, { value: "30", label: "30 วัน" }, { value: "remove-31", label: "30 วัน ลบวันที่ 31 ออก" }, { value: "actual", label: "ตามจริง" }]} value={adjustmentDays} />
            </Row>

            <Row title="ป้องกันพนักงานเลือกโอทีผิดประเภท" note="ป้องกันไม่ให้พนักงานเลือกโอทีผิดประเภท เพราะโอทีบางประเภทถูกกำหนดให้ใช้สำหรับวันทำงานหรือวันหยุดเท่านั้น">
              <div className="flex"><Toggle active={otProtection} label="ป้องกัน" onClick={() => setOtProtection(true)} /><Toggle active={!otProtection} label="ไม่ป้องกัน" onClick={() => setOtProtection(false)} /></div>
            </Row>

            <Row className="h-[114.9375px]" title="ตั้งค่าสกุลเงิน" description="เลือกสกุลเงินที่จะใช้ในการแสดงเงินเดือน" note="การตั้งค่านี้จะเปลี่ยนแค่การแสดงผลของสกุลเงินในรูปแบบข้อความเท่านั้น และจะไม่เกี่ยวข้องกับการคำนวณหรือแปลงค่าเงินจริงในระบบ ซึ่งจะมีผลกับการแสดงสกุลเงินทั้งข้อมูลในอดีตและปัจจุบัน รวมถึงเอกสารที่แสดงสกุลเงินด้วย">
              <div className="relative w-[300px]"><DropdownSelect aria-label="สกุลเงิน" className={selectClass} onChange={(event) => setCurrency(event.target.value)} value={currency}><option>THB | บาท</option><option>USD | ดอลลาร์สหรัฐ</option></DropdownSelect></div>
            </Row>

            <Row className="h-[119.8px]" title="ปัดเศษจำนวนเงิน" description="ปัดเศษทศนิยมของจำนวนเงินที่เกิดจากการคำนวณของโปรแกรม" note="Ex. พนักงานเงินเดือน 13,000 / 30 = 433.33บาทถ้าเลือกปัดเศษจะเท่ากับ 433บาท พนักงานเงินเดือน 14,000 / 30 = 466.67บาทถ้าเลือกปัดเศษจะเท่ากับ 467บาท">
              <div className="flex"><Toggle active={!rounding} label="ไม่ปัดเศษ" onClick={() => setRounding(false)} /><Toggle active={rounding} label="ปัดเศษ" onClick={() => setRounding(true)} /></div>
            </Row>

            <Row title="พนักงานรายวันได้รับค่าแรงในวันหยุดนักขัตฤกษ์" note="ถ้าเลือกได้รับค่าแรง ถึงแม้ว่าพนักงานจะไม่มาทำงานในวันหยุดระบบก็จะคิดค่าแรงในวันหยุดนักขัตฤกษ์">
              <div className="flex"><Toggle active={holidayPay} label="ได้รับค่าแรง" onClick={() => setHolidayPay(true)} /><Toggle active={!holidayPay} label="ไม่ได้รับค่าแรง" onClick={() => setHolidayPay(false)} /></div>
            </Row>

            <Row className="h-[178.8px]" flushTitle title="พนักงานพาร์ตไทม์ปัดเศษชั่วโมง" note={<>EX. พนักงานทำงาน 07:40:00 ชั่วโมง<br />ปัดเศษลงเต็มชั่วโมง ระบบจะคำนวณให้ 07:00:00 ชั่วโมง<br />ปัดเศษขึ้นเต็มชั่วโมง ระบบจะคำนวณให้ 08:00:00 ชั่วโมง<br />ปัดเศษขึ้น-ลงเต็มชั่วโมง ระบบจะคำนวณให้ 08:00:00 ชั่วโมง<br />ปัดเศษลงเต็มครึ่งชั่วโมง ระบบจะคำนวณให้ 07:30:00 ชั่วโมง<br />ปัดเศษขึ้นเต็มครึ่งชั่วโมง ระบบจะคำนวณให้ 08:00:00 ชั่วโมง<br />ปัดเศษขึ้น-ลงเต็มครึ่งชั่วโมง ระบบจะคำนวณให้ 08:00:00 ชั่วโมง</>}>
              <div className="flex"><Toggle active={partTimeMode === "total"} label="ปัดเศษชั่วโมงทำงานรวม" onClick={() => setPartTimeMode("total")} /><Toggle active={partTimeMode === "work-time"} label="ปัดเศษเวลาการทำงาน" onClick={() => setPartTimeMode("work-time")} /></div>
              <p className="mb-[7px] mt-1 text-sm leading-[22px] text-[rgba(33,33,33,0.65)]">หากคำนวณชั่วโมงแล้วไม่เต็มชั่วโมงระบบจะปัดเศษชั่วโมง</p>
              <div className="relative w-[300px]"><DropdownSelect aria-label="การปัดเศษชั่วโมงพนักงานพาร์ตไทม์" className={selectClass} onChange={(event) => setPartTimeRounding(event.target.value)} value={partTimeRounding}><option value="none">ไม่ปัดเศษ</option><option value="up">ปัดเศษขึ้นเต็มชั่วโมง</option><option value="down">ปัดเศษลงเต็มชั่วโมง</option></DropdownSelect></div>
            </Row>

            <Row className="h-[93.5375px]" title="อัตราประกันสังคมของพนักงาน(%)" note="เปอร์เซ็นที่จะใช้ในการคำนวณประกันสังคมของพนักงาน">
              <input aria-label="อัตราประกันสังคมของพนักงาน" className="mt-1 h-8 w-[300px] rounded-[3px] border border-[#d9d9d9] px-3 text-sm outline-none focus:border-[#40a9ff]" inputMode="decimal" onChange={(event) => setEmployeeRate(event.target.value)} value={employeeRate} />
            </Row>

            <Row className="h-[85.5375px]" flushTitle title="อัตราประกันสังคมของนายจ้าง(%)" note="เปอร์เซ็นที่จะใช้ในการคำนวณประกันสังคมของนายจ้าง">
              <input aria-label="อัตราประกันสังคมของนายจ้าง" className="mt-1 h-8 w-[300px] rounded-[3px] border border-[#d9d9d9] px-3 text-sm outline-none focus:border-[#40a9ff]" inputMode="decimal" onChange={(event) => setEmployerRate(event.target.value)} value={employerRate} />
            </Row>

              <div className="pb-[8.8px] pt-5"><button className="h-8 rounded-[4px] bg-[#1890ff] px-5 text-sm text-white shadow-sm hover:bg-[#40a9ff]" type="submit">บันทึก</button></div>
            </div>
          </form>
          ) : (
            activeTab === "โควตา" ? (
              <PagePlaceholder title="จัดการโควตาการลา" description="จัดการโควตาการลาของพนักงานตามสิทธิที่กำหนด" />
            ) : (
              <section className="overflow-hidden rounded-b-xl bg-white shadow-[0_2px_1px_-1px_rgb(0_0_0_/_20%),0_1px_1px_rgb(0_0_0_/_14%),0_1px_3px_rgb(0_0_0_/_12%)]">
                <div className="px-6 py-5">
                  <h2 className="m-0 text-2xl font-normal leading-[37.716px] text-black/[.85]">{activeTab}</h2>
                </div>
              </section>
            )
          )}
        </div>
      </div>
      {changeSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="presentation">
          <div aria-labelledby="change-settings-title" aria-modal="true" className="w-full max-w-[320px] rounded-[4px] bg-white px-8 pb-4 pt-6 text-center shadow-2xl" role="dialog">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#fff2df]">
              <div className="flex size-9 items-center justify-center rounded-full bg-[#ffd9a8] text-[#f59e0b]">
                <CircleAlert className="size-6" strokeWidth={2} />
              </div>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#303943]" id="change-settings-title">เปลี่ยนการตั้งค่า</h2>
            <p className="mt-2 text-sm font-medium text-[#4b5560]">ยืนยันการเปลี่ยนการตั้งค่า</p>
            <p className="mt-1 text-xs leading-5 text-[#7b8798]">หากมีการตั้งค่าที่ไม่เป็นไปตามเงื่อนไข ระบบจะไม่บันทึก การตั้งค่ารายการนั้น</p>
            <div className="mt-5 flex justify-center gap-2">
              <button className="h-9 min-w-[80px] rounded-[4px] bg-[#1890ff] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#40a9ff]" onClick={() => void saveGeneralSettings()} type="button">ยืนยัน</button>
              <button className="h-9 min-w-[80px] rounded-[4px] border border-[#d9d9d9] bg-white px-4 text-sm font-medium text-[#595959] shadow-sm hover:bg-[#f5f5f5]" onClick={() => setChangeSettingsOpen(false)} type="button">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { DropdownSelect } from "@/components/ui/dropdown-select";
