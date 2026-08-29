"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const LANGS = ["th", "en"] as const;

export function AuthCard({
  title,
  tagline = "Automated HRM Solutions",
  children,
}: {
  title: string;
  tagline?: string;
  children: React.ReactNode;
}) {
  const [lang, setLang] = useState<(typeof LANGS)[number]>("th");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground">
              HR
            </div>
            <span className="text-2xl font-semibold tracking-tight text-[#0799f4] [text-shadow:0_0_1.5px_#047ac4]">
              HRMic<span className="text-[#ff6b00] [text-shadow:0_0_1.5px_#cc5500]">.ai</span>
            </span>
          </div>
          <p className="mt-1.5 text-sm font-light text-[#4f5660] [text-shadow:0_0_18px_#c3c8d0]">{tagline}</p>
        </div>

        {/* Language toggle */}
        <div className="mt-6 flex items-center justify-end gap-1.5">
          <span className="mr-1 text-sm text-muted-foreground">ภาษา :</span>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-medium uppercase transition-colors",
                lang === l
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <h1 className="mt-6 text-xl font-semibold text-foreground">{title}</h1>

        <div className="mt-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}
