"use client";

import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type PositionNode = {
  id: string;
  companyId: string;
  parentId: string | null;
  name: string;
  code: string;
  children: PositionNode[];
};

type PositionResponse = {
  companyId: string | null;
  positions: PositionNode[];
  error?: string;
};

type EditorState = {
  mode: "add" | "edit";
  id?: string;
  companyId: string;
  parentId: string | null;
  name: string;
  code: string;
};

function TreeAction({ kind, label, onClick }: { kind: "add" | "edit" | "delete"; label: string; onClick: () => void }) {
  const Icon = kind === "add" ? Plus : kind === "edit" ? Pencil : Trash2;
  const color = kind === "add" ? "bg-[#87c3eb] hover:bg-[#75b7e3]" : kind === "edit" ? "bg-[#a1ded7] hover:bg-[#8dd2ca]" : "bg-[#eb8794] hover:bg-[#e57988]";
  return <button type="button" aria-label={label} onClick={onClick} className={`m-0.5 inline-flex size-[29px] items-center justify-center rounded-full text-white transition-colors ${color}`}><Icon className="size-[15px]" strokeWidth={2.25} /></button>;
}

function NodeLabel({ node }: { node: PositionNode }) {
  return <div className="relative box-border flex h-[57.2px] w-fit shrink-0 items-center justify-center rounded-[10px] border-[1.6px] border-[#808080] px-6 py-4 text-sm leading-[22.001px] text-black/87"><span className="absolute left-6 top-[2px] text-[12px] leading-[18.858px] text-[#aaa]">ตำแหน่ง</span><span className="whitespace-nowrap text-center">{node.name}</span><span className="absolute bottom-[2px] left-6 text-[12px] leading-[18.858px] text-[#aaa]">({node.code || "-"})</span></div>;
}

function ToggleButton({ expanded, onClick, label, hidden }: { expanded: boolean; onClick: () => void; label: string; hidden: boolean }) {
  return <button type="button" aria-label={label} disabled={hidden} onClick={onClick} className="relative z-20 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-black/87 transition-colors hover:bg-black/5 disabled:cursor-default disabled:hover:bg-transparent">{!hidden && (expanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />)}</button>;
}

function flatten(nodes: PositionNode[], rows: string[][] = [], level = 0): string[][] {
  nodes.forEach((node) => { rows.push(["  ".repeat(level) + "ตำแหน่ง", node.name, node.code]); flatten(node.children, rows, level + 1); });
  return rows;
}

