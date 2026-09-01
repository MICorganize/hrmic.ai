"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type ComponentType } from "react";
import {
  ArrowUp,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Coins,
  Contact,
  Crosshair,
  Database,
  DollarSign,
  Download,
  FileCheck,
  FileClock,
  FileEdit,
  FileText,
  FileUser,
  FileWarning,
  GitBranch,
  GitFork,
  HandCoins,
  IdCard,
  Landmark,
  Megaphone,
  Menu,
  MessageSquare,
  Network,
  Pencil,
  PiggyBank,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldUser,
  Star,
  Timer,
  User,
  UserCog,
  UserSearch,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { UserDropdown } from "@/components/layouts/UserDropdown";

type IconComponent = ComponentType<{ className?: string }>;

type NavChild = {
  href: string;
  label: string;
  icon: IconComponent;
  /** Nested sub-items, e.g. the report list under a report group. */
  children?: NavChild[];
};
type NavItem = {
  href: string;
  label: string;
  /** Short label shown in the collapsed (narrow) sidebar. */
  shortLabel?: string;
  icon: IconComponent;
  children?: NavChild[];
};

/** Circular arrows around a dollar sign (currency exchange). */
function CurrencyExchangeIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <RefreshCw className="size-full" />
      <DollarSign className="absolute size-[45%]" strokeWidth={2.5} />
    </span>
  );
}

/** Open book with a person figure above it (learning resources). */
function LearningBookIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <BookOpen className="size-full" />
      <User className="absolute -top-[30%] left-1/2 size-[45%] -translate-x-1/2" />
    </span>
  );
}

/** Clock with a checkmark (work shifts). */
function ClockCheckIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <Clock className="size-full" />
      <Check className="absolute size-[45%]" strokeWidth={2.5} />
    </span>
  );
}

/** Database with an upward arrow (salary adjustment). */
function DatabaseUpIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <Database className="size-full" />
      <ArrowUp className="absolute -top-[15%] size-[55%]" strokeWidth={2.5} />
    </span>
  );
}

/** Database with a pencil (annual tax adjustment). */
function DatabaseEditIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <Database className="size-full" />
      <Pencil className="absolute -right-[10%] -top-[15%] size-[45%]" strokeWidth={2.5} />
    </span>
  );
}

/** Document with a banknote (payroll calculation report). */
function FileBanknoteIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <FileText className="size-full" />
      <Banknote className="absolute -bottom-[10%] -right-[10%] size-[55%]" strokeWidth={2} />
    </span>
  );
}

