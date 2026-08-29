"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  KeyRound,
  Languages,
  LogOut,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { href: "/profile", label: "โปรไฟล์ของฉัน", icon: User },
  { href: "/profile", label: "เปลี่ยนรหัสผ่าน", icon: KeyRound },
  { href: "/settings", label: "ตั้งค่าบริษัท", icon: Building2 },
];

export function UserDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Circular avatar with the reference's orange ring + white bold initials (previous size) */}
        <div className="flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 border-[#f59e0b] bg-[#4d4d4d] text-xs font-bold text-white">
          AC
        </div>
        <div className="hidden text-left leading-tight sm:block">
          <p className="text-sm font-light text-foreground">Adirek Chumchuen</p>
          <p className="text-xs font-medium text-muted-foreground">Admin (Owner)</p>
        </div>
        <ChevronDown
          className={cn(
            "hidden size-3.5 text-muted-foreground transition-transform sm:block",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          role="menu"
        >
          {/* User info header */}
          <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#f59e0b] bg-[#4d4d4d] text-sm font-bold text-white">
              AC
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">Adirek Chumchuen</p>
              <p className="truncate text-xs text-muted-foreground">Admin (Owner)</p>
            </div>
          </div>

          <div className="p-1.5">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                role="menuitem"
              >
                <item.icon className="size-4 shrink-0 text-muted-foreground" />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              role="menuitem"
            >
              <Languages className="size-4 shrink-0 text-muted-foreground" />
              สลับภาษา
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              role="menuitem"
            >
              <Bell className="size-4 shrink-0 text-muted-foreground" />
              การแจ้งเตือน
            </button>
          </div>

          <div className="border-t border-border p-1.5">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              role="menuitem"
            >
              <LogOut className="size-4 shrink-0" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
