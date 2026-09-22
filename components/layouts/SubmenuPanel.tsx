"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";
import { ChevronRight } from "lucide-react";

import { preloadEmployeeSummary } from "@/lib/employee/summary-client";
import { preloadPayrollDashboard } from "@/lib/payroll/dashboard-client";
import { cn } from "@/lib/utils";
import { notifyEmployeeDashboardReset } from "@/components/layouts/portalEvents";

type IconComponent = ComponentType<{ className?: string }>;
type NavChild = {
  href: string;
  label: string;
  icon: IconComponent;
  testId?: string;
  childrenTestId?: string;
  children?: NavChild[];
};
type NavItem = { href: string; label: string; icon: IconComponent; children?: NavChild[] };

function isChildActive(child: NavChild, pathname: string): boolean {
  if (pathname === child.href || pathname.startsWith(child.href + "/")) return true;
  return child.children?.some((sub) => isChildActive(sub, pathname)) ?? false;
}

/**
 * The expanded navigation drawer is intentionally loaded only after its
 * parent Sidebar row is opened. It contains nested accordions and prefetch
 * handlers that are unnecessary for the Portal's first paint.
 */
export function SubmenuPanel({
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
  const isSettingsMenu = item.href === "/settings";
  const usesReferenceSpacing = isOrganizationMenu || isSettingsMenu;
  const findExpandedGroup = () => {
    const activeGroup = children.find(
      (child) => child.children?.length && isChildActive(child, currentPath)
    )?.href;
    return activeGroup ?? (isSettingsMenu ? "/settings/setting-payroll" : null);
  };
  const [openGroup, setOpenGroup] = useState<string | null>(findExpandedGroup);
  const [previousPath, setPreviousPath] = useState(currentPath);
  if (previousPath !== currentPath) {
    setPreviousPath(currentPath);
    setOpenGroup(findExpandedGroup());
  }

  return (
    <div
      className={cn(
        usesReferenceSpacing ? "pt-[25px]" : "p-4",
        isSettingsMenu && "h-full text-[14px] font-normal leading-[22.001px] tracking-[-0.1px] text-[rgba(0,0,0,0.87)]"
      )}
      data-testid="nav-child-panel"
    >
      <h2
        className={cn(usesReferenceSpacing ? "mb-2.5 flex h-10 items-center px-5 text-sm font-normal leading-[22.001px] text-black/87" : "mb-3 px-2 text-base font-bold text-foreground", isSettingsMenu && "text-[18px] font-semibold text-[#6a6e72]")}
        style={isSettingsMenu ? { lineHeight: "normal" } : undefined}
      >
        {item.label}
      </h2>
      <nav aria-label={`เมนู${item.label}`} className={cn(usesReferenceSpacing ? "px-4" : "space-y-0.5")}>
        {children.map((child) => {
          const active = isChildActive(child, currentPath);
          if (child.children?.length) {
            const open = openGroup === child.href;
            const childrenId = `${child.href.replaceAll("/", "-").replace(/^-/, "")}-children`;
            return (
              <div key={child.href}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : child.href)}
                  aria-controls={childrenId}
                  aria-expanded={open}
                  data-testid={child.testId}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg text-sm transition-colors",
                    usesReferenceSpacing ? "h-12 pl-7 pr-2.5" : "px-3 py-2",
                    isSettingsMenu && "relative overflow-hidden font-normal leading-[22.001px] text-[rgba(0,0,0,0.87)] hover:bg-[rgba(0,0,0,0.05)]",
                    active
                      ? isSettingsMenu
                        ? "bg-[rgba(0,0,0,0.05)]"
                        : "bg-[#e3f2fd] font-medium text-[#0080ff]"
                      : !isSettingsMenu && "text-foreground hover:bg-muted"
                  )}
                >
                  <child.icon className={cn("shrink-0", isOrganizationMenu ? "size-6" : isSettingsMenu ? "size-6 text-[#6a6e72]" : "size-4")} />
                  <span className="min-w-0 flex-1 truncate text-left">{child.label}</span>
                  <ChevronRight
                    className={cn("size-5 shrink-0 transition-transform", isSettingsMenu ? "text-[rgba(0,0,0,0.87)]" : "text-muted-foreground")}
                    style={{ transform: open ? "rotate(90deg)" : "none" }}
                  />
                </button>
                {open && (
                  <div
                    id={childrenId}
                    data-testid={child.childrenTestId}
                    className={cn(isSettingsMenu ? "-mx-4 overflow-hidden" : "ml-4 space-y-0.5 border-l border-border pb-1 pl-2 pt-0.5")}
                    style={isSettingsMenu ? { height: child.children.length * 49 } : undefined}
                  >
                    {child.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        aria-current={isChildActive(sub, currentPath) ? "page" : undefined}
                        data-testid={sub.testId}
                        onMouseEnter={sub.href === "/salary/calculate/normal" ? () => { void preloadPayrollDashboard(); } : undefined}
                        onFocus={sub.href === "/salary/calculate/normal" ? () => { void preloadPayrollDashboard(); } : undefined}
                        onPointerDown={sub.href === "/salary/calculate/normal" ? () => { void preloadPayrollDashboard(); } : undefined}
                        onClick={() => {
                          window.dispatchEvent(new Event("employee-list-close"));
                          onNavigate?.();
                        }}
                        className={cn(
                          "flex items-center rounded-lg text-sm transition-colors",
                          isSettingsMenu
                            ? "relative mx-4 mb-px h-12 overflow-hidden pl-16 pr-[7px] font-normal leading-[22.001px] text-[rgba(0,0,0,0.87)] hover:bg-[rgba(0,0,0,0.05)]"
                            : "gap-2 px-3 py-1.5",
                          isChildActive(sub, currentPath)
                            ? isSettingsMenu
                              ? "bg-[rgba(0,0,0,0.05)]"
                              : "font-medium text-[#0080ff]"
                            : !isSettingsMenu && "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{sub.label}</span>
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
              aria-current={active ? "page" : undefined}
              data-testid={child.testId}
              prefetch={child.href === "/organization/organization-employee" ? true : undefined}
              onMouseEnter={child.href === "/organization/organization-employee" ? () => { void preloadEmployeeSummary().catch(() => undefined); } : undefined}
              onFocus={child.href === "/organization/organization-employee" ? () => { void preloadEmployeeSummary().catch(() => undefined); } : undefined}
              onPointerDown={child.href === "/organization/organization-employee" ? () => { void preloadEmployeeSummary().catch(() => undefined); } : undefined}
              onClick={() => {
                // The employee page keeps its submenu in client state. Signal
                // it to open on Dashboard even when the URL stays the same.
                if (child.href === "/organization/organization-employee") notifyEmployeeDashboardReset();
                onNavigate?.();
              }}
              className={cn(
                usesReferenceSpacing ? "flex h-12 items-center gap-3 rounded-lg pl-7 pr-[7px] text-sm transition-colors" : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isSettingsMenu && "relative mb-px overflow-hidden font-normal leading-[22.001px] text-[rgba(0,0,0,0.87)] hover:bg-[rgba(0,0,0,0.05)]",
                active
                  ? isSettingsMenu
                    ? "bg-[rgba(0,0,0,0.05)]"
                    : "bg-[#e3f2fd] font-medium text-[#0080ff]"
                  : !isSettingsMenu && "text-foreground hover:bg-muted"
              )}
            >
              <child.icon className={cn("shrink-0", isOrganizationMenu ? "size-6" : isSettingsMenu ? "size-6 text-[#6a6e72]" : "size-4")} />
              <span className="min-w-0 flex-1 truncate">{child.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
