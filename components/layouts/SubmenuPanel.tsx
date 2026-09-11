"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";
import { ChevronDown } from "lucide-react";

import { preloadEmployeeSummary } from "@/lib/employee/summary-client";
import { preloadPayrollDashboard } from "@/lib/payroll/dashboard-client";
import { cn } from "@/lib/utils";
import { notifyEmployeeDashboardReset } from "@/components/layouts/portalEvents";

type IconComponent = ComponentType<{ className?: string }>;
type NavChild = { href: string; label: string; icon: IconComponent; children?: NavChild[] };
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
  const findExpandedGroup = () =>
    children.find(
      (child) => child.children?.length && isChildActive(child, currentPath)
    )?.href ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(findExpandedGroup);
  const [previousPath, setPreviousPath] = useState(currentPath);
  if (previousPath !== currentPath) {
    setPreviousPath(currentPath);
    setOpenGroup(findExpandedGroup());
  }

  return (
    <div className={cn(isOrganizationMenu ? "pt-[25px]" : "p-4")} data-testid="nav-child-panel">
      <h2 className={cn(isOrganizationMenu ? "mb-2.5 h-10 px-5 text-sm font-normal leading-10 text-black/87" : "mb-3 px-2 text-base font-bold text-foreground")}>
        {item.label}
      </h2>
      <nav className={cn(isOrganizationMenu ? "px-4" : "space-y-0.5")}>
        {children.map((child) => {
          const active = isChildActive(child, currentPath);
          if (child.children?.length) {
            const open = openGroup === child.href;
            return (
              <div key={child.href}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : child.href)}
                  className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-[#e3f2fd] font-medium text-[#0080ff]" : "text-foreground hover:bg-muted")}
                >
                  <child.icon className={cn("shrink-0", isOrganizationMenu ? "size-6" : "size-4")} />
                  <span className="min-w-0 flex-1 truncate text-left">{child.label}</span>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                </button>
                {open && (
                  <div className="ml-4 space-y-0.5 border-l border-border pb-1 pl-2 pt-0.5">
                    {child.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onMouseEnter={sub.href === "/salary/calculate/normal" ? () => { void preloadPayrollDashboard(); } : undefined}
                        onFocus={sub.href === "/salary/calculate/normal" ? () => { void preloadPayrollDashboard(); } : undefined}
                        onPointerDown={sub.href === "/salary/calculate/normal" ? () => { void preloadPayrollDashboard(); } : undefined}
                        onClick={() => {
                          window.dispatchEvent(new Event("employee-list-close"));
                          onNavigate?.();
                        }}
                        className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors", isChildActive(sub, currentPath) ? "font-medium text-[#0080ff]" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
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
              className={cn(isOrganizationMenu ? "flex h-12 items-center gap-3 rounded-lg pl-7 pr-[7px] text-sm transition-colors" : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-[#e3f2fd] font-medium text-[#0080ff]" : "text-foreground hover:bg-muted")}
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
