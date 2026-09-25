"use client";

import dynamic from "next/dynamic";
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
  Search,
  Settings,
  ShieldUser,
  Sparkles,
  Star,
  Timer,
  User,
  UserCog,
  UserSearch,
  Maximize,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getLatestPortalActiveCompany,
  PORTAL_ACTIVE_COMPANY_EVENT,
  selectPortalActiveCompany,
} from "@/components/layouts/PortalActiveCompanySync";
import { notifyEmployeeDashboardReset } from "@/components/layouts/portalEvents";
import {
  AssignmentNavIcon,
  EmptySettingsNavIcon,
  LoginAsNavIcon,
  OtherSettingsNavIcon,
  RuleSettingsNavIcon,
} from "@/components/layouts/SettingsNavIcons";
import { preloadEmployeeSummary, promotePreloadedEmployeeSummary } from "@/lib/employee/summary-client";

const UserDropdown = dynamic(
  () => import("@/components/layouts/UserDropdown").then((module) => module.UserDropdown),
  {
    ssr: false,
    loading: () => <div aria-hidden className="size-6.5 rounded-full bg-[#4d4d4d]" />,
  }
);

const SearchFavoritesPanel = dynamic(
  () => import("@/components/layouts/SearchFavoritesPanel").then((module) => module.SearchFavoritesPanel),
  {
    ssr: false,
    loading: () => <div aria-busy className="h-full animate-pulse bg-[#fafafa]" />,
  }
);

const SubmenuPanel = dynamic(
  () => import("@/components/layouts/SubmenuPanel").then((module) => module.SubmenuPanel),
  {
    ssr: false,
    loading: () => <div aria-busy className="h-24 animate-pulse bg-[#fafafa]" />,
  }
);

type IconComponent = ComponentType<{ className?: string }>;

type ActiveCompany = {
  id: string;
  name: string;
  code: string | null;
  employeeLimit: number | null;
};
type CompanyOption = Omit<ActiveCompany, "employeeLimit">;
type CompaniesResponse = {
  companies?: Array<{ id: string; code: string; nameEN: string }>;
};

