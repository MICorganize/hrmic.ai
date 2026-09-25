"use client";

import { DropdownSelect } from "@/components/ui/dropdown-select";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Filter, FolderOpen, Search, UsersRound, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type OrgNode = {
  id: string;
  code: string;
  name: string;
  kind?: "company" | "branch" | "department" | "employee";
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

function employeeDisplayName(node: OrgNode) {
  const nameFromParts = [node.firstNameTH, node.lastNameTH].filter(Boolean).join(" ").trim();
  const name = nameFromParts || node.name;
  return name.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

function countEmployees(nodes: OrgNode[]): number {
  return nodes.reduce(
    (total, node) => total + (isEmployeeNode(node) ? 1 : countEmployees(node.children ?? [])),
    0
  );
}

function hideCompanyAndBranchNodes(nodes: OrgNode[]): OrgNode[] {
  return nodes.flatMap((node) => {
    const children = hideCompanyAndBranchNodes(node.children ?? []);
    if (node.kind === "company" || node.kind === "branch") return children;
    return [{ ...node, ...(node.children ? { children } : {}) }];
  });
}

function organizationLabel(node: OrgNode) {
  return node.kind === "department" ? node.name : `${node.code}: ${node.name}`;
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
    organizations.push({ id: node.id, label: organizationLabel(node) });
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
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <span className="relative block">
      <DropdownSelect
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={cn("h-[30px] w-full appearance-none rounded-[4px] border border-[#dfe4e8] bg-white px-2.5 pr-8 text-xs font-normal leading-[18px] text-[#34425c] outline-none ring-[#5eaafa] transition-colors focus:ring-2", className)}
      >
        {children}
      </DropdownSelect>
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
  const className = cn(
    "-ml-[5.6px] mt-0 flex min-h-[46px] w-[calc(100%+5.6px)] max-w-full appearance-none items-center rounded-lg border border-[#e3e8f0] bg-white py-[5px] pl-3 pr-2.5 text-left text-sm leading-5 text-[#4d5a6d] shadow-[0_2px_8px_rgba(29,52,93,.05)] transition-colors hover:border-[#9dc9ff] hover:bg-[#f7faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eaafa]",
    node.type && "min-h-[50px]"
  );
  const content = (
    <>
      <span
        className={cn(
          "-my-[5px] -ml-3 mr-3 self-stretch w-1 shrink-0 rounded-l-lg",
          node.status === "inactive" ? "bg-[#ef5350]" : "bg-[#20b889]"
        )}
        aria-label={node.status === "inactive" ? "พนักงานไม่ปฏิบัติงาน" : "พนักงานปฏิบัติงาน"}
      />
      <span className="flex min-w-0 flex-col justify-center">
        <span className="block truncate text-xs font-medium leading-[18px] text-[#34425c]">
          <span className="font-semibold text-[#1474ee]">{node.code}</span>: <span>{employeeDisplayName(node)}</span>
        </span>
        {node.type && (
          <span className="mt-0.5 block w-fit rounded-full bg-[#eaf4ff] px-1.5 text-[10px] leading-[14px] text-[#1474ee]">{node.type}</span>
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
        // The original tree carries a continuous dotted rail at every depth.
        // Each rail begins one row above its card, matching the Material-tree
        // layout used by the source screen.
        // Keep the rail toward the panel edge so the hierarchy stays balanced
        // inside the compact 270px employee panel. The horizontal connector
        // still ends at the employee card's -5.6px inset.
        level > 1 && "before:absolute before:left-[-21.4px] before:top-[-13.2px] before:bottom-0 before:border-l before:border-dotted before:border-[#c9d5e5] after:absolute after:left-[-21.4px] after:top-6 after:w-[15.8px] after:border-t after:border-dotted after:border-[#c9d5e5]"
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
  const [previousForceExpanded, setPreviousForceExpanded] = useState(forceExpanded);
  if (previousForceExpanded !== forceExpanded) {
    setPreviousForceExpanded(forceExpanded);
    if (forceExpanded) setExpanded(true);
  }
  if (isEmployee) return <EmployeeNode node={node} level={level} onSelect={onSelect} onEmployeeSelect={onEmployeeSelect} />;

  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-selected={false}
      aria-expanded={hasChildren ? expanded : undefined}
      className={cn(
        "relative list-none",
        level > 1 && "before:absolute before:left-[-21.4px] before:top-[-13.2px] before:bottom-0 before:border-l before:border-dotted before:border-[#c9d5e5]"
      )}
    >
      <div className="mb-1 flex min-h-10 items-center text-sm leading-5 text-[#34425c]">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mr-0 flex size-10 shrink-0 items-center justify-center rounded-lg text-[#738199] transition-colors hover:bg-[#eaf4ff] hover:text-[#1474ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eaafa]"
            aria-label={expanded ? `ย่อ ${node.code}` : `ขยาย ${node.code}`}
          >
              <ChevronDown
                className={cn("relative left-[-10.8px] size-3.5 transition-transform", !expanded && "-rotate-90")}
              aria-hidden="true"
            />
          </button>
        ) : (
          <span className="mr-2 size-10 shrink-0" aria-hidden="true" />
        )}
        <span className="relative left-[-20.8px] min-w-0 flex-1 break-words rounded-lg border border-[#e3e8f0] bg-white px-3 py-2 text-sm font-medium leading-5 text-[#34425c] shadow-[0_2px_8px_rgba(29,52,93,.04)]">
          {organizationLabel(node)}
          {node.count !== undefined && <span className="ml-1 text-xs font-medium text-[#7b8798]">({node.count})</span>}
        </span>
      </div>

      {expanded && (
        <ul
          role="group"
          className="relative mb-2 ml-[30.6px] list-none p-0"
        >
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
  error = false,
  onRetry,
  onEmployeeSelect,
  placement = "page",
}: {
  onClose: () => void;
  orgTree: OrgNode[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onEmployeeSelect?: (employee: OrgNode) => void;
  /** The detail view establishes its own positioned content area. */
  placement?: "page" | "detail";
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<EmployeeFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<EmployeeFilters>(EMPTY_FILTERS);
  const filteredTree = useMemo(() => filterTree(orgTree, appliedFilters), [orgTree, appliedFilters]);
  const visibleTree = useMemo(() => hideCompanyAndBranchNodes(filteredTree), [filteredTree]);
  const options = useMemo(() => collectOptions(hideCompanyAndBranchNodes(orgTree)), [orgTree]);
  const hasAppliedFilters = Object.values(appliedFilters).some((value) => value !== "" && value !== "active");

  const updateDraft = <K extends keyof EmployeeFilters>(key: K, value: EmployeeFilters[K]) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const panel = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/30 lg:z-[999]"
        aria-label="ปิดรายชื่อพนักงาน"
      />

      <aside
        data-employee-select-panel
        data-placement={placement}
        className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[280px] max-w-[85vw] flex-col border-r border-[#dfe5ee] bg-[#f7f9fc] font-sans shadow-[8px_0_24px_rgba(29,52,93,.14)] lg:bottom-0 lg:z-[1000] lg:w-[280px] lg:max-w-none",
          "lg:left-[230px] lg:top-[70px]"
        )}
        aria-label="รายชื่อพนักงาน"
      >
        <div className="shrink-0 border-b border-[#e5eaf2] bg-white px-4 py-3">
          <div className="relative flex min-h-10 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eaf4ff] text-[#1474ee]">
              <UsersRound className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="whitespace-nowrap text-base font-semibold leading-5 text-[#172348]">รายชื่อพนักงาน</h2>
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen((current) => !current)}
              className={cn("relative left-[20px] ml-auto flex size-9 shrink-0 items-center justify-center rounded-lg text-[#718096] transition-colors hover:bg-[#eaf4ff] hover:text-[#1474ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eaafa]", filterOpen && "bg-[#eaf4ff] text-[#1474ee]")}
              aria-label="กรองรายชื่อพนักงาน"
              aria-expanded={filterOpen}
            >
              <Filter className="size-4" />
            </button>
            <button type="button" onClick={onClose} className="relative left-[5px] flex size-9 items-center justify-center rounded-lg text-[#718096] transition-colors hover:bg-[#eaf4ff] hover:text-[#1474ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eaafa]" aria-label="ปิดรายชื่อพนักงาน">
              <X className="size-4" />
            </button>
          </div>

          {filterOpen && (
            <div className="relative -left-2 mt-3 flex flex-col gap-[6px] rounded-none border border-[#e5eaf2] bg-[#f8faff] p-1.5 text-xs leading-[18px] text-[#34425c] shadow-inner w-[calc(100%+16px)]">
              <label className="flex h-[30px] items-center gap-2 rounded-[4px] border border-[#dfe4e8] bg-white px-2.5 text-[#738199] ring-[#5eaafa] focus-within:ring-2">
                <span className="sr-only">คำค้นหา</span>
                <Search aria-hidden="true" className="size-3.5 shrink-0" />
                <input value={draftFilters.query} onChange={(event) => updateDraft("query", event.target.value)} placeholder="ค้นหารหัสหรือชื่อพนักงาน" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs font-normal leading-[18px] text-[#34425c] outline-none placeholder:text-[#9aa5b4]" />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium leading-[18px] text-[#5e6b7c]">โครงสร้างองค์กร</span>
                <FilterSelect value={draftFilters.organizationId} onChange={(value) => updateDraft("organizationId", value)} ariaLabel="โครงสร้างองค์กร" className="h-[30px]">
                  <option value="">โครงสร้างองค์กร</option>
                  {options.organizations.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </FilterSelect>
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium leading-[18px] text-[#5e6b7c]">ตำแหน่ง</span>
                  <FilterSelect value={draftFilters.positionId} onChange={(value) => updateDraft("positionId", value)} ariaLabel="ตำแหน่ง">
                    <option value="">ตำแหน่ง</option>
                    {options.positions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </FilterSelect>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium leading-[18px] text-[#5e6b7c]">ประเภทพนักงาน</span>
                  <FilterSelect value={draftFilters.employeeType} onChange={(value) => updateDraft("employeeType", value)} ariaLabel="ประเภทพนักงาน">
                    <option value="">ประเภทพนักงาน</option>
                    {options.employeeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </FilterSelect>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium leading-[18px] text-[#5e6b7c]">สถานะพนักงาน</span>
                  <FilterSelect value={draftFilters.status} onChange={(value) => updateDraft("status", value as EmployeeFilters["status"])} ariaLabel="สถานะพนักงาน">
                    <option value="active">เฉพาะที่ Active</option>
                    <option value="inactive">เฉพาะที่ Inactive</option>
                    <option value="all">ทั้งหมด</option>
                  </FilterSelect>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium leading-[18px] text-[#5e6b7c]">#Hashtag</span>
                  <span className="flex h-[30px] items-center gap-2 rounded-[4px] border border-[#dfe4e8] bg-white px-2.5 text-[#738199] ring-[#5eaafa] focus-within:ring-2">
                    <Search aria-hidden="true" className="size-3.5 shrink-0" />
                    <input value={draftFilters.hashtag} onChange={(event) => updateDraft("hashtag", event.target.value)} placeholder="#Hashtag" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs font-medium leading-[18px] text-[#34425c] outline-none placeholder:text-[#9aa5b4]" />
                  </span>
                </label>
              </div>

              <div className="flex gap-[6px]">
                <button type="button" onClick={clearFilters} className="h-[30px] flex-1 rounded-lg border border-[#dfe4e8] bg-white px-3 text-xs font-medium leading-[18px] text-[#5f6d80] transition-colors hover:bg-[#f2f5f9]">ล้างค่า</button>
                <button type="button" onClick={() => { setAppliedFilters(draftFilters); setFilterOpen(false); }} className="h-[30px] flex-1 rounded-lg bg-[#1474ee] px-3 text-xs font-medium leading-[18px] text-white shadow-[0_4px_12px_rgba(20,116,238,.24)] transition-colors hover:bg-[#0d65d8]">ค้นหา</button>
              </div>
            </div>
          )}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto bg-[#f7f9fc] px-[7px] py-3 text-sm leading-5 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]"
          data-testid="org-emp-select-tree"
          aria-busy={loading}
        >
          <ul role="tree" className="m-0 -ml-2.5 list-none p-0" aria-label="โครงสร้างองค์กรและรายชื่อพนักงาน">
            {loading ? (
              <li role="none" className="px-1 py-1">
                <p role="status" className="sr-only">กำลังโหลดรายชื่อพนักงาน...</p>
                <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
                  <div className="h-10 w-60 rounded-lg bg-[#e6ebf2]" />
                  <div className="ml-5 h-10 w-52 rounded-lg bg-[#edf1f6]" />
                  <div className="ml-10 space-y-2 border-l border-dotted border-[#c9d5e5] pl-4">
                    {[0, 1, 2, 3, 4].map((row) => <div key={row} className="h-[50px] rounded-lg border border-[#e3e8f0] bg-white p-2 shadow-[0_2px_8px_rgba(29,52,93,.04)]"><div className="h-3 w-36 rounded bg-[#e6ebf2]" /><div className="mt-2 h-2 w-20 rounded bg-[#dcecff]" /></div>)}
                  </div>
                </div>
              </li>
            ) : error ? (
              <li role="none" className="rounded-xl border border-[#e5eaf2] bg-white px-4 py-10 text-center text-sm text-[#738199]">
                <p role="alert">ไม่สามารถโหลดรายชื่อพนักงานได้</p>
                <button type="button" onClick={onRetry} className="mt-3 font-medium text-[#1474ee] hover:text-[#0d65d8]">ลองใหม่</button>
              </li>
            ) : visibleTree.length === 0 ? (
              <li role="none" className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-[#e5eaf2] bg-white text-center text-[#8894a6]">
                <span className="flex size-11 items-center justify-center rounded-full bg-[#eef5ff] text-[#1474ee]"><FolderOpen className="size-5" /></span>
                <span className="text-sm font-medium">ไม่มีข้อมูลพนักงาน</span>
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

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}