export default function OrganizationPositionPage() {
  const [positions, setPositions] = useState<PositionNode[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<PositionNode | null>(null);

  const applyTree = useCallback((next: PositionNode[]) => {
    setPositions(next);
    setExpanded((current) => {
      const result = new Set(current);
      const addIds = (nodes: PositionNode[]) => nodes.forEach((node) => { result.add(node.id); addIds(node.children); });
      addIds(next);
      return result;
    });
  }, []);

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/organization-position", { cache: "no-store" });
      const data = (await response.json()) as PositionResponse;
      if (!response.ok) throw new Error(data.error ?? "ไม่สามารถโหลดโครงสร้างตำแหน่งได้");
      setCompanyId(data.companyId);
      applyTree(data.positions);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถโหลดโครงสร้างตำแหน่งได้");
    } finally {
      setLoading(false);
    }
  }, [applyTree]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPositions(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPositions]);

  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const openAdd = (parent?: PositionNode) => {
    const selectedCompanyId = parent?.companyId ?? companyId;
    if (!selectedCompanyId) { setMessage("ไม่พบบริษัทสำหรับสร้างตำแหน่ง"); return; }
    setMessage("");
    setEditor({ mode: "add", companyId: selectedCompanyId, parentId: parent?.id ?? null, name: "", code: "" });
  };

  const openEdit = (node: PositionNode) => {
    setMessage("");
    setEditor({ mode: "edit", id: node.id, companyId: node.companyId, parentId: node.parentId, name: node.name, code: node.code });
  };

  const saveEditor = async () => {
    if (!editor) return;
    if (!editor.name.trim() || !editor.code.trim()) { setMessage("กรุณากรอกชื่อตำแหน่งและรหัสให้ครบถ้วน"); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/organization-position", { method: editor.mode === "add" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editor) });
      const data = (await response.json()) as PositionResponse;
      if (!response.ok) throw new Error(data.error ?? "บันทึกข้อมูลไม่สำเร็จ");
      setCompanyId(data.companyId);
      applyTree(data.positions);
      setEditor(null);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally { setSaving(false); }
  };

  const deletePosition = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const response = await fetch("/api/organization-position", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleting.id }) });
      const data = (await response.json()) as PositionResponse;
      if (!response.ok) throw new Error(data.error ?? "ลบตำแหน่งไม่สำเร็จ");
      setCompanyId(data.companyId);
      applyTree(data.positions);
      setDeleting(null);
      setMessage("");
      setSuccessMessage("ลบตำแหน่งสำเร็จ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ลบตำแหน่งไม่สำเร็จ");
    } finally { setSaving(false); }
  };

  const exportPositions = () => {
    const lines = [["ประเภท", "ชื่อ", "รหัส"], ...flatten(positions)].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "organization-position.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const renderNode = (node: PositionNode, level: number): ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const children = [...node.children].sort((first, second) => first.code.localeCompare(second.code, undefined, { numeric: true, sensitivity: "base" }));
    return <li key={node.id} role="treeitem" aria-level={level} aria-selected={false} aria-expanded={hasChildren ? isExpanded : undefined} className={`relative -top-9 w-full list-none border-[#808080] pl-10 ${hasChildren ? "border-l-0 border-b-0" : "border-l-[0.8px] border-b-[0.8px]"}`}>
      {hasChildren && <span aria-hidden="true" className="absolute left-0 top-0 z-0 h-16 border-l-[0.8px] border-[#808080]" />}
      {hasChildren && <span aria-hidden="true" className="absolute left-0 top-16 z-10 w-[50px] border-t-[0.8px] border-[#808080]" />}
      <div className="relative top-9 mb-3 flex h-[57.2px] w-full min-w-full items-center bg-white shadow-none">
        <ToggleButton expanded={isExpanded} onClick={() => toggle(node.id)} label={isExpanded ? `ย่อตำแหน่ง ${node.name}` : `ขยายตำแหน่ง ${node.name}`} hidden={!hasChildren} />
        <NodeLabel node={node} />
        <TreeAction kind="add" label={`เพิ่มใต้ตำแหน่ง ${node.name}`} onClick={() => openAdd(node)} />
        <TreeAction kind="delete" label={`ลบตำแหน่ง ${node.name}`} onClick={() => { setMessage(""); setDeleting(node); }} />
        <TreeAction kind="edit" label={`แก้ไขตำแหน่ง ${node.name}`} onClick={() => openEdit(node)} />
      </div>
      {hasChildren && isExpanded && <ul className="relative -ml-[41px] w-[calc(100%+40px)] list-none border-l-[0.8px] border-l-white p-0 pl-[60px]"><div className="relative top-9">{children.map((child) => renderNode(child, level + 1))}</div></ul>}
    </li>;
  };

  return <div className="min-h-[calc(100vh-4rem)] bg-white">
    <header className="flex h-40 min-h-40 flex-col items-center justify-center bg-[#61a8ff] p-6 text-white sm:flex-row sm:justify-between">
      <div className="flex flex-col items-center sm:items-start"><div className="hidden items-center text-[14px] leading-[22.001px] text-white md:flex"><span>ข้อมูลองค์กร</span><ChevronRight className="-mx-px size-4" /><span>โครงสร้างตำแหน่ง</span></div><div className="group relative flex items-center pr-[30px] text-[24px] font-normal leading-[37.716px]"><h1>โครงสร้างตำแหน่ง</h1><button type="button" aria-label="คำอธิบายโครงสร้างตำแหน่ง" className="ml-2 hidden size-5 items-center justify-center rounded-full border border-white/90 text-xs font-semibold leading-none text-white">?</button><span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 w-56 -translate-y-1/2 rounded bg-[#424242] px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">แสดงโครงสร้างตำแหน่งในองค์กร</span></div></div>
      <button type="button" onClick={exportPositions} disabled={loading || !positions.length} className="mt-4 inline-flex h-9 items-center rounded-[4px] bg-white px-4 text-sm font-semibold leading-9 text-black/87 shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.14),0_1px_5px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0">Export</button>
    </header>

    <section className="relative m-9 hidden md:block">
      <div className="mb-9 flex h-[58.625px] items-center"><div className="box-border inline-block h-[58.625px] rounded-[10px] border-[1.6px] border-[#808080] px-6 py-3 text-[20px] font-normal leading-[31.43px] text-black/87">โครงสร้างตำแหน่ง</div><TreeAction kind="add" label="เพิ่มตำแหน่งระดับบนสุด" onClick={() => openAdd()} /></div>
      {message && <p role="alert" className="mb-5 rounded border border-[#eb8794] bg-[#fff3f4] px-4 py-3 text-sm text-[#ad3242]">{message}</p>}
      <span aria-hidden="true" className="absolute left-[60px] top-[58.625px] h-9 border-l-[0.8px] border-[#808080]" />
      <div className="overflow-x-auto"><div role="tree" aria-label="โครงสร้างตำแหน่ง" className="-mt-[36.8px] ml-[60px] min-h-[210px] w-[calc(100%-60px)] min-w-[640px] bg-white pt-[36.8px]">{loading ? <p className="py-10 text-sm text-black/60">กำลังโหลดข้อมูล...</p> : positions.length ? <ul className="m-0 w-full list-none p-0">{positions.map((node) => renderNode(node, 1))}</ul> : <p className="py-10 text-sm text-black/60">ไม่พบข้อมูลโครงสร้างตำแหน่ง</p>}</div></div>
    </section>

    <div className="flex h-[55vh] items-center justify-center px-6 text-center text-lg text-[#424242] md:hidden"><p>ไม่สามารถตั้งค่า<br /><b className="my-4 inline-block">&apos;ORG_POSITION&apos;</b><br />ในโทรศัพท์ได้</p></div>

    {editor && <div role="dialog" aria-modal="true" aria-labelledby="position-editor-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="flex max-h-[calc(100vh-72px)] w-[min(1100px,calc(100vw-32px))] flex-col overflow-hidden rounded-[11px] bg-white text-sm text-black/87 shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]"><header className="h-[85.7px] shrink-0 bg-[#61a8ff] px-6 py-6 text-[18px] font-bold text-white"><h2 id="position-editor-title">ตำแหน่ง</h2></header><div className="overflow-y-auto p-9"><label className="block text-sm text-black/87">รหัสตำแหน่ง<input autoFocus value={editor.code} onChange={(event) => setEditor({ ...editor, code: event.target.value })} className="mt-1 block h-[31.6px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] py-1 text-sm text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" /></label><p className="mb-1 text-sm leading-5 text-black/60">กรุณาตั้งรหัสเป็นภาษาอังกฤษ หรือ ตัวเลขเท่านั้น ห้ามซ้ำกับสิ่งที่มีอยู่แล้ว</p><label className="block text-sm text-black/87">ชื่อตำแหน่ง<input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} className="mt-1 block h-[31.6px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] py-1 text-sm text-black/65 outline-none focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]" /></label>{message && <p role="alert" className="mt-4 text-sm text-[#ad3242]">{message}</p>}</div><footer className="flex h-[60.8px] shrink-0 items-center justify-end gap-2 border-t border-black/30 bg-white px-3 py-3"><button type="button" onClick={() => { setEditor(null); setMessage(""); }} className="h-9 rounded-[4px] bg-[#8390a3] px-4 text-sm font-bold text-white shadow">ยกเลิก</button><button type="button" disabled={saving} onClick={() => void saveEditor()} className="h-9 rounded-[4px] bg-[#00b900] px-4 text-sm font-bold text-white shadow hover:bg-[#00a800] disabled:opacity-60">{saving ? "กำลังบันทึก..." : "บันทึก"}</button></footer></div></div>}

    {deleting && <div role="dialog" aria-modal="true" aria-labelledby="delete-position-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-[320px] rounded-[4px] bg-white px-6 py-6 text-center text-black/87 shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]"><div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-[#f5c998] text-[30px] font-light leading-none text-[#edb270]">!</div><h2 id="delete-position-title" className="mt-4 text-xl font-bold">ยืนยัน</h2><p className="mt-2 text-xs text-black/65">ยืนยันการลบข้อมูล</p>{message && <p role="alert" className="mt-4 text-sm text-[#ad3242]">{message}</p>}<div className="mt-4 flex justify-center gap-1"><button type="button" disabled={saving} onClick={() => void deletePosition()} className="h-8 rounded-[3px] bg-[#2f8fd6] px-3 text-xs font-bold text-white shadow hover:bg-[#237ebf] disabled:opacity-60">{saving ? "กำลังลบ..." : "ยืนยัน"}</button><button type="button" onClick={() => { setDeleting(null); setMessage(""); }} className="h-8 rounded-[3px] bg-[#737373] px-3 text-xs font-bold text-white shadow hover:bg-[#626262]">ยกเลิก</button></div></div></div>}

    {successMessage && <div role="dialog" aria-modal="true" aria-labelledby="delete-success-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-[320px] rounded-[4px] bg-white px-6 py-6 text-center text-black/87 shadow-[0_11px_15px_-7px_rgba(0,0,0,0.2),0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12)]"><div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-[#9ad5b6] text-[30px] font-semibold leading-none text-[#45a46e]">✓</div><h2 id="delete-success-title" className="mt-4 text-xl font-bold">สำเร็จ</h2><p className="mt-2 text-xs text-black/65">{successMessage}</p><button type="button" autoFocus onClick={() => setSuccessMessage("")} className="mt-4 h-8 rounded-[3px] bg-[#2f8fd6] px-4 text-xs font-bold text-white shadow hover:bg-[#237ebf]">ตกลง</button></div></div>}
  </div>;
}
