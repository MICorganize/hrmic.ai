"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { USER_IMAGE_ORIGIN } from "@/lib/external-assets";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ---------------------------------- Types ---------------------------------- */

type EmployeeItem = {
  id: string;
  employeeNumber: string;
  employeeCode: string | null;
  firstNameTH: string;
  lastNameTH: string;
  status: string;
  departmentName: string;
  positionName: string;
};

type EmployeeListResponse = {
  items: EmployeeItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type DeletedEmployeeItem = {
  id: string;
  employeeNumber: string;
  employeeCode: string | null;
  firstNameTH: string;
  lastNameTH: string;
  departmentName: string;
  positionName: string;
  deletedAt: string;
  daysRemaining: number;
};

type DeletedEmployeeListResponse = {
  items: DeletedEmployeeItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/* ---------------------------------- Data ---------------------------------- */

const STATUS_OPTIONS = ["ทั้งหมด", "Active", "Inactive"];
const PLACEHOLDER_PHOTO = `${USER_IMAGE_ORIGIN}/images/userPlaceHolder.png`;

/* ---------------------------------- Tabs ---------------------------------- */

type DeleteTab = "list" | "permanent";

/* ---------------------------------- Page ---------------------------------- */

export function DeleteEmployeeContent() {
  const [activeTab, setActiveTab] = useState<DeleteTab>("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters — list tab
  const [orgFilter, setOrgFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");

  // Data — list tab
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Data — permanent delete tab
  const [deletedEmployees, setDeletedEmployees] = useState<DeletedEmployeeItem[]>([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [deletedPage, setDeletedPage] = useState(1);
  const [deletedTotalPages, setDeletedTotalPages] = useState(1);
  const [deletedLoading, setDeletedLoading] = useState(true);
  const [deletedError, setDeletedError] = useState(false);
  const [deletedSearch, setDeletedSearch] = useState("");
  const [purgeSelected, setPurgeSelected] = useState<Set<string>>(new Set());

  // Credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Delete state — list tab
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Action state — permanent delete tab
  const [restoring, setRestoring] = useState(false);
  const [purging, setPurging] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const PAGE_SIZE = 10;

  /* ====================== LIST TAB ====================== */

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (statusFilter !== "ทั้งหมด") params.set("status", statusFilter);
      if (orgFilter) params.set("department", orgFilter);
      if (positionFilter) params.set("position", positionFilter);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/employee/list?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EmployeeListResponse = await res.json();
      setEmployees(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError(true);
      setEmployees([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, orgFilter, positionFilter, page]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, orgFilter, positionFilter]);

  const allSelected =
    employees.length > 0 && employees.every((e) => selected.has(e.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(employees.map((e) => e.id)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canDelete = username.trim() !== "" && password.trim() !== "" && selected.size > 0 && !deleting;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleteError(null);
    setDeleteSuccess(null);
    setShowConfirm(true);
  }

  async function confirmDelete() {
    setShowConfirm(false);
    setDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);
    try {
      const res = await fetch("/api/employee/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: [...selected],
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "ไม่สามารถลบข้อมูลได้");
        return;
      }
      const count = data.deleted ?? 0;
      const notFound = data.notFound?.length ?? 0;
      let msg = `ลบข้อมูลพนักงานสำเร็จ ${count} รายการ`;
      if (notFound > 0) msg += ` (${notFound} รายการไม่พบในระบบ)`;
      setDeleteSuccess(msg);
      setSelected(new Set());
      setUsername("");
      setPassword("");
      fetchEmployees();
      fetchDeletedEmployees(); // refresh count
      window.dispatchEvent(new Event("employee-data-changed"));
    } catch {
      setDeleteError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDeleting(false);
    }
  }

  /* ====================== PERMANENT DELETE TAB ====================== */

  const fetchDeletedEmployees = useCallback(async () => {
    setDeletedLoading(true);
    setDeletedError(false);
    try {
      const params = new URLSearchParams();
      if (deletedSearch) params.set("search", deletedSearch);
      params.set("page", String(deletedPage));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/employee/deleted?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DeletedEmployeeListResponse = await res.json();
      setDeletedEmployees(data.items);
      setDeletedTotal(data.total);
      setDeletedTotalPages(data.totalPages);
    } catch {
      setDeletedError(true);
      setDeletedEmployees([]);
      setDeletedTotal(0);
    } finally {
      setDeletedLoading(false);
    }
  }, [deletedSearch, deletedPage]);

  useEffect(() => {
    if (activeTab === "permanent") {
      fetchDeletedEmployees();
    }
  }, [activeTab, fetchDeletedEmployees]);

  useEffect(() => {
    setDeletedPage(1);
  }, [deletedSearch]);

  const allPurgeSelected =
    deletedEmployees.length > 0 &&
    deletedEmployees.every((e) => purgeSelected.has(e.id));

  function togglePurgeAll() {
    if (allPurgeSelected) {
      setPurgeSelected(new Set());
    } else {
      setPurgeSelected(new Set(deletedEmployees.map((e) => e.id)));
    }
  }

  function togglePurgeRow(id: string) {
    setPurgeSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canRestore = purgeSelected.size > 0 && !restoring && !purging;
  const canPurge = purgeSelected.size > 0 && username.trim() !== "" && password.trim() !== "" && !purging && !restoring;

  async function handleRestore() {
    if (!canRestore) return;
    setActionError(null);
    setActionSuccess(null);
    setShowRestoreConfirm(true);
  }

  async function confirmRestore() {
    setShowRestoreConfirm(false);
    setRestoring(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch("/api/employee/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: [...purgeSelected],
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "ไม่สามารถกู้คืนข้อมูลได้");
        return;
      }
      setActionSuccess(`กู้คืนพนักงานสำเร็จ ${data.restored} รายการ`);
      setPurgeSelected(new Set());
      fetchDeletedEmployees();
      fetchEmployees(); // refresh list tab count
      window.dispatchEvent(new Event("employee-data-changed"));
    } catch {
      setActionError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setRestoring(false);
    }
  }

  async function handlePurge() {
    if (!canPurge) return;
    setActionError(null);
    setActionSuccess(null);
    setShowPurgeConfirm(true);
  }

  async function confirmPurge() {
    setShowPurgeConfirm(false);
    setPurging(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch("/api/employee/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: [...purgeSelected],
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "ไม่สามารถลบถาวรได้");
        return;
      }
      setActionSuccess(`ลบถาวรสำเร็จ ${data.purged} รายการ — ข้อมูลไม่สามารถกู้คืนได้อีก`);
      setPurgeSelected(new Set());
      setUsername("");
      setPassword("");
      fetchDeletedEmployees();
    } catch {
      setActionError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setPurging(false);
    }
  }

  /* ====================== RENDER ====================== */

  return (
    <Card className="overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
        <span className="font-semibold text-foreground">ลบข้อมูลพนักงาน</span>
        <button
          type="button"
          className="flex size-4 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-bold text-muted-foreground"
          aria-label="ข้อมูลเพิ่มเติม"
        >
          ?
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-black/10">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={cn(
            "relative px-6 py-3 text-sm font-medium transition-colors",
            activeTab === "list"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          รายชื่อพนักงาน
          {activeTab === "list" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("permanent")}
          className={cn(
            "relative px-6 py-3 text-sm font-medium transition-colors",
            activeTab === "permanent"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          ลบถาวร{" "}
          <span className="text-muted-foreground">({deletedTotal})</span>
          {activeTab === "permanent" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* ==================== LIST TAB ==================== */}
      {activeTab === "list" ? (
        <CardContent className="p-4">
          {/* Info banner */}
          <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <CircleHelp className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <span>
              พนักงานที่ถูกลบจะยังไม่หายทันที ระบบเก็บไว้{" "}
              <strong>45 วัน</strong> สามารถกู้คืนได้จากแท็บ{" "}
              <strong>ลบถาวร</strong> ก่อนครบกำหนด
            </span>
          </div>

          {/* Filter row */}
          <div className="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">โครงสร้างองค์กร</label>
              <Input
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                placeholder="โครงสร้างองค์กรทั้งหมด"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ตำแหน่ง</label>
              <Input
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                placeholder="ตำแหน่งทั้งหมด"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ค้นหาพนักงาน</label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัสพนักงาน ชื่อ นามสกุล เลขประจำตัวประชาชน"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">สถานะพนักงาน</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                className="h-9 w-full border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
              >
                <Search className="size-4" />
                ค้นหา
              </Button>
            </div>
          </div>

          {/* Loading / Error states */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <RefreshCw className="size-5 animate-spin" />
              <span className="text-sm">กำลังโหลดข้อมูล...</span>
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-sm text-foreground">ไม่สามารถโหลดข้อมูลพนักงานได้</p>
              <Button variant="outline" size="sm" onClick={fetchEmployees} className="h-9">
                <RefreshCw className="size-4" /> ลองใหม่
              </Button>
            </div>
          )}

          {/* Employee table */}
          {!loading && !error && (
            <>
              <div className="mb-4 overflow-x-auto rounded-md border border-black/10">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 bg-[#3b82f6] text-center text-white">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="size-4 cursor-pointer accent-blue-500" />
                      </TableHead>
                      <TableHead className="w-16 bg-[#3b82f6] text-center text-white">ลำดับ</TableHead>
                      <TableHead className="w-24 bg-[#3b82f6] text-center text-white">สถานะ</TableHead>
                      <TableHead className="bg-[#3b82f6] text-center text-white">พนักงาน</TableHead>
                      <TableHead className="w-[200px] bg-[#3b82f6] text-center text-white">แผนก</TableHead>
                      <TableHead className="w-[200px] bg-[#3b82f6] text-center text-white">ตำแหน่ง</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6}>
                          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">ไม่มีข้อมูล</div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((emp, idx) => (
                        <TableRow key={emp.id} className={cn("hover:bg-transparent", idx % 2 === 1 && "bg-muted/30")}>
                          <TableCell className="text-center">
                            <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleRow(emp.id)} className="size-4 cursor-pointer accent-blue-500" />
                          </TableCell>
                          <TableCell className="text-center text-foreground">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                          <TableCell className="text-center font-normal text-foreground">{emp.status}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img src={PLACEHOLDER_PHOTO} alt={`${emp.firstNameTH} ${emp.lastNameTH}`} className="size-8 rounded-full object-cover" />
                              <span className="font-normal text-foreground">
                                {emp.employeeCode ?? emp.employeeNumber} : {emp.firstNameTH} {emp.lastNameTH}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-normal text-foreground">{emp.departmentName}</TableCell>
                          <TableCell className="text-center font-normal text-foreground">{emp.positionName}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              )}
            </>
          )}

          {/* Success / Error messages */}
          {deleteSuccess && <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{deleteSuccess}</div>}
          {deleteError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{deleteError}</div>}

          {/* Credentials row */}
          <div className="flex flex-wrap items-end gap-4 border-t border-black/10 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="h-9 w-48 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-9 w-48 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
              <Button variant="destructive" disabled={!canDelete} onClick={handleDelete} className="h-9">
                {deleting && <Loader2 className="size-4 animate-spin" />}
                ลบข้อมูลออกจากฐานข้อมูลทั้งหมด
              </Button>
            </div>
          </div>

          {/* Confirmation dialog — soft delete */}
          {showConfirm && (
            <ConfirmDialog
              title="ยืนยันการลบข้อมูลพนักงาน"
              description={`คุณต้องการลบข้อมูลพนักงาน ${selected.size} รายการ ใช่หรือไม่?`}
              note="พนักงานที่ถูกลบจะถูกซ่อนออกจากระบบ แต่ข้อมูลจะยังคงอยู่ 45 วัน และสามารถกู้คืนได้"
              confirmLabel="ยืนยันลบ"
              onConfirm={confirmDelete}
              onCancel={() => setShowConfirm(false)}
            />
          )}
        </CardContent>
      ) : (
        /* ==================== PERMANENT DELETE TAB ==================== */
        <CardContent className="p-4">
          {/* Warning banner */}
          <div className="mb-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" />
            <span>
              การลบถาวรจะลบข้อมูลพนักงานออกจากระบบโดย<strong>ไม่สามารถกู้คืนได้</strong>
              กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
            </span>
          </div>

          {/* Search + actions row */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ค้นหาพนักงาน</label>
              <Input
                value={deletedSearch}
                onChange={(e) => setDeletedSearch(e.target.value)}
                placeholder="ค้นหาด้วยรหัสพนักงาน ชื่อ นามสกุล"
                className="h-9 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!canRestore}
              onClick={handleRestore}
              className="h-9 border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
            >
              {restoring ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              กู้คืน ({purgeSelected.size})
            </Button>
          </div>

          {/* Loading / Error states */}
          {deletedLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <RefreshCw className="size-5 animate-spin" />
              <span className="text-sm">กำลังโหลดข้อมูล...</span>
            </div>
          )}
          {deletedError && !deletedLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-sm text-foreground">ไม่สามารถโหลดข้อมูลได้</p>
              <Button variant="outline" size="sm" onClick={fetchDeletedEmployees} className="h-9">
                <RefreshCw className="size-4" /> ลองใหม่
              </Button>
            </div>
          )}

          {/* Deleted employee table */}
          {!deletedLoading && !deletedError && (
            <>
              <div className="mb-4 overflow-x-auto rounded-md border border-black/10">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 bg-[#3b82f6] text-center text-white">
                        <input type="checkbox" checked={allPurgeSelected} onChange={togglePurgeAll} className="size-4 cursor-pointer accent-blue-500" />
                      </TableHead>
                      <TableHead className="w-16 bg-[#3b82f6] text-center text-white">ลำดับ</TableHead>
                      <TableHead className="bg-[#3b82f6] text-center text-white">พนักงาน</TableHead>
                      <TableHead className="w-[160px] bg-[#3b82f6] text-center text-white">แผนก</TableHead>
                      <TableHead className="w-[160px] bg-[#3b82f6] text-center text-white">ตำแหน่ง</TableHead>
                      <TableHead className="w-[120px] bg-[#3b82f6] text-center text-white">วันที่ลบ</TableHead>
                      <TableHead className="w-[120px] bg-[#3b82f6] text-center text-white">เหลือ (วัน)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedEmployees.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7}>
                          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">ไม่มีข้อมูลพนักงานที่ถูกลบ</div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      deletedEmployees.map((emp, idx) => (
                        <TableRow key={emp.id} className={cn("hover:bg-transparent", idx % 2 === 1 && "bg-muted/30")}>
                          <TableCell className="text-center">
                            <input type="checkbox" checked={purgeSelected.has(emp.id)} onChange={() => togglePurgeRow(emp.id)} className="size-4 cursor-pointer accent-blue-500" />
                          </TableCell>
                          <TableCell className="text-center font-normal text-foreground">{(deletedPage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img src={PLACEHOLDER_PHOTO} alt={`${emp.firstNameTH} ${emp.lastNameTH}`} className="size-8 rounded-full object-cover" />
                              <span className="font-normal text-foreground">
                                {emp.employeeCode ?? emp.employeeNumber} : {emp.firstNameTH} {emp.lastNameTH}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-normal text-foreground">{emp.departmentName}</TableCell>
                          <TableCell className="text-center font-normal text-foreground">{emp.positionName}</TableCell>
                          <TableCell className="text-center font-normal text-foreground">{emp.deletedAt}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                emp.daysRemaining <= 7
                                  ? "bg-red-100 text-red-700"
                                  : emp.daysRemaining <= 14
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-green-100 text-green-700"
                              )}
                            >
                              {emp.daysRemaining} วัน
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {deletedTotal > 0 && (
                <Pagination
                  page={deletedPage}
                  totalPages={deletedTotalPages}
                  total={deletedTotal}
                  pageSize={PAGE_SIZE}
                  onPageChange={setDeletedPage}
                />
              )}
            </>
          )}

          {/* Action success / error messages */}
          {actionSuccess && <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{actionSuccess}</div>}
          {actionError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}

          {/* Credentials row */}
          <div className="flex flex-wrap items-end gap-4 border-t border-black/10 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="h-9 w-48 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-9 w-48 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
              <Button variant="destructive" disabled={!canPurge} onClick={handlePurge} className="h-9">
                {purging ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                ลบถาวร ({purgeSelected.size})
              </Button>
            </div>
          </div>

          {/* Confirmation dialog — restore */}
          {showRestoreConfirm && (
            <ConfirmDialog
              title="ยืนยันการกู้คืนพนักงาน"
              description={`คุณต้องการกู้คืนพนักงาน ${purgeSelected.size} รายการ ใช่หรือไม่?`}
              note="พนักงานจะกลับเข้าสู่ระบบและแสดงในรายชื่อพนักงานตามเดิม"
              confirmLabel="ยืนยันกู้คืน"
              onConfirm={confirmRestore}
              onCancel={() => setShowRestoreConfirm(false)}
            />
          )}

          {/* Confirmation dialog — purge */}
          {showPurgeConfirm && (
            <ConfirmDialog
              title="⚠️ ยืนยันการลบถาวร"
              description={`คุณต้องการลบข้อมูลพนักงาน ${purgeSelected.size} รายการออกจากระบบอย่างถาวร ใช่หรือไม่?`}
              note="การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลพนักงานจะถูกลบออกจากระบบโดยสมบูรณ์"
              confirmLabel="ยืนยันลบถาวร"
              confirmVariant="destructive"
              onConfirm={confirmPurge}
              onCancel={() => setShowPurgeConfirm(false)}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ========================= Shared sub-components ========================= */

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="mb-4 flex items-center justify-end gap-1">
      <span className="mr-2 text-sm text-muted-foreground">
        {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
      </span>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="flex size-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-1 text-sm text-muted-foreground">...</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p as number)}
            className={cn(
              "flex size-8 items-center justify-center rounded border text-sm font-medium transition-colors",
              p === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="flex size-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  note,
  confirmLabel,
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  note: string;
  confirmLabel: string;
  confirmVariant?: "destructive" | "outline";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mb-1 text-sm text-foreground">{description}</p>
        <p className="mb-4 text-sm text-muted-foreground">{note}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>ยกเลิก</Button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
