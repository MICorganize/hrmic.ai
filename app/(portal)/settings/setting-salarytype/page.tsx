"use client";

import { X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { DropdownSelect } from "@/components/ui/dropdown-select";

type Calculation = "Auto" | "Constant" | "Expense" | "Fund" | "Income" | "Loan";
type SalaryType = {
  id: string;
  nameTH: string;
  nameEN: string;
  reference: string;
  calculation: Calculation;
  type: "รายรับ" | "รายจ่าย";
  calculateWith: string;
  taxType: "40(1)" | "40(1)(2)";
  active: boolean;
  rounded: boolean;
  editable: boolean;
  extraForm?: boolean;
  order?: string;
};

type SalaryTypeSeed = [
  nameTH: string,
  nameEN: string,
  reference: string,
  calculation: Calculation,
  type: SalaryType["type"],
  calculateWith: string,
  taxType: SalaryType["taxType"],
  active: boolean,
  rounded?: boolean,
  editable?: boolean,
  extraForm?: boolean,
  order?: string,
];

const SALARY_TYPE_SEEDS: SalaryTypeSeed[] = [
  ["ประกันสังคม", "SSO", "social_insurance", "Auto", "รายจ่าย", "-", "40(1)", true, true, true, true],
  ["ประกันสังคมบริษัทจ่ายให้", "SSO Company Provided", "sso_company_provided", "Auto", "รายรับ", "Tax", "40(1)", false, true, false, true],
  ["ภาษี", "Tax", "tax", "Auto", "รายจ่าย", "-", "40(1)", true, false, true],
  ["ภาษีบริษัทจ่ายให้", "Tax Company Provided", "tax_company_provided", "Auto", "รายรับ", "Tax", "40(1)", false],
  ["ภาษีลาออก", "Resignment Tax", "resign_tax", "Auto", "รายจ่าย", "-", "40(1)(2)", false],
  ["ภาษีเกษียณ", "Retirement Tax", "retirement_tax", "Auto", "รายจ่าย", "-", "40(1)(2)", false],
  ["สาย", "Late", "ST0025", "Auto", "รายจ่าย", "-", "40(1)", true, false, true, true, "1"],
  ["หัก ณ ที่จ่าย", "Withholding Tax", "nvat", "Auto", "รายจ่าย", "หัก ณ ที่จ่าย งวดพิเศษ", "40(1)", false, true],
  ["เงินค่าตกใจ", "Severance Extended", "severance_extended", "Auto", "รายรับ", "Tax", "40(1)(2)", false],
  ["เงินชดเชยลาออก", "Severance Pay", "severance_pay", "Auto", "รายรับ", "Tax", "40(1)(2)", false],
  ["เงินชดเชยเกษียณ", "Retirement Severance", "retirement_severance", "Auto", "รายรับ", "-", "40(1)(2)", false],
  ["เงินสดย่อย", "Petty Cash", "petty_cash", "Auto", "รายรับ", "-", "40(1)", false],
  ["ค่าครองชีพ", "Cost of Living", "ST0004", "Constant", "รายรับ", "-", "40(1)", false],
  ["ค่าตอบแทนจากยอดขาย", "Incentive Sale Out", "ST0028", "Constant", "รายรับ", "Tax", "40(1)", true, false, true],
  ["ค่าตำแหน่ง", "Position Value", "ST0001", "Constant", "รายรับ", "-", "40(1)", false],
  ["ค่าบำรุงรักษารถ", "Car Maintenance", "ST0034", "Constant", "รายรับ", "Tax", "40(1)", true, false, true],
  ["ค่าวิชาชีพ", "Professional Fee", "ST0006", "Constant", "รายรับ", "-", "40(1)", false],
  ["ค่าเดินทาง/ ค่าน้ำมัน", "Travel/ Transportation", "ST0029", "Constant", "รายรับ", "Tax", "40(1)", true, false, true],
  ["ค่าเบี้ยเลี้ยง", "Allowance", "ST0030", "Constant", "รายรับ", "Tax", "40(1)", true, false, true],
  ["ค่าโทรศัพท์", "Communication (Tel)", "ST0031", "Constant", "รายรับ", "-", "40(1)", true, false, true],
  ["ปรับเงินรับอื่นๆ", "Adjust Revenue", "ST0032", "Constant", "รายรับ", "Tax", "40(1)", true, false, true],
  ["เงินรับอื่นๆ", "Other Revenue", "ST0033", "Constant", "รายรับ", "Tax", "40(1)", true, false, true],
  ["โบนัส", "Bonus", "ST0012", "Constant", "รายรับ", "Tax", "40(1)", true, false, true],
  ["กองทุนกู้ยืม กยศ.", "Loan Fund", "ST0005", "Expense", "รายจ่าย", "-", "40(1)", true, false, true],
  ["ค่าชุดพนักงาน", "Uniform Fee", "ST0015", "Expense", "รายจ่าย", "-", "40(1)", false],
  ["ค่าปรับ", "Fine", "ST0008", "Expense", "รายจ่าย", "-", "40(1)", false],
  ["ปรับเงินหักอื่นๆ", "Adjust Deduct", "ST0026", "Expense", "รายจ่าย", "-", "40(1)", true, false, true],
  ["เงินสะสม", "Savings", "ST0027", "Expense", "รายจ่าย", "-", "40(1)", false],
  ["เงินหักกรมบังคับคดี", "Legal Execution Department", "ST0007", "Expense", "รายจ่าย", "-", "40(1)", true, false, true],
  ["เงินหักอื่นๆ", "Other Expense", "ST0016", "Expense", "รายจ่าย", "-", "40(1)", false],
  ["กองทุนสงเคราะห์ลูกจ้าง", "Employee Welfare Fund", "employee_welfare_fund", "Fund", "รายจ่าย", "-", "40(1)", true, false, true, true],
  ["กองทุนสำรองเลี้ยงชีพ", "Provident Fund", "provident", "Fund", "รายจ่าย", "-", "40(1)", false, false, false, true],
  ["กองทุนสำรองเลี้ยงชีพ 3", "Provident Fund 3", "provident3", "Fund", "รายจ่าย", "-", "40(1)", false, false, false, true],
  ["Incentive", "Incentive", "ST0014", "Income", "รายรับ", "-", "40(1)", false],
  ["คอมมิชชั่น", "Commission", "ST0017", "Income", "รายรับ", "-", "40(1)", false],
  ["ค่าเดินทาง", "Travel Expenses", "ST0009", "Income", "รายรับ", "-", "40(1)", false],
  ["ค่าโทรศัพท์", "Phone Bill", "ST0010", "Income", "รายรับ", "-", "40(1)", false],
  ["เงินได้อื่นๆ", "Other Income", "ST0013", "Income", "รายรับ", "-", "40(1)", false],
  ["เบี้ยขยัน", "Diligent Allowance", "ST0011", "Income", "รายรับ", "-", "40(1)", false],
  ["ชำระค่าเสียหาย", "Damages", "ST0003", "Loan", "รายจ่าย", "-", "40(1)", false],
  ["ยืมเงินชำระเป็นงวด", "Borrowing", "ST0002", "Loan", "รายจ่าย", "-", "40(1)", false],
  ["เงินประกันการทำงาน", "Work Insurance", "work_insurance", "Loan", "รายจ่าย", "-", "40(1)", true, false, true],
];

const INITIAL_SALARY_TYPES: SalaryType[] = SALARY_TYPE_SEEDS.map((seed, index) => ({
  id: `${seed[2]}-${index}`,
  nameTH: seed[0],
  nameEN: seed[1],
  reference: seed[2],
  calculation: seed[3],
  type: seed[4],
  calculateWith: seed[5],
  taxType: seed[6],
  active: seed[7],
  rounded: seed[8] ?? false,
  editable: seed[9] ?? false,
  extraForm: seed[10],
  order: seed[11],
}));

function SettingsHeaderIcon() {
  return (
    <span aria-hidden className="flex size-[41px] shrink-0 items-center justify-center rounded-full bg-[#bbdefb]">
      <span className="flex h-[26px] w-6 items-center justify-center rounded-full bg-[#90caf9]">
        <svg className="h-[18px] w-[18px]" viewBox="0 0 16 15" fill="none">
          <path d="M8.00001 4.5C8.79566 4.5 9.55872 4.81607 10.1213 5.37868C10.6839 5.94129 11 6.70435 11 7.5C11 8.29565 10.6839 9.05871 10.1213 9.62132C9.55872 10.1839 8.79566 10.5 8.00001 10.5C7.20436 10.5 6.4413 10.1839 5.87869 9.62132C5.31608 9.05871 5.00001 8.29565 5.00001 7.5C5.00001 6.70435 5.31608 5.94129 5.87869 5.37868C6.4413 4.81607 7.20436 4.5 8.00001 4.5ZM8.00001 6C7.60219 6 7.22066 6.15804 6.93935 6.43934C6.65805 6.72064 6.50001 7.10218 6.50001 7.5C6.50001 7.89782 6.65805 8.27936 6.93935 8.56066C7.22066 8.84196 7.60219 9 8.00001 9C8.39784 9 8.77937 8.84196 9.06067 8.56066C9.34198 8.27936 9.50001 7.89782 9.50001 7.5C9.50001 7.10218 9.34198 6.72064 9.06067 6.43934C8.77937 6.15804 8.39784 6 8.00001 6ZM6.50001 15C6.31251 15 6.15501 14.865 6.12501 14.685L5.84751 12.6975C5.37501 12.51 4.97001 12.255 4.58001 11.955L2.71251 12.7125C2.54751 12.7725 2.34501 12.7125 2.25501 12.5475L0.755011 9.9525C0.709108 9.87522 0.692925 9.78387 0.709489 9.69553C0.726054 9.60718 0.774231 9.5279 0.845011 9.4725L2.42751 8.2275L2.37501 7.5L2.42751 6.75L0.845011 5.5275C0.774231 5.4721 0.726054 5.39282 0.709489 5.30447C0.692925 5.21613 0.709108 5.12478 0.755011 5.0475L2.25501 2.4525C2.34501 2.2875 2.54751 2.22 2.71251 2.2875L4.58001 3.0375C4.97001 2.745 5.37501 2.49 5.84751 2.3025L6.12501 0.315C6.15501 0.135 6.31251 0 6.50001 0H9.50001C9.68751 0 9.84501 0.135 9.87501 0.315L10.1525 2.3025C10.625 2.49 11.03 2.745 11.42 3.0375L13.2875 2.2875C13.4525 2.22 13.655 2.2875 13.745 2.4525L15.245 5.0475C15.3425 5.2125 15.2975 5.415 15.155 5.5275L13.5725 6.75L13.625 7.5L13.5725 8.25L15.155 9.4725C15.2975 9.585 15.3425 9.7875 15.245 9.9525L13.745 12.5475C13.655 12.7125 13.4525 12.78 13.2875 12.7125L11.42 11.9625C11.03 12.255 10.625 12.51 10.1525 12.6975L9.87501 14.685C9.84501 14.865 9.68751 15 9.50001 15H6.50001ZM7.43751 1.5L7.16001 3.4575C6.26001 3.645 5.46501 4.125 4.88751 4.7925L3.08001 4.0125L2.51751 4.9875L4.10001 6.15C3.80001 7.025 3.80001 7.975 4.10001 8.85L2.51001 10.02L3.07251 10.995L4.89501 10.215C5.47251 10.875 6.26001 11.355 7.15251 11.535L7.43001 13.5H8.57001L8.84751 11.5425C9.74001 11.355 10.5275 10.875 11.105 10.215L12.9275 10.995L13.49 10.02L11.9 8.8575C12.2 7.98 12.2 7.0275 11.9 6.15L13.4825 4.9875L12.92 4.0125L11.1125 4.7925C10.5232 4.11024 9.72376 3.64326 8.84001 3.465L8.56251 1.5H7.43751Z" fill="#0C7EF1" />
        </svg>
      </span>
    </span>
  );
}

function AddIcon() {
  return <svg aria-hidden className="mr-2.5 size-6 shrink-0 fill-current" viewBox="0 0 25 25"><path d="M17.5 13.5H13.5V17.5H11.5V13.5H7.5V11.5H11.5V7.5H13.5V11.5H17.5M12.5 2.5C11.1868 2.5 9.88642 2.75866 8.67317 3.2612C7.45991 3.76375 6.35752 4.50035 5.42893 5.42893C3.55357 7.3043 2.5 9.84784 2.5 12.5C2.5 15.1522 3.55357 17.6957 5.42893 19.5711C6.35752 20.4997 7.45991 21.2362 8.67317 21.7388C9.88642 22.2413 11.1868 22.5 12.5 22.5C15.1522 22.5 17.6957 21.4464 19.5711 19.5711C21.4464 17.6957 22.5 15.1522 22.5 12.5C22.5 11.1868 22.2413 9.88642 21.7388 8.67317C21.2362 7.45991 20.4997 6.35752 19.5711 5.42893C18.6425 4.50035 17.5401 3.76375 16.3268 3.2612C15.1136 2.75866 13.8132 2.5 12.5 2.5Z" /></svg>;
}

function SearchIcon() {
  return (
    <svg aria-hidden className="size-6 min-w-6 overflow-visible fill-current text-[#747474]" viewBox="0 0 24 24">
      <path d="M9.5 3a6.5 6.5 0 1 0 0 13c1.61 0 3.09-.59 4.23-1.57L19.49 20 21 18.49l-5.57-5.57A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 0 0 9.5 3Zm0 2A4.5 4.5 0 1 1 5 9.5 4.5 4.5 0 0 1 9.5 5Z" />
    </svg>
  );
}

function EditIcon() {
  return <svg aria-hidden className="relative top-[1.05px] size-3 fill-current" viewBox="0 0 488.471 488.471"><path d="m483.999 111.318-106.847-106.846c-5.962-5.962-15.621-5.962-21.584 0l-351.066 351.067c-2.862 2.862-4.472 6.738-4.472 10.792l-.03 106.876c0 4.04 1.61 7.93 4.472 10.792s6.752 4.472 10.792 4.472l106.876-.03c4.054 0 7.93-1.61 10.792-4.472l351.067-351.067c5.962-5.962 5.962-15.621 0-21.584zm-368.203 346.622-85.298.03.03-85.298 251.868-251.868 85.268 85.268c-.001 0-251.868 251.868-251.868 251.868zm273.453-273.453-85.268-85.267 62.371-62.371 85.268 85.268z" /></svg>;
}

function ExtraFormIcon() {
  return <svg aria-hidden className="relative top-[1.05px] size-3.5" viewBox="0 0 24 24" fill="none"><path d="M14.486 3.143C14.7412 3.21479 14.9575 3.38501 15.0873 3.61623C15.217 3.84744 15.2497 4.12073 15.178 4.376L10.748 20.164C10.7125 20.2905 10.6525 20.4087 10.5714 20.512C10.4902 20.6152 10.3895 20.7015 10.275 20.7659C10.1605 20.8302 10.0345 20.8714 9.90407 20.887C9.77366 20.9027 9.64145 20.8925 9.51499 20.857C9.38853 20.8215 9.27028 20.7615 9.16702 20.6804C9.06375 20.5992 8.97748 20.4985 8.91313 20.384C8.84877 20.2695 8.80761 20.1435 8.79197 20.0131C8.77633 19.8827 8.78653 19.7505 8.82199 19.624L13.252 3.836C13.2874 3.70942 13.3475 3.59107 13.4287 3.48771C13.5099 3.38435 13.6107 3.29803 13.7253 3.23366C13.8399 3.1693 13.9661 3.12816 14.0966 3.1126C14.2271 3.09705 14.3595 3.10738 14.486 3.143ZM7.20699 7.05C7.39446 7.23753 7.49977 7.49184 7.49977 7.757C7.49977 8.02217 7.39446 8.27647 7.20699 8.464L3.67199 12L7.20699 15.535C7.2999 15.6278 7.37361 15.7381 7.42392 15.8594C7.47423 15.9807 7.50014 16.1108 7.50019 16.2421C7.50024 16.3735 7.47441 16.5036 7.42419 16.6249C7.37397 16.7463 7.30033 16.8566 7.20749 16.9495C7.11464 17.0424 7.00441 17.1161 6.88308 17.1664C6.76174 17.2167 6.63169 17.2427 6.50034 17.2427C6.36899 17.2428 6.23892 17.2169 6.11755 17.1667C5.99619 17.1165 5.8859 17.0428 5.79299 16.95L1.54999 12.707C1.36252 12.5195 1.2572 12.2652 1.2572 12C1.2572 11.7348 1.36252 11.4805 1.54999 11.293L5.79299 7.05C5.98052 6.86253 6.23482 6.75722 6.49999 6.75722C6.76515 6.75722 7.01946 6.86253 7.20699 7.05ZM16.793 8.464C16.6975 8.37175 16.6213 8.26141 16.5689 8.13941C16.5165 8.0174 16.4889 7.88618 16.4877 7.7534C16.4866 7.62062 16.5119 7.48894 16.5622 7.36605C16.6124 7.24315 16.6867 7.1315 16.7806 7.03761C16.8745 6.94371 16.9861 6.86946 17.109 6.81918C17.2319 6.7689 17.3636 6.7436 17.4964 6.74475C17.6292 6.74591 17.7604 6.77349 17.8824 6.8259C18.0044 6.87831 18.1147 6.95449 18.207 7.05L22.45 11.293C22.6375 11.4805 22.7428 11.7348 22.7428 12C22.7428 12.2652 22.6375 12.5195 22.45 12.707L18.207 16.95C18.0193 17.1375 17.7649 17.2428 17.4996 17.2427C17.2344 17.2426 16.98 17.1371 16.7925 16.9495C16.605 16.7619 16.4997 16.5074 16.4998 16.2421C16.4999 15.9769 16.6053 15.7225 16.793 15.535L20.328 12L16.793 8.464Z" fill="currentColor" /></svg>;
}

function SortIcon({ activeUp = false }: { activeUp?: boolean }) {
  return (
    <span aria-hidden className="ml-2 mt-[-2.8px] block h-[23.6px] w-3 shrink-0 text-[#bfbfbf]">
      <span className="inline-flex h-[20.4px] w-3 flex-col">
        <svg className={`size-3 shrink-0 fill-current ${activeUp ? "text-[#1890ff]" : "text-[rgba(0,0,0,0.54)]"}`} viewBox="0 0 1024 1024"><path d="M858.9 689 530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z" /></svg>
        <svg className="mt-[-3.6px] size-3 shrink-0 fill-current text-[rgba(0,0,0,0.54)]" viewBox="0 0 1024 1024"><path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z" /></svg>
      </span>
    </span>
  );
}

function InfoIcon() {
  return (
    <svg aria-label="ข้อมูลการคำนวณ" className="size-3.5 shrink-0 fill-current" viewBox="0 0 24 24">
      <path d="M11 17h2v-6h-2v6Zm1-14a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm-1-10h2V7h-2v2Z" />
    </svg>
  );
}

function FilterSelect({ label, value, onChange, options, className }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }>; className: string }) {
  return (
    <DropdownSelect
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={label}
      className={`h-10 shrink-0 ${className}`}
    >
        <option value="">{label}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </DropdownSelect>
  );
}

