"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, FolderOpen, Search } from "lucide-react";

import type { OrgNode } from "@/components/employee/EmployeeSelectPanel";
import { cn } from "@/lib/utils";

type DirectoryItem = Pick<OrgNode, "id" | "code" | "name" | "status" | "positionId" | "positionName" | "type">;

type DirectoryResponse = { items: DirectoryItem[]; nextCursor: string | null };
type TreeResponse = { orgTree: OrgNode[] };

function EmployeeLeaf({ employee, onSelect }: { employee: DirectoryItem; onSelect: (employee: OrgNode) => void }) {
  return <li role="treeitem" aria-selected={false} className="relative ml-4 pb-[2.8px] pt-[2px] before:absolute before:left-0 before:top-[23px] before:w-4 before:border-t before:border-dotted before:border-[#bfbfbf]"><button type="button" onClick={() => onSelect(employee)} className="ml-[16px] flex h-[43.2px] w-max max-w-[calc(100%-16px)] items-center rounded-[5px_8px_8px_5px] border-[0.8px] border-[#d9d9d9] bg-white py-1 pl-2.5 pr-2.5 text-left font-[Kanit,sans-serif] text-[14px] leading-[22px] text-black/65 shadow-[0_2px_0_rgba(0,0,0,0.016)] transition-colors hover:border-[#91caff] hover:bg-[#f0f8ff]"><span className={cn("-my-1 -ml-2.5 mr-2.5 self-stretch w-1 shrink-0 rounded-[5px_0_0_5px]", employee.status === "inactive" ? "bg-[rgba(244,67,54,0.7)]" : "bg-[rgba(3,174,3,0.7)]")} /><span className="min-w-0"><span className="block truncate text-xs font-medium leading-[18.4px]">{employee.code}: {employee.name}</span>{employee.type && <span className="block h-[15.2px] w-fit rounded-[8px] bg-[#e6f3fe] px-1 text-[10px] leading-[15.2px] text-[#57a3db]">{employee.type}</span>}</span></button></li>;
}

