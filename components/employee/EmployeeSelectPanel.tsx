"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, FolderOpen, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type OrgNode = {
  id: string;
  code: string;
  name: string;
  firstNameTH?: string;
  lastNameTH?: string;
  nickname?: string | null;
  count?: number;
  /** Employee type shown below the name on employee nodes. */
  type?: string;
  organizationIds?: string[];
  positionId?: string;
  positionName?: string;
  status?: "active" | "inactive";
  hashtag?: string | null;
  children?: OrgNode[];
};

type EmployeeFilters = {
  query: string;
  organizationId: string;
  positionId: string;
  employeeType: string;
  status: "active" | "inactive" | "all";
  hashtag: string;
};

const EMPTY_FILTERS: EmployeeFilters = {
  query: "",
  organizationId: "",
  positionId: "",
  employeeType: "",
  status: "active",
  hashtag: "",
};

function isEmployeeNode(node: OrgNode) {
  return node.count === undefined && (node.children?.length ?? 0) === 0;
}

function countEmployees(nodes: OrgNode[]): number {
  return nodes.reduce(
    (total, node) => total + (isEmployeeNode(node) ? 1 : countEmployees(node.children ?? [])),
    0
  );
}

function filterTree(nodes: OrgNode[], filters: EmployeeFilters): OrgNode[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const hashtag = filters.hashtag.trim().replace(/^#/, "").toLocaleLowerCase();

  return nodes.flatMap((node) => {
    if (isEmployeeNode(node)) {
      const matchesQuery = !query || `${node.code} ${node.name} ${node.type ?? ""} ${node.positionName ?? ""}`.toLocaleLowerCase().includes(query);
      const matchesOrganization = !filters.organizationId || node.organizationIds?.includes(filters.organizationId);
      const matchesPosition = !filters.positionId || node.positionId === filters.positionId;
      const matchesType = !filters.employeeType || node.type === filters.employeeType;
      const matchesStatus = filters.status === "all" || node.status === filters.status;
      const matchesHashtag = !hashtag || node.hashtag?.toLocaleLowerCase().includes(hashtag);
      return matchesQuery && matchesOrganization && matchesPosition && matchesType && matchesStatus && matchesHashtag ? [node] : [];
    }

    const children = node.children ? filterTree(node.children, filters) : [];
    // Humansoft replaces the count on each retained organization with the
    // number of matching employees beneath it. Keeping the source count here
    // made a search result such as one employee still display "(38)".
    return children.length > 0 ? [{ ...node, count: countEmployees(children), children }] : [];
  });
}

function collectOptions(nodes: OrgNode[]) {
  const organizations: { id: string; label: string }[] = [];
  const positions = new Map<string, string>();
  const employeeTypes = new Set<string>();

  const visit = (node: OrgNode) => {
    if (isEmployeeNode(node)) {
      if (node.positionId && node.positionName) positions.set(node.positionId, node.positionName);
      if (node.type) employeeTypes.add(node.type);
      return;
    }
    organizations.push({ id: node.id, label: `${node.code}: ${node.name}` });
    node.children?.forEach(visit);
  };

  nodes.forEach(visit);
  return { organizations, positions: [...positions], employeeTypes: [...employeeTypes] };
}

function FilterSelect({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <span className="relative block">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="h-[31.6px] w-full appearance-none rounded-[4px] border border-[#d9d9d9] bg-white py-px pl-[9.6px] pr-6 font-[Kanit,sans-serif] text-sm font-normal leading-[22.001px] text-black/65 outline-none focus:border-[#2299ff]"
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-[9.6px] top-1/2 size-3 -translate-y-1/2 text-black/[0.54]" />
    </span>
  );
}

function EmployeeNode({
  node,
  level,
  onSelect,
  onEmployeeSelect,
}: {
  node: OrgNode;
  level: number;
  onSelect: () => void;
  onEmployeeSelect?: (employee: OrgNode) => void;
}) {
  const className = "ml-[16px] mt-0 flex h-[43.2px] w-max max-w-full appearance-none items-center rounded-[5px_8px_8px_5px] border-[0.8px] border-[#d9d9d9] bg-white py-1 pl-2.5 pr-2.5 text-left font-[Kanit,sans-serif] text-[14px] leading-[22.001px] text-black/65 shadow-[0_2px_0_rgba(0,0,0,0.016)] transition-colors hover:border-[#91caff] hover:bg-[#f0f8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2299ff]";
  const content = (
    <>
      <span
        className={cn(
          "-my-1 -ml-2.5 mr-2.5 self-stretch w-1 shrink-0 rounded-[5px_0_0_5px]",
          node.status === "inactive" ? "bg-[rgba(244,67,54,0.7)]" : "bg-[rgba(3,174,3,0.7)]"
        )}
        aria-label={node.status === "inactive" ? "พนักงานไม่ปฏิบัติงาน" : "พนักงานปฏิบัติงาน"}
      />
      <span className="min-w-0">
        <span className="block whitespace-nowrap text-xs font-medium leading-[18.4px] text-black/65">
          {node.code}: <span>{node.name}</span>
        </span>
        {node.type && (
          <span className="block h-[15.2px] w-fit rounded-[8px] bg-[#e6f3fe] px-1 text-[10px] leading-[15.2px] text-[#57a3db]">{node.type}</span>
        )}
      </span>
    </>
  );

  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-selected={false}
      className={cn(
        "relative pb-[2.8px] pt-[2px]",
        level > 1 && "before:absolute before:left-0 before:top-[23px] before:w-4 before:border-t before:border-dotted before:border-[#bfbfbf]"
      )}
    >
      {onEmployeeSelect ? (
        <button
          type="button"
          onClick={() => {
            onEmployeeSelect(node);
            onSelect();
          }}
          data-testid={`org-emp-select-node-${node.code}`}
          className={className}
        >
          {content}
        </button>
      ) : (
        <Link
          href="/organization/organization-employee"
          onClick={onSelect}
          data-testid={`org-emp-select-node-${node.code}`}
          className={className}
        >
          {content}
        </Link>
      )}
    </li>
  );
}