/** Document with a chat bubble (miscellaneous reports). */
function FileChatIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <FileText className="size-full" />
      <MessageSquare className="absolute -bottom-[5%] -right-[5%] size-[55%]" strokeWidth={2} />
    </span>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  {
    href: "/organization",
    label: "ข้อมูลองค์กร",
    shortLabel: "องค์กร",
    icon: Landmark,
    children: [
      { href: "/organization/organization-structure", label: "โครงสร้างองค์กร", icon: Network },
      { href: "/organization/organization-position", label: "โครงสร้างตำแหน่ง", icon: GitFork },
  { href: "/organization/organization-employee-type-group", label: "ข้อมูลกลุ่มประเภทพนักงาน", icon: UserCog },
      { href: "/attendance", label: "ข้อมูลกะการทำงาน", icon: ClockCheckIcon },
      { href: "/organization/organization-employee", label: "ข้อมูลพนักงาน", icon: IdCard },
      { href: "/organization/contacts", label: "ค้นหาผู้ติดต่อ", icon: UserSearch },
      { href: "/communication", label: "ประกาศข่าวสาร", icon: Megaphone },
      { href: "/organization/policy", label: "นโยบายบริษัท", icon: FileWarning },
    ],
  },
  {
    href: "/payroll",
    label: "การประมวลผลเงินเดือน",
    shortLabel: "เงินเดือน",
    icon: CurrencyExchangeIcon,
    children: [
      {
        href: "/payroll/time",
        label: "จัดการเวลา",
        icon: Timer,
        children: [
          { href: "/payroll/time#work-time", label: "ปรับปรุงเวลาการทำงาน", icon: Clock },
          { href: "/payroll/time#shift-holiday", label: "จัดการกะการทำงาน-วันหยุด", icon: CalendarClock },
        ],
      },
      {
        href: "/payroll/documents",
        label: "จัดการเอกสาร",
        icon: FileEdit,
        children: [
          { href: "/payroll/documents#time-leave", label: "จัดการลางาน", icon: FileText },
          { href: "/payroll/documents#ot", label: "จัดการโอที", icon: FileText },
          { href: "/payroll/documents#time-adjust", label: "จัดการเพิ่มเวลา", icon: FileText },
          { href: "/payroll/documents#work-cycle", label: "จัดการเปลี่ยนกะการทำงาน", icon: FileText },
          { href: "/payroll/documents#holiday", label: "จัดการเปลี่ยนวันหยุด", icon: FileText },
          { href: "/payroll/documents#advance", label: "เบิกเงินล่วงหน้า", icon: FileText },
        ],
      },
      { href: "/payroll/leave-quota", label: "จัดการโควตาการลา", icon: Crosshair },
      { href: "/payroll/employee-loans", label: "จัดการหนี้สินพนักงาน", icon: HandCoins },
      { href: "/payroll/structure", label: "ปรับโครงสร้างองค์กร/ตำแหน่ง", icon: GitBranch },
      { href: "/payroll/salary-adjustment", label: "ปรับเงินเดือนพนักงาน", icon: DatabaseUpIcon },
      { href: "/payroll/annual-tax", label: "ปรับปรุงภาษีประจำปี", icon: DatabaseEditIcon },
      { href: "/payroll/social-security", label: "ปรับปรุงประกันสังคมประจำปี", icon: FileCheck },
      {
        href: "/salary/calculate/normal",
        label: "การคำนวณเงินเดือน",
        icon: DollarSign,
        children: [
          { href: "/salary/calculate/normal", label: "คำนวณเงินเดือน", icon: DollarSign },
          { href: "/salary/calculate/special", label: "คำนวณงวดพิเศษ", icon: CalendarClock },
          { href: "/salary/calculate/ot", label: "คำนวณงวดโอที", icon: Clock },
          { href: "/salary/calculate/work-time", label: "คำนวณงวดเวลาการทำงาน", icon: Timer },
          { href: "/salary/calculate/commission", label: "คำนวณค่าคอมมิชชั่น", icon: Coins },
        ],
      },
      { href: "/payroll/schedule", label: "จัดการตารางเวลาการทำงาน", icon: CalendarClock },
    ],
  },
  {
    href: "/training",
    label: "แหล่งเรียนรู้",
    icon: LearningBookIcon,
    children: [
      { href: "/training", label: "E-Learning", icon: BookOpen },
    ],
  },
  {
    href: "/reports",
    label: "รายงาน",
    icon: ClipboardList,
    children: [
      {
        href: "/reports/employee-history",
        label: "กลุ่มประวัติพนักงาน",
        icon: FileUser,
        children: [
          { href: "/reports/employee-history/registry", label: "รายงานทะเบียนพนักงาน", icon: FileText },
          { href: "/reports/employee-history/birthdays", label: "รายงานวันเกิดประจำเดือน", icon: FileText },
          { href: "/reports/employee-history/probation", label: "รายงานพนักงานทดลองงาน", icon: FileText },
          { href: "/reports/employee-history/new-hires", label: "รายงานพนักงานเข้าใหม่", icon: FileText },
          { href: "/reports/employee-history/terminations", label: "รายงานพนักงานลาออก", icon: FileText },
          { href: "/reports/employee-history/renewals", label: "รายงานเอกสารต่ออายุ", icon: FileText },
          { href: "/reports/employee-history/permanent", label: "รายงานพนักงานบรรจุ", icon: FileText },
          { href: "/reports/employee-history/restructure", label: "รายงานปรับโครงสร้างองค์กร", icon: FileText },
          { href: "/reports/employee-history/salary-adjustment", label: "รายงานการปรับเงินเดือน", icon: FileText },
          { href: "/reports/employee-history/type-change", label: "รายงานปรับประเภทพนักงาน", icon: FileText },
        ],
      },
      {
        href: "/reports/work-time",
        label: "กลุ่มเวลาการทำงาน",
        icon: FileClock,
        children: [
          { href: "/reports/work-time/received-dates", label: "รายงานวันที่ได้รับ/วันที่ถูกหัก", icon: FileText },
          { href: "/reports/work-time/schedules", label: "รายงานตารางเวลาการทำงาน", icon: FileText },
          { href: "/reports/work-time/daily-schedules", label: "รายงานตารางเวลาการทำงานประจำวัน", icon: FileText },
          { href: "/reports/work-time/ot-schedules", label: "รายงานตารางเวลาการทำงาน แยกงวดโอที", icon: FileText },
          { href: "/reports/work-time/work-time-schedules", label: "รายงานตารางเวลาการทำงาน แยกงวดเวลาการทำงาน", icon: FileText },
          { href: "/reports/work-time/time-calculation", label: "รายงานผลการคำนวณเวลา", icon: FileText },
          { href: "/reports/work-time/public-holidays", label: "รายงานวันหยุดนักขัตฤกษ์ของพนักงาน", icon: FileText },
          { href: "/reports/work-time/document-requests", label: "รายงานการขอเอกสาร", icon: FileText },
          { href: "/reports/work-time/time-attendance", label: "รายงานการลงเวลา", icon: FileText },
          { href: "/reports/work-time/attendance-status", label: "รายงานสถานะมาทำงาน", icon: FileText },
          { href: "/reports/work-time/ot-period-calculation", label: "รายงานผลการคำนวณเวลางวดแยกโอที", icon: FileText },
          { href: "/reports/work-time/work-time-period-calculation", label: "รายงานผลการคำนวณเวลางวดแยกเวลาการทำงาน", icon: FileText },
          { href: "/reports/work-time/top-10", label: "รายงาน Top 10", icon: FileText },
        ],
      },
      {
        href: "/reports/leave-quota",
        label: "กลุ่มโควตาการลา",
        icon: ClipboardCheck,
        children: [
          { href: "/reports/leave-quota/quota-statistics", label: "รายงานสถิติการลาตามโควตา", icon: FileText },
          { href: "/reports/leave-quota/quota-details", label: "รายงานรายละเอียดโควตการลา", icon: FileText },
          { href: "/reports/leave-quota/leave-summary", label: "รายงานสรุปสถิติการลา", icon: FileText },
        ],
      },
      {
        href: "/reports/income-expense",
        label: "กลุ่มรายรับ-รายจ่าย",
        icon: Coins,
        children: [
          { href: "/reports/income-expense/advance-withdrawals", label: "รายงานเบิกล่วงหน้า", icon: FileText },
          { href: "/reports/income-expense/debt-liabilities", label: "รายงานภาระหนี้สิ้น", icon: FileText },
          { href: "/reports/income-expense/work-deposits", label: "รายงานเงินประกันการทำงาน", icon: FileText },
        ],
      },
      {
        href: "/reports/calculation",
        label: "กลุ่มการคำนวณเงินเดือน",
        icon: FileBanknoteIcon,
        children: [
          { href: "/reports/calculation/net-regular", label: "รายงานผลการคำนวณเงินเดือนสุทธิ งวดปกติ", icon: FileText },
          { href: "/reports/calculation/net-regular-yearly", label: "รายงานผลการคำนวณเงินเดือนสุทธิ งวดปกติประจำปี", icon: FileText },
          { href: "/reports/calculation/net-by-payment", label: "รายงานผลการคำนวณเงินเดือนสุทธิ แบ่งงวดจ่าย", icon: FileText },
          { href: "/reports/calculation/net-special", label: "รายงานผลการคำนวณเงินเดือนสุทธิ งวดพิเศษ", icon: FileText },
          { href: "/reports/calculation/net-ot-period", label: "รายงานการคำนวณสุทธิ งวดแยกโอที", icon: FileText },
          { href: "/reports/calculation/net-work-time-period", label: "รายงานการคำนวณสุทธิ งวดแยกเวลาการทำงาน", icon: FileText },
          { href: "/reports/calculation/by-department", label: "รายงานผลการคำนวณเงินเดือนแยกตามแผนก", icon: FileText },
          { href: "/reports/calculation/by-department-yearly", label: "รายงานผลการคำนวณเงินเดือนแยกตามแผนกประจำปี", icon: FileText },
          { href: "/reports/calculation/net-by-payment-department", label: "รายงานผลการคำนวณเงินเดือนสุทธิ แบ่งงวดจ่ายแยกตามแผนก", icon: FileText },
          { href: "/reports/calculation/by-income-expense-group", label: "รายงานผลการคำนวณเงินเดือนแบบแบ่งกลุ่มรายรับรายจ่าย", icon: FileText },
          { href: "/reports/calculation/payslips", label: "รายงานสลิปเงินเดือน", icon: FileText },
        ],
      },
      {
        href: "/reports/accounts",
        label: "กลุ่มรายรับรายจ่ายตามผังบัญชี",
        icon: Banknote,
        children: [
          { href: "/reports/accounts/net-by-account-group", label: "รายงานผลการคำนวณเงินเดือนสุทธิ แยกตามกลุ่มบัญชี", icon: FileText },
        ],
      },
      {
        href: "/reports/social-security",
        label: "กลุ่มประกันสังคม",
        icon: ShieldUser,
        children: [
          { href: "/reports/social-security/monthly", label: "ประกันสังคมประจำเดือน", icon: FileText },
          { href: "/reports/social-security/compensation-fund", label: "รายงานกองทุนเงินทดแทน (กท.20)", icon: FileText },
          { href: "/reports/social-security/compensation-fund-yearly", label: "รายงานกองทุนเงินทดแทนประจำปี (กท.20ก)", icon: FileText },
          { href: "/reports/social-security/social-security-check", label: "รายงานตรวจประกันสังคม (กท. 20ก)", icon: FileText },
          { href: "/reports/social-security/monthly-check", label: "รายงานตรวจประกันสังคมประจำเดือน (กท.20)", icon: FileText },
        ],
      },
      {
        href: "/reports/tax",
        label: "กลุ่มภาษี",
        icon: Contact,
        children: [
          { href: "/reports/tax/monthly", label: "ภาษีประจำเดือน (ภงด.1)", icon: FileText },
          { href: "/reports/tax/yearly", label: "ภาษีประจำปี (ภงด.1ก)", icon: FileText },
          { href: "/reports/tax/withholding", label: "ภาษี ณ ที่จ่าย (ภงด.3)", icon: FileText },
          { href: "/reports/tax/tax-check", label: "รายงานตรวจภาษี (ภงด.1ก)", icon: FileText },
          { href: "/reports/tax/monthly-check", label: "รายงานตรวจภาษีประจำเดือน (ภงด.1)", icon: FileText },
          { href: "/reports/tax/pnd-91-attachment", label: "ใบแนบ ภงด. 91", icon: FileText },
        ],
      },
      {
        href: "/reports/fund",
        label: "กลุ่มกองทุน",
        icon: PiggyBank,
        children: [
          { href: "/reports/fund/general", label: "รายงานกองทุน", icon: FileText },
          { href: "/reports/fund/provident-fund", label: "รายงานกองทุนสำรองเลี้ยงชีพ", icon: FileText },
          { href: "/reports/fund/provident-fund-yearly", label: "รายงานกองทุนสำรองเลี้ยงชีพประจำปี", icon: FileText },
          { href: "/reports/fund/history", label: "รายงานประวัติกองทุน", icon: FileText },
        ],
      },
      {
        href: "/reports/others",
        label: "อื่นๆ",
        icon: FileChatIcon,
        children: [
          { href: "/reports/others/hr-audit", label: "รายงานตรวจสอบฝ่ายบุคคล", icon: FileText },
          { href: "/reports/others/edit-history", label: "รายงานประวัติการแก้ไข", icon: FileText },
          { href: "/reports/others/document-history", label: "รายงานประวัติเอกสาร", icon: FileText },
          { href: "/reports/others/access-history", label: "รายงานประวัติการเข้าใช้งาน", icon: FileText },
        ],
      },
    ],
  },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
  { href: "/documents", label: "อื่นๆ", icon: ClipboardCheck },
];