function StatusSwitch({ active, onChange, name }: { active: boolean; onChange: () => void; name: string }) {
  return (
    <button type="button" role="switch" aria-checked={active} aria-label={`สถานะการใช้งาน ${name}`} onClick={onChange} className={`relative top-[0.5125px] inline-block h-[22px] w-11 rounded-[100px] border-[0.8px] border-transparent align-middle leading-5 tracking-normal ${active ? "bg-[#1890ff]" : "bg-[rgba(0,0,0,0.25)]"}`}>
      <span className={`absolute top-px size-[18px] rounded-[18px] bg-white shadow-[0_2px_4px_rgba(0,35,11,0.2)] transition-[left,transform] ${active ? "left-full -ml-px -translate-x-full" : "left-px"}`} />
    </button>
  );
}

const HEADERS = ["สถานะการใช้งาน", "รายการ", "รหัสอ้างอิง", "รูปแบบ", "ประเภท", "นำไปคำนวณกับ", "งวดพิเศษ", "ลำดับการคำนวณ", "40(x)", "ตั้งค่าการปัดเศษ", ""];
const WIDTHS = [130, 200, 130, 100, 70, 190, 70, 135, 90, 135, 80];
const SORTABLE = new Set([0, 1, 2, 3, 7, 9]);
const optionize = (items: string[]) => items.map((item) => ({ label: item, value: item }));