function OrganizationNode({
  node,
  level = 1,
  onSelect,
  onEmployeeSelect,
  forceExpanded = false,
}: {
  node: OrgNode;
  level?: number;
  onSelect: () => void;
  onEmployeeSelect?: (employee: OrgNode) => void;
  forceExpanded?: boolean;
}) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const isEmployee = isEmployeeNode(node);
  // The employee list is a browsing surface: show every employee card when
  // it opens, while still allowing a department to be collapsed manually.
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);
  if (isEmployee) return <EmployeeNode node={node} level={level} onSelect={onSelect} onEmployeeSelect={onEmployeeSelect} />;

  return (
    <li role="treeitem" aria-level={level} aria-selected={false} aria-expanded={hasChildren ? expanded : undefined} className="list-none">
      <div className="mb-[2.8px] flex h-10 items-center text-sm leading-[22.001px] text-[rgba(0,0,0,0.87)]">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
          className="mr-0 flex size-10 shrink-0 items-center justify-center text-[rgba(0,0,0,0.87)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2299ff]"
            aria-label={expanded ? `ย่อ ${node.code}` : `ขยาย ${node.code}`}
          >
            <ChevronDown
              className={cn("size-[19.2px] transition-transform", !expanded && "-rotate-90")}
              aria-hidden="true"
            />
          </button>
        ) : (
          <span className="mr-2 size-10 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 break-words rounded-[6px] border-[0.8px] border-black/50 px-3 py-1 font-[Kanit,sans-serif] text-[14px] font-normal leading-[22.001px] tracking-[-0.1px]">
          {node.code}: {node.name}
          {node.count !== undefined && ` (${node.count})`}
        </span>
      </div>

      {expanded && (
        <ul role="group" className="ml-5 list-none border-l border-dotted border-[#bfbfbf] p-0">
          {children.map((child) => (
            <OrganizationNode key={child.id} node={child} level={level + 1} onSelect={onSelect} onEmployeeSelect={onEmployeeSelect} forceExpanded={forceExpanded} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function EmployeeSelectPanel({
  onClose,
  orgTree,
  loading = false,
  onEmployeeSelect,
  placement = "page",
}: {
  onClose: () => void;
  orgTree: OrgNode[];
  loading?: boolean;
  onEmployeeSelect?: (employee: OrgNode) => void;
  /** The detail view establishes its own positioned content area. */
  placement?: "page" | "detail";
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<EmployeeFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<EmployeeFilters>(EMPTY_FILTERS);
  const visibleTree = useMemo(() => filterTree(orgTree, appliedFilters), [orgTree, appliedFilters]);
  const options = useMemo(() => collectOptions(orgTree), [orgTree]);
  const hasAppliedFilters = Object.values(appliedFilters).some((value) => value !== "" && value !== "active");

  const updateDraft = <K extends keyof EmployeeFilters>(key: K, value: EmployeeFilters[K]) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        aria-label="ปิดรายชื่อพนักงาน"
      />

      <aside
        data-employee-select-panel
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-full max-w-[386.4375px] flex-col bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] lg:bottom-0 lg:z-[1000] lg:w-[386.4375px] lg:max-w-none",
          placement === "detail" ? "lg:left-0 lg:top-0" : "lg:left-80 lg:top-16"
        )}
        aria-label="รายชื่อพนักงาน"
      >
        <div className="shrink-0 bg-[#61a8ff] px-3 py-3 text-white">
          <div className="relative flex h-10 items-center">
            <h2 className="font-[Kanit,sans-serif] text-xl font-semibold leading-[30.4px] tracking-[-0.1px]">รายชื่อพนักงาน</h2>
            <button
              type="button"
              onClick={() => setFilterOpen((current) => !current)}
              className="ml-auto flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="กรองรายชื่อพนักงาน"
              aria-expanded={filterOpen}
            >
              <Filter className="size-3" />
            </button>
          </div>

          {filterOpen && (
            <div className="mt-2.5 flex flex-col font-[Kanit,sans-serif] text-sm text-white">
              <label className="mb-2.5 flex h-[34.5px] items-center gap-3 rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] py-1 text-[#bfbfbf]">
                <span className="sr-only">คำค้นหา</span>
                <Search aria-hidden="true" className="size-4 shrink-0" />
                <input value={draftFilters.query} onChange={(event) => updateDraft("query", event.target.value)} placeholder="คำค้นหา" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal leading-[22.001px] text-black/65 outline-none placeholder:text-[#bfbfbf]" />
              </label>

              <label className="mb-2.5 block">
                <span className="block font-medium leading-[20.8px]">โครงสร้างองค์กร</span>
                <FilterSelect value={draftFilters.organizationId} onChange={(value) => updateDraft("organizationId", value)} ariaLabel="โครงสร้างองค์กร">
                  <option value="">โครงสร้างองค์กร</option>
                  {options.organizations.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </FilterSelect>
              </label>

              <div className="mb-2.5 grid grid-cols-2 gap-[5px]">
                <label className="block">
                  <span className="block font-medium leading-[20.8px]">ตำแหน่ง</span>
                  <FilterSelect value={draftFilters.positionId} onChange={(value) => updateDraft("positionId", value)} ariaLabel="ตำแหน่ง">
                    <option value="">ตำแหน่ง</option>
                    {options.positions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </FilterSelect>
                </label>
                <label className="block">
                  <span className="block font-medium leading-[20.8px]">กลุ่มประเภทพนักงาน</span>
                  <FilterSelect value={draftFilters.employeeType} onChange={(value) => updateDraft("employeeType", value)} ariaLabel="กลุ่มประเภทพนักงาน">
                    <option value="">กลุ่มประเภทพนักงาน</option>
                    {options.employeeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </FilterSelect>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-[5px]">
                <label className="mb-2.5 block">
                  <span className="block font-medium leading-[20.8px]">สถานะพนักงาน</span>
                  <FilterSelect value={draftFilters.status} onChange={(value) => updateDraft("status", value as EmployeeFilters["status"])} ariaLabel="สถานะพนักงาน">
                    <option value="active">เฉพาะที่ Active</option>
                    <option value="inactive">เฉพาะที่ Inactive</option>
                    <option value="all">ทั้งหมด</option>
                  </FilterSelect>
                </label>
                <label className="mb-2.5 block">
                  <span className="block font-medium leading-[20.8px]">#Hashtag</span>
                  <span className="flex h-[34.5px] items-center gap-3 rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] py-1 text-[#bfbfbf]">
                    <Search aria-hidden="true" className="size-4 shrink-0" />
                    <input value={draftFilters.hashtag} onChange={(event) => updateDraft("hashtag", event.target.value)} placeholder="#Hashtag" className="h-[23.6px] min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal leading-[22.001px] text-black/65 outline-none placeholder:text-[#bfbfbf]" />
                  </span>
                </label>
              </div>

              <div className="mb-2.5 flex gap-[5px]">
                <button type="button" onClick={clearFilters} className="h-9 flex-1 rounded-[4px] bg-[#e0e0e0] px-2.5 py-[3px] text-sm font-semibold leading-9 text-black/[0.87] shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ล้างค่า</button>
                <button type="button" onClick={() => { setAppliedFilters(draftFilters); setFilterOpen(false); }} className="h-9 flex-1 rounded-[4px] bg-[#04509d] px-2.5 py-[3px] text-sm font-semibold leading-7 text-white shadow-[0_3px_1px_-2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)]">ค้นหา</button>
              </div>
            </div>
          )}
        </div>

        <div
          className="-ml-[12.2px] min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-[21px] font-[Kanit,sans-serif] text-[14px] leading-[22.001px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="org-emp-select-tree"
        >
          <ul role="tree" className="m-0 list-none p-0" aria-label="โครงสร้างองค์กรและรายชื่อพนักงาน">
            {loading ? (
              <li role="treeitem" className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                กำลังโหลดรายชื่อพนักงาน...
              </li>
            ) : visibleTree.length === 0 ? (
              <li role="treeitem" className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <FolderOpen className="size-8" />
                <span className="text-sm">ไม่มีข้อมูลพนักงาน</span>
              </li>
            ) : (
              visibleTree.map((node) => (
                <OrganizationNode key={node.id} node={node} onSelect={onClose} onEmployeeSelect={onEmployeeSelect} forceExpanded={hasAppliedFilters} />
              ))
            )}
          </ul>
        </div>
      </aside>
    </>
  );
}