type NavChild = {
  href: string;
  label: string;
  icon: IconComponent;
  /** Stable selector used by the reference navigation and UI tests. */
  testId?: string;
  /** Stable selector for an accordion's nested item container. */
  childrenTestId?: string;
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

/** Matches the reference `currency_exchange` navigation icon. */
function CurrencyExchangeIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn("shrink-0", className)} viewBox="0 0 20 20" fill="none">
      <path
        fill="currentColor"
        d="M10.0007 19.1666C8.4451 19.1666 7.01454 18.8125 5.70898 18.1041C4.40343 17.3958 3.33398 16.4514 2.50065 15.2708V17.5H0.833984V12.5H5.83398V14.1666H3.77148C4.43815 15.1666 5.31662 15.9722 6.4069 16.5833C7.49718 17.1944 8.6951 17.5 10.0007 17.5C11.0423 17.5 12.018 17.3021 12.9277 16.9062C13.8375 16.5104 14.6291 15.9757 15.3027 15.3021C15.9763 14.6285 16.5111 13.8368 16.9069 12.9271C17.3027 12.0173 17.5007 11.0416 17.5007 9.99998H19.1673C19.1673 11.2639 18.9277 12.4514 18.4486 13.5625C17.9694 14.6736 17.3132 15.6458 16.4798 16.4791C15.6465 17.3125 14.6743 17.9687 13.5632 18.4479C12.452 18.9271 11.2645 19.1666 10.0007 19.1666ZM9.25065 15.8333V14.75C8.59787 14.5972 8.06662 14.316 7.6569 13.9062C7.24718 13.4965 6.9451 12.9583 6.75065 12.2916L8.12565 11.75C8.29232 12.3194 8.55273 12.7465 8.9069 13.0312C9.26107 13.316 9.66732 13.4583 10.1257 13.4583C10.584 13.4583 10.9763 13.3507 11.3027 13.1354C11.6291 12.9201 11.7923 12.5833 11.7923 12.125C11.7923 11.7222 11.6222 11.3958 11.2819 11.1458C10.9416 10.8958 10.334 10.6111 9.45899 10.2916C8.63954 9.99998 8.03885 9.65276 7.6569 9.24998C7.27496 8.8472 7.08398 8.31942 7.08398 7.66665C7.08398 7.0972 7.2819 6.57984 7.67774 6.11456C8.07357 5.64929 8.61176 5.3472 9.29232 5.20831V4.16665H10.7507V5.20831C11.2507 5.24998 11.7055 5.45137 12.1152 5.81248C12.525 6.17359 12.8062 6.5972 12.959 7.08331L11.6257 7.62498C11.5145 7.30554 11.334 7.03817 11.084 6.8229C10.834 6.60762 10.4868 6.49998 10.0423 6.49998C9.55621 6.49998 9.18468 6.60415 8.92774 6.81248C8.67079 7.02081 8.54232 7.30554 8.54232 7.66665C8.54232 8.02776 8.70204 8.31248 9.02148 8.52081C9.34093 8.72915 9.91732 8.9722 10.7507 9.24998C11.7507 9.61109 12.4173 10.0347 12.7507 10.5208C13.084 11.0069 13.2507 11.5416 13.2507 12.125C13.2507 12.5278 13.1812 12.8819 13.0423 13.1875C12.9034 13.493 12.7194 13.7535 12.4902 13.9687C12.2611 14.184 11.9937 14.3576 11.6882 14.4896C11.3826 14.6215 11.0562 14.7222 10.709 14.7916V15.8333H9.25065ZM0.833984 9.99998C0.833984 8.73609 1.07357 7.54859 1.55273 6.43748C2.0319 5.32637 2.68815 4.35415 3.52148 3.52081C4.35482 2.68748 5.32704 2.03123 6.43815 1.55206C7.54926 1.0729 8.73676 0.833313 10.0007 0.833313C11.5562 0.833313 12.9868 1.18748 14.2923 1.89581C15.5979 2.60415 16.6673 3.54859 17.5007 4.72915V2.49998H19.1673V7.49998H14.1673V5.83331H16.2298C15.5632 4.83331 14.6847 4.02776 13.5944 3.41665C12.5041 2.80554 11.3062 2.49998 10.0007 2.49998C8.95898 2.49998 7.98329 2.6979 7.07357 3.09373C6.16385 3.48956 5.37218 4.02429 4.69857 4.6979C4.02496 5.37151 3.49023 6.16317 3.0944 7.0729C2.69857 7.98262 2.50065 8.95831 2.50065 9.99998H0.833984Z"
      />
    </svg>
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
  { href: "/organization/organization-employee", label: "ข้อมูลพนักงาน", icon: IdCard },
  { href: "/salary/calculate/normal", label: "คำนวณเงินเดือน", icon: CurrencyExchangeIcon },
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
      { href: "/organization/contacts", label: "ค้นหาผู้ติดต่อ", icon: UserSearch },
      { href: "/communication", label: "ประกาศข่าวสาร", icon: Megaphone },
      { href: "/organization/policy", label: "นโยบายบริษัท", icon: FileWarning },
    ],
  },
  {
    href: "/payroll",
    label: "ประมวลผลเงินเดือน",
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
        icon: CurrencyExchangeIcon,
        children: [
          { href: "/salary/calculate/normal", label: "คำนวณเงินเดือน", icon: CurrencyExchangeIcon },
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
          { href: "/reports/report-nettotal", label: "รายงานผลการคำนวณเงินเดือนสุทธิ งวดปกติ", icon: FileText },
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
  {
    href: "/settings",
    label: "ตั้งค่า",
    icon: Settings,
    children: [
      {
        href: "/settings/tutorial",
        label: "ตั้งค่าเริ่มต้น",
        icon: AssignmentNavIcon,
        testId: "nav-child-setting-tutorial",
      },
      {
        href: "/settings/setting-user",
        label: "ตั้งค่าผู้ใช้",
        icon: EmptySettingsNavIcon,
        testId: "nav-child-setting-users",
        childrenTestId: "nav-child-children-setting-users",
        children: [
          { href: "/settings/setting-user/user-group", label: "ข้อมูลกลุ่มผู้ใช้", icon: UserCog, testId: "nav-child-setting-setting-user-user_group" },
          { href: "/settings/setting-user/user-admin", label: "ข้อมูลผู้ดูแล", icon: ShieldUser, testId: "nav-child-setting-setting-user-user_admin" },
          { href: "/settings/setting-user/user-permission", label: "สิทธิการเข้าถึงข้อมูล", icon: ShieldUser, testId: "nav-child-setting-null-null" },
        ],
      },
      { href: "/settings/setting-general", label: "ตั้งค่าทั่วไป", icon: AssignmentNavIcon, testId: "nav-child-setting-setting_general" },
      {
        href: "/settings/setting-payroll",
        label: "ตั้งค่าการคำนวณ",
        icon: RuleSettingsNavIcon,
        testId: "nav-child-setting-payroll",
        childrenTestId: "nav-child-children-setting-payroll",
        children: [
          { href: "/settings/setting-worktime", label: "ตั้งค่าเวลาการทำงาน", icon: Clock, testId: "nav-child-setting-payroll-worktime" },
          { href: "/settings/setting-timeleave", label: "ตั้งค่าประเภทการลา", icon: FileText, testId: "nav-child-setting-payroll-leave_flag" },
          { href: "/settings/setting-salarytype", label: "ตั้งค่าประเภทรายรับรายจ่าย", icon: Coins, testId: "nav-child-setting-payroll-salary_type" },
          { href: "/settings/setting-salarygroup", label: "ตั้งค่ากลุ่มประเภทรายรับรายจ่าย", icon: Coins, testId: "nav-child-setting-payroll-salary_group" },
          { href: "/settings/setting-commission", label: "ตั้งค่าประเภทค่าคอมมิชชัน", icon: Coins, testId: "nav-child-setting-setting-setting_commission" },
          { href: "/settings/setting-chart-of-accounts/account-group", label: "ตั้งค่ากลุ่มบัญชีตามผังบัญชี", icon: Banknote, testId: "nav-child-setting-setting-chart-of-accounts-account_group" },
          { href: "/settings/setting-chart-of-accounts/salary-group", label: "ตั้งค่ากลุ่มรายรับรายจ่ายตามผังบัญชี", icon: Banknote, testId: "nav-child-setting-setting-chart-of-accounts-salary_group" },
          { href: "/settings/setting-holiday", label: "ตั้งค่าวันหยุดนักขัตฤกษ์", icon: CalendarClock, testId: "nav-child-setting-setting-setting_holiday" },
          { href: "/settings/setting-bonusday", label: "ตั้งค่าวันทำงานพิเศษ", icon: CalendarClock, testId: "nav-child-setting-setting-setting_bonusday" },
        ],
      },
      {
        href: "/settings/setting-other",
        label: "ตั้งค่าอื่นๆ",
        icon: OtherSettingsNavIcon,
        testId: "nav-child-setting-other",
        childrenTestId: "nav-child-children-setting-other",
        children: [
          { href: "/settings/setting-location", label: "ตั้งค่าพื้นที่การทำงาน", icon: Landmark, testId: "nav-child-setting-other-location" },
          { href: "/settings/setting-schduler", label: "ตั้งค่าเวลารันคำสั่ง", icon: Timer, testId: "nav-child-setting-other-schduler" },
          { href: "/settings/setting-condition", label: "ตั้งค่าเงื่อนไขตัวช่วยอัฉริยะ", icon: Settings, testId: "nav-child-setting-other-condition" },
          { href: "/settings/setting-fingerscan", label: "ตั้งค่าอุปกรณ์การลงเวลา", icon: Clock, testId: "nav-child-setting-other-device" },
          { href: "/settings/setting-signature", label: "ตั้งค่าลายเซ็น", icon: Pencil, testId: "nav-child-setting-setting-setting_signature" },
          { href: "/settings/setting-option-type", label: "ตั้งค่าชื่อตัวเลือก", icon: ClipboardList, testId: "nav-child-setting-setting-setting_option_type" },
          { href: "/settings/setting-partner", label: "การเชื่อมต่อภายนอก", icon: Contact, testId: "nav-child-setting-setting-setting_partner" },
          { href: "/settings/setting-notify", label: "ตั้งค่า HumanSoft Notify", icon: Bell, testId: "nav-child-setting-setting-setting_notify" },
          { href: "/settings/setting-time-frame", label: "ตั้งค่าป้ายกำกับช่วงเวลา", icon: Clock, testId: "nav-child-setting-setting-setting_time_frame" },
          { href: "/settings/setting-role-duty", label: "ตั้งค่าป้ายกำกับหน้าที่ปฏิบัติงาน", icon: ClipboardCheck, testId: "nav-child-setting-setting-setting_role_duty" },
        ],
      },
      { href: "/settings/setting-login-as", label: "เข้าสู่ระบบในนาม", icon: LoginAsNavIcon, testId: "nav-child-setting-login-as" },
    ],
  },
  { href: "/documents", label: "อื่นๆ", icon: ClipboardCheck },
];

/* --------------------------------- Favorites --------------------------------- */

// Keep actual user choices in a separate key so their selection survives
// refreshes, browser restarts, and future UI updates. A favorite is removed
// only through the explicit remove action in the favorites menu.
const FAVORITES_KEY = "hrmic:favorites:v2";
const PREVIOUS_FAVORITES_KEY = "hrmic:favorites";
const LEGACY_FAVORITES_KEY = ["human", "soft:favorites"].join("");
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
let favoritesStorageListenerAttached = false;

function normalizeFavorites(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))].slice(0, MAX_FAVORITES)
    : [];
}

