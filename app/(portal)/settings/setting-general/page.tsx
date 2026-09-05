"use client";

import {
  BellRing,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Eye,
  FileText,
  Landmark,
  LayoutPanelTop,
  ShieldCheck,
  Split,
} from "lucide-react";
import { useState, type ComponentType } from "react";

import { cn } from "@/lib/utils";

type Option = { label: string; value: string };
type SectionIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

const PAGE_MENU: Array<{ label: string; icon: SectionIcon; active?: boolean }> = [
  { label: "คำนวณเงินเดือน", icon: CircleDollarSign, active: true },
  { label: "โควตา", icon: LayoutPanelTop },
  { label: "ตั้งค่ากะการทำงาน /วันหยุด", icon: CalendarDays },
  { label: "การลงเวลาการทำงาน", icon: Clock3 },
  { label: "การแจ้งเตือน", icon: BellRing },
  { label: "แบบฟอร์ม", icon: FileText },
  { label: "สิทธิการมองเห็น", icon: Eye },
  { label: "โครงสร้างองค์กร", icon: Landmark },
  { label: "อื่นๆ", icon: ShieldCheck },
];

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
  const [saved, setSaved] = useState(false);

  const selectClass = "h-8 w-full appearance-none rounded-[3px] border border-[#d9d9d9] bg-white px-3 pr-8 text-sm leading-8 text-black/[.65] outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgb(24_144_255_/_20%)]";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#e7eff8] font-[var(--font-kanit)] text-black/[.87]" data-testid="general-settings-page">
      <header className="h-40 bg-[#61a7f5] px-6 pt-11 text-white">
        <p className="m-0 text-sm leading-[22px] text-white/75">ตั้งค่า <span className="px-1">›</span> ตั้งค่าการคำนวณ</p>
        <h1 className="m-0 pt-0.5 text-[26px] font-normal leading-[40px]">ตั้งค่าทั่วไป</h1>
      </header>

      <div className="flex min-h-[calc(100vh-14rem)]">
        <nav aria-label="เมนูการตั้งค่าทั่วไป" className="w-[196px] shrink-0 bg-white px-2 pt-4 max-md:hidden">
          {PAGE_MENU.map(({ label, icon: Icon, active }) => (
            <button
              className={cn("mb-1 flex min-h-10 w-full items-center gap-3 rounded-[18px] px-3 text-left text-base leading-5 text-black/[.78] transition-colors hover:bg-[#f1f7fe]", active && "bg-[#e7eff8] font-medium text-[#1386f4]")}
              key={label}
              type="button"
            >
              <Icon className="size-6 shrink-0 text-[#61a7f5]" strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 px-4 py-4 sm:pl-[22px] sm:pr-6">
          <form className="mb-3 flow-root w-[calc(100%+26.3245px)] translate-x-[0.8875px] rounded-[8px] bg-white shadow-[0_2px_1px_-1px_rgb(0_0_0_/_20%),0_1px_1px_rgb(0_0_0_/_14%),0_1px_3px_rgb(0_0_0_/_12%)]" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
            <div className="my-2 px-6 py-[5px]">
              <h2 className="mb-[16.88px] mt-[16.08px] text-2xl font-normal leading-[37.716px] text-black/[.85]">คำนวณเงินเดือน</h2>

            <Row icon={CalendarDays} title="รอบการจ่ายเงินเดือน" description="วันที่ตัดรอบการจ่ายเงินเดือน" note={<><span>Ex. ตั้งแต่วันที่ 2 จนถึงวันที่ 1</span><br />วันที่ 2 มกราคม ถึง วันที่ 1 กุมภาพันธ์<br />วันที่ 2 กุมภาพันธ์ ถึง วันที่ 1 มีนาคม</>}>
              <div className="relative w-[80%] min-w-[250px]">
                <select aria-label="รอบการจ่ายเงินเดือน" className={selectClass} onChange={(event) => setPeriod(event.target.value)} value={period}>
                  <option value="eom">ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)</option>
                  <option value="15">ตั้งแต่วันที่ 16 จนถึงวันที่ 15</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-black/[.35]" />
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
              <div className="relative w-[300px]"><select aria-label="สกุลเงิน" className={selectClass} onChange={(event) => setCurrency(event.target.value)} value={currency}><option>THB | บาท</option><option>USD | ดอลลาร์สหรัฐ</option></select><ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-black/[.35]" /></div>
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
              <div className="relative w-[300px]"><select aria-label="การปัดเศษชั่วโมงพนักงานพาร์ตไทม์" className={selectClass} onChange={(event) => setPartTimeRounding(event.target.value)} value={partTimeRounding}><option value="none">ไม่ปัดเศษ</option><option value="up">ปัดเศษขึ้นเต็มชั่วโมง</option><option value="down">ปัดเศษลงเต็มชั่วโมง</option></select><ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-black/[.35]" /></div>
            </Row>

            <Row className="h-[93.5375px]" title="อัตราประกันสังคมของพนักงาน(%)" note="เปอร์เซ็นที่จะใช้ในการคำนวณประกันสังคมของพนักงาน">
              <input aria-label="อัตราประกันสังคมของพนักงาน" className="mt-1 h-8 w-[300px] rounded-[3px] border border-[#d9d9d9] px-3 text-sm outline-none focus:border-[#40a9ff]" inputMode="decimal" onChange={(event) => setEmployeeRate(event.target.value)} value={employeeRate} />
            </Row>

            <Row className="h-[85.5375px]" flushTitle title="อัตราประกันสังคมของนายจ้าง(%)" note="เปอร์เซ็นที่จะใช้ในการคำนวณประกันสังคมของนายจ้าง">
              <input aria-label="อัตราประกันสังคมของนายจ้าง" className="mt-1 h-8 w-[300px] rounded-[3px] border border-[#d9d9d9] px-3 text-sm outline-none focus:border-[#40a9ff]" inputMode="decimal" onChange={(event) => setEmployerRate(event.target.value)} value={employerRate} />
            </Row>

              <div className="pb-[8.8px] pt-5"><button className="h-8 rounded-[4px] bg-[#1890ff] px-5 text-sm text-white shadow-sm hover:bg-[#40a9ff]" type="submit">{saved ? "บันทึกแล้ว" : "บันทึก"}</button></div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