/* --------------------------------- Favorites --------------------------------- */

const FAVORITES_KEY = "humansoft:favorites";
const FAVORITES_INITIALIZED_KEY = "humansoft:favorites:initialized";
const FAVORITES_SEED_VERSION_KEY = "humansoft:favorites:seed-version";
const FAVORITES_SEED_VERSION = "2";
const MAX_FAVORITES = 8;

/** A flat, deduped list of every page a user can favorite, grouped by section. */
function flattenMenuItems(): { href: string; label: string; icon: IconComponent; section: string }[] {
  const byHref = new Map<string, { href: string; label: string; icon: IconComponent; section: string }>();
  const add = (item: { href: string; label: string; icon: IconComponent }, section: string) => {
    if (!byHref.has(item.href)) {
      byHref.set(item.href, { href: item.href, label: item.label, icon: item.icon, section });
    }
  };
  for (const item of NAV_ITEMS) {
    if (item.children?.length) {
      for (const child of item.children) {
        add(child, item.label);
        child.children?.forEach((sub) => add(sub, `${item.label} / ${child.label}`));
      }
    } else {
      add(item, "เมนูหลัก");
    }
  }
  return [...byHref.values()];
}

/* --------------------------- Favorites external store -------------------------- */

const EMPTY_FAVORITES: string[] = [];
// Client-only snapshot cache. Reading localStorage during render on the server
// is impossible, so the store returns a stable empty snapshot there and during
// hydration; after hydration React swaps to the real client snapshot.
let favoritesCache: string[] | null = null;
const favoritesListeners = new Set<() => void>();

