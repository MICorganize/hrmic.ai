"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, KeyRound, List, Loader2, Mail, UserRound } from "lucide-react";

import { HRMicWordmark } from "@/components/hrmic-wordmark";
import { usePublicCompanies, type PublicCompany } from "@/hooks/use-public-companies";
import { cn } from "@/lib/utils";

type RegistrationError = "invalidInput" | "companyUnavailable" | "emailExists" | "generic";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [language, setLanguage] = useState<"th" | "en">("th");
  const { companies, loading: companiesLoading } = usePublicCompanies();
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<RegistrationError | null>(null);
  const copy = language === "en"
    ? {
        language: "Language",
        imageAlt: "Illustration of secure registration",
        title: "Sign up",
        subtitle: "Create an account to get started with HRMic.ai",
        company: "Select company",
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
        registering: "Creating account",
        invalidInput: "Please complete all fields. Passwords must be at least 8 characters.",
        companyUnavailable: "The selected company is no longer available.",
        emailExists: "This email is already in use.",
        generic: "Something went wrong. Please try again.",
      }
    : {
        language: "ภาษา",
        imageAlt: "ภาพประกอบการลงทะเบียนอย่างปลอดภัย",
        title: "ลงทะเบียน",
        subtitle: "สร้างบัญชีเพื่อเริ่มต้นใช้งาน HRMic.ai",
        company: "เลือกบริษัท",
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
        registering: "กำลังสร้างบัญชี",
        invalidInput: "กรุณากรอกข้อมูลให้ครบถ้วน และรหัสผ่านอย่างน้อย 8 ตัวอักษร",
        companyUnavailable: "บริษัทที่เลือกไม่พร้อมใช้งานแล้ว",
        emailExists: "อีเมลนี้ถูกใช้งานแล้ว",
        generic: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company || !name || !email || !password || !acceptedTerms) return;

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, name, email, password }),
      });
      const result = await response.json().catch(() => ({})) as { error?: RegistrationError };
      if (!response.ok) {
        setError(result.error ?? "generic");
        return;
      }

      router.replace("/login");
    } catch {
      setError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main lang={language} className="grid h-dvh overflow-hidden place-items-center bg-[#f4f5f7] p-4 font-[family:var(--font-kanit)] text-[#454545] sm:p-8">
      <section className="grid w-full max-w-[960px] overflow-hidden rounded-sm bg-white shadow-[0_4px_24px_rgba(33,41,52,0.14)] lg:grid-cols-2">
        <aside className="hidden min-h-full overflow-hidden bg-[#0259e6] lg:flex lg:items-center">
          <Image src="/images/auth/login-illustration.jpg" alt={copy.imageAlt} width={5209} height={4167} loading="eager" sizes="(min-width: 1024px) 480px, 1px" className="h-auto w-full" />
        </aside>

        <div className="relative flex flex-col justify-center px-7 py-6 sm:px-12 lg:min-h-[658px] lg:justify-start">
          <div className="absolute right-7 top-6 flex items-center gap-1 text-xs text-[#8d949b] sm:right-10">
            <span>{copy.language}</span>
            <button type="button" onClick={() => setLanguage("th")} className={cn("grid size-6 place-items-center rounded-full text-[11px]", language === "th" ? "bg-[#135ee4] text-white" : "text-[#8d949b]")}>TH</button>
            <button type="button" onClick={() => setLanguage("en")} className={cn("grid size-6 place-items-center rounded-full text-[11px]", language === "en" ? "bg-[#135ee4] text-white" : "text-[#8d949b]")}>EN</button>
          </div>

          <div className="mb-4 sm:mb-5">
            <div className="origin-center -translate-y-4 scale-[.64] sm:scale-[.72]"><HRMicWordmark primaryClassName="text-[#315ff4] [text-shadow:0_0_1.5px_#1849db]" /></div>
            <h1 className="-mt-4 text-2xl font-semibold text-[#333]">{copy.title}</h1>
            <p className="mt-1 text-sm text-[#777]">{copy.subtitle}</p>
          </div>

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm text-[#4a4f55]">{copy.company}</label>
              <div className="relative">
                <input type="hidden" name="companyId" value={company?.id ?? ""} />
                <button type="button" disabled={companiesLoading || companies.length === 0} onClick={() => setCompanyOpen((open) => !open)} aria-label={copy.company} className="flex h-10 w-full items-center justify-between rounded-full border border-[#e0e3e7] px-4 text-sm text-[#555d66] transition-colors hover:border-[#a8b3c3] disabled:cursor-wait disabled:opacity-60">
                  <span className="flex items-center gap-3"><List className="size-4 text-[#5d6670]" strokeWidth={1.8} />{company?.code ?? copy.company}</span>
                  <ChevronDown className={cn("size-4 text-[#7d858e] transition-transform", companyOpen && "rotate-180")} />
                </button>
                {companyOpen && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#dce2e6] bg-white py-1 shadow-lg">
                  {companies.map((option) => <button key={option.id} type="button" onClick={() => { setCompany(option); setCompanyOpen(false); }} className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[#4c535b] hover:bg-[#edf4ff]"><span className="truncate">{option.code}</span>{option.id === company?.id && <Check className="size-4 shrink-0 text-[#135ee4]" />}</button>)}
                </div>}
              </div>
            </div>

            <div>
              <label htmlFor="register-name" className="mb-1.5 block text-sm text-[#4a4f55]">{copy.name}</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="register-name" name="name" type="text" autoComplete="name" placeholder={copy.namePlaceholder} value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-4 text-sm text-[#353a40] outline-none transition focus:border-[#315ff4] focus:ring-1 focus:ring-[#315ff4]" required />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="mb-1.5 block text-sm text-[#4a4f55]">{copy.email}</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="register-email" name="email" type="email" autoComplete="email" placeholder={copy.emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-4 text-sm text-[#353a40] outline-none transition focus:border-[#315ff4] focus:ring-1 focus:ring-[#315ff4]" required />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="mb-1.5 block text-sm text-[#4a4f55]">{copy.password}</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="register-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder={copy.passwordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-11 text-sm text-[#353a40] outline-none transition focus:border-[#315ff4] focus:ring-1 focus:ring-[#315ff4]" required />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#66707a] hover:text-[#315ff4]" aria-label={showPassword ? copy.hidePassword : copy.showPassword}>{showPassword ? <Eye className="size-[18px]" strokeWidth={1.8} /> : <EyeOff className="size-[18px]" strokeWidth={1.8} />}</button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm text-[#5d6570]">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="size-4 accent-[#315ff4]" />
              {copy.terms}
            </label>

            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{copy[error]}</p>}

            <button type="submit" disabled={submitting || !acceptedTerms || !company || !name || !email || !password} className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-full text-[16px] font-medium text-white shadow-sm transition", acceptedTerms && company && name && email && password ? "bg-[#315ff4] hover:bg-[#1849db]" : "cursor-not-allowed bg-[#b8c5ed]")}>{submitting && <Loader2 className="size-4 animate-spin" />}{submitting ? copy.registering : copy.submit}</button>
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
