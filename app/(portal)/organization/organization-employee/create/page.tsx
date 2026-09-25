"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addDays, addMonths, addYears, differenceInCalendarDays, startOfDay } from "date-fns";
import { th } from "date-fns/locale/th";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Loader2,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatPhone } from "@/lib/phone";
import {
  BUDDHIST_YEAR_OFFSET,
  formatThaiDateNumeric,
  formatThaiMonthYear,
  parseIsoDate,
  THAI_MONTHS,
  THAI_MONTHS_SHORT,
  toIsoDate,
} from "@/lib/date/thai-date";
import { cn } from "@/lib/utils";
import { DropdownSelect } from "@/components/ui/dropdown-select";

const TABS = [
  "ข้อมูลพื้นฐาน",
  "ข้อมูลกำหนดเอง",
  "ตั้งค่า",
  "ประวัติส่วนตัว",
  "ประวัติการปรับเงินเดือน/ปรับประเภท",
  "รายรับ/รายจ่ายคงที่",
  "รายรับ/รายจ่ายอัตโนมัติ",
  "กองทุน",
  "เงินประกันการทำงาน",
  "สวัสดิการ",
  "ภาษี",
  "การฝึกอบรม",
  "สินทรัพย์ถือครอง",
  "โรงพยาบาลตามสิทธิ",
  "ประวัติการแก้ไข",
];

const TAB_WIDTHS: Record<string, string> = {
  "ข้อมูลพื้นฐาน": "160px",
  "ข้อมูลกำหนดเอง": "160px",
  "ตั้งค่า": "160px",
  "ประวัติส่วนตัว": "160px",
  "ประวัติการปรับเงินเดือน/ปรับประเภท": "255.475px",
  "รายรับ/รายจ่ายคงที่": "161.512px",
  "รายรับ/รายจ่ายอัตโนมัติ": "184.375px",
  "กองทุน": "160px",
  "เงินประกันการทำงาน": "165.85px",
  "สวัสดิการ": "160px",
  "ภาษี": "160px",
  "การฝึกอบรม": "160px",
  "สินทรัพย์ถือครอง": "160px",
  "โรงพยาบาลตามสิทธิ": "164.275px",
  "ประวัติการแก้ไข": "160px",
};

type OrganizationKind = "company" | "branch" | "department";

type OrganizationNode = {
  id: string;
  kind: OrganizationKind;
  name: string;
  code: string;
  children: OrganizationNode[];
};

type OrganizationResponse = {
  companies: OrganizationNode[];
  error?: string;
};

type PositionNode = {
  id: string;
  name: string;
  code: string;
  children: PositionNode[];
};

type PositionResponse = {
  positions: PositionNode[];
  error?: string;
};

type EmployeeTypeDefinition = {
  id: string;
  code: string;
  nameTH: string;
  nameEN: string;
  calculationGroup: "monthly" | "daily" | "partTime" | "contract";
  taxMethod: "tax" | "withholding" | "none";
  taxSection: string | null;
  enabled: boolean;
};

type EmployeeTypeResponse = {
  employeeTypes: EmployeeTypeDefinition[];
  error?: string;
};

function companyIdForOrganization(nodes: OrganizationNode[], selection: string, parentCompanyId?: string): string | undefined {
  for (const node of nodes) {
    const companyId = node.kind === "company" ? node.id : parentCompanyId;
    if (`${node.kind}:${node.id}` === selection) return companyId;
    const result = companyIdForOrganization(node.children, selection, companyId);
    if (result) return result;
  }
  return undefined;
}

function calculateAge(birthDate: Date | undefined): string | undefined {
  if (!birthDate || Number.isNaN(birthDate.getTime())) return undefined;

  const today = startOfDay(new Date());
  const birthday = startOfDay(birthDate);
  if (birthday > today) return undefined;

  let years = today.getFullYear() - birthday.getFullYear();
  let anniversary = addYears(birthday, years);
  if (anniversary > today) {
    years -= 1;
    anniversary = addYears(birthday, years);
  }

  let months =
    (today.getFullYear() - anniversary.getFullYear()) * 12 +
    today.getMonth() -
    anniversary.getMonth();
  let monthAnniversary = addMonths(anniversary, months);
  if (monthAnniversary > today) {
    months -= 1;
    monthAnniversary = addMonths(anniversary, months);
  }

  const days = differenceInCalendarDays(today, monthAnniversary);
  return `${years} ปี ${months} เดือน ${days} วัน`;
}

/* ------------------------------ Form fields ------------------------------- */

function FieldShell({
  label,
  required,
  children,
  className,
}: {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-1.5 py-[5px]", className)}>
      <label className="mb-1 block text-sm font-normal leading-5 text-[#4b5870]">
        {label}
        {required && <span className="text-[#ff0000]"> *</span>}
      </label>
      {children}
    </div>
  );
}

function HelpLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <CircleHelp className="size-3.5 text-muted-foreground" />
    </span>
  );
}

function TextInput({
  placeholder,
  disabled,
  className,
  name,
  value,
  defaultValue,
  onChange,
  type = "text",
  min,
  step,
  autoComplete,
  inputMode,
  maxLength,
}: {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: React.HTMLInputTypeAttribute;
  min?: number;
  step?: number;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      min={min}
      step={step}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
      placeholder={undefined}
      disabled={disabled}
      className={cn(
        "h-8 w-full rounded-lg border border-[#dfe4e8] bg-white px-3 text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors placeholder:text-[#9aa5b5] focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20",
        disabled && "cursor-not-allowed bg-[#f5f7fa] text-[#7b8798]",
        className
      )}
    />
  );
}