function readFavorites(): string[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const usesCurrentSeed =
      window.localStorage.getItem(FAVORITES_SEED_VERSION_KEY) === FAVORITES_SEED_VERSION;
    // Seed the shared Portal store with the eight welcome shortcuts. The version
    // keeps old, empty browser state from opening a blank panel on other routes,
    // while still allowing an explicit empty list after the user has edited it.
    const parsed = raw ? JSON.parse(raw) : [];
    if (!usesCurrentSeed && Array.isArray(parsed) && parsed.length === 0) {
      return DASHBOARD_STARTER_FAVORITES;
    }
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((v): v is string => typeof v === "string"))].slice(0, MAX_FAVORITES)
      : [];
  } catch {
    return [];
  }
}

function getFavoritesSnapshot(): string[] {
  if (favoritesCache === null) favoritesCache = readFavorites();
  return favoritesCache;
}

/** Used during SSR and hydration so server HTML and first client render match. */
function getFavoritesServerSnapshot(): string[] {
  return EMPTY_FAVORITES;
}

function subscribeFavorites(listener: () => void) {
  favoritesListeners.add(listener);
  return () => {
    favoritesListeners.delete(listener);
  };
}

function writeFavorites(next: string[]) {
  favoritesCache = next;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    window.localStorage.setItem(FAVORITES_INITIALIZED_KEY, "true");
    window.localStorage.setItem(FAVORITES_SEED_VERSION_KEY, FAVORITES_SEED_VERSION);
  } catch {
    // storage unavailable — favorites just won't persist
  }
  favoritesListeners.forEach((listener) => listener());
}

function useFavorites() {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot
  );

  return {
    favorites,
    isFavorite: (href: string) => favorites.includes(href),
    toggleFavorite: (href: string) => {
      if (favorites.includes(href)) {
        writeFavorites(favorites.filter((h) => h !== href));
        return;
      }
      if (favorites.length < MAX_FAVORITES) {
        writeFavorites([...favorites, href]);
      }
    },
    removeFavorite: (href: string) => writeFavorites(favorites.filter((h) => h !== href)),
  };
}

function isChildActive(child: NavChild, pathname: string): boolean {
  if (pathname === child.href || pathname.startsWith(child.href + "/")) return true;
  return child.children?.some((sub) => isChildActive(sub, pathname)) ?? false;
}

function isItemActive(item: NavItem, pathname: string) {
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return item.children?.some((child) => isChildActive(child, pathname)) ?? false;
}

function findExpandedParent(pathname: string): string | null {
  const activeItem = NAV_ITEMS.find((item) => item.children && isItemActive(item, pathname));

  // Humansoft treats the organization child drawer as a transient menu picker.
  // A direct organization-structure route therefore starts with the drawer
  // closed rather than reopening it over the destination page.
  return activeItem?.href === "/organization" ? null : activeItem?.href ?? null;
}

