"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { format, parse } from "date-fns";
import { th } from "date-fns/locale/th";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
    <div className={cn("p-1", className)}>
      <label className="mb-1 block font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-[rgba(0,0,0,0.65)]">
        {label}
        {required && <span className="text-red-500">*</span>}
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
}: {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}) {
  return (
    <input
      type="text"
      name={name}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
      "relative -top-1 h-8 w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 font-[Kanit,sans-serif] text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)] shadow-none outline-none placeholder:text-muted-foreground/60 focus:border-[#2299ff]",
        disabled && "cursor-not-allowed bg-muted text-muted-foreground",
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
    <div className={cn("relative", className)}>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        className={cn(
          "relative -top-1 h-8 w-full appearance-none rounded-[4px] border border-[#d9d9d9] bg-white px-3 pr-8 font-[Kanit,sans-serif] text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)] shadow-none outline-none focus:border-[#2299ff]",
          defaultValue ? "text-foreground" : "text-muted-foreground/60",
          disabled && "cursor-not-allowed bg-muted text-muted-foreground"
        )}
      >
        {!defaultValue && <option value="">{placeholder ? "" : "เลือก"}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-[calc(50%-4px)] size-4 -translate-y-1/2 text-black/45" />
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
      <select
        name="employeeTypeDefinitionId"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || availableTypes.length === 0}
        required
        className={cn(
          "h-8 w-full appearance-none rounded-[4px] border border-[#d9d9d9] bg-card px-3 pr-8 text-sm leading-[22px] shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value ? "text-foreground" : "text-muted-foreground/60",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
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
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
    setExpanded((current) => new Set([...current, ...companies.map((company) => company.id)]));
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
              "min-w-0 flex-1 rounded-sm px-1.5 py-1 text-left text-sm leading-5",
              isCompany
                ? "cursor-not-allowed text-[#999]"
                : "text-foreground hover:bg-[#bae7ff]",
              value === nodeValue && "bg-[#e6f7ff] text-[#1677ff]"
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
          className="flex h-8 w-full items-center justify-between rounded-[4px] border border-[#d9d9d9] bg-card px-3 text-left text-sm leading-[22px] text-foreground shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          <span className={cn("truncate", !selectedNode && "text-muted-foreground/60")}>
            {loading
              ? "กำลังโหลดโครงสร้างองค์กร..."
              : selectedNode
                ? `${selectedNode.code}: ${selectedNode.name}`
                : "เลือกโครงสร้างองค์กร"}
          </span>
          <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
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
    setExpanded((current) => new Set([...current, ...positions.map((position) => position.id)]));
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
              "min-w-0 flex-1 rounded-sm px-1.5 py-1 text-left text-sm leading-5 text-foreground hover:bg-[#bae7ff]",
              value === node.id && "bg-[#e6f7ff] text-[#1677ff]"
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
          className="flex h-8 w-full items-center justify-between rounded-[4px] border border-[#d9d9d9] bg-card px-3 text-left text-sm leading-[22px] text-foreground shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          <span className={cn("truncate", !selectedNode && "text-muted-foreground/60")}>
            {loading ? "กำลังโหลดโครงสร้างตำแหน่ง..." : selectedNode ? `${selectedNode.code}: ${selectedNode.name}` : "เลือกตำแหน่ง"}
          </span>
          <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
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
}: {
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);

  // Parse defaultValue (MM/dd/yyyy) to Date if provided
  const initialDate = (() => {
    if (!defaultValue) return undefined;
    try {
      return parse(defaultValue, "MM/dd/yyyy", new Date());
    } catch {
      return undefined;
    }
  })();

  const [selected, setSelected] = useState<Date | undefined>(initialDate);

  const displayText = selected ? format(selected, "dd/MM/yyyy") : "";

  return (
    <div className={cn("relative", className)}>
      <input type="hidden" name={name} value={selected ? format(selected, "MM/dd/yyyy") : ""} />
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "relative -top-1 flex h-8 w-full items-center justify-between rounded-[4px] border border-[#d9d9d9] bg-white px-3 pr-9 font-[Kanit,sans-serif] text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)] shadow-none outline-none focus:border-[#2299ff]",
              disabled && "cursor-not-allowed bg-muted text-muted-foreground",
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
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(day) => {
                setSelected(day);
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

function RadioGroup({
  options,
  value,
  onChange,
  className,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-x-2",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="flex h-[22px] shrink-0 items-center gap-1 text-sm leading-[22px] text-foreground"
        >
          <span
            className={cn(
              "flex size-3.5 items-center justify-center rounded-full border",
              opt === value ? "border-primary" : "border-muted-foreground/40"
            )}
          >
            {opt === value && <span className="size-2 rounded-full bg-primary" />}
          </span>
          <span className="truncate">{opt}</span>
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
      <span className="text-sm font-semibold leading-[22px] text-foreground">{label}</span>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function OrganizationEmployeeCreatePage({
  onCancel,
  onComplete,
  employeeCount,
}: {
  onCancel?: () => void;
  onComplete?: () => void;
  employeeCount?: number | null;
}) {
  const router = useRouter();
  const currentEmployeeCount = employeeCount ?? 1;
  const employeeLimit = 2;
  const progressPct = Math.min(100, Math.round((currentEmployeeCount / employeeLimit) * 100));
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
  const selectedOrganizationCompanyId = companyIdForOrganization(organizations, organizationSelection);

  // Employee code duplicate check
  const [employeeCode, setEmployeeCode] = useState("");
  const [codeDuplicate, setCodeDuplicate] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
  const [existingEmployee, setExistingEmployee] = useState<
    { employeeNumber: string; fullName: string } | null
  >(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setCodeDuplicate(false);
      setCodeChecking(false);
      setExistingEmployee(null);
      return;
    }
    setCodeChecking(true);
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
      } finally {
        setCodeChecking(false);
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
    <div className="w-full overflow-x-hidden">
{/* Header follows the employee-data page header used by HRMic. */}
      <section className="relative flex h-40 items-center justify-between overflow-hidden border-b border-white/20 bg-[#61a8ff] p-6 tracking-[-0.1px] text-white">
        <div className="flex min-w-0 flex-col items-start">
          <div className="hidden items-center text-sm leading-[22.001px] text-white/70 md:flex">
            <span>ข้อมูลองค์กร</span>
            <ChevronRight className="size-4" />
            <span>ข้อมูลพนักงาน</span>
          </div>
          <div className="flex items-center">
            <h1 className="w-fit pr-[30px] text-2xl font-normal leading-[37.716px] text-white">ข้อมูลพนักงาน</h1>
            <button
              type="button"
              className="hidden"
              aria-label="ข้อมูลเพิ่มเติมเกี่ยวกับหน้าข้อมูลพนักงาน"
            >
              ?
            </button>
          </div>
        </div>

        <div className="mx-16 hidden flex-1 flex-col items-center justify-center md:flex">
          <div className="h-2 w-full overflow-hidden bg-[#c5c6cb] [background-image:radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.25)_1px,transparent_1.25px)] [background-size:8px_4px]">
            <div className="h-full bg-[#ffa000] transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <label className="w-full text-right text-sm font-normal leading-[22.001px] text-white">
            {currentEmployeeCount}/{employeeLimit} คน
          </label>
        </div>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 hidden h-[36.65px] shrink-0 items-center justify-center rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.2),0px_2px_2px_0px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)] transition-colors hover:bg-slate-100 md:inline-flex"
          >
            ยกเลิก
          </button>
        ) : (
          <Link
            href="/organization/organization-employee/dashboard"
            className="mt-4 hidden h-[36.65px] shrink-0 items-center justify-center rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0px_3px_1px_-2px_rgba(0,0,0,0.2),0px_2px_2px_0px_rgba(0,0,0,0.14),0px_1px_5px_0px_rgba(0,0,0,0.12)] transition-colors hover:bg-slate-100 md:inline-flex"
          >
            ยกเลิก
          </Link>
        )}
      </section>

      <div className="relative z-10 mt-0 space-y-0 p-2 sm:p-3 lg:-mt-[25px] lg:p-4">
        {/* Sub-navigation tabs */}
              <div className="relative overflow-hidden rounded-t-[5px] rounded-b-none border-0 border-b border-[#d9e1e8] bg-card shadow-none">
                <div
                  ref={tabViewportRef}
                  className="overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div className="flex min-w-max items-center px-8">
          {TABS.map((tab) => {
            const active = tab === activeTab;
            const disabled = tab !== "ข้อมูลพื้นฐาน" && tab !== "ตั้งค่า";
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                disabled={disabled}
                style={{ width: TAB_WIDTHS[tab] }}
                className={cn(
                  "h-12 shrink-0 whitespace-nowrap border-b-2 px-4 text-sm font-semibold leading-[22px] transition-colors",
                  active
                    ? "border-[#515151] text-[#515151]"
                    : disabled
                      ? "border-transparent text-black/40"
                      : "border-transparent text-[#515151] hover:text-foreground"
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
                  onClick={() => scrollTabs("back")}
                  disabled={!canScrollTabsBack}
                  className={cn(
                    "absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-center bg-card text-[#515151] shadow-[4px_0_8px_rgba(0,0,0,0.18)] transition-colors hover:bg-muted disabled:cursor-default disabled:text-black/25 disabled:hover:bg-card",
                    !canScrollTabsBack && "pointer-events-none"
                  )}
                  aria-label="ก่อนหน้า"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 -rotate-[135deg] border-r-2 border-t-2 border-current"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTabs("forward")}
                  disabled={!canScrollTabsForward}
                  className={cn(
                    "absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-center bg-card text-[#515151] shadow-[-4px_0_8px_rgba(0,0,0,0.18)] transition-colors hover:bg-muted disabled:cursor-default disabled:text-black/25 disabled:hover:bg-card",
                    !canScrollTabsForward && "pointer-events-none"
                  )}
                  aria-label="ถัดไป"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 rotate-45 border-r-2 border-t-2 border-current"
                  />
                </button>
              </div>

      {/* Form content */}
      {activeTab === "ข้อมูลพื้นฐาน" ? (
        <Card className="rounded-b-[5px] rounded-t-none border-0 shadow-none xl:min-h-[1184.85px]">
          <CardContent className="p-0">
          <form id="employee-create-form" onSubmit={handleSubmit} className="space-y-0 px-3 pt-3 text-sm leading-[22px] sm:px-4 sm:pt-4 lg:mx-6 lg:px-0">
            {/* Row 1 */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-6">
              <FieldShell label="รหัสพนักงาน">
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type="text"
                      name="employeeCode"
                      placeholder="รหัสพนักงาน"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      className={cn(
                        "relative -top-1 h-8 w-full rounded-[4px] border border-[#d9d9d9] bg-white px-3 font-[Kanit,sans-serif] text-sm leading-[22.001px] text-[rgba(0,0,0,0.65)] shadow-none outline-none placeholder:text-muted-foreground/60 focus:border-[#2299ff]",
                        codeDuplicate
                          ? "border-[0.5px] border-red-300 focus-visible:ring-red-300"
                          : "border-input"
                      )}
                    />
                    {codeChecking && (
                      <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </FieldShell>
              <FieldShell label="รหัสลายนิ้วมือ">
                <TextInput name="fingerprintCode" placeholder="รหัสลายนิ้วมือ" />
              </FieldShell>
              <FieldShell label="เพศ">
                <RadioGroup className="max-w-[140px]" options={["ชาย", "หญิง", "ไม่ระบุ"]} value={gender} onChange={setGender} />
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
                <SelectInput name="title" options={["นาย", "นาง", "นางสาว", "ดร.", "ศาสตราจารย์"]} defaultValue="นาย" />
              </FieldShell>
              <FieldShell label="ชื่อ" required>
                <TextInput name="firstNameTH" placeholder="ชื่อ" />
              </FieldShell>
              <FieldShell label="นามสกุล" required>
                <TextInput name="lastNameTH" placeholder="นามสกุล" />
              </FieldShell>
              <FieldShell label="ชื่อเล่น">
                <TextInput name="nickname" placeholder="ชื่อเล่น" />
              </FieldShell>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
              <FieldShell label="ชื่อ (ENG)">
                <TextInput name="firstNameEN" placeholder="First Name" />
              </FieldShell>
              <FieldShell label="นามสกุล (ENG)">
                <TextInput name="lastNameEN" placeholder="Last Name" />
              </FieldShell>
              <FieldShell label="ชื่อเล่น (ENG)">
                <TextInput name="nicknameEN" placeholder="Nickname" />
              </FieldShell>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 gap-0 pb-2 sm:grid-cols-2 xl:grid-cols-[25%_12.4%_12.6%_25%_25%]">
              <FieldShell label="สถานะ">
                <SelectInput name="maritalStatus" options={["โสด", "สมรส", "หย่าร้าง", "หม้าย"]} defaultValue="โสด" />
              </FieldShell>
              <FieldShell label="วันเกิด">
                <DateInput name="birthDate" />
              </FieldShell>
              <FieldShell label="อายุ">
                <TextInput placeholder="อายุ" disabled />
              </FieldShell>
              <FieldShell label="เบอร์โทรศัพท์">
                <TextInput name="phone" placeholder="เบอร์โทรศัพท์" />
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
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-6">
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
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
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
                <DateInput name="socialSecurityStart" placeholder="เลือกวันที่" />
              </FieldShell>
            </div>

            {/* Row 8: Tax */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
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
                <DateInput name="taxStart" placeholder="เลือกวันที่" />
              </FieldShell>
            </div>

            {/* Row 9: Dates & probation */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:min-h-[63.6px] xl:grid-cols-6">
              <FieldShell label="วันที่เริ่มงาน" required>
                <DateInput name="hireDate" defaultValue="08/14/2026" />
              </FieldShell>
              <FieldShell label="วันที่บรรจุ">
                <DateInput name="confirmationDate" />
              </FieldShell>
              <FieldShell label="วันที่หมดสัญญาจ้าง">
                <DateInput name="contractEndDate" />
              </FieldShell>
              <FieldShell label="ปีที่เกษียณ">
                <DateInput name="retirementDate" placeholder="เลือกวันที่" />
              </FieldShell>
              <FieldShell label="ระยะเวลาทดลองงาน">
                <TextInput name="probationDays" placeholder="119" />
              </FieldShell>
              <FieldShell label="วันที่สิ้นสุดทดลองงาน">
                <DateInput name="probationDate" defaultValue="12/10/2026" disabled />
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

            {/* Row 11: Description */}              <FieldShell label="รายละเอียด" className="xl:h-[61.6px]">
                <TextInput name="description" placeholder="รายละเอียด" />
              </FieldShell>

            {/* Row 12: Hashtag */}              <FieldShell label="Hashtag" className="xl:h-[61.6px]">
                <TextInput name="hashtag" placeholder="input # to mention tag" />
              </FieldShell>
          </form>

          <div className="px-3 sm:px-4 lg:mx-6 lg:px-0">
            {/* On-boarding */}
            <section className="h-auto p-1 lg:h-[187.6px]">
              <p className="h-[22px] text-sm leading-[22px] text-foreground">On-boarding</p>
              <div className="h-auto lg:h-[156.8px]">
                <div className="flex h-10 items-center justify-between">
                  <p className="text-sm leading-[22px] text-foreground">คอร์สเรียนที่มอบหมาย</p>
                  <button
                    type="button"
                    className="mt-[4.5px] inline-flex h-[26px] w-[123.36px] self-start items-center gap-1 text-sm text-[#008cff] transition-colors hover:text-[#0073d4]"
                  >
                    <Plus className="size-4" />
                    เพิ่มคอร์สเรียน
                  </button>
                </div>
                <div className="overflow-x-auto border border-border lg:h-[116.8px] lg:overflow-visible lg:border-0">
                  <table className="min-w-[44rem] w-full table-fixed text-sm leading-[22px] lg:min-w-0">
                    <colgroup>
                      <col className="w-[40%]" />
                      <col className="w-[17%]" />
                      <col className="w-[17%]" />
                      <col className="w-[17%]" />
                      <col className="w-[9%]" />
                    </colgroup>
                    <thead>
                      <tr className="h-[54.8px] text-center text-foreground">
                        <th className="p-0 font-normal">ชื่อคอร์ส</th>
                        <th className="p-0 font-normal">สถานะ</th>
                        <th className="p-0 font-normal">วันที่เริ่ม</th>
                        <th className="p-0 font-normal">วันที่จบ</th>
                        <th className="p-0 font-normal" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-[62px] border-t border-border bg-card">
<td className="px-5 text-foreground">การเข้าใช้งาน Application HRMic สำหรับพนักงานใหม่</td>
                        <td className="text-center">
                          <span className="inline-flex items-center gap-[5px] text-emerald-600">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Publish
                          </span>
                        </td>
                        <td className="text-center"><CalendarIcon className="mx-auto size-3 text-muted-foreground" /></td>
                        <td className="text-center"><CalendarIcon className="mx-auto size-3 text-muted-foreground" /></td>
                        <td className="text-center">
                          <button type="button" className="relative -top-[2.7px] mx-auto flex size-8 items-center justify-center rounded-full bg-[#eb8794] text-white" aria-label="ลบคอร์ส">
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Payroll round and warning */}
            <div className="mt-4 h-auto lg:h-[120.45px]">
              <div className="h-[34.45px] pt-3">
                <Toggle checked={payrollRound} onChange={setPayrollRound} label="สร้างรายชื่อในรอบคำนวณเงินเดือน" />
              </div>
              <p className="mt-[5px] text-sm leading-[22px] text-foreground">
                ระบบจะสร้างรายชื่อพนักงานในรอบเดือนที่ตรงกับวันที่เริ่มงาน และหากมีการเปิดหลายรอบเดือน ระบบจะสร้างรายชื่อตั้งแต่รอบเดือนที่พนักงานเริ่มงาน ไปจนถึงรอบเดือนสุดท้ายที่ถูกเปิดอยู่ในปัจจุบัน
              </p>
              <div className="relative mt-[5px] min-h-[42px] pr-0 text-sm leading-[21px] text-foreground lg:pr-24">
                <span>⚠️ หมายเหตุ: หากต้องการสร้างรายชื่อในรูปแบบการคำนวณแบ่งงวดจ่าย (Split) กรุณาไปที่ ตั้งค่า → ตั้งค่าทั่วไป → รอบการคำนวณเงินเดือน แล้วเลือก &quot;แบ่งงวดจ่าย&quot; ก่อนทำการบันทึก</span>
                <button
                  type="button"
                  className="mt-1 inline-flex w-[92.1px] whitespace-nowrap text-sm font-semibold leading-[16.1px] text-[#008cff] hover:underline lg:absolute lg:right-0 lg:top-[13px] lg:mt-0"
                >
                  ▶ ไปที่หน้าตั้งค่า
                </button>
              </div>
            </div>

            {/* Save */}
            <div className="mt-3 h-auto p-1 lg:h-11">
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
                className="flex h-9 w-full items-center justify-center gap-2 rounded-[4px] bg-[#03ae03] text-sm font-semibold leading-9 text-white shadow-sm transition-colors hover:bg-[#029702] disabled:cursor-not-allowed disabled:opacity-60"
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