function readFavorites(): string[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;
  try {
    const savedFavorites = window.localStorage.getItem(FAVORITES_KEY);
    if (savedFavorites !== null) return normalizeFavorites(JSON.parse(savedFavorites));

    const previousFavorites =
      window.localStorage.getItem(PREVIOUS_FAVORITES_KEY) ??
      window.localStorage.getItem(LEGACY_FAVORITES_KEY);
    if (previousFavorites === null) return EMPTY_FAVORITES;

    // Preserve every existing selection during key migration. Favorites must
    // never disappear on their own; users remove them from the menu instead.
    return normalizeFavorites(JSON.parse(previousFavorites));
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
  if (typeof window !== "undefined" && !favoritesStorageListenerAttached) {
    window.addEventListener("storage", (event) => {
      if (event.key !== FAVORITES_KEY && event.key !== LEGACY_FAVORITES_KEY) return;
      favoritesCache = readFavorites();
      favoritesListeners.forEach((callback) => callback());
    });
    favoritesStorageListenerAttached = true;
  }
  return () => {
    favoritesListeners.delete(listener);
  };
}

function writeFavorites(next: string[]) {
  favoritesCache = normalizeFavorites(next);
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoritesCache));
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Persist an empty first-time state and migrate an actual user selection
      // from earlier keys without replacing an explicitly empty list.
      if (window.localStorage.getItem(FAVORITES_KEY) === null) {
        writeFavorites(favoritesCache ?? readFavorites());
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser sessions.
    }
  }, []);

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
  const directItem = NAV_ITEMS.find(
    (candidate) =>
      !candidate.children?.length &&
      (pathname === candidate.href || pathname.startsWith(candidate.href + "/"))
  );
  if (directItem && directItem.href !== item.href) return false;
  if (pathname === item.href) return true;
  if (item.children?.length) {
    return item.children.some((child) => isChildActive(child, pathname));
  }
  return pathname.startsWith(item.href + "/");
}