function TreeEmployees({ organizationId, onSelect }: { organizationId: string; onSelect: (employee: OrgNode) => void }) {
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback((cursor?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ organizationId, pageSize: "50" });
    if (cursor) params.set("cursor", cursor);
    void fetch(`/api/employee/directory?${params.toString()}`, { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<DirectoryResponse> : Promise.reject()).then((data) => { setItems((current) => cursor ? [...current, ...data.items] : data.items); setNextCursor(data.nextCursor); }).catch(() => { if (!cursor) setItems([]); }).finally(() => setLoading(false));
  }, [organizationId]);
  useEffect(() => {
    // Defer the initial state transition until after this branch mounts, so
    // expanding a tree node never adds a synchronous effect render.
    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  if (loading && items.length === 0) return <li className="ml-10 py-2 text-xs text-muted-foreground">กำลังโหลดพนักงาน...</li>;
  return <>{items.map((employee) => <EmployeeLeaf key={employee.id} employee={employee} onSelect={onSelect} />)}{nextCursor && <li className="ml-10 py-1"><button type="button" onClick={() => load(nextCursor)} disabled={loading} className="text-xs text-[#2299ff] disabled:text-black/25">{loading ? "กำลังโหลด..." : "แสดงพนักงานเพิ่ม"}</button></li>}</>;
}

function TreeNode({ node, onSelect }: { node: OrgNode; onSelect: (employee: OrgNode) => void }) {
  // Show the complete organization structure immediately. Employee leaves
  // remain explicitly lazy so opening a 500-person tenant stays fast.
  const [expanded, setExpanded] = useState(true);
  const [employeesVisible, setEmployeesVisible] = useState(false);
  const children = node.children ?? [];
  const isLeafOrganization = children.length === 0;
  return <li role="treeitem" aria-expanded={expanded} aria-selected={false} className="list-none"><div className="mb-[2.8px] flex h-10 items-center text-sm leading-[22px] text-[rgba(0,0,0,0.87)]"><button type="button" onClick={() => setExpanded((current) => !current)} className="mr-0 flex size-10 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2299ff]" aria-label={expanded ? `ย่อ ${node.code}` : `ขยาย ${node.code}`}><ChevronDown className={cn("size-[19.2px] transition-transform", !expanded && "-rotate-90")} /></button><span className="min-w-0 break-words rounded-[6px] border-[0.8px] border-black/50 px-3 py-1 font-[Kanit,sans-serif] text-[14px] leading-[22px] tracking-[-0.1px]">{node.code}: {node.name} ({node.count ?? 0})</span></div>{expanded && <ul role="group" className="ml-5 list-none border-l border-dotted border-[#bfbfbf] p-0">{children.map((child) => <TreeNode key={child.id} node={child} onSelect={onSelect} />)}{isLeafOrganization && (employeesVisible ? <TreeEmployees organizationId={node.id} onSelect={onSelect} /> : <li className="ml-10 py-1"><button type="button" onClick={() => setEmployeesVisible(true)} className="text-xs text-[#2299ff]">แสดงรายชื่อพนักงาน</button></li>)}</ul>}</li>;
}

/** A bounded picker: it keeps at most one 50-row page in the React tree. */
export function EmployeeDirectoryPanel({
  onClose,
  onEmployeeSelect,
  placement = "page",
}: {
  onClose: () => void;
  onEmployeeSelect: (employee: OrgNode) => void;
  placement?: "page" | "detail";
}) {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<string[]>([]);
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/employee?view=tree", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<TreeResponse>; }).then((data) => { if (!cancelled) setTree(data.orgTree); }).catch(() => { if (!cancelled) setTree([]); }).finally(() => { if (!cancelled) setTreeLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setCursor(null);
      setPreviousCursors([]);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [queryInput]);

  useEffect(() => {
    if (!query) return;

    let cancelled = false;
    const params = new URLSearchParams({ pageSize: "50" });
    if (query) params.set("q", query);
    if (cursor) params.set("cursor", cursor);

    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch(`/api/employee/directory?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<DirectoryResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setNextCursor(data.nextCursor);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setNextCursor(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cursor, query]);

  return (
    <>
      <button type="button" onClick={onClose} className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-label="ปิดรายชื่อพนักงาน" />
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
            <button type="button" onClick={() => setFilterOpen((current) => !current)} className="ml-auto flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="กรองรายชื่อพนักงาน" aria-expanded={filterOpen}><Filter className="size-3" /></button>
          </div>
          {filterOpen && <div className="mt-2.5 font-[Kanit,sans-serif] text-sm text-white"><label className="flex h-[34.5px] items-center gap-3 rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] py-1 text-[#bfbfbf]"><Search aria-hidden="true" className="size-4 shrink-0" /><input autoFocus value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="คำค้นหา" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal leading-[22px] text-black/65 outline-none placeholder:text-[#bfbfbf]" /></label></div>}
        </div>
        <div className="-ml-[12.2px] min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-[21px] font-[Kanit,sans-serif] text-[14px] leading-[22.001px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="org-emp-select-tree">
          {treeLoading ? <p className="py-12 text-center text-sm text-muted-foreground">กำลังโหลดรายชื่อพนักงาน...</p> : !query && tree.length > 0 ? <ul role="tree" className="m-0 list-none p-0" aria-label="โครงสร้างองค์กรและรายชื่อพนักงาน">{tree.map((node) => <TreeNode key={node.id} node={node} onSelect={(employee) => { onEmployeeSelect(employee); onClose(); }} />)}</ul> : loading ? <p className="py-12 text-center text-sm text-muted-foreground">กำลังโหลดรายชื่อพนักงาน...</p> : items.length === 0 ? <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center text-muted-foreground"><FolderOpen className="size-8" /><span className="text-sm">ไม่มีข้อมูลพนักงาน</span></div> : (
            <ul role="tree" className="m-0 list-none space-y-[2.8px] p-0" aria-label="รายชื่อพนักงาน">
              {items.map((employee) => (
                <li key={employee.id} role="treeitem" aria-selected={false} className="relative ml-4 pb-[2.8px] pt-[2px] before:absolute before:left-0 before:top-[23px] before:w-4 before:border-t before:border-dotted before:border-[#bfbfbf]">
                  <button type="button" onClick={() => { onEmployeeSelect(employee); onClose(); }} className="ml-[16px] flex h-[43.2px] w-max max-w-[calc(100%-16px)] items-center rounded-[5px_8px_8px_5px] border-[0.8px] border-[#d9d9d9] bg-white py-1 pl-2.5 pr-2.5 text-left font-[Kanit,sans-serif] text-[14px] leading-[22px] text-black/65 shadow-[0_2px_0_rgba(0,0,0,0.016)] transition-colors hover:border-[#91caff] hover:bg-[#f0f8ff]">
                    <span className={cn("-my-1 -ml-2.5 mr-2.5 self-stretch w-1 shrink-0 rounded-[5px_0_0_5px]", employee.status === "inactive" ? "bg-[rgba(244,67,54,0.7)]" : "bg-[rgba(3,174,3,0.7)]")} />
                    <span className="min-w-0"><span className="block truncate text-xs font-medium leading-[18.4px]">{employee.code}: {employee.name}</span>{employee.type && <span className="block h-[15.2px] w-fit rounded-[8px] bg-[#e6f3fe] px-1 text-[10px] leading-[15.2px] text-[#57a3db]">{employee.type}</span>}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between border-t p-3 text-sm">
          <button type="button" disabled={previousCursors.length === 0 || loading} onClick={() => { const previous = previousCursors.at(-1) ?? null; setPreviousCursors((current) => current.slice(0, -1)); setCursor(previous); }} className="inline-flex items-center gap-1 disabled:text-black/25"><ChevronLeft className="size-4" />ก่อนหน้า</button>
          <button type="button" disabled={!nextCursor || loading} onClick={() => { if (!nextCursor) return; setPreviousCursors((current) => [...current, cursor ?? ""]); setCursor(nextCursor); }} className="inline-flex items-center gap-1 disabled:text-black/25">ถัดไป<ChevronRight className="size-4" /></button>
        </div>
      </aside>
    </>
  );
}
