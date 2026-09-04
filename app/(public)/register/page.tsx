"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Building2, Eye, EyeOff, KeyRound, Mail, UserRound } from "lucide-react";

import { HRMicWordmark } from "@/components/hrmic-wordmark";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [language, setLanguage] = useState<"th" | "en">("th");
  const copy = language === "en"
    ? {
        language: "Language",
        imageAlt: "Illustration of secure registration",
        title: "Sign up",
        subtitle: "Create an account to get started with HRMic.ai",
        company: "Company name",
        companyPlaceholder: "Enter company name",
        name: "Full name",
        namePlaceholder: "Enter full name",
        email: "Email",
        emailPlaceholder: "Enter email",
        password: "Password",
        passwordPlaceholder: "Create a password",
        showPassword: "Show password",
        hidePassword: "Hide password",
        terms: "I accept the terms and conditions of use",
        submit: "Sign up",
        existingAccount: "Already have an account?",
        login: "Log in",
      }
    : {
        language: "ภาษา",
        imageAlt: "ภาพประกอบการลงทะเบียนอย่างปลอดภัย",
        title: "ลงทะเบียน",
        subtitle: "สร้างบัญชีเพื่อเริ่มต้นใช้งาน HRMic.ai",
        company: "ชื่อบริษัท",
        companyPlaceholder: "กรอกชื่อบริษัท",
        name: "ชื่อ-นามสกุล",
        namePlaceholder: "กรอกชื่อ-นามสกุล",
        email: "อีเมล",
        emailPlaceholder: "กรอกอีเมล",
        password: "รหัสผ่าน",
        passwordPlaceholder: "สร้างรหัสผ่าน",
        showPassword: "แสดงรหัสผ่าน",
        hidePassword: "ซ่อนรหัสผ่าน",
        terms: "ฉันยอมรับข้อกำหนดและเงื่อนไขการใช้งาน",
        submit: "ลงทะเบียน",
        existingAccount: "มีบัญชีผู้ใช้อยู่แล้ว?",
        login: "เข้าสู่ระบบ",
      };

  return (
    <main lang={language} className="grid min-h-dvh place-items-center bg-[#f4f5f7] p-4 font-[family:var(--font-kanit)] text-[#454545] sm:p-8">
      <section className="grid w-full max-w-[960px] overflow-hidden rounded-sm bg-white shadow-[0_4px_24px_rgba(33,41,52,0.14)] lg:min-h-[580px] lg:grid-cols-2">
        <aside className="hidden min-h-full overflow-hidden bg-[#0259e6] lg:flex lg:items-center">
          <Image src="/images/auth/login-illustration.jpg" alt={copy.imageAlt} width={5209} height={4167} priority className="h-auto w-full" />
        </aside>

        <div className="relative flex min-h-[580px] flex-col justify-center px-7 py-8 sm:px-12">
          <div className="absolute right-7 top-6 flex items-center gap-1 text-xs text-[#8d949b] sm:right-10">
            <span>{copy.language}</span>
            <button type="button" onClick={() => setLanguage("th")} className={cn("grid size-6 place-items-center rounded-full text-[11px]", language === "th" ? "bg-[#135ee4] text-white" : "text-[#8d949b]")}>TH</button>
            <button type="button" onClick={() => setLanguage("en")} className={cn("grid size-6 place-items-center rounded-full text-[11px]", language === "en" ? "bg-[#135ee4] text-white" : "text-[#8d949b]")}>EN</button>
          </div>

          <div className="mb-6">
            <div className="origin-center -translate-y-6 scale-[.64] sm:scale-[.72]"><HRMicWordmark primaryClassName="text-[#315ff4] [text-shadow:0_0_1.5px_#1849db]" /></div>
            <h1 className="-mt-5 text-2xl font-semibold text-[#333]">{copy.title}</h1>
            <p className="mt-1 text-sm text-[#777]">{copy.subtitle}</p>
          </div>

          <form className="space-y-3.5" onSubmit={(event) => event.preventDefault()}>
            <div>
              <label htmlFor="register-company" className="mb-1.5 block text-sm text-[#4a4f55]">{copy.company}</label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="register-company" name="organization" type="text" autoComplete="organization" placeholder={copy.companyPlaceholder} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-4 text-sm text-[#353a40] outline-none transition focus:border-[#315ff4] focus:ring-1 focus:ring-[#315ff4]" required />
              </div>
            </div>

            <div>
              <label htmlFor="register-name" className="mb-1.5 block text-sm text-[#4a4f55]">{copy.name}</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="register-name" name="name" type="text" autoComplete="name" placeholder={copy.namePlaceholder} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-4 text-sm text-[#353a40] outline-none transition focus:border-[#315ff4] focus:ring-1 focus:ring-[#315ff4]" required />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="mb-1.5 block text-sm text-[#4a4f55]">{copy.email}</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="register-email" name="email" type="email" autoComplete="email" placeholder={copy.emailPlaceholder} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-4 text-sm text-[#353a40] outline-none transition focus:border-[#315ff4] focus:ring-1 focus:ring-[#315ff4]" required />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="mb-1.5 block text-sm text-[#4a4f55]">{copy.password}</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="register-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder={copy.passwordPlaceholder} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-11 text-sm text-[#353a40] outline-none transition focus:border-[#315ff4] focus:ring-1 focus:ring-[#315ff4]" required />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#66707a] hover:text-[#315ff4]" aria-label={showPassword ? copy.hidePassword : copy.showPassword}>{showPassword ? <Eye className="size-[18px]" strokeWidth={1.8} /> : <EyeOff className="size-[18px]" strokeWidth={1.8} />}</button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm text-[#5d6570]">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="size-4 accent-[#315ff4]" />
              {copy.terms}
            </label>

            <button type="submit" disabled={!acceptedTerms} className={cn("flex h-10 w-full items-center justify-center rounded-full text-[16px] font-medium text-white shadow-sm transition", acceptedTerms ? "bg-[#315ff4] hover:bg-[#1849db]" : "cursor-not-allowed bg-[#b8c5ed]")}>{copy.submit}</button>
          </form>

          <p className="mt-5 text-center text-sm text-[#757b82]">
            {copy.existingAccount}{" "}
            <Link href="/login" className="font-medium text-[#315ff4] hover:underline">{copy.login}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
