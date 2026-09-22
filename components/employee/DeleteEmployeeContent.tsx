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
import { formatThaiDateNumeric } from "@/lib/date/thai-date";

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
    <Card data-delete-employee className="ml-4 mr-4 overflow-hidden rounded-lg border-0 bg-white text-[14px] leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)] xl:h-[1752.625px] xl:w-[957.6625px]" style={{ boxShadow: "0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)" }}>
      <style>{`
        [data-delete-employee] .employee-delete-card-header { color: rgba(0, 0, 0, 0.87); font-family: Kanit, sans-serif; letter-spacing: -0.1px; }
        [data-delete-employee] .employee-delete-tabs > button { color: #000; letter-spacing: -0.1px; }
        [data-delete-employee] .employee-delete-table { overflow: hidden !important; background: #fff; box-shadow: 0px 2px 1px -1px rgba(0,0,0,.2), 0px 1px 1px 0px rgba(0,0,0,.14), 0px 1px 3px 0px rgba(0,0,0,.12) !important; }
        [data-delete-employee] .employee-delete-table th { border: 0 !important; letter-spacing: -0.1px !important; line-height: 22.001px !important; text-transform: none; }
        [data-delete-employee] .employee-delete-table th:first-child { border-radius: 2px 0 0; }
        [data-delete-employee] .employee-delete-table th:last-child { border-radius: 0 2px 0 0; }
        [data-delete-employee] .employee-delete-table td { border: 0; color: rgba(0,0,0,.65); letter-spacing: -0.1px; line-height: 22.001px; }
        [data-delete-employee] .employee-delete-table tbody tr:nth-child(odd) > td { background: #fff; }
        [data-delete-employee] .employee-delete-table tbody tr:nth-child(even) > td { background: #f2fafe; }
      `}</style>
      {/* Card header */}
      <div className="employee-delete-card-header group flex h-[59.3625px] items-center px-3 py-3 text-[22px] font-normal leading-[34.573px]">
        <div className="flex items-center">
        <span>ลบข้อมูลพนักงาน</span>
        <button
          type="button"
          className="ml-[10px] mr-[-30px] hidden rounded-full bg-[#f0f0f0] px-[6px] py-px text-[22px] font-normal leading-[25.3px] tracking-normal text-[rgba(0,0,0,0.87)] shadow-[0_2px_3px_rgba(0,0,0,0.5)] group-hover:inline-block"
          aria-label="ข้อมูลเพิ่มเติม"
        >
          <span className="block bg-[#ffa500] px-2 text-base font-normal leading-normal tracking-normal text-white">?</span>
        </button>
        </div>
      </div>

      <div className="employee-delete-card-body p-4 px-2">
      {/* Tab bar */}
      <div className="employee-delete-tabs flex h-[48.8px] border-b border-[#e5e5e5] pl-4">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={cn(
            "relative h-12 w-40 shrink-0 px-6 text-sm font-semibold leading-[22px] transition-colors focus-visible:outline-none",
            activeTab === "list"
              ? "text-[#008cff]"
              : "text-black/85 hover:text-black/85"
          )}
        >
          รายชื่อพนักงาน
          {activeTab === "list" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#008cff]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("permanent")}
          className={cn(
            "relative h-12 w-40 shrink-0 px-6 text-sm font-semibold leading-[22px] transition-colors focus-visible:outline-none",
            activeTab === "permanent"
              ? "text-[#008cff]"
              : "text-black/85 hover:text-black/85"
          )}
        >
          ลบถาวร{" "}
          <span className={activeTab === "permanent" ? "text-[#008cff]" : "text-black/85"}>({deletedTotal})</span>
          {activeTab === "permanent" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#008cff]" />
          )}
        </button>
      </div>

      {/* ==================== LIST TAB ==================== */}
      {activeTab === "list" ? (
        <CardContent className="p-4">
          {/* Info banner */}
          <div className="mb-4 flex h-[45.6px] items-center gap-[10px] rounded-[6px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-[10px] text-sm font-normal leading-[22.4px] text-[#009cff]">
            <CircleHelp className="size-5 shrink-0 text-[#2299ff]" />
            <span>
              พนักงานที่ถูกลบจะยังไม่หายทันที ระบบเก็บไว้{" "}
              <strong className="font-semibold">45 วัน</strong> สามารถกู้คืนได้จากแท็บ{" "}
              <strong className="font-semibold">ลบถาวร</strong> ก่อนครบกำหนด
            </span>
          </div>

          {/* Filter row */}
          <div className="mb-4 flex h-[58px] items-end gap-[10px]">
            <div className="flex h-[57.6px] w-[199.5px] shrink-0 flex-col gap-1">
              <label className="text-sm font-normal leading-[22px] text-black/85">โครงสร้างองค์กร</label>
              <Input
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                placeholder="โครงสร้างองค์กรทั้งหมด"
                className="employee-delete-filter-input employee-delete-input h-8 px-[11px] py-1 text-sm leading-[22px]"
              />
            </div>
            <div className="flex h-[57.6px] w-[199.5px] shrink-0 flex-col gap-1">
              <label className="text-sm font-normal leading-[22px] text-black/85">ตำแหน่ง</label>
              <Input
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                placeholder="ตำแหน่งทั้งหมด"
                className="employee-delete-filter-input employee-delete-input h-8 px-[11px] py-1 text-sm leading-[22px]"
              />
            </div>
            <div className="flex h-[57.6px] w-[199.5px] shrink-0 flex-col gap-1">
              <label className="text-sm font-normal leading-[22px] text-black/85">ค้นหาพนักงาน</label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัสพนักงาน ชื่อ นามสกุล เลขประจำตัวประชาชน"
                className="employee-delete-filter-input employee-delete-input h-8 px-[11px] py-1 text-sm leading-[22px]"
              />
            </div>
            <div className="flex h-[58px] w-[199.5px] shrink-0 flex-col gap-1">
              <label className="text-sm font-normal leading-[22px] text-black/85">สถานะพนักงาน</label>
              <EmployeeStatusDropdown
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
            <div className="flex h-[58px] w-[71.7px] shrink-0 items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                className="h-8 w-full rounded-[4px] border-0 bg-[#2299ff] px-5 text-sm font-normal leading-[16.1px] text-white shadow-none hover:bg-[#2299ff] hover:text-white"
              >
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
              <div className="employee-delete-table mb-6 min-h-[535.6px] overflow-x-auto rounded-lg border-0 shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.14),0_1px_3px_rgba(0,0,0,0.12)]">
                <Table className="text-sm leading-[22px] text-black/65">
                  <TableHeader>
                    <TableRow className="h-[46.8px] border-0 bg-[#61a8ff] hover:bg-[#61a8ff]">
                      <TableHead className="h-[46.8px] w-16 bg-[#61a8ff] px-2 py-3 text-center text-sm font-medium leading-[22px] text-white">
                        <EmployeeDeleteCheckbox checked={allSelected} onChange={toggleAll} />
                      </TableHead>
                      <TableHead className="h-[46.8px] w-[72.7px] bg-[#61a8ff] px-2 py-3 text-center text-sm font-medium leading-[22px] text-white">ลำดับ</TableHead>
                      <TableHead className="h-[46.8px] w-[163.5875px] bg-[#61a8ff] px-2 py-3 text-center text-sm font-medium leading-[22px] text-white">สถานะ</TableHead>
                      <TableHead className="h-[46.8px] w-[281.75px] bg-[#61a8ff] px-2 py-3 text-center text-sm font-medium leading-[22px] text-white">พนักงาน</TableHead>
                      <TableHead className="h-[46.8px] w-[163.5875px] bg-[#61a8ff] px-2 py-3 text-center text-sm font-medium leading-[22px] text-white">แผนก</TableHead>
                      <TableHead className="h-[46.8px] w-[163.625px] bg-[#61a8ff] px-2 py-3 text-center text-sm font-medium leading-[22px] text-white">ตำแหน่ง</TableHead>
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
                        <TableRow key={emp.id} className={cn("h-[48.8px] border-0 hover:bg-transparent", idx % 2 === 1 && "bg-[#f2fafe]")}>
                          <TableCell className="h-[48.8px] p-2 text-center text-sm font-normal leading-[22px] text-black/65">
                            <EmployeeDeleteCheckbox checked={selected.has(emp.id)} onChange={() => toggleRow(emp.id)} />
                          </TableCell>
                          <TableCell className="h-[48.8px] p-2 text-center text-sm font-normal leading-[22px] text-black/65">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                          <TableCell className="h-[48.8px] p-2 text-center text-sm font-normal leading-[22px] text-black/65">{emp.status}</TableCell>
                          <TableCell className="h-[48.8px] p-2 text-sm font-normal leading-[22px] text-black/65">
                            <div className="flex items-center gap-2">
                              <img src={PLACEHOLDER_PHOTO} alt={`${emp.firstNameTH} ${emp.lastNameTH}`} className="size-8 rounded-full object-cover" />
                              <span className="font-normal text-black/65">
                                <span className="font-semibold text-[#1976d2]">{emp.employeeCode ?? emp.employeeNumber}</span> : {emp.firstNameTH} {emp.lastNameTH}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="h-[48.8px] p-2 text-center text-sm font-normal leading-[22px] text-black/65">{emp.departmentName}</TableCell>
                          <TableCell className="h-[48.8px] p-2 text-center text-sm font-normal leading-[22px] text-black/65">{emp.positionName}</TableCell>
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
          <div className="mt-4 flex h-[62.425px] items-end gap-[10px]">
            <div className="flex h-[56.425px] w-[333.1625px] flex-col gap-1">
              <label className="text-[13px] font-medium leading-[20.425px] text-black/65">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="employee-delete-input h-8 w-full px-3 py-0 text-[13px] leading-[14.95px]" />
            </div>
            <div className="flex h-[56.425px] w-[333.175px] flex-col gap-1">
              <label className="text-[13px] font-medium leading-[20.425px] text-black/65">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="employee-delete-input h-8 w-full px-3 py-0 text-[13px] leading-[14.95px]" />
            </div>
            <div className="flex h-[62.425px] w-[223.325px] flex-col gap-1">
              <label className="h-[20.425px] text-[13px] font-medium leading-[20.425px] text-black/65">&nbsp;</label>
              <Button variant="destructive" disabled={!canDelete} onClick={handleDelete} className="h-[38px] rounded-[4px] border-0 bg-[#e53935] px-5 text-[13px] font-medium leading-[14.95px] text-white shadow-none hover:bg-[#e53935]">
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
                className="employee-delete-input h-9 text-sm"
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
                        <EmployeeDeleteCheckbox checked={allPurgeSelected} onChange={togglePurgeAll} />
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
                            <EmployeeDeleteCheckbox checked={purgeSelected.has(emp.id)} onChange={() => togglePurgeRow(emp.id)} />
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
                          <TableCell className="text-center font-normal text-foreground">{formatThaiDateNumeric(emp.deletedAt)}</TableCell>
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
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="employee-delete-input h-9 w-48 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="employee-delete-input h-9 w-48 text-sm" />
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
      </div>
    </Card>
  );
}

/* ========================= Shared sub-components ========================= */

function EmployeeDeleteCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <span className="employee-delete-checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span aria-hidden="true" className="employee-delete-checkbox__mark" />
    </span>
  );
}

function EmployeeStatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-8 w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-[4px] border bg-white px-[11px] text-left text-sm font-normal leading-[30px] text-black/65 outline-none",
          open
            ? "border-[#40a9ff] shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
            : "border-[#d9d9d9]"
        )}
      >
        <span className="truncate pr-[18px]">{value}</span>
        <svg
          viewBox="64 64 896 896"
          aria-hidden="true"
          className={cn("size-3 shrink-0 fill-current text-black/[.54] transition-transform", open && "rotate-180")}
        >
          <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-full rounded-[2px] bg-white py-1 text-sm leading-[22px] text-black/65 shadow-[0_3px_6px_-4px_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.08),0_9px_28px_8px_rgba(0,0,0,0.05)]"
        >
          {STATUS_OPTIONS.map((option) => {
            const selectedOption = option === value;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selectedOption}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-8 w-full items-center px-3 py-[5px] text-left text-sm leading-[22px]",
                  selectedOption
                    ? "bg-[#e6f7ff] font-semibold"
                    : "font-normal hover:bg-[#f5f5f5]"
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
    <div className="mb-0 flex h-8 items-center justify-end gap-0 text-sm leading-[22px] text-black/65">
      <span className="mr-2 h-8 leading-[30px]">
        {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
      </span>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="mr-2 flex size-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#039be5] transition-colors disabled:cursor-not-allowed disabled:text-black/25"
      >
        <ChevronLeft className="size-3" />
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
              "mr-2 flex size-8 items-center justify-center rounded-[2px] border bg-white text-sm transition-colors",
              p === page
                ? "border-[#1890ff] font-medium text-[#039be5]"
                : "border-[#d9d9d9] font-normal text-black/65"
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
        className="flex size-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#039be5] transition-colors disabled:cursor-not-allowed disabled:text-black/25"
      >
        <ChevronRight className="size-3" />
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
