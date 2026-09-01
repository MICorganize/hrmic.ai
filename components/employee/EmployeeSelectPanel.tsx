"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, FolderOpen, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type OrgNode = {
  id: string;
  code: string;
  name: string;
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
    return children.length > 0 ? [{ ...node, children }] : [];
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
}: {
  onClose: () => void;
  orgTree: OrgNode[];
  loading?: boolean;
  onEmployeeSelect?: (employee: OrgNode) => void;
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
        className="fixed inset-y-0 left-0 z-40 flex w-full max-w-[386.4375px] flex-col bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] lg:bottom-0 lg:left-80 lg:top-16 lg:w-[386.4375px] lg:max-w-none"
        aria-label="รายชื่อพนักงาน"
      >
        <div className="relative flex h-16 shrink-0 items-center bg-[#61a8ff] px-3 text-white">
          <h2 className="font-[Kanit,sans-serif] text-xl font-semibold leading-[30.4px] tracking-[-0.1px]">รายชื่อพนักงาน</h2>
          <button
            type="button"
            onClick={() => setFilterOpen((current) => !current)}
            className="ml-auto flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="กรองรายชื่อพนักงาน"
            aria-expanded={filterOpen}
          >
            <Filter className="size-4" />
          </button>
        </div>

        {filterOpen && (
          <div className="shrink-0 space-y-3 border-b border-[#d9d9d9] bg-white px-6 py-3 font-[Kanit,sans-serif] text-xs text-black/65">
            <label className="relative block">
              <span className="sr-only">คำค้นหา</span>
              <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-black/45" />
              <input value={draftFilters.query} onChange={(event) => updateDraft("query", event.target.value)} placeholder="คำค้นหา" className="h-8 w-full rounded border border-[#d9d9d9] pl-8 pr-2 text-sm outline-none focus:border-[#2299ff]" />
            </label>
            <label className="block">
              <span className="mb-1 block">โครงสร้างองค์กร</span>
              <select value={draftFilters.organizationId} onChange={(event) => updateDraft("organizationId", event.target.value)} className="h-8 w-full rounded border border-[#d9d9d9] bg-white px-2 text-sm outline-none focus:border-[#2299ff]">
                <option value="">โครงสร้างองค์กร</option>
                {options.organizations.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-[5px]">
              <label className="block">
                <span className="mb-1 block">ตำแหน่ง</span>
                <select value={draftFilters.positionId} onChange={(event) => updateDraft("positionId", event.target.value)} className="h-8 w-full rounded border border-[#d9d9d9] bg-white px-2 text-sm outline-none focus:border-[#2299ff]">
                  <option value="">ตำแหน่ง</option>
                  {options.positions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block">กลุ่มประเภทพนักงาน</span>
                <select value={draftFilters.employeeType} onChange={(event) => updateDraft("employeeType", event.target.value)} className="h-8 w-full rounded border border-[#d9d9d9] bg-white px-2 text-sm outline-none focus:border-[#2299ff]">
                  <option value="">กลุ่มประเภทพนักงาน</option>
                  {options.employeeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block">สถานะพนักงาน</span>
              <select value={draftFilters.status} onChange={(event) => updateDraft("status", event.target.value as EmployeeFilters["status"])} className="h-8 w-full rounded border border-[#d9d9d9] bg-white px-2 text-sm outline-none focus:border-[#2299ff]">
                <option value="active">เฉพาะที่ Active</option>
                <option value="inactive">เฉพาะที่ Inactive</option>
                <option value="all">ทั้งหมด</option>
              </select>
            </label>
            <label className="relative block"><span className="sr-only">#Hashtag</span><Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-black/45" /><input value={draftFilters.hashtag} onChange={(event) => updateDraft("hashtag", event.target.value)} placeholder="#Hashtag" className="h-8 w-full rounded border border-[#d9d9d9] pl-8 pr-2 text-sm outline-none focus:border-[#2299ff]" /></label>
            <div className="flex gap-[5px]"><button type="button" onClick={clearFilters} className="h-8 flex-1 rounded-[4px] border border-[#d9d9d9] bg-white text-sm text-black/65">ล้างค่า</button><button type="button" onClick={() => setAppliedFilters(draftFilters)} className="h-8 flex-1 rounded-[4px] bg-[#2299ff] text-sm text-white">ค้นหา</button></div>
          </div>
        )}

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