function SubmenuPanel({
  item,
  currentPath,
  onNavigate,
}: {
  item: NavItem;
  currentPath: string;
  onNavigate?: () => void;
}) {
  const children = item.children ?? [];
  const isOrganizationMenu = item.href === "/organization";
  const findExpandedGroup = () =>
    children.find(
      (child) =>
        child.children?.length &&
        (currentPath === child.href || currentPath.startsWith(child.href + "/"))
    )?.href ?? null;

  // Auto-expand the group matching the current page; re-sync on navigation
  // via a render-phase update (same pattern used elsewhere in this layout).
  const [openGroup, setOpenGroup] = useState<string | null>(findExpandedGroup);
  const [prevPath, setPrevPath] = useState(currentPath);
  if (prevPath !== currentPath) {
    setPrevPath(currentPath);
    setOpenGroup(findExpandedGroup());
  }

  return (
    <div className={cn(isOrganizationMenu ? "pt-[25px]" : "p-4")} data-testid="nav-child-panel">
      <h2
        className={cn(
          isOrganizationMenu
            ? "mb-2.5 h-10 px-5 text-sm font-normal leading-10 text-black/87"
            : "mb-3 px-2 text-base font-bold text-foreground"
        )}
      >
        {item.label}
      </h2>
      <nav className={cn(isOrganizationMenu ? "px-4" : "space-y-0.5")}>
        {children.map((child) => {
          const active = isChildActive(child, currentPath);
          // Groups with sub-items render as an expandable accordion.
          if (child.children?.length) {
            const open = openGroup === child.href;
            return (
              <div key={child.href}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : child.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[#e3f2fd] font-medium text-[#0080ff]"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <child.icon className={cn("shrink-0", isOrganizationMenu ? "size-6" : "size-4")} />
                  <span className="min-w-0 flex-1 truncate text-left">{child.label}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>
                {open && (
                  <div className="ml-4 space-y-0.5 border-l border-border pb-1 pl-2 pt-0.5">
                    {child.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => {
                          window.dispatchEvent(new Event("employee-list-close"));
                          onNavigate?.();
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                          isChildActive(sub, currentPath)
                            ? "font-medium text-[#0080ff]"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                isOrganizationMenu
                  ? "flex h-12 items-center gap-3 rounded-lg pl-7 pr-[7px] text-sm transition-colors"
                  : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[#e3f2fd] font-medium text-[#0080ff]"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <child.icon className={cn("shrink-0", isOrganizationMenu ? "size-6" : "size-4")} />
              <span className="truncate">{child.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

type FavoriteItem = { href: string; label: string; icon: IconComponent; section: string };

// The Humansoft welcome screen ships with this practical starter set. Keep it
// visible on the dashboard even before a newly created workspace has saved its
// own shortcuts, so the landing page does not open with an empty favourites
// section.
const DASHBOARD_STARTER_FAVORITES = [
  "/salary/calculate/normal",
  "/organization/organization-employee",
  "/payroll/documents#time-leave",
  "/payroll/time#shift-holiday",
  "/payroll/time#work-time",
  "/payroll/documents#ot",
  "/organization",
  "/payroll/documents#time-adjust",
];

function toFavoriteItem(item: FavoriteItem): FavoriteItem {
  return item.href === "/salary/calculate/normal"
    ? { ...item, label: "คำนวณเงินเดือน" }
    : item;
}

function SearchFavoritesPanel({
  items,
  favorites,
  isFavorite,
  onToggle,
}: {
  items: FavoriteItem[];
  favorites: string[];
  isFavorite: (href: string) => boolean;
  onToggle: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  // With no search term the reference panel shows the user's saved shortcuts.
  // Typing switches the list to matching menus so another shortcut can be added.
  const visibleItems = useMemo(() => {
    if (!q) {
      // Preserve shortcut order from the sidebar, matching the welcome page.
      return favorites
        .map((href) => items.find((item) => item.href === href))
        .filter((item): item is FavoriteItem => item !== undefined)
        .map(toFavoriteItem);
    }
    const needle = q.toLowerCase();
    return items.filter(
      (item) => item.label.toLowerCase().includes(needle) || item.href.toLowerCase().includes(needle)
    );
  }, [favorites, items, q]);

  const selectedCount = favorites.length;

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="shrink-0 px-5 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-muted-foreground/55" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาเพื่อเพิ่มเมนูโปรด"
            autoFocus
            className="h-9 w-full border-b border-border bg-transparent pl-9 pr-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
        </div>
      </div>

      <div className="shrink-0 px-5 pb-2 pt-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">รายการเมนูโปรด</h2>
          <span className="text-sm text-muted-foreground">{selectedCount}/{MAX_FAVORITES}</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">
        {visibleItems.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {q ? "ไม่พบเมนูที่ค้นหา" : "ยังไม่มีเมนูโปรด"}
          </p>
        )}
        {visibleItems.map((item) => {
          const fav = isFavorite(item.href);
          const cannotAdd = !fav && favorites.length >= MAX_FAVORITES;
          return (
            <button
              key={item.href}
              type="button"
              disabled={cannotAdd}
              onClick={() => onToggle(item.href)}
              className={cn(
                "flex w-full items-center gap-4 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45",
                fav && "text-foreground"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <Star
                className={cn(
                  "size-5 shrink-0 transition-colors",
                  fav ? "fill-[#ffc400] text-[#ffc400]" : "text-muted-foreground/45"
                )}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarContent({
  currentPath,
  expanded,
  onToggle,
  onClose,
  collapsed = false,
  onExpand,
  onAddFavorite,
  favoritesActive,
  favoriteItems,
}: {
  currentPath: string;
  expanded: string | null;
  onToggle: (href: string) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onExpand?: () => void;
  onAddFavorite: () => void;
  /** True while the add-favorites (search) panel is open — highlights the row. */
  favoritesActive: boolean;
  /** Resolved favorite menu items, shown inline under เมนูโปรด. */
  favoriteItems: FavoriteItem[];
}) {
  const router = useRouter();

  // Collapsed (narrow) mode: icon with the label underneath.
  if (collapsed) {
    return (
      <div className="flex h-full flex-col">
        {/* Logo mark */}
        <div className="flex h-14 shrink-0 items-center justify-center">
          <span className="flex size-[43.2px] items-center justify-center rounded-lg bg-white text-[13.2px] font-bold tracking-[-0.08em] text-[#0799f4]">
            HR
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
          <button
            type="button"
            className="flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/15"
          >
            <Search className="size-5 shrink-0" />
            <span className="w-full truncate text-center leading-tight">ค้นหาเมนู</span>
          </button>
          <button
            type="button"
            onClick={() => onExpand?.()}
            className="flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/15"
          >
            <Star className="size-5 shrink-0 fill-current" />
            <span className="w-full truncate text-center leading-tight">เมนูโปรด</span>
          </button>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item, currentPath);
            const hasChildren = !!item.children?.length;
            const label = item.shortLabel ?? item.label;
            const cls = cn(
              "flex w-full flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors",
              active ? "bg-white text-[#0080ff] shadow-sm" : "text-white hover:bg-white/15"
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={hasChildren ? onExpand : undefined}
                className={cls}
              >
                <item.icon className="size-5 shrink-0" />
                <span className="w-full truncate text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 px-2 pb-3 text-center">
          <p className="text-[10px] text-white/80">v.2.6.27</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo header */}
      <div className="flex h-[5.875rem] shrink-0 items-center justify-between gap-2 px-5">
        <span className="truncate text-[2.82rem] font-bold tracking-[-0.06em] text-white">
          HRMic<span className="text-[#ff9700]">.ai</span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-white/90 transition-colors hover:bg-white/15"
              aria-label="ปิดเมนู"
            >
              <X className="size-5" />
            </button>
          )}
          <button
            type="button"
            className="rounded-md p-1.5 text-white/90 transition-colors hover:bg-white/15"
            aria-label="ค้นหา"
          >
            <Search className="size-6" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4 pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* เมนูโปรด (favorites) header row */}
        <button
          type="button"
          onClick={onAddFavorite}
          aria-expanded={favoritesActive}
          aria-label={favoritesActive ? "ปิดเมนูโปรด" : "เพิ่มเมนูโปรด"}
          className={cn(
            "flex h-10 w-full items-center gap-4 rounded-lg px-6 text-sm font-normal leading-[22.001px] transition-colors",
            favoritesActive ? "bg-white text-[#367fbf] shadow-sm" : "text-white hover:bg-white/15"
          )}
        >
          <Star className="size-5 shrink-0 fill-current" />
          <span className="truncate">เมนูโปรด</span>
          {favoritesActive ? (
            <ChevronRight className="ml-auto size-5 shrink-0" />
          ) : (
            <Plus className="ml-auto size-4 shrink-0" />
          )}
        </button>

        {/* Favorite items — shown inline under เมนูโปรด, above the main menu */}
        {favoriteItems.length > 0 && (
          <div className="space-y-1.5">
            {favoriteItems.map((item) => {
              const active = currentPath === item.href || currentPath.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => window.dispatchEvent(new Event("employee-list-close"))}
                  className={cn(
                    "ml-8 flex h-10 items-center gap-4 rounded-lg px-6 text-sm leading-[22.001px] transition-colors",
                    active
                      ? "bg-white text-[#367fbf] shadow-sm"
                      : "text-white/90 hover:bg-white/15"
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const active = isItemActive(item, currentPath);
          const hasChildren = !!item.children?.length;
          const isExpanded = expanded === item.href;
          const cls = cn(
              "flex h-10 items-center gap-4 rounded-lg px-6 text-sm font-normal leading-[22.001px] transition-colors",
              active || isExpanded ? "bg-white text-[#367fbf] shadow-sm" : "text-white hover:bg-white/15"
            );
          const content = (
            <>
              <item.icon className="size-5 shrink-0" />
              <span className="truncate">{item.label}</span>
              {hasChildren && <ChevronRight className="ml-auto size-5 shrink-0" aria-hidden="true" />}
            </>
          );
          return hasChildren ? (
            <button
              key={item.href}
              type="button"
              aria-expanded={isExpanded}
              onClick={() => {
                // The reference treats this row as a drawer trigger. It opens
                // its child panel without changing the current page.
                if (item.href === "/organization") {
                  onToggle(item.href);
                  return;
                }
                onToggle(item.href);
                if (!isExpanded) router.push(item.href);
              }}
              className={cn(cls, "w-full text-left")}
            >
              {content}
            </button>
          ) : (
            <Link key={item.href} href={item.href} className={cls}>
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="shrink-0 px-4 pb-1 text-center">
        <p className="text-[11px] text-white/80">v.2.6.27</p>
      </div>
    </div>
  );
}

// Pages that render their own in-page submenu — hide the layout's submenu panel there
// so the page can use the full width. The employee detail routes inherit the same.
// /salary/calculate/normal collapses the การประมวลผลเงินเดือน submenu because the
// page ships its own ภาพรวม/รายบุคคล/รายองค์กร/ปิดงวด/สรุปงวด navigation.
const FULL_WIDTH_PAGES = ["/payroll/documents", "/payroll/time", "/salary/calculate/normal", "/salary/calculate/special", "/salary/calculate/ot", "/salary/calculate/work-time", "/salary/calculate/commission", "/training"];

function isFullWidthPage(pathname: string) {
  return (
    FULL_WIDTH_PAGES.includes(pathname) ||
    FULL_WIDTH_PAGES.some((page) => pathname.startsWith(page + "/"))
  );
}

/** Leaf report pages (/reports/<group>/<report>) — the submenu panel collapses on them. */
const REPORT_LEAF_PAGES = new Set(
  NAV_ITEMS.find((item) => item.href === "/reports")?.children?.flatMap(
    (group) => group.children?.map((report) => report.href) ?? []
  ) ?? []
);

function isReportLeafPage(pathname: string) {
  return REPORT_LEAF_PAGES.has(pathname);
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchFavoritesOpen, setSearchFavoritesOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(() => findExpandedParent(pathname));
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [submenuCollapsed, setSubmenuCollapsed] = useState(() => isReportLeafPage(pathname));
  const favorites = useFavorites();
  const allMenuItems = useMemo(() => flattenMenuItems(), []);
  const favoriteItems = useMemo(
    () => {
      return favorites.favorites
        .map((href) => allMenuItems.find((candidate) => candidate.href === href))
        .filter((item): item is FavoriteItem => item !== undefined)
        .map(toFavoriteItem);
    },
    [allMenuItems, favorites.favorites]
  );
  // Reset the expanded parent when navigating between pages (render-phase update,
  // per React's "storing information from previous renders" pattern). The
  // search-to-add panel closes on navigation. The reports submenu collapses when
  // entering a specific report page and reopens when leaving it; navigating
  // between report pages keeps the user's manual choice.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setSearchFavoritesOpen(false);
    setExpanded(findExpandedParent(pathname));
    const prevLeaf = isReportLeafPage(prevPathname);
    const nextLeaf = isReportLeafPage(pathname);
    if (prevLeaf !== nextLeaf) {
      setSubmenuCollapsed(nextLeaf);
    }
  }
  const expandedItem =
    NAV_ITEMS.find((item) => item.href === expanded && item.children?.length) ?? null;
  const hideSubmenu = isFullWidthPage(pathname);
  const sidePanelOpen =
    !collapsed && (searchFavoritesOpen || (!hideSubmenu && !!expandedItem && !submenuCollapsed));
  const toggleSection = (href: string) => {
    setSearchFavoritesOpen(false);
    setExpanded((prev) => (prev === href ? null : href));
  };
  const openAddFavorites = () => setSearchFavoritesOpen((v) => !v);

  // The child menu is a temporary drawer in the reference UI. Escape dismisses
  // it just like clicking its dimmed backdrop.
  useEffect(() => {
    if (!sidePanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchFavoritesOpen(false);
        setExpanded(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidePanelOpen]);

  return (
    <div className={cn("min-h-screen bg-background", pathname === "/dashboard" && "h-screen overflow-hidden")}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
            "fixed inset-y-0 left-0 z-40 hidden bg-[#0259e6] lg:block",
          collapsed ? "w-24" : "w-80"
        )}
      >
        {/* Collapse/expand toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-[10px] top-[71.5px] z-50 flex size-[21px] items-center justify-center rounded-[50px] border border-black/40 bg-white text-black shadow-[0_2px_2px_rgba(0,0,0,0.25)] transition-colors hover:bg-slate-100"
          aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
        >
          {collapsed ? <ChevronRight className="size-[18px] translate-y-[1.1875px]" /> : <ChevronLeft className="size-[18px] translate-y-[1.1875px]" />}
        </button>
        <SidebarContent
          currentPath={pathname}
          expanded={expanded}
          onToggle={toggleSection}
          collapsed={collapsed}
          onExpand={() => setCollapsed(false)}
          onAddFavorite={openAddFavorites}
          favoritesActive={searchFavoritesOpen}
          favoriteItems={favoriteItems}
        />
      </aside>

      {/* The report reference keeps its leaf pages full-width.  In that state the
          sidebar's own fold control is the only control on its edge; rendering
          the submenu-return control as well would place two buttons on top of
          each other. */}
      {!hideSubmenu && !isReportLeafPage(pathname) && !!expandedItem && !collapsed && submenuCollapsed && (
        <button
          type="button"
          onClick={() => setSubmenuCollapsed(false)}
          className="fixed left-80 top-16 z-50 hidden size-7 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-md transition-colors hover:bg-muted lg:flex"
          aria-label="กลับไปเมนูรายงาน"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {/* Desktop submenu panel (hidden while the sidebar is collapsed or on full-width pages) */}
      {sidePanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-y-0 left-80 z-30 hidden w-[calc(100%-20rem)] cursor-default bg-black/55 lg:block"
            onClick={() => {
              setSearchFavoritesOpen(false);
              setExpanded(null);
            }}
            aria-label={searchFavoritesOpen ? "ปิดแผงเมนูโปรด" : "ปิดแผงข้อมูลองค์กร"}
          />
          <aside className="fixed inset-y-0 left-80 z-40 hidden w-80 overflow-y-auto border-r border-border bg-[#fafafa] lg:block">
          {searchFavoritesOpen ? (
            <SearchFavoritesPanel
              items={allMenuItems}
              favorites={favorites.favorites}
              isFavorite={favorites.isFavorite}
              onToggle={favorites.toggleFavorite}
            />
          ) : expandedItem ? (
            <SubmenuPanel
              item={expandedItem}
              currentPath={pathname}
              onNavigate={() => setExpanded(null)}
            />
          ) : null}
          </aside>
        </>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-white shadow-xl">
            <div className="bg-[#0259e6]">
              <SidebarContent
                currentPath={pathname}
                expanded={expanded}
                onToggle={toggleSection}
                onClose={() => setMobileOpen(false)}
                onAddFavorite={openAddFavorites}
                favoritesActive={searchFavoritesOpen}
                favoriteItems={favoriteItems}
              />
            </div>
            {searchFavoritesOpen && (
              <SearchFavoritesPanel
                items={allMenuItems}
                favorites={favorites.favorites}
                isFavorite={favorites.isFavorite}
                onToggle={favorites.toggleFavorite}
              />
            )}
            {expandedItem && !hideSubmenu && (
              <SubmenuPanel
                item={expandedItem}
                currentPath={pathname}
                onNavigate={() => {
                  setExpanded(null);
                  setMobileOpen(false);
                }}
              />
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          "transition-[padding]",
          collapsed ? "lg:pl-24" : "lg:pl-80"
        )}
      >
        {/* Topbar — matches the reference toolbar (white bg, #D8E0E9 border) */}
        <header
          className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-white px-4 sm:px-6"
          style={{ borderColor: "#D8E0E9" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="rounded-md p-1.5 text-foreground hover:bg-accent lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="เปิดเมนู"
            >
              <Menu className="size-5" />
            </button>

            {/* Company selector */}
            <button
              type="button"
              className="group flex min-w-0 items-center gap-2 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-muted/60"
              aria-haspopup="menu"
            >
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-base font-medium text-foreground">MIC</span>
                <span className="truncate text-xs font-medium text-muted-foreground">
                  MIC ORGANIZE CO., LTD.
                </span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-foreground/60 transition-transform group-hover:text-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Download queue — dark gray circle with white glyph (previous size) */}
            <button
              type="button"
              className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-[#4d4d4d] text-white transition-opacity hover:opacity-80"
              aria-label="ดาวน์โหลด"
            >
              <Download className="size-3.25" strokeWidth={2} />
            </button>

            {/* Help center — dark gray circle with white question mark (previous size) */}
            <button
              type="button"
              className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-[#4d4d4d] text-white transition-opacity hover:opacity-80"
              aria-label="ช่วยเหลือ"
            >
              <CircleHelp className="size-3.25" strokeWidth={2} />
            </button>

            {/* Notifications — solid dark gray bell (1.5x, others unchanged) */}
            <button
              type="button"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#4d4d4d] transition-colors hover:bg-muted"
              aria-label="การแจ้งเตือน"
            >
              <Bell className="size-6" fill="currentColor" strokeWidth={2} />
            </button>

            <UserDropdown />
          </div>
        </header>

        <main
          className={cn(
            "overflow-x-hidden p-4 sm:p-6 lg:p-8",
            // Pages that render their own full-width banner flush under the topbar.
            (pathname === "/dashboard" ||
              pathname === "/attendance" ||
              pathname === "/communication" ||
              pathname === "/organization" ||
              pathname === "/organization/organization-structure" ||
              pathname === "/organization/contacts" ||
              pathname === "/organization/organization-position" ||
              pathname === "/organization/policy" ||
              pathname === "/organization/organization-employee-type-group" ||
              pathname === "/organization/organization-employee" ||
              pathname === "/payroll/time" ||
              pathname === "/payroll/documents" ||
              pathname.startsWith("/organization/organization-employee/") ||
              pathname === "/salary/calculate/normal" ||
              pathname === "/salary/calculate/special" ||
              pathname === "/salary/calculate/ot" ||
              pathname === "/salary/calculate/work-time" ||
              pathname === "/salary/calculate/commission" ||
              pathname === "/training" ||
              pathname === "/reports/employee-history/registry" ||
              pathname === "/reports/employee-history/birthdays" ||
              pathname === "/reports/employee-history/probation" ||
              pathname === "/reports/employee-history/new-hires" ||
              pathname === "/reports/employee-history/terminations" ||
              pathname === "/reports/employee-history/renewals" ||
              pathname === "/reports/employee-history/permanent" ||
              pathname === "/reports/employee-history/restructure" ||
              pathname === "/reports/employee-history/salary-adjustment" ||
              pathname === "/reports/employee-history/type-change" ||
              pathname === "/reports/calculation/net-regular") &&
              "p-0 sm:p-0 lg:p-0",
            pathname === "/dashboard" &&
              "h-[calc(100vh-4rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            pathname === "/salary/calculate/normal" &&
              "h-[calc(100vh-4rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