function findExpandedParent(pathname: string): string | null {
  const activeItem = NAV_ITEMS.find((item) => item.children && isItemActive(item, pathname));

  // These child drawers are transient menu pickers. Direct detail routes use
  // their own page navigation, so do not reopen a drawer over the destination.
  return activeItem?.href === "/organization" || activeItem?.href === "/settings"
    ? null
    : activeItem?.href ?? null;
}

type FavoriteItem = { href: string; label: string; icon: IconComponent; section: string };

function toFavoriteItem(item: FavoriteItem): FavoriteItem {
  return item.href === "/salary/calculate/normal"
    ? { ...item, label: "คำนวณเงินเดือน" }
    : item;
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
  dashboardVariant = false,
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
  /** Compact navy navigation used by the redesigned dashboard only. */
  dashboardVariant?: boolean;
}) {
  const router = useRouter();
  const preloadEmployeeDashboard = () => {
    router.prefetch("/organization/organization-employee");
  };
  const handleLeafClick = (href: string) => {
    if (href === "/organization/organization-employee") notifyEmployeeDashboardReset();
    onClose?.();
  };

  if (dashboardVariant) {
    return (
      <div className="flex h-full flex-col text-white">
        <div className={cn("flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 px-4", collapsed && "justify-center px-1")}>
          <div className="flex min-w-0 items-center gap-2.5 font-sans">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#16a5ff] to-[#7554f3] shadow-lg shadow-blue-950/40">
              <Sparkles className="size-5" />
            </div>
            <div className={cn("min-w-0", collapsed && "hidden")}>
              <p className="truncate text-xl font-bold leading-none tracking-tight text-white">HRMic<span className="text-[#ff7a21]">.ai</span></p>
              <p className="mt-1 truncate text-[10px] font-medium tracking-wide text-[#67c4ff]">SMART HR SOLUTIONS</p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-md p-1 text-white/80 hover:bg-white/10 lg:hidden" aria-label="ปิดเมนู">
              <X className="size-5" />
            </button>
          )}
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-y-auto px-2 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", collapsed && "px-1")}>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item, currentPath);
            const hasChildren = !!item.children?.length;
            const rowClass = cn(
              "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors",
              collapsed && "justify-center gap-0 px-0",
              active
                ? "bg-gradient-to-r from-[#0c73f1] to-[#178df5] font-medium text-white shadow-[0_5px_16px_rgba(10,115,241,.35)]"
                : "text-[#d7e3f5] hover:bg-white/[0.07] hover:text-white"
            );
            const content = <><item.icon className={cn("size-[18px] shrink-0", active ? "text-white" : "text-[#82a9d9]")} /><span className={cn("min-w-0 flex-1 truncate", collapsed && "hidden")}>{item.label}</span>{hasChildren && !collapsed && <ChevronRight className="size-3.5 opacity-70" />}</>;

            return hasChildren ? (
              <button
                key={item.href}
                type="button"
                aria-label={item.label}
                aria-expanded={expanded === item.href}
                onPointerEnter={item.href === "/organization" ? preloadEmployeeDashboard : undefined}
                onFocus={item.href === "/organization" ? preloadEmployeeDashboard : undefined}
                onClick={() => {
                  if (item.href === "/organization") preloadEmployeeDashboard();
                  onToggle(item.href);
                  if (item.href !== "/organization" && item.href !== "/settings" && expanded !== item.href) router.push(item.href);
                }}
                className={rowClass}
              >
                {content}
              </button>
            ) : <Link key={item.href} href={item.href} aria-label={item.label} onClick={() => handleLeafClick(item.href)} className={rowClass}>{content}</Link>;
          })}
        </nav>

        <div className={cn("m-3 rounded-xl border border-[#1b4b82] bg-[#08275a] p-3", collapsed && "hidden")}>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#ffd44d]"><ShieldUser className="size-4" />สถานะระบบ</div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#bfcee2]"><span>การเชื่อมต่อ</span><span className="font-medium text-[#42df83]">● ปกติ</span></div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#bfcee2]"><span>เวอร์ชัน</span><span>2.6.27</span></div>
        </div>
      </div>
    );
  }

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
                onClick={hasChildren ? onExpand : () => handleLeafClick(item.href)}
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
        <span className="truncate text-[2.82rem] font-bold tracking-[-0.06em] text-white">HRMic<span className="text-[#ff9700]">.ai</span></span>
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
                  prefetch={item.href === "/organization/organization-employee" ? true : undefined}
                  onClick={() => {
                    window.dispatchEvent(new Event("employee-list-close"));
                    if (item.href === "/organization/organization-employee") notifyEmployeeDashboardReset();
                  }}
                  className={cn(
                    "ml-8 flex h-10 items-center gap-4 rounded-lg px-6 text-sm leading-[22.001px] transition-colors",
                    active
                      ? "text-white"
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
              onPointerEnter={item.href === "/organization" ? preloadEmployeeDashboard : undefined}
              onFocus={item.href === "/organization" ? preloadEmployeeDashboard : undefined}
              onClick={() => {
                // The reference treats this row as a drawer trigger. It opens
                // its child panel without changing the current page.
                if (item.href === "/organization") {
                  preloadEmployeeDashboard();
                  onToggle(item.href);
                  return;
                }
                if (item.href === "/settings") {
                  onToggle(item.href);
                  return;
                }
                onToggle(item.href);
                if (!isExpanded) {
                  router.push(item.href);
                }
              }}
              className={cn(cls, "w-full text-left")}
            >
              {content}
            </button>
          ) : (
            <Link key={item.href} href={item.href} onClick={() => handleLeafClick(item.href)} className={cls}>
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
// /salary/calculate/normal collapses the ประมวลผลเงินเดือน submenu because the
// page ships its own ภาพรวม/รายบุคคล/รายองค์กร/ปิดงวด/สรุปงวด navigation.
const FULL_WIDTH_PAGES = ["/payroll/documents", "/payroll/time", "/salary/calculate/normal", "/salary/calculate/special", "/salary/calculate/ot", "/salary/calculate/work-time", "/salary/calculate/commission", "/settings/setting-general", "/training"];

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
  const usesUnifiedSidebar = true;
  const usesModernPortalChrome = pathname === "/dashboard" || pathname === "/organization/organization-employee" || pathname === "/organization/organization-structure" || pathname === "/organization/organization-position" || pathname === "/reports/employee-history/registry" || pathname === "/reports/report-nettotal" || pathname === "/salary/calculate/normal" || pathname.startsWith("/settings/");
  const isPayrollCalculatePage = pathname.startsWith("/salary/calculate");
  const usesEmployeeTemplateChrome = pathname === "/organization/organization-employee";
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchFavoritesOpen, setSearchFavoritesOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(() => findExpandedParent(pathname));
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [submenuCollapsed, setSubmenuCollapsed] = useState(() => isReportLeafPage(pathname));
  const [activeCompany, setActiveCompany] = useState<ActiveCompany | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [companyDirectoryRequested, setCompanyDirectoryRequested] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [switchingCompanyId, setSwitchingCompanyId] = useState<string | null>(null);
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

  useEffect(() => {
    // Child effects may finish before this persistent layout effect during the
    // first hydration. Read the module snapshot before subscribing so the
    // streamed company identity cannot be missed.
    const latestCompany = getLatestPortalActiveCompany();
    if (latestCompany !== undefined) queueMicrotask(() => setActiveCompany(latestCompany));
    const syncCompany = (event: Event) => {
      setActiveCompany((event as CustomEvent<ActiveCompany | null>).detail ?? null);
    };
    window.addEventListener(PORTAL_ACTIVE_COMPANY_EVENT, syncCompany);
    return () => window.removeEventListener(PORTAL_ACTIVE_COMPANY_EVENT, syncCompany);
  }, []);

  useEffect(() => {
    if (!companyDirectoryRequested || companiesLoaded) return;

    let cancelled = false;
    void fetch("/company-data")
      .then(async (response) => response.ok ? (await response.json()) as CompaniesResponse : {})
      .then((companyData) => {
        if (cancelled) return;
        setCompanies((companyData.companies ?? []).map(({ id, code, nameEN }) => ({ id, code, name: nameEN })));
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) {
          setCompaniesLoading(false);
          setCompaniesLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [companiesLoaded, companyDirectoryRequested]);

  const toggleCompanyMenu = () => {
    if (!companyMenuOpen && !companiesLoaded) {
      setCompaniesLoading(true);
      setCompanyDirectoryRequested(true);
    }
    setCompanyMenuOpen((open) => !open);
  };

  const prefetchCompanyDirectory = () => {
    if (companiesLoaded || companyDirectoryRequested) return;
    setCompanyDirectoryRequested(true);
  };

  const selectCompany = async (company: CompanyOption) => {
    if (company.id === activeCompany?.id) {
      setCompanyMenuOpen(false);
      return;
    }

    setSwitchingCompanyId(company.id);
    // Start the selected company's dashboard read before changing the active
    // company. Once the switch succeeds, this snapshot is promoted to the
    // active cache so the already-open Dashboard can render it immediately.
    const selectedSummary = preloadEmployeeSummary(company.id);
    // A failed warm-up must not cancel an otherwise valid company switch.
    void selectedSummary.catch(() => undefined);
    try {
      const response = await fetch("/api/active-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      if (!response.ok) return;
      const { company: authorizedCompany } = await response.json() as { company: ActiveCompany };
      // Commit the authorized company immediately. If the summary is still
      // loading, promote its existing Promise to the active key so Dashboard
      // can show its shell now and fill it from this same request later.
      const summary = promotePreloadedEmployeeSummary(company.id);

      // Keep the switch in the client router so the employee page remains
      // responsive, while leaving its canonical URL unchanged.
      if (pathname === "/organization/organization-employee") {
        selectPortalActiveCompany(authorizedCompany);
        setCompanyMenuOpen(false);
        window.dispatchEvent(new CustomEvent("active-company-changed", { detail: { summary } }));
        // The company lives in an httpOnly cookie. Refreshing makes Next fetch
        // a new RSC payload instead of reusing a same-URL client cache entry
        // that was rendered for the previous company.
        router.refresh();
        return;
      }

      // The selected company is stored in a secure cookie. A reload keeps the
      // current page open while ensuring every company-scoped request reloads.
      window.location.reload();
    } finally {
      setSwitchingCompanyId(null);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        pathname === "/organization/companies" && "bg-[#f5f5f5]",
        (pathname === "/dashboard" ||
          pathname.startsWith("/organization/organization-employee/")) &&
          "h-screen overflow-hidden"
      )}
    >
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 ease-in-out lg:block",
              usesUnifiedSidebar ? (collapsed ? "w-[64px] bg-[#071f49] font-sans" : "w-[230px] bg-[#071f49] font-sans") : "bg-[#0259e6]",
          !usesUnifiedSidebar && (collapsed ? (pathname === "/settings/setting-salarytype" ? "w-[105px]" : "w-24") : "w-80")
        )}
      >
        {/* Collapse/expand toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-[10px] top-[59.5px] z-50 flex size-[21px] items-center justify-center rounded-[50px] border border-black/40 bg-white text-black shadow-[0_2px_2px_rgba(0,0,0,0.25)] transition-colors hover:bg-slate-100"
          aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
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
          dashboardVariant={usesUnifiedSidebar}
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
            className={cn("fixed inset-y-0 z-30 hidden cursor-default bg-black/55 lg:block", usesUnifiedSidebar ? (collapsed ? "left-[64px] w-[calc(100%-64px)]" : "left-[230px] w-[calc(100%-230px)]") : "left-80 w-[calc(100%-20rem)]")}
            onClick={() => {
              setSearchFavoritesOpen(false);
              setExpanded(null);
            }}
            aria-label={searchFavoritesOpen ? "ปิดแผงเมนูโปรด" : "ปิดแผงข้อมูลองค์กร"}
          />
          <aside
            className={cn(
              "fixed inset-y-0 z-40 hidden w-80 overflow-y-auto border-r border-border bg-[#fafafa] lg:block",
              usesUnifiedSidebar ? (collapsed ? "left-[64px]" : "left-[230px]") : "left-80",
              expandedItem?.href === "/settings" && "settings-nav-scrollbar overflow-y-scroll border-r-0"
            )}
          >
          {searchFavoritesOpen ? (
            <SearchFavoritesPanel
              items={allMenuItems}
              favorites={favorites.favorites}
              isFavorite={favorites.isFavorite}
              onToggle={favorites.toggleFavorite}
              maxFavorites={MAX_FAVORITES}
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
          <div className={cn("absolute inset-y-0 left-0 w-[230px] max-w-[85vw] overflow-y-auto shadow-xl", usesUnifiedSidebar ? "bg-[#071f49]" : "bg-white")}>
            <div className={cn(usesUnifiedSidebar ? "min-h-full bg-[#071f49]" : "bg-[#0259e6]")}>
              <SidebarContent
                currentPath={pathname}
                expanded={expanded}
                onToggle={toggleSection}
                onClose={() => setMobileOpen(false)}
                onAddFavorite={openAddFavorites}
              favoritesActive={searchFavoritesOpen}
              favoriteItems={favoriteItems}
              dashboardVariant={usesUnifiedSidebar}
            />
            </div>
            {searchFavoritesOpen && (
              <SearchFavoritesPanel
                items={allMenuItems}
                favorites={favorites.favorites}
                isFavorite={favorites.isFavorite}
                onToggle={favorites.toggleFavorite}
                maxFavorites={MAX_FAVORITES}
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
          usesUnifiedSidebar ? (collapsed ? "lg:pl-[64px]" : "lg:pl-[230px]") : collapsed ? (pathname === "/settings/setting-salarytype" ? "lg:pl-[105px]" : "lg:pl-24") : "lg:pl-80"
        )}
      >
        {/* Topbar — matches the reference toolbar (white bg, #D8E0E9 border) */}
        <header
          className={cn(
            "sticky top-0 z-20 flex items-center justify-between gap-4 border-b px-4 sm:px-6",
                usesModernPortalChrome ? "h-[70px] border-[#18355c] bg-[#061937] font-sans text-white shadow-md" : "h-16 bg-white"
          )}
          style={{ borderColor: usesModernPortalChrome ? "#18355c" : "#D8E0E9" }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              className={cn("rounded-md p-1.5 hover:bg-accent lg:hidden", usesModernPortalChrome ? "text-white" : "text-foreground")}
              onClick={() => setMobileOpen(true)}
              aria-label="เปิดเมนู"
            >
              <Menu className="size-5" />
            </button>

            {usesModernPortalChrome && (
              <div className="relative hidden w-full max-w-[370px] sm:block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#667792]" />
                <input aria-label="ค้นหา" placeholder="ค้นหาพนักงาน เอกสาร หรือรายงาน..." className="h-10 w-full rounded-xl border-0 bg-white pl-10 pr-4 text-sm text-[#233250] outline-none ring-[#5eaafa] placeholder:text-[#8995a6] focus:ring-2" />
              </div>
            )}

            {/* Company selector */}
            <div className={cn("relative", usesModernPortalChrome ? "hidden" : isPayrollCalculatePage ? "hidden" : usesEmployeeTemplateChrome ? "hidden" : "lg:-ml-6")}>
              <button
                type="button"
                onClick={toggleCompanyMenu}
                onPointerEnter={prefetchCompanyDirectory}
                onFocus={prefetchCompanyDirectory}
                className={cn("group ml-3 flex h-12 w-[197.6px] items-center justify-between px-4 text-left", usesModernPortalChrome && "outline-none ring-[#5eaafa] focus:ring-2")}
                aria-haspopup="menu"
                aria-expanded={companyMenuOpen}
                aria-label="เลือกบริษัท"
              >
                <span className="flex w-[129.6px] min-w-0 items-center">
                  <span className="truncate text-sm font-normal leading-5 text-black">{activeCompany?.code ?? "MIC"}</span>
                </span>
                <ChevronDown className={cn("size-3.5 shrink-0 text-black transition-transform", companyMenuOpen && "rotate-180")} />
              </button>

              {companyMenuOpen && (
                <div role="menu" aria-label="รายชื่อบริษัท" className="absolute left-3 top-12 z-50 w-[236px] overflow-hidden rounded-[4px] bg-white py-2 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.2),0_4px_5px_rgba(0,0,0,0.14),0_1px_10px_rgba(0,0,0,0.12)]">
                  {companies.length > 0 ? companies.map((company) => {
                    const selected = company.id === activeCompany?.id;
                    const switching = company.id === switchingCompanyId;
                    return <button key={company.id} role="menuitemradio" aria-checked={selected} type="button" disabled={switchingCompanyId !== null} onPointerEnter={() => { if (!selected) void preloadEmployeeSummary(company.id); }} onFocus={() => { if (!selected) void preloadEmployeeSummary(company.id); }} onClick={() => void selectCompany(company)} className={cn("flex h-12 w-full items-center justify-between gap-2 px-6 text-left text-sm font-normal leading-[48px] text-black/[0.87] transition-colors hover:bg-black/[0.04] disabled:cursor-wait", selected && "bg-[rgba(0,140,255,0.2)]")}>
                      <span className="max-w-[170px] truncate">{switching ? "กำลังเปิดข้อมูลบริษัท..." : company.code}</span>
                      {selected && <svg aria-hidden="true" className="size-[14px] shrink-0" viewBox="0 0 14 15" fill="none"><path fill="#008CFF" fillRule="evenodd" clipRule="evenodd" d="M7 14.5C7.91925 14.5 8.8295 14.3189 9.67878 13.9672C10.5281 13.6154 11.2997 13.0998 11.9497 12.4497C12.5998 11.7997 13.1154 11.0281 13.4672 10.1788C13.8189 9.3295 14 8.41925 14 7.5C14 6.58075 13.8189 5.6705 13.4672 4.82122C13.1154 3.97194 12.5998 3.20026 11.9497 2.55025C11.2997 1.90024 10.5281 1.38463 9.67878 1.03284C8.8295 0.68106 7.91925 0.5 7 0.5C5.14348 0.5 3.36301 1.2375 2.05025 2.55025C0.737498 3.86301 0 5.64348 0 7.5C0 9.35652 0.737498 11.137 2.05025 12.4497C3.36301 13.7625 5.14348 14.5 7 14.5ZM6.81956 10.3311L10.7084 5.66444L9.51378 4.66889L6.16933 8.68144L4.43878 6.95011L3.339 8.04989L5.67233 10.3832L6.27433 10.9852L6.81956 10.3311Z" /></svg>}
                    </button>;
                  }) : <p className="h-12 px-6 text-sm leading-[48px] text-black/[0.87]">{companiesLoading ? "กำลังเตรียมรายชื่อบริษัท..." : "ไม่พบบริษัทที่คุณมีสิทธิ์ใช้งาน"}</p>}
                  <div className="mx-4 h-px bg-black/[0.12]" />
                  <Link href="/organization/companies" role="menuitem" onClick={() => setCompanyMenuOpen(false)} className="block h-12 px-6 text-sm font-normal leading-[48px] text-black/[0.87] hover:bg-black/[0.04]">ระบบจัดการบริษัท</Link>
                </div>
              )}
            </div>
          </div>

          <div className={cn("flex items-center gap-2.5 sm:gap-3", usesModernPortalChrome && "[&>button]:bg-transparent [&>button]:text-[#e5ebf5]")}>
            {/* Download queue — dark gray circle with white glyph (previous size) */}
            {!usesModernPortalChrome && <button
              type="button"
              className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-[#4d4d4d] text-white transition-opacity hover:opacity-80"
              aria-label="ดาวน์โหลด"
            >
              <Download className="size-3.25" strokeWidth={2} />
            </button>}

            {/* Help center — dark gray circle with white question mark (previous size) */}
            {!usesModernPortalChrome && <button
              type="button"
              className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-[#4d4d4d] text-white transition-opacity hover:opacity-80"
              aria-label="ช่วยเหลือ"
            >
              <CircleHelp className="size-3.25" strokeWidth={2} />
            </button>}

            {/* Notifications — solid dark gray bell (1.5x, others unchanged) */}
            <button
              type="button"
              className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-full text-[#4d4d4d] transition-colors hover:bg-muted", usesModernPortalChrome && "!text-[#e5ebf5] hover:!bg-white/10")}
              aria-label="การแจ้งเตือน"
            >
              <Bell className={cn("size-6", !usesModernPortalChrome && "fill-current")} strokeWidth={2} />
              {usesModernPortalChrome && <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-[#ed2856] text-[9px] font-bold text-white">5</span>}
            </button>

            {usesModernPortalChrome && <button type="button" className="hidden size-9 items-center justify-center rounded-lg !text-[#e5ebf5] hover:!bg-white/10 sm:flex" aria-label="เต็มหน้าจอ"><Maximize className="size-5" /></button>}
            {usesModernPortalChrome && <button type="button" className="hidden size-9 items-center justify-center rounded-lg !text-[#e5ebf5] hover:!bg-white/10 md:flex" aria-label="ตั้งค่า"><Settings className="size-5" /></button>}

            <div className={cn(usesModernPortalChrome && "border-l border-white/15 pl-3 text-white [&_p]:!text-white [&_button:hover]:!bg-white/10")}>
              <UserDropdown
                activeCompany={activeCompany}
                companies={companies}
                companiesLoading={companiesLoading}
                switchingCompanyId={switchingCompanyId}
                onRequestCompanies={prefetchCompanyDirectory}
                onSelectCompany={selectCompany}
              />
            </div>
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
              pathname === "/settings/setting-general" ||
              pathname === "/settings/setting-salarytype" ||
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
              pathname === "/reports/report-nettotal") &&
              "p-0 sm:p-0 lg:p-0",
            pathname === "/dashboard" &&
              "h-[calc(100vh-70px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            pathname === "/settings/setting-general" &&
              "h-[calc(100vh-4rem)] overflow-y-auto",
            pathname === "/settings/setting-salarytype" &&
              "h-[calc(100vh-4rem)] overflow-hidden",
            pathname.startsWith("/organization/organization-employee/") &&
              "h-[calc(100vh-4rem)] overflow-y-auto",
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
