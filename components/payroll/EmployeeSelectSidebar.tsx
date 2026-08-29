"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, Filter, Search } from "lucide-react";

import { cn } from "@/lib/utils";

/* ---------------------------------- Data ---------------------------------- */

type OrgEmployee = { id: string; code: string; name: string; type: string };

type OrgNode = {
  id: string;
  label: string;
  children?: OrgNode[];
  employees?: OrgEmployee[];
};

const ORG_TREE: OrgNode[] = [
  {
    id: "co-1",
    label: "SVOA: MIC ORGANIZE CO., LTD. (1)",
    children: [
      {
        id: "b-1",
        label: "B01: SVOA PUBLIC (1)",
        children: [
          {
            id: "d-1",
            label: "D01: Speed Computer (1)",
            employees: [
              { id: "e-2", code: "SVOA002", name: "นพดล ฟุ้งศรีสถิตย์กุล", type: "พนักงานรายเดือน" },
            ],
          },
        ],
      },
    ],
  },
];

/* --------------------------------- Helpers -------------------------------- */

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="relative">
        <select className="h-9 w-full appearance-none rounded-md border border-input bg-card px-2.5 pr-8 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

/* --------------------------------- Tree ----------------------------------- */

function TreeBranch({
  node,
  depth,
  expanded,
  selectedId,
  onToggle,
  onSelect,
}: {
  node: OrgNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (emp: OrgEmployee) => void;
}) {
  const isOpen = expanded.has(node.id);
  return (
    <div>
      <div className="relative flex items-center gap-1.5 py-1">
        {/* Dotted connector for children */}
        {depth > 0 && (
          <span
            className="absolute -left-2 top-0 h-full w-px border-l border-dashed border-border"
            aria-hidden="true"
          />
        )}
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-muted/60",
            depth > 0 && "ml-4",
            "border-border"
          )}
        >
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              !isOpen && "-rotate-90"
            )}
          />
          <span className="truncate">{node.label}</span>
        </button>
      </div>
      {isOpen && (
        <div className={cn(depth > 0 && "ml-4")}>
          {node.children?.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
          {node.employees?.map((emp) => (
            <div key={emp.id} className="relative ml-5 pl-2 py-1">
              {/* Dotted connector */}
              <span
                className="absolute -left-2 top-0 h-full w-px border-l border-dashed border-border"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => onSelect(emp)}
                className={cn(
                  "flex w-full items-stretch gap-2 overflow-hidden rounded-md border bg-card text-left shadow-sm transition-colors",
                  selectedId === emp.id
                    ? "border-[#2563eb] bg-blue-50"
                    : "border-border hover:bg-muted/60"
                )}
              >
                {/* Green accent bar on the left edge */}
                <span className="w-1.5 shrink-0 bg-green-500" />
                <span className="min-w-0 py-1.5 pr-2.5">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {emp.code}: {emp.name}
                  </span>
                  <span className="mt-1 inline-block rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                    {emp.type}
                  </span>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Sidebar -------------------------------- */

export function EmployeeSelectSidebar({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (emp: OrgEmployee) => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["co-1", "b-1", "d-1"]));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function toggleNode(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelect(emp: OrgEmployee) {
    setSelectedId(emp.id);
    onSelect(emp);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop — click anywhere outside the panel to close it */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:z-20 lg:bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — extends from the main app sidebar (left-80) on desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:inset-y-auto lg:bottom-0 lg:left-80 lg:top-16 lg:z-30 lg:w-[23.2rem] lg:max-w-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between gap-2 bg-[#5ca6f4] px-3 text-white">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/20"
              aria-label="ปิด"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="truncate text-xl font-bold">รายชื่อพนักงาน</span>
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded transition-colors",
              filterOpen ? "bg-white/30" : "hover:bg-white/20"
            )}
            aria-label="ตัวกรอง"
            title="ตัวกรอง"
          >
            <Filter className="size-4" />
          </button>
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <div className="space-y-3 border-b border-border bg-card p-4">
            {/* ค้นหา */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="คำค้นหา"
                className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* โครงสร้างองค์กร */}
            <FilterSelect label="โครงสร้างองค์กร" options={["โครงสร้างองค์กร"]} />

            <div className="grid grid-cols-2 gap-3">
              <FilterSelect label="ตำแหน่ง" options={["ตำแหน่ง"]} />
              <FilterSelect label="กลุ่มประเภทพนักงาน" options={["กลุ่มประเภทพนักงาน"]} />
            </div>

            {/* สถานะพนักงาน + Hashtag */}
            <div className="grid grid-cols-2 gap-3">
              <FilterSelect label="สถานะพนักงาน" options={["เลือกทั้งหมด", "ประจำ", "ทดลองงาน", "ลาออก"]} />
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">#Hashtag</div>
                <input
                  placeholder="#Hashtag"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* ปุ่มล้างค่า / ค้นหา */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQuery("")}
                className="h-9 flex-1 rounded-md bg-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300"
              >
                ล้างค่า
              </button>
              <button
                type="button"
                className="h-9 flex-1 rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8]"
              >
                ค้นหา
              </button>
            </div>
          </div>
        )}

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-4 pt-5 lg:px-10">
          {ORG_TREE.map((node) => (
            <TreeBranch
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              selectedId={selectedId}
              onToggle={toggleNode}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </aside>
    </>
  );
}