function roundingStateClass(row: SalaryType, selected: boolean) {
  if (!row.editable) {
    return selected
      ? "border-[#d9d9d9] bg-[#e6e6e6] text-white"
      : "border-[#d9d9d9] bg-[#f5f5f5] text-[rgba(0,0,0,0.25)]";
  }

  return selected
    ? "border-[#1890ff] bg-[#1890ff] text-white"
    : "border-[#d9d9d9] bg-white text-[rgba(0,0,0,0.65)]";
}

export default function SalaryTypeSettingsPage() {
  const [rows, setRows] = useState(INITIAL_SALARY_TYPES);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [calculation, setCalculation] = useState("");
  const [type, setType] = useState("");
  const [calculateWith, setCalculateWith] = useState("");
  const [taxType, setTaxType] = useState("");
  const [extraForm, setExtraForm] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const headerTableRef = useRef<HTMLTableElement>(null);

  const visibleRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("th");
    return rows.filter((row) =>
      (!term || `${row.nameTH} ${row.nameEN} ${row.reference}`.toLocaleLowerCase("th").includes(term)) &&
      (!status || String(row.active) === status) &&
      (!calculation || row.calculation === calculation) &&
      (!type || row.type === type) &&
      (!calculateWith || row.calculateWith === calculateWith) &&
      (!taxType || row.taxType === taxType) &&
      (!extraForm || String(Boolean(row.extraForm)) === extraForm)
    ).sort((a, b) => Number(b.active) - Number(a.active));
  }, [rows, query, status, calculation, type, calculateWith, taxType, extraForm]);

  const updateRow = (id: string, patch: Partial<SalaryType>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));

  return (
    <div data-testid="salary-type-settings-page" className="relative flex h-[calc(100vh-4rem)] min-h-[480px] flex-col overflow-hidden bg-white p-4 font-sans text-[14px] font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.65)] sm:p-6 lg:p-8">
      <header className="mb-4 shrink-0">
        <div className="flex min-h-[45.6px] items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <SettingsHeaderIcon />
            <div className="group relative pr-[30px] text-[20px] font-medium leading-[31.43px] text-[#008cff]">
              <h1 className="font-inherit text-inherit">ตั้งค่าประเภทรายรับรายจ่าย</h1>
              <button type="button" aria-label="ข้อมูลเกี่ยวกับประเภทรายรับรายจ่าย" className="absolute right-0 top-1 hidden size-6 items-center justify-center rounded-full bg-[#f0f0f0] text-[16px] text-[#008cff] shadow-[0_2px_3px_rgba(0,0,0,0.5)] group-hover:flex group-focus-within:flex">?</button>
            </div>
          </div>
          <button data-testid="setting-salarytype-add-btn" type="button" onClick={() => setAddOpen(true)} className="flex shrink-0 items-center justify-center rounded-[4px] border-[0.8px] border-[#008cff] bg-white px-3 py-2.5 text-[14px] font-medium leading-[16.1px] tracking-normal text-[#008cff] transition-colors hover:bg-[#e6f7ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008cff]">
            <AddIcon /><span>เพิ่มประเภทรายรับรายจ่าย</span>
          </button>
        </div>
        <p className="mt-1 text-[14px] leading-[22.001px] text-black/45">ตั้งค่าการคำนวณเกี่ยวกับประเภทรายรับรายจ่าย ตามวิธีการคำนวณ</p>
      </header>

      <div className="mb-4 flex h-10 shrink-0 items-center justify-between overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <label className="block h-10 w-full max-w-[480px] flex-[0_1_auto] overflow-hidden rounded-[20px] border-[0.8px] border-[#d9d9d9] bg-white shadow-[0_2px_0_rgba(0,0,0,0.016)]">
          <span className="flex h-[38.4px] w-full items-center bg-white px-[18px] leading-[48px]">
            <SearchIcon />
            <input data-testid="setting-salarytype-search-input" value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full border-0 bg-white px-4 text-[14px] leading-[16.1px] tracking-normal text-[rgba(0,0,0,0.65)] outline-none placeholder:text-[#757575]" placeholder="ค้นหารายการหรือรหัสอ้างอิง" aria-label="ค้นหารายการหรือรหัสอ้างอิง" />
          </span>
        </label>
        <div className="flex h-10 min-w-max items-center gap-2">
          <FilterSelect label="สถานะการใช้งาน" value={status} onChange={setStatus} options={[{ label: "ใช้งาน", value: "true" }, { label: "ไม่ใช้งาน", value: "false" }]} className="w-[154.4625px]" />
          <FilterSelect label="รูปแบบการคำนวณ" value={calculation} onChange={setCalculation} options={optionize(["Auto", "Constant", "Expense", "Fund", "Income", "Loan"])} className="w-[167.7625px]" />
          <FilterSelect label="ประเภท" value={type} onChange={setType} options={optionize(["รายรับ", "รายจ่าย"])} className="w-[103.7125px]" />
          <FilterSelect label="นำไปคำนวณกับ" value={calculateWith} onChange={setCalculateWith} options={optionize(["Tax", "-", "หัก ณ ที่จ่าย งวดพิเศษ"])} className="w-[150.0625px]" />
          <FilterSelect label="40(x)" value={taxType} onChange={setTaxType} options={optionize(["40(1)", "40(1)(2)"])} className="w-[95.3625px]" />
          <FilterSelect label="Extra Form" value={extraForm} onChange={setExtraForm} options={[{ label: "มี", value: "true" }, { label: "ไม่มี", value: "false" }]} className="w-[130.3px]" />
        </div>
      </div>

      <div className="shrink-0 overflow-hidden">
        <table ref={headerTableRef} className="min-w-[1330px] table-fixed border-separate border-spacing-0 text-[14px] leading-[22.001px]" style={{ width: "calc(100% - 8px)" }}>
          <colgroup>{WIDTHS.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
          <thead className="bg-white text-black">
            <tr className="h-[77.6px]">
              {HEADERS.map((header, index) => (
                <th key={`${header}-${index}`} className="relative border-b-[1.6px] border-[#e8e8e8] bg-white p-0 text-center font-normal">
                  {SORTABLE.has(index) ? (
                    <span className={`inline-flex items-center p-4 ${index === 0 || index === 7 || index === 9 ? "w-full" : ""}`}>
                      <span className={`${index === 0 || index === 7 || index === 9 ? "min-w-0 flex-1" : ""} whitespace-normal`}>{header}</span>
                      <SortIcon activeUp={index === 0} />
                    </span>
                  ) : (
                    <span className="flex h-[22px] items-center justify-center whitespace-nowrap">
                      <span className={index === 5 ? "mr-1.5" : undefined}>{header}</span>{index === 5 && <InfoIcon />}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      <div className="-mb-4 min-h-0 flex-1 overflow-auto sm:-mb-6 lg:-mb-8 [&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#bdbdbd]" onScroll={(event) => {
        if (headerTableRef.current) headerTableRef.current.style.transform = `translateX(${-event.currentTarget.scrollLeft}px)`;
      }}>
        <table className="w-full min-w-[1330px] table-fixed border-separate border-spacing-0 text-[14px] leading-[22.001px]">
          <colgroup>{WIDTHS.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className={`h-[60px] hover:bg-[#fafafa] ${!row.active ? "[&>td:not(:first-child)]:opacity-50" : ""}`}>
                <td className="relative p-2 text-center align-middle"><StatusSwitch active={row.active} name={row.nameTH} onChange={() => updateRow(row.id, { active: !row.active })} /></td>
                <td className="relative p-2 align-middle"><div className="flex flex-col"><span className="block text-[#008cff]">{row.nameTH}</span><span className="block text-[rgba(0,0,0,0.65)]">{row.nameEN}</span></div></td>
                <td className="relative break-all p-2 text-center align-middle">{row.reference}</td>
                <td className="relative p-2 text-center align-middle">{row.calculation}</td>
                <td className="relative p-2 text-center align-middle">{row.type}</td>
                <td className="relative p-2 text-left align-middle">{row.calculateWith === "Tax" ? <div className="flex w-full"><span className="flex h-[22.85px] w-fit items-center justify-center rounded-[5px] bg-[#ffa07a] px-[7px] py-0.5 text-[12px] leading-[18.858px] text-[rgba(0,0,0,0.65)]">Tax</span></div> : row.calculateWith === "หัก ณ ที่จ่าย งวดพิเศษ" ? <div className="flex w-full"><span className="flex h-[22.85px] w-fit items-center justify-center rounded-[5px] bg-[#ffb4b4] px-[7px] py-0.5 text-[12px] leading-[18.858px] text-[rgba(0,0,0,0.65)]">{row.calculateWith}</span></div> : <div className="flex h-[22px] w-full items-center justify-center"><span>{row.calculateWith}</span></div>}</td>
                <td className="relative p-2 text-center align-middle" />
                <td className="relative p-2 text-center align-middle"><div className="flex w-full items-center justify-center">{row.order}</div></td>
                <td className="relative p-2 text-center align-middle"><div className="ml-3 flex h-[22px] items-center justify-start"><span className="mr-0.5">{row.taxType}</span><span className="size-[18px] shrink-0" /></div></td>
                <td className="relative p-2 text-center align-middle">
                  <div className="h-8 w-full">
                  <div className="inline-flex h-8 overflow-hidden rounded-[2px]">
                    <button type="button" disabled={!row.editable} onClick={() => updateRow(row.id, { rounded: false })} className={`rounded-l-[2px] border-[0.8px] px-[15px] leading-[30px] ${roundingStateClass(row, !row.rounded)}`}>ไม่ปัด</button>
                    <button type="button" disabled={!row.editable} onClick={() => updateRow(row.id, { rounded: true })} className={`rounded-r-[2px] border-[0.8px] border-l-0 px-[15px] leading-[30px] ${roundingStateClass(row, row.rounded)}`}>ปัด</button>
                  </div>
                  </div>
                </td>
                <td className="p-2 text-center align-middle"><div className="flex flex-col items-center"><button type="button" disabled={!row.editable} aria-label={`แก้ไข ${row.nameTH}`} className="ml-0.5 mr-1 my-0.5 flex size-8 items-center justify-center rounded-full bg-[#a1ded7] text-white disabled:bg-[#e0e0e0]"><EditIcon /></button>{row.extraForm && <button type="button" disabled={!row.editable} aria-label={`ตั้งค่า Extra Form ${row.nameTH}`} className="m-0.5 flex size-8 items-center justify-center rounded-full bg-[#ffa726] text-white disabled:bg-[#e0e0e0]"><ExtraFormIcon /></button>}</div></td>
              </tr>
            ))}
            {visibleRows.length === 0 && <tr><td colSpan={11} className="h-32 text-center text-black/45">ไม่พบข้อมูล</td></tr>}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={() => setAddOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-salary-type-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-[8px] bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4"><h2 id="add-salary-type-title" className="text-lg font-medium text-black/85">เพิ่มประเภทรายรับรายจ่าย</h2><button type="button" onClick={() => setAddOpen(false)} aria-label="ปิด" className="rounded-full p-1 text-black/45 hover:bg-black/5"><X className="size-5" /></button></header>
            <form className="space-y-4 p-6" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const nameTH = String(form.get("nameTH") ?? "").trim();
              const nameEN = String(form.get("nameEN") ?? "").trim();
              const reference = String(form.get("reference") ?? "").trim();
              if (!nameTH || !reference) return;
              setRows((current) => [...current, { id: `${reference}-${Date.now()}`, nameTH, nameEN, reference, calculation: "Income", type: "รายรับ", calculateWith: "-", taxType: "40(1)", active: true, rounded: false, editable: true }]);
              setAddOpen(false);
            }}>
              {[{ name: "nameTH", label: "รายการ", required: true }, { name: "nameEN", label: "รายการ (ENG)", required: false }, { name: "reference", label: "รหัสอ้างอิง", required: true }].map((field) => <label key={field.name} className="block text-sm text-black/65">{field.label}{field.required && <span className="text-red-500"> *</span>}<input name={field.name} required={field.required} className="mt-1 h-10 w-full rounded-[4px] border border-[#d9d9d9] px-3 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" /></label>)}
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddOpen(false)} className="h-9 rounded-[4px] border border-[#d9d9d9] px-4">ยกเลิก</button><button type="submit" className="h-9 rounded-[4px] bg-[#1890ff] px-5 text-white">เพิ่ม</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