function SelectInput({
  options,
  placeholder,
  defaultValue,
  disabled,
  className,
  name,
}: {
  options: string[];
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}) {
  return (
    <DropdownSelect
      name={name}
      defaultValue={defaultValue}
      disabled={disabled}
      placeholder={placeholder}
      className={cn("h-8", className)}
    >
      {!defaultValue && <option value="">{placeholder ?? "เลือก"}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </DropdownSelect>
  );
}

function TitleSelectInput({
  options,
  defaultValue,
  disabled,
  className,
  name,
}: {
  options: string[];
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => {
    const index = options.indexOf(defaultValue ?? "");
    return index >= 0 ? index : 0;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => {
          const direction = event.key === "ArrowDown" ? 1 : -1;
          return (current + direction + options.length) % options.length;
        });
      }
      if (event.key === "Enter" && options[activeIndex]) {
        event.preventDefault();
        setValue(options[activeIndex]);
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, open, options]);

  const selectOption = (option: string, index: number) => {
    setValue(option);
    setActiveIndex(index);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setActiveIndex(Math.max(options.indexOf(value), 0));
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-sm font-normal leading-5 text-[#757575] shadow-none outline-none transition-colors",
          open
            ? "border-[#5eaafa] ring-2 ring-[#5eaafa]/20"
            : "border-[#dfe4e8]",
          disabled && "cursor-not-allowed bg-[#f5f7fa] text-[#9aa5b5]"
        )}
      >
        <span className="truncate">{value || "เลือก"}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[#8b8b8b] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="คำนำหน้าชื่อ"
          className="absolute left-0 right-0 top-[calc(100%+2px)] z-50 max-h-[260px] overflow-y-auto rounded-[2px] border border-[#e0e0e0] bg-white py-0.5 shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
        >
          {options.map((option, index) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option, index)}
                className={cn(
                  "flex min-h-8 w-full items-center px-3 py-1 text-left text-sm font-light leading-5 text-[#555] transition-colors",
                  selected
                    ? "bg-[#e2f4ff] font-bold hover:bg-[#e2f4ff]"
                    : "hover:bg-[#f2f2f2]"
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function employeeTypeLabel(type: EmployeeTypeDefinition) {
  if (type.taxMethod === "tax" && type.taxSection) {
    return `${type.nameTH} (${type.taxSection})`;
  }
  if (type.taxMethod === "withholding") {
    return `${type.nameTH} (หัก ณ ที่จ่าย)`;
  }
  return type.nameTH;
}

function EmployeeTypeSelectInput({
  types,
  value,
  loading,
  onChange,
}: {
  types: EmployeeTypeDefinition[];
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
}) {
  const availableTypes = types.filter((type) => type.enabled);

  return (
    <div className="relative">
      <DropdownSelect
        name="employeeTypeDefinitionId"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || availableTypes.length === 0}
        required
        className={cn(
          "h-8 w-full appearance-none rounded-lg border border-[#dfe4e8] bg-white px-3 pr-8 text-sm font-normal leading-5 shadow-none transition-colors focus:border-[#5eaafa] focus:outline-none focus:ring-2 focus:ring-[#5eaafa]/20",
          value ? "text-foreground" : "text-muted-foreground/60",
          "disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#9aa5b5]"
        )}
      >
        <option value="">
          {loading ? "กำลังโหลดประเภทพนักงาน..." : "เลือกประเภทพนักงาน"}
        </option>
        {availableTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {employeeTypeLabel(type)}
          </option>
        ))}
      </DropdownSelect>
    </div>
  );
}

function OrganizationSelectInput({
  companies,
  value,
  loading,
  onChange,
}: {
  companies: OrganizationNode[];
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(companies.map((company) => company.id)));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExpanded((current) => new Set([...current, ...companies.map((company) => company.id)]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [companies]);

  const findNode = (nodes: OrganizationNode[]): OrganizationNode | undefined => {
    for (const node of nodes) {
      if (`${node.kind}:${node.id}` === value) return node;
      const child = findNode(node.children);
      if (child) return child;
    }
  };
  const selectedNode = findNode(companies);

  const toggleNode = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: OrganizationNode, depth = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isCompany = node.kind === "company";
    const nodeValue = `${node.kind}:${node.id}`;
    const label = `${node.code}: ${node.name}`;

    return (
      <li key={`${node.kind}-${node.id}`} role="treeitem" aria-level={depth + 1} aria-expanded={hasChildren ? isExpanded : undefined}>
        <div className="flex min-h-8 items-center rounded-sm pr-1 hover:bg-[#e6f7ff]">
          <span aria-hidden className="h-6 shrink-0" style={{ width: `${depth * 18}px` }} />
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleNode(node.id)}
              className="flex size-6 shrink-0 items-center justify-center text-[#666] hover:text-[#1677ff]"
              aria-label={isExpanded ? `ยุบ ${label}` : `ขยาย ${label}`}
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}
          <button
            type="button"
            disabled={isCompany}
            onClick={() => {
              onChange(nodeValue);
              setOpen(false);
            }}
            className={cn(
              "min-w-0 flex-1 rounded-sm px-1.5 py-1 text-left text-sm font-light leading-5",
              isCompany
                ? "cursor-not-allowed text-[#999]"
                : "text-foreground hover:bg-[#bae7ff]",
              value === nodeValue && "bg-[#e6f7ff] font-bold text-[#1677ff]"
            )}
            title={label}
          >
            {label}
          </button>
        </div>
        {hasChildren && isExpanded && (
          <ul role="group" className="m-0 list-none p-0">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={loading || companies.length === 0}
          className={cn("flex h-8 w-full items-center justify-between rounded-lg border border-[#dfe4e8] bg-white px-3 text-left text-sm font-light leading-5 text-[#757575] shadow-none transition-colors focus:border-[#5eaafa] focus:outline-none focus:ring-2 focus:ring-[#5eaafa]/20 disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#9aa5b5]", open && "border-[#5eaafa] ring-2 ring-[#5eaafa]/20")}
        >
          <span className={cn("truncate", !selectedNode && "text-muted-foreground/60")}>
            {loading
              ? "กำลังโหลดโครงสร้างองค์กร..."
              : selectedNode
                ? `${selectedNode.code}: ${selectedNode.name}`
                : "เลือกโครงสร้างองค์กร"}
          </span>
          <ChevronDown className={cn("ml-2 size-4 shrink-0 text-[#8b8b8b] transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-[var(--radix-popover-trigger-width)] overflow-auto p-1">
        <ul role="tree" aria-label="โครงสร้างองค์กร" className="m-0 list-none p-0">
          {companies.map((company) => renderNode(company))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function PositionSelectInput({
  positions,
  value,
  loading,
  onChange,
}: {
  positions: PositionNode[];
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(positions.map((position) => position.id)));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExpanded((current) => new Set([...current, ...positions.map((position) => position.id)]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [positions]);

  const findNode = (nodes: PositionNode[]): PositionNode | undefined => {
    for (const node of nodes) {
      if (node.id === value) return node;
      const child = findNode(node.children);
      if (child) return child;
    }
  };
  const selectedNode = findNode(positions);

  const toggleNode = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: PositionNode, depth = 1): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const label = `${node.code}: ${node.name}`;
    return (
      <li key={node.id} role="treeitem" aria-level={depth + 1} aria-expanded={hasChildren ? isExpanded : undefined}>
        <div className="flex min-h-8 items-center rounded-sm pr-1 hover:bg-[#e6f7ff]">
          <span aria-hidden className="h-6 shrink-0" style={{ width: `${depth * 18}px` }} />
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleNode(node.id)}
              className="flex size-6 shrink-0 items-center justify-center text-[#666] hover:text-[#1677ff]"
              aria-label={isExpanded ? `ยุบ ${label}` : `ขยาย ${label}`}
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => {
              onChange(node.id);
              setOpen(false);
            }}
            className={cn(
              "min-w-0 flex-1 rounded-sm px-1.5 py-1 text-left text-sm font-light leading-5 text-foreground hover:bg-[#bae7ff]",
              value === node.id && "bg-[#e6f7ff] font-bold text-[#1677ff]"
            )}
            title={label}
          >
            {label}
          </button>
        </div>
        {hasChildren && isExpanded && (
          <ul role="group" className="m-0 list-none p-0">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={loading || positions.length === 0}
          className={cn("flex h-8 w-full items-center justify-between rounded-lg border border-[#dfe4e8] bg-white px-3 text-left text-sm font-light leading-5 text-[#757575] shadow-none transition-colors focus:border-[#5eaafa] focus:outline-none focus:ring-2 focus:ring-[#5eaafa]/20 disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#9aa5b5]", open && "border-[#5eaafa] ring-2 ring-[#5eaafa]/20")}
        >
          <span className={cn("truncate", !selectedNode && "text-muted-foreground/60")}>
            {loading ? "กำลังโหลดโครงสร้างตำแหน่ง..." : selectedNode ? `${selectedNode.code}: ${selectedNode.name}` : "เลือกตำแหน่ง"}
          </span>
          <ChevronDown className={cn("ml-2 size-4 shrink-0 text-[#8b8b8b] transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-[var(--radix-popover-trigger-width)] overflow-auto p-1">
        <ul role="tree" aria-label="โครงสร้างตำแหน่ง" className="m-0 list-none p-0">
          <li role="treeitem" aria-level={1} aria-expanded>
            <div className="flex min-h-8 items-center rounded-sm pr-1">
              <ChevronDown className="mx-[5px] size-3.5 shrink-0 text-[#666]" aria-hidden />
              <button type="button" disabled className="min-w-0 flex-1 cursor-not-allowed rounded-sm px-1.5 py-1 text-left text-sm leading-5 text-[#999]">
                ตำแหน่ง
              </button>
            </div>
            <ul role="group" className="m-0 list-none p-0">
              {positions.map((position) => renderNode(position))}
            </ul>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function DateInput({
  placeholder = "เลือกวันที่",
  defaultValue,
  disabled,
  className,
  name,
  onDateChange,
  selectedDate,
}: {
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
  onDateChange?: (date: Date | undefined) => void;
  selectedDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  const initialDate = parseIsoDate(defaultValue);

  const [selected, setSelected] = useState<Date | undefined>(initialDate);
  const resolvedSelectedDate = selectedDate ?? selected;

  const displayText = resolvedSelectedDate ? formatThaiDateNumeric(resolvedSelectedDate) : "";

  return (
    <div className={cn("relative", className)}>
      <input type="hidden" name={name} value={resolvedSelectedDate ? toIsoDate(resolvedSelectedDate) : ""} />
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border border-[#dfe4e8] bg-white px-3 pr-9 text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20",
          disabled && "cursor-not-allowed bg-[#f5f7fa] text-[#7b8798]",
              !selected && "text-muted-foreground/60"
            )}
          >
            <span className="truncate">
              {displayText || placeholder}
            </span>
            <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        {!disabled && (
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={4}
            avoidCollisions={false}
            className="w-auto p-0"
          >
            <Calendar
              mode="single"
              selected={resolvedSelectedDate}
              defaultMonth={resolvedSelectedDate}
              onSelect={(day) => {
                setSelected(day);
                onDateChange?.(day);
                setOpen(false);
              }}
              locale={th}
              captionLayout="dropdown-years"
            />
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}

const THAI_WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

type BirthDateCalendarView = "day" | "month" | "year";

function DetailedDateInput({
  name,
  onDateChange,
  selectedDate,
  disableFuture = false,
}: {
  name: string;
  onDateChange?: (date: Date | undefined) => void;
  selectedDate?: Date;
  disableFuture?: boolean;
}) {
  const today = startOfDay(new Date());
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>();
  const resolvedSelected = selectedDate ?? selected;
  const [view, setView] = useState<BirthDateCalendarView>("day");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [yearRangeStart, setYearRangeStart] = useState(() => today.getFullYear() + BUDDHIST_YEAR_OFFSET - 9);

  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const buddhistYear = visibleYear + BUDDHIST_YEAR_OFFSET;
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const isCurrentOrFutureMonth = visibleMonth.getTime() >= currentMonthStart.getTime();
  const daysInMonth = new Date(visibleYear, visibleMonthIndex + 1, 0).getDate();
  const firstDayOffset = (new Date(visibleYear, visibleMonthIndex, 1).getDay() + 6) % 7;
  const dayCells = Array.from({ length: firstDayOffset + daysInMonth }, (_, index) =>
    index < firstDayOffset ? null : index - firstDayOffset + 1
  );

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      const anchorDate = resolvedSelected ?? today;
      setVisibleMonth(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
      setYearRangeStart(anchorDate.getFullYear() + BUDDHIST_YEAR_OFFSET - 9);
      setView("day");
    }
  };

  const moveCalendar = (direction: -1 | 1) => {
    if (view === "day") {
      setVisibleMonth((current) => addMonths(current, direction));
      return;
    }
    if (view === "month") {
      setVisibleMonth((current) => new Date(current.getFullYear() + direction, current.getMonth(), 1));
      return;
    }
    setYearRangeStart((current) => current + direction * 12);
  };

  const selectDay = (day: number) => {
    const date = new Date(visibleYear, visibleMonthIndex, day);
    if (disableFuture && date > today) return;
    setSelected(date);
    onDateChange?.(date);
    setOpen(false);
  };

  const selectMonth = (monthIndex: number) => {
    const isFutureMonth = disableFuture && visibleYear === today.getFullYear() && monthIndex > today.getMonth();
    if (disableFuture && (visibleYear > today.getFullYear() || isFutureMonth)) return;
    setVisibleMonth(new Date(visibleYear, monthIndex, 1));
    setView("day");
  };

  const selectYear = (yearBE: number) => {
    const year = yearBE - BUDDHIST_YEAR_OFFSET;
    if (disableFuture && year > today.getFullYear()) return;
    const month = disableFuture && year === today.getFullYear() ? Math.min(visibleMonthIndex, today.getMonth()) : visibleMonthIndex;
    setVisibleMonth(new Date(year, month, 1));
    setView("month");
  };

  const selectedText = resolvedSelected ? formatThaiDateNumeric(resolvedSelected) : "";

  return (
    <div className="relative">
      <input type="hidden" name={name} value={resolvedSelected ? toIsoDate(resolvedSelected) : ""} />
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-between rounded-lg border border-[#dfe4e8] bg-white px-3 pr-9 text-left text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20 data-[state=open]:border-[#5eaafa] data-[state=open]:ring-2 data-[state=open]:ring-[#5eaafa]/20"
          >
            <span className={cn("truncate", !resolvedSelected && "text-muted-foreground/60")}>{selectedText || "กรุณาเลือก"}</span>
            <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[276px] gap-0 overflow-hidden rounded-lg bg-white p-0 shadow-[0_4px_18px_rgba(28,37,54,0.16)] ring-1 ring-black/5"
        >
          <div className="flex h-12 items-center justify-between border-b border-[#f0f0f0] px-2">
            <button type="button" onClick={() => moveCalendar(-1)} aria-label={view === "year" ? "ช่วงปีก่อนหน้า" : view === "month" ? "ปีก่อนหน้า" : "เดือนก่อนหน้า"} className="flex size-8 items-center justify-center rounded-md text-[#858b94] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa]">
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (view === "day") setView("month");
                else if (view === "month") {
                  setYearRangeStart(buddhistYear - 9);
                  setView("year");
                }
              }}
              className={cn("rounded px-2 py-1 text-sm font-semibold text-[#30343b]", view !== "year" && "hover:bg-[#eef7ff] hover:text-[#5eaafa]")}
            >
              {view === "day" ? `${THAI_MONTHS[visibleMonthIndex]} ${buddhistYear}` : view === "month" ? buddhistYear : `${yearRangeStart} - ${yearRangeStart + 11}`}
            </button>
            <button type="button" disabled={disableFuture && view !== "year" && (view === "month" ? visibleYear >= today.getFullYear() : isCurrentOrFutureMonth)} onClick={() => moveCalendar(1)} aria-label={view === "year" ? "ช่วงปีถัดไป" : view === "month" ? "ปีถัดไป" : "เดือนถัดไป"} className="flex size-8 items-center justify-center rounded-md text-[#858b94] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa] disabled:cursor-not-allowed disabled:text-[#d4d6da] disabled:hover:bg-transparent">
              <ChevronRight className="size-5" />
            </button>
          </div>

          {view === "day" && (
            <div className="px-3 pb-3 pt-2">
              <div className="grid grid-cols-7">
                {THAI_WEEKDAYS.map((weekday) => <span key={weekday} className="flex h-8 items-center justify-center text-xs font-normal text-[#8b9098]">{weekday}</span>)}
                {dayCells.map((day, index) => {
                  if (day === null) return <span key={`empty-${index}`} className="size-8" />;
                  const date = new Date(visibleYear, visibleMonthIndex, day);
                  const isFuture = disableFuture && date > today;
                  const isToday = date.getTime() === today.getTime();
                  const isSelected = resolvedSelected?.getTime() === date.getTime();
                  return (
                    <button key={day} type="button" disabled={isFuture} onClick={() => selectDay(day)} className={cn("mx-auto flex size-8 items-center justify-center rounded-md text-sm font-normal text-[#464b53] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa]", isToday && !isSelected && "font-semibold text-[#5eaafa]", isSelected && "bg-[#5eaafa] text-white hover:bg-[#4a9be9] hover:text-white", isFuture && "cursor-not-allowed text-[#c9ccd1] hover:bg-transparent hover:text-[#c9ccd1]")}>{day}</button>
                  );
                })}
              </div>
            </div>
          )}

          {view === "month" && (
            <div className="grid min-h-[202px] grid-cols-4 gap-x-1 gap-y-3 px-4 py-5">
              {THAI_MONTHS_SHORT.map((month, monthIndex) => {
                const isFuture = disableFuture && (visibleYear > today.getFullYear() || (visibleYear === today.getFullYear() && monthIndex > today.getMonth()));
                const isActive = resolvedSelected?.getFullYear() === visibleYear && resolvedSelected.getMonth() === monthIndex;
                return <button key={month} type="button" disabled={isFuture} onClick={() => selectMonth(monthIndex)} className={cn("rounded-md text-sm text-[#4b5058] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa]", isActive && "bg-[#5eaafa] text-white hover:bg-[#4a9be9] hover:text-white", isFuture && "cursor-not-allowed bg-[#fafafa] text-[#c9ccd1] hover:bg-[#fafafa] hover:text-[#c9ccd1]")}>{month}</button>;
              })}
            </div>
          )}

          {view === "year" && (
            <div className="grid min-h-[202px] grid-cols-4 gap-x-1 gap-y-3 px-4 py-5">
              {Array.from({ length: 12 }, (_, index) => yearRangeStart + index).map((yearBE) => {
                  const isFuture = disableFuture && yearBE - BUDDHIST_YEAR_OFFSET > today.getFullYear();
                  const isActive = resolvedSelected ? resolvedSelected.getFullYear() + BUDDHIST_YEAR_OFFSET === yearBE : false;
                return <button key={yearBE} type="button" disabled={isFuture} onClick={() => selectYear(yearBE)} className={cn("rounded-md text-sm text-[#4b5058] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa]", isActive && "bg-[#5eaafa] text-white hover:bg-[#4a9be9] hover:text-white", isFuture && "cursor-not-allowed bg-[#fafafa] text-[#c9ccd1] hover:bg-[#fafafa] hover:text-[#c9ccd1]")}>{yearBE}</button>;
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MonthPickerInput({
  placeholder = "เลือกเดือน",
  defaultValue,
  disabled,
  className,
  name,
}: {
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}) {
  const initialDate = parseIsoDate(defaultValue);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(initialDate);
  const [visibleYear, setVisibleYear] = useState((initialDate ?? new Date()).getFullYear());

  const chooseMonth = (month: number) => {
    setSelected(new Date(visibleYear, month, 1));
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <input type="hidden" name={name} value={selected ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}` : ""} />
      <Popover
        open={open}
        onOpenChange={disabled ? undefined : (nextOpen) => {
          if (nextOpen) setVisibleYear((selected ?? new Date()).getFullYear());
          setOpen(nextOpen);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border border-[#dfe4e8] bg-white px-3 pr-9 text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20",
          disabled && "cursor-not-allowed bg-[#f5f7fa] text-[#7b8798]",
              !selected && "text-muted-foreground/60"
            )}
          >
            <span className="truncate whitespace-pre">{selected ? formatThaiMonthYear(selected) : placeholder}</span>
            <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        {!disabled && (
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={4}
            avoidCollisions={false}
            className="w-[272px] p-3"
          >
            <div className="grid h-8 grid-cols-[32px_1fr_32px] items-center">
              <button
                type="button"
                aria-label="ปีก่อนหน้า"
                onClick={() => setVisibleYear((year) => year - 1)}
                className="flex size-8 items-center justify-center rounded-[4px] text-[rgba(0,0,0,0.65)] hover:bg-[#f5f5f5]"
              >
                {"<<"}
              </button>
          <span className="text-center text-sm font-semibold text-[#172348]">
                {visibleYear + BUDDHIST_YEAR_OFFSET}
              </span>
              <button
                type="button"
                aria-label="ปีถัดไป"
                onClick={() => setVisibleYear((year) => year + 1)}
                className="flex size-8 items-center justify-center rounded-[4px] text-[rgba(0,0,0,0.65)] hover:bg-[#f5f5f5]"
              >
                {">>"}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1" role="grid" aria-label="เลือกเดือน">
              {Array.from({ length: 12 }, (_, month) => {
                const monthDate = new Date(visibleYear, month, 1);
                const isSelected = selected?.getFullYear() === visibleYear && selected.getMonth() === month;
                return (
                  <button
                    key={month}
                    type="button"
                    role="gridcell"
                    aria-pressed={isSelected}
                    onClick={() => chooseMonth(month)}
                    className={cn(
                "h-8 rounded-lg text-sm font-normal transition-colors hover:bg-[#e6f7ff]",
                      isSelected ? "bg-[#1890ff] text-white hover:bg-[#1890ff]" : "text-[rgba(0,0,0,0.65)]"
                    )}
                  >
                    {THAI_MONTHS_SHORT[month]}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
  className,
  compact,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center",
        compact ? "flex-nowrap gap-x-2" : "flex-wrap gap-x-2",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="flex h-6 shrink-0 items-center gap-2 text-sm font-normal leading-5 text-[#4b5870]"
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-full border",
              opt === value ? "border-[#1890ff]" : "border-[#d9d9d9]"
            )}
          >
            {opt === value && <span className="size-2 rounded-full bg-[#1890ff]" />}
          </span>
          <span className={cn("truncate tracking-[-0.1px]", compact ? "pr-0" : "pr-2", !compact && opt === "ไม่ระบุ" && "pr-[13.075px]")}>
            {compact ? opt : opt === "ไม่ระบุ" ? " ไม่ระบุ " : opt}
          </span>
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="inline-flex h-[22.45px] items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-[0.45px] h-[22px] w-11 rounded-full transition-colors",
          checked ? "bg-[#00a000]" : "bg-black/25"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
            checked ? "left-6" : "left-0.5"
          )}
        />
      </button>
      <span className="text-sm font-medium leading-5 text-[#34425c]">{label}</span>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function OrganizationEmployeeCreatePage({
  onCancel,
  onComplete,
  employeeCount,
  employeeLimit,
  embedded = false,
}: {
  onCancel?: () => void;
  onComplete?: () => void;
  employeeCount?: number | null;
  employeeLimit?: number | null;
  embedded?: boolean;
}) {
  const router = useRouter();
  const currentEmployeeCount = employeeCount ?? 1;
  const configuredEmployeeLimit = employeeLimit ?? 2;
  const progressPct = Math.min(100, Math.round((currentEmployeeCount / configuredEmployeeLimit) * 100));
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const tabViewportRef = useRef<HTMLDivElement>(null);
  const [canScrollTabsBack, setCanScrollTabsBack] = useState(false);
  const [canScrollTabsForward, setCanScrollTabsForward] = useState(true);
  const [gender, setGender] = useState("ชาย");
  const [nationality, setNationality] = useState("ไทย");
  const [payrollRound, setPayrollRound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "error" | "success">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationNode[]>([]);
  const [organizationLoading, setOrganizationLoading] = useState(true);
  const [organizationSelection, setOrganizationSelection] = useState("");
  const [positions, setPositions] = useState<PositionNode[]>([]);
  const [positionLoading, setPositionLoading] = useState(true);
  const [positionSelection, setPositionSelection] = useState("");
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeTypeDefinition[]>([]);
  const [employeeTypeLoading, setEmployeeTypeLoading] = useState(true);
  const [employeeTypeSelection, setEmployeeTypeSelection] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [hireDate, setHireDate] = useState(() => startOfDay(new Date()));
  const [probationDays, setProbationDays] = useState("119");
  const selectedOrganizationCompanyId = companyIdForOrganization(organizations, organizationSelection);
  const probationDuration = /^\d+$/.test(probationDays) ? Number.parseInt(probationDays, 10) : 0;
  const probationEndDate = probationDuration > 0 ? addDays(hireDate, probationDuration - 1) : undefined;

  // Employee code duplicate check
  const [employeeCode, setEmployeeCode] = useState("");
  const [lastName, setLastName] = useState("");
  const [lastNameEN, setLastNameEN] = useState("");
  const [codeDuplicate, setCodeDuplicate] = useState(false);
  const [existingEmployee, setExistingEmployee] = useState<
    { employeeNumber: string; fullName: string } | null
  >(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetBasicForm = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setEmployeeCode("");
    setLastName("");
    setLastNameEN("");
    setCodeDuplicate(false);
    setExistingEmployee(null);
    setGender("ชาย");
    setNationality("ไทย");
    setPayrollRound(false);
    setBirthDate(undefined);
    setHireDate(startOfDay(new Date()));
    setProbationDays("119");
    setOrganizationSelection("");
    setPositionSelection("");
    setEmployeeTypeSelection("");
    setSaveStatus("idle");
    setSaveMessage("");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/organization", { cache: "no-store" });
        const data = (await response.json()) as OrganizationResponse;
        if (!response.ok) throw new Error(data.error);
        if (!cancelled) setOrganizations(data.companies);
      } catch {
        if (!cancelled) {
          setOrganizations([]);
          setSaveStatus("error");
          setSaveMessage("ไม่สามารถโหลดโครงสร้างองค์กรได้ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        if (!cancelled) setOrganizationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setEmployeeTypeLoading(true);
        const query = selectedOrganizationCompanyId
          ? `?companyId=${encodeURIComponent(selectedOrganizationCompanyId)}`
          : "";
        const response = await fetch(`/api/employee-type-definition${query}`, { cache: "no-store" });
        const data = (await response.json()) as EmployeeTypeResponse;
        if (!response.ok) throw new Error(data.error);
        if (!cancelled) {
          setEmployeeTypes(data.employeeTypes);
          setEmployeeTypeSelection("");
        }
      } catch {
        if (!cancelled) {
          setEmployeeTypes([]);
          setSaveStatus("error");
          setSaveMessage("ไม่สามารถโหลดกลุ่มประเภทพนักงานได้ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        if (!cancelled) setEmployeeTypeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOrganizationCompanyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/organization-position", { cache: "no-store" });
        const data = (await response.json()) as PositionResponse;
        if (!response.ok) throw new Error(data.error);
        if (!cancelled) setPositions(data.positions);
      } catch {
        if (!cancelled) {
          setPositions([]);
          setSaveStatus("error");
          setSaveMessage("ไม่สามารถโหลดโครงสร้างตำแหน่งได้ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        if (!cancelled) setPositionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const viewport = tabViewportRef.current;
    if (!viewport) return;

    const syncPagination = () => {
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      setCanScrollTabsBack(viewport.scrollLeft > 1);
      setCanScrollTabsForward(viewport.scrollLeft < maxScroll - 1);
    };

    syncPagination();
    viewport.addEventListener("scroll", syncPagination, { passive: true });
    const resizeObserver = new ResizeObserver(syncPagination);
    resizeObserver.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", syncPagination);
      resizeObserver.disconnect();
    };
  }, []);

  function scrollTabs(direction: "back" | "forward") {
    const viewport = tabViewportRef.current;
    if (!viewport) return;
    // Material's paginator moves by one third of the tab-label viewport,
    // excluding its two fixed 32px pagination controls.
    const distance = Math.max((viewport.clientWidth - 64) / 3, 1);
    viewport.scrollBy({
      left: direction === "forward" ? distance : -distance,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!employeeCode.trim()) {
      debounceRef.current = setTimeout(() => {
        setCodeDuplicate(false);
        setExistingEmployee(null);
      }, 0);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/employee/check-code?code=${encodeURIComponent(employeeCode.trim())}`
        );
        const data = await res.json();
        setCodeDuplicate(data.duplicate);
        setExistingEmployee(data.existingEmployee ?? null);
      } catch {
        setCodeDuplicate(false);
        setExistingEmployee(null);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [employeeCode]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!organizationSelection) {
      setSaveStatus("error");
      setSaveMessage("กรุณาเลือกโครงสร้างองค์กร");
      return;
    }
    if (!positionSelection) {
      setSaveStatus("error");
      setSaveMessage("กรุณาเลือกตำแหน่ง");
      return;
    }
    if (!employeeTypeSelection) {
      setSaveStatus("error");
      setSaveMessage("กรุณาเลือกประเภทพนักงาน");
      return;
    }
    if (codeDuplicate) {
      setSaveStatus("error");
      setSaveMessage("รหัสพนักงานนี้มีในระบบแล้ว กรุณาเปลี่ยนรหัสพนักงาน");
      return;
    }
    setSaving(true);
    setSaveStatus("idle");
    setSaveMessage("");

    const fd = new FormData(e.currentTarget);
    const str = (key: string) => String(fd.get(key) ?? "").trim();
    const [organizationKind = "", organizationId = ""] = organizationSelection.split(":");

    const payload = {
      employeeCode: str("employeeCode"),
      fingerprintCode: str("fingerprintCode"),
      gender,
      nationality,
      title: str("title"),
      firstNameTH: str("firstNameTH"),
      lastNameTH: str("lastNameTH"),
      nickname: str("nickname"),
      firstNameEN: str("firstNameEN"),
      lastNameEN: str("lastNameEN"),
      nicknameEN: str("nicknameEN"),
      maritalStatus: str("maritalStatus"),
      birthDate: str("birthDate"),
      phone: str("phone"),
      email: str("email"),
      citizenId: str("citizenId"),
      alienIdNumber: str("alienIdNumber"),
      passportNo: str("passportNo"),
      workPermitNo: str("workPermitNo"),
      socialSecurityNumber: str("socialSecurityNumber"),
      organizationId,
      organizationKind,
      positionId: positionSelection,
      employeeTypeDefinitionId: employeeTypeSelection,
      wage: str("wage"),
      advanceType: str("advanceType"),
      advanceLimit: str("advanceLimit"),
      socialSecurityCalc: str("socialSecurityCalc"),
      socialSecurityFixed: str("socialSecurityFixed"),
      socialSecurityStart: str("socialSecurityStart"),
      taxCalc: str("taxCalc"),
      taxFixed: str("taxFixed"),
      taxStart: str("taxStart"),
      hireDate: str("hireDate"),
      confirmationDate: str("confirmationDate"),
      contractEndDate: str("contractEndDate"),
      retirementDate: str("retirementDate"),
      probationDays: str("probationDays"),
      probationDate: str("probationDate"),
      paymentChannel: str("paymentChannel"),
      companyPayoutAccount: str("companyPayoutAccount"),
      bankName: str("bankName"),
      bankBranchCode: str("bankBranchCode"),
      bankAccountNumber: str("bankAccountNumber"),
      description: str("description"),
      hashtag: str("hashtag"),
    };

    try {
      const res = await fetch("/api/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setSaveStatus("error");
        setSaveMessage(data?.error ?? "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }
      setSaveStatus("success");
      setSaveMessage("บันทึกข้อมูลเรียบร้อย กำลังกลับไปหน้ารายการ...");
      window.setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          router.push("/organization/organization-employee/dashboard");
          router.refresh();
        }
      }, 1000);
    } catch {
      setSaveStatus("error");
      setSaveMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-employee-create-page className="min-h-[calc(100vh-70px)] w-full overflow-x-hidden bg-[#f3f6fb] font-sans">
{/* Header follows the employee-data page header used by HRMic. */}
      {!embedded && <section className="mx-3 mt-3 flex min-h-24 flex-col gap-4 rounded-xl border border-[#e7eaf0] bg-white p-4 shadow-[0_3px_12px_rgba(29,52,93,.07)] sm:mx-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col items-start">
          <div className="hidden items-center text-xs font-normal leading-5 text-[#7b8798] md:flex">
            <span>ข้อมูลองค์กร</span>
            <ChevronRight className="size-4" />
            <span>ข้อมูลพนักงาน</span>
          </div>
          <div className="flex items-center">
            <h1 className="w-fit text-xl font-semibold leading-7 tracking-tight text-[#172348]">ข้อมูลพนักงาน</h1>
            <button
              type="button"
              className="hidden"
              aria-label="ข้อมูลเพิ่มเติมเกี่ยวกับหน้าข้อมูลพนักงาน"
            >
              ?
            </button>
          </div>
        </div>

        <div className="hidden max-w-xl flex-1 flex-col items-center justify-center px-8 md:flex">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#edf1f6]">
            <div className="h-full rounded-full bg-[#ff9418] transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <label className="mt-1 w-full text-right text-xs font-normal leading-5 text-[#6f7b90]">
            {currentEmployeeCount}/{configuredEmployeeLimit} คน
          </label>
        </div>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="hidden h-9 shrink-0 items-center justify-center rounded-lg border border-[#dfe4e8] bg-white px-4 text-sm font-medium leading-5 text-[#34425c] transition-colors hover:border-[#b9c7d8] hover:bg-[#f7f9fc] md:inline-flex"
          >
            ยกเลิก
          </button>
        ) : (
          <Link
            href="/organization/organization-employee/dashboard"
            className="hidden h-9 shrink-0 items-center justify-center rounded-lg border border-[#dfe4e8] bg-white px-4 text-sm font-medium leading-5 text-[#34425c] transition-colors hover:border-[#b9c7d8] hover:bg-[#f7f9fc] md:inline-flex"
          >
            ยกเลิก
          </Link>
        )}
      </section>}

      <div className={cn(
        "relative z-10 space-y-0",
        embedded ? "w-full p-0" : "p-3 sm:p-4",
      )}>
        {/* Sub-navigation tabs */}
              <div className={cn(
                "flex h-12 overflow-hidden rounded-t-xl border border-[#e5eaf2] bg-white font-[Kanit,sans-serif] text-sm font-semibold leading-[22px] text-[#65728a] shadow-[0_3px_12px_rgba(29,52,93,0.06)]",
                embedded
                  ? "border-[#edf0f5]"
                  : "border-[#e5eaf2]",
              )}>
                <button
                  type="button"
                  onClick={() => scrollTabs("back")}
                  disabled={!canScrollTabsBack}
                  className="flex h-12 w-9 shrink-0 items-center justify-center border-r border-[#edf0f5] text-[#718096] transition-colors hover:bg-[#f6f8fc] hover:text-[#1474ee] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="ก่อนหน้า"
                >
                  <ChevronLeft className="size-5" strokeWidth={1.75} />
                </button>
                <div
                  ref={tabViewportRef}
                  className="h-12 min-w-0 flex-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="tablist"
                >
                  <div className="flex h-12 w-max">
          {TABS.map((tab) => {
            const active = tab === activeTab;
            const disabled = tab !== "ข้อมูลพื้นฐาน" && tab !== "ตั้งค่า";
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (activeTab === "ข้อมูลพื้นฐาน" && tab !== "ข้อมูลพื้นฐาน") {
                    resetBasicForm();
                  }
                  setActiveTab(tab);
                }}
                disabled={disabled}
                style={{ width: TAB_WIDTHS[tab], minWidth: TAB_WIDTHS[tab] }}
                className={cn(
                  "relative flex h-12 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap px-5 text-sm font-semibold leading-[22px] text-[#65728a] transition-colors",
                  active
                    ? "bg-[#f8fbff] !text-[#126fd5] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#1474ee]"
                    : disabled
                      ? "cursor-default text-[#b1bac7]"
                      : "hover:bg-[#f6f8fc] hover:text-[#26344f]"
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

      {/* Form content */}
      {activeTab === "ข้อมูลพื้นฐาน" ? (
        <Card className={cn(
          "rounded-t-none xl:min-h-[1184.85px]",
          embedded
            ? "rounded-b-xl border border-t-0 border-[#e7eaf0] shadow-[0_3px_12px_rgba(29,52,93,0.07)]"
            : "rounded-b-xl border border-t-0 border-[#e7eaf0] shadow-[0_3px_12px_rgba(29,52,93,.07)]",
        )}>
          <CardContent className="p-0">
          <form id="employee-create-form" onSubmit={handleSubmit} autoComplete="off" className="w-full space-y-0 px-3 pt-3 text-sm font-normal leading-5 sm:px-4 sm:pt-4 lg:mx-6 lg:w-[calc(100%-48px)] lg:px-0">
            {/* Row 1 */}
            <div className="grid w-full grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-[190.2125fr_190.2125fr_190.2125fr_187.578125fr_187.578125fr_190.20625fr]">
              <FieldShell label="รหัสพนักงาน">
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type="text"
                      name="employeeCode"
                      autoComplete="off"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      className={cn(
                        "h-8 w-full rounded-lg border border-[#dfe4e8] bg-white px-3 text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors placeholder:text-[#9aa5b5] focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20",
                        codeDuplicate
                          ? "border-[0.5px] border-red-500 focus:border-red-500 focus-visible:ring-red-500"
                          : "border-[#d9d9d9]"
                      )}
                    />
                  </div>
                </div>
              </FieldShell>
              <FieldShell label="รหัสลายนิ้วมือ">
                <TextInput name="fingerprintCode" placeholder="รหัสลายนิ้วมือ" />
              </FieldShell>
              <FieldShell label="เพศ">
                <RadioGroup compact options={["ชาย", "หญิง", "ไม่ระบุ"]} value={gender} onChange={setGender} />
              </FieldShell>
              <FieldShell label="สัญชาติ" className="xl:col-span-2">
                <RadioGroup
                  options={["ไทย", "ไม่ระบุสัญชาติ / บุคคลพื้นที่สูง", "ต่างชาติ"]}
                  value={nationality}
                  onChange={setNationality}
                />
              </FieldShell>
              <FieldShell label="สัญชาติ">
                <SelectInput
                  options={["ไทย", "เมียนมา", "ลาว", "กัมพูชา", "เวียดนาม", "จีน", "อื่นๆ"]}
                  placeholder="เลือกสัญชาติ"
                  disabled
                />
              </FieldShell>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-4">
              <FieldShell label="คำนำหน้าชื่อ">
                <SelectInput
                  name="title"
                  options={[
                    "นาย",
                    "นาง",
                    "นางสาว",
                    "หม่อมราชวงศ์",
                    "หม่อมหลวง",
                    "คุณหญิง",
                    "ว่าที่ร้อยตรี",
                    "ร้อยตรี",
                    "ร้อยโท",
                    "ร้อยเอก",
                    "พลทหารอากาศ",
                    "จ่าโท",
                    "นายดาบตำรวจ",
                    "ว่าที่ ร.ต.",
                    "พันตรี",
                    "พันโท",
                  ]}
                  defaultValue="นาย"
                />
              </FieldShell>
              <FieldShell label="ชื่อ" required>
                <TextInput name="firstNameTH" placeholder="ชื่อ" />
              </FieldShell>
              <FieldShell label="นามสกุล" required>
                <TextInput
                  name="lastNameTH"
                  placeholder="นามสกุล"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="new-password"
                />
              </FieldShell>
              <FieldShell label="ชื่อเล่น">
                <TextInput name="nickname" placeholder="ชื่อเล่น" />
              </FieldShell>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[378.68125fr_378.6625fr_378.65625fr]">
              <FieldShell label="ชื่อ (ENG)">
                <TextInput name="firstNameEN" placeholder="First Name" />
              </FieldShell>
              <FieldShell label="นามสกุล (ENG)">
                <TextInput
                  name="lastNameEN"
                  placeholder="Last Name"
                  value={lastNameEN}
                  onChange={(event) => setLastNameEN(event.target.value)}
                  autoComplete="new-password"
                />
              </FieldShell>
              <FieldShell label="ชื่อเล่น (ENG)">
                <TextInput name="nicknameEN" placeholder="Nickname" />
              </FieldShell>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-[25%_12.4%_12.6%_25%_25%]">
              <FieldShell label="สถานะ">
                <SelectInput name="maritalStatus" options={["โสด", "สมรส", "หย่าร้าง", "หม้าย"]} defaultValue="โสด" />
              </FieldShell>
              <FieldShell label="วันเกิด" required>
                <DetailedDateInput name="birthDate" onDateChange={setBirthDate} disableFuture />
              </FieldShell>
              <FieldShell label="อายุ">
          <TextInput value={calculateAge(birthDate) ?? ""} placeholder="อายุ" disabled className="pl-[9px]" />
              </FieldShell>
              <FieldShell label="เบอร์โทรศัพท์">
                <TextInput name="phone" placeholder="เบอร์โทรศัพท์" inputMode="numeric" maxLength={12} onChange={(event) => { event.currentTarget.value = formatPhone(event.currentTarget.value); }} />
              </FieldShell>
              <FieldShell label="อีเมล">
                <TextInput name="email" placeholder="อีเมล" />
              </FieldShell>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-5">
              <FieldShell label="เลขประจำตัวประชาชน / ผู้เสียภาษี" required>
                <TextInput name="citizenId" placeholder="เลขประจำตัวประชาชน / ผู้เสียภาษี" />
              </FieldShell>
              <FieldShell label="เลขประจำตัวคนซึ่งไม่มีสัญชาติไทย">
                <TextInput name="alienIdNumber" placeholder="เลขประจำตัวคนซึ่งไม่มีสัญชาติไทย" />
              </FieldShell>
              <FieldShell label="เลขหนังสือเดินทาง">
                <TextInput name="passportNo" placeholder="เลขหนังสือเดินทาง" />
              </FieldShell>
              <FieldShell label="เลขที่ใบอนุญาตทำงาน">
                <TextInput name="workPermitNo" placeholder="เลขที่ใบอนุญาตทำงาน" />
              </FieldShell>
              <FieldShell label="เลขประจำตัวประกันสังคม">
                <TextInput name="socialSecurityNumber" placeholder="เลขประจำตัวประกันสังคม" />
              </FieldShell>
            </div>

            {/* Row 6 */}
            <div className="grid w-full grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-6">
              <FieldShell label="โครงสร้างองค์กร" required>
                <OrganizationSelectInput
                  companies={organizations}
                  value={organizationSelection}
                  loading={organizationLoading}
                  onChange={setOrganizationSelection}
                />
              </FieldShell>
              <FieldShell label="ตำแหน่ง" required>
                <PositionSelectInput
                  positions={positions}
                  value={positionSelection}
                  loading={positionLoading}
                  onChange={setPositionSelection}
                />
              </FieldShell>
              <FieldShell label="ประเภทพนักงาน" required>
                <EmployeeTypeSelectInput
                  types={employeeTypes}
                  value={employeeTypeSelection}
                  loading={employeeTypeLoading}
                  onChange={setEmployeeTypeSelection}
                />
              </FieldShell>
              <FieldShell label="ค่าจ้าง">
                <TextInput name="wage" placeholder="0.00" />
              </FieldShell>
              <FieldShell label="เงินเบิกล่วงหน้า">
                <SelectInput name="advanceType" options={["กำหนดวงเงินเบิกล่วงหน้า", "ไม่ให้เบิกล่วงหน้า"]} placeholder="เลือกประเภท" />
              </FieldShell>
              <FieldShell label="วงเงินเบิกล่วงหน้า">
                <TextInput name="advanceLimit" placeholder="0.00" />
              </FieldShell>
            </div>

            {/* Row 7: Social security */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[381.33125fr_381.3375fr_373.33125fr]">
              <FieldShell label={<HelpLabel label="ประกันสังคม" />}>
                <SelectInput
                  name="socialSecurityCalc"
                  options={["คิดตามฐานเงินเดือนจริงที่ได้รับ", "ไม่คิดประกันสังคม", "คิดตามอัตราคงที่"]}
                  defaultValue="คิดตามฐานเงินเดือนจริงที่ได้รับ"
                />
              </FieldShell>
              <FieldShell label="ค่าคงที่ของประกันสังคม">
                <TextInput name="socialSecurityFixed" placeholder="0.00" disabled />
              </FieldShell>
              <FieldShell label="เดือนที่เริ่มคำนวณประกันสังคม">
                <MonthPickerInput name="socialSecurityStart" />
              </FieldShell>
            </div>

            {/* Row 8: Tax */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[378.6625fr_378.68125fr_378.65625fr]">
              <FieldShell label={<HelpLabel label="ภาษี" />}>
                <SelectInput
                  name="taxCalc"
                  options={["คิดภาษี ภงด.1 ใหม่ทุกเดือน", "ไม่คิดภาษี", "คิดภาษีคงที่ต่อเดือน"]}
                  defaultValue="คิดภาษี ภงด.1 ใหม่ทุกเดือน"
                />
              </FieldShell>
              <FieldShell label="จำนวนภาษีคงที่ต่อเดือน">
                <TextInput name="taxFixed" placeholder="0.00" disabled />
              </FieldShell>
              <FieldShell label="เดือนที่เริ่มคำนวณภาษี">
                <MonthPickerInput name="taxStart" />
              </FieldShell>
            </div>

            {/* Row 9: Dates & probation */}
            <div className="grid w-full grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-[189.33125fr_189.3375fr_189.325fr_189.3375fr_189.3375fr_189.33125fr]">
              <FieldShell label="วันที่เริ่มงาน" required>
                <DetailedDateInput
                  name="hireDate"
                  selectedDate={hireDate}
                  onDateChange={(date) => date && setHireDate(date)}
                />
              </FieldShell>
              <FieldShell label="วันที่บรรจุ">
                <DetailedDateInput name="confirmationDate" />
              </FieldShell>
              <FieldShell label="วันที่หมดสัญญาจ้าง">
                <DetailedDateInput name="contractEndDate" />
              </FieldShell>
              <FieldShell label="ปีที่เกษียณ">
                <DetailedDateInput name="retirementDate" />
              </FieldShell>
              <FieldShell label="ระยะเวลาทดลองงาน">
                <TextInput
                  name="probationDays"
                  type="number"
                  min={1}
                  step={1}
                  value={probationDays}
                  onChange={(event) => setProbationDays(event.target.value)}
                />
              </FieldShell>
              <FieldShell label="วันที่สิ้นสุดทดลองงาน">
                <DateInput name="probationDate" selectedDate={probationEndDate} disabled />
              </FieldShell>
            </div>

            {/* Row 10: Payment */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-5">
              <FieldShell label="ช่องทางการชำระเงิน">
                <SelectInput name="paymentChannel" options={["เงินสด", "โอน", "เช็ค"]} defaultValue="เงินสด" />
              </FieldShell>
              <FieldShell label="บัญชีบริษัทนำจ่าย">
                <SelectInput name="companyPayoutAccount" options={["บัญชี A", "บัญชี B"]} placeholder="เลือกบัญชี" />
              </FieldShell>
              <FieldShell label="ธนาคาร">
                <SelectInput name="bankName" options={["ธนาคารกรุงเทพ", "ธนาคารกสิกรไทย", "ธนาคารไทยพาณิชย์"]} placeholder="เลือกธนาคาร" />
              </FieldShell>
              <FieldShell label="รหัสสาขาธนาคาร">
                <TextInput name="bankBranchCode" placeholder="รหัสสาขาธนาคาร" />
              </FieldShell>
              <FieldShell label="เลขที่บัญชี">
                <TextInput name="bankAccountNumber" placeholder="เลขที่บัญชี" />
              </FieldShell>
            </div>

            {/* Row 11: Description */}              <FieldShell label="รายละเอียด">
                <TextInput name="description" placeholder="รายละเอียด" />
              </FieldShell>

            {/* Row 12: Hashtag */}              <FieldShell label="Hashtag">
                <TextInput name="hashtag" placeholder="input # to mention tag" />
              </FieldShell>
          </form>

          <div className="px-3 sm:px-4 lg:mx-6 lg:px-0">
            {/* Payroll round and warning */}
            <div className="h-auto lg:h-[120.45px]">
              <div className="h-[34.45px] pt-3">
                <Toggle checked={payrollRound} onChange={setPayrollRound} label="สร้างรายชื่อในรอบคำนวณเงินเดือน" />
              </div>
              <p className="mt-1.5 text-sm font-normal leading-5 text-[#4b5870]">
                ระบบจะสร้างรายชื่อพนักงานในรอบเดือนที่ตรงกับวันที่เริ่มงาน และหากมีการเปิดหลายรอบเดือน ระบบจะสร้างรายชื่อตั้งแต่รอบเดือนที่พนักงานเริ่มงาน ไปจนถึงรอบเดือนสุดท้ายที่ถูกเปิดอยู่ในปัจจุบัน
              </p>
              <div className="relative mt-1.5 min-h-[42px] pr-0 text-sm font-normal leading-5 text-[#4b5870] lg:pr-28">
                <span>⚠️ หมายเหตุ: หากต้องการสร้างรายชื่อในรูปแบบการคำนวณแบ่งงวดจ่าย (Split) กรุณาไปที่ ตั้งค่า → ตั้งค่าทั่วไป → รอบการคำนวณเงินเดือน แล้วเลือก &quot;แบ่งงวดจ่าย&quot; ก่อนทำการบันทึก</span>
                <button
                  type="button"
                  className="mt-1 inline-flex whitespace-nowrap text-sm font-medium leading-5 text-[#1474ee] hover:underline lg:absolute lg:right-0 lg:top-3 lg:mt-0"
                >
                  ▶ ไปที่หน้าตั้งค่า
                </button>
              </div>
            </div>

            {/* Save */}
            <div className="mt-3 pt-1 pb-[6px]">
              {saveStatus === "error" && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{saveMessage}</p>
              )}
              {saveStatus === "success" && (
                <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{saveMessage}</p>
              )}
              <button
                type="submit"
                form="employee-create-form"
                disabled={saving || codeDuplicate}
                className="flex h-[36.65px] w-full items-center justify-center gap-2 rounded-lg bg-[#1474ee] text-sm font-medium leading-5 text-white shadow-[0_4px_12px_rgba(20,116,238,.24)] transition-colors hover:bg-[#0d65d8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              อยู่ระหว่างการพัฒนา
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
