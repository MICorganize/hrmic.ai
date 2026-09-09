"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, KeyRound, List, Loader2, Mail } from "lucide-react";

import { authenticateWithCredentials } from "@/app/actions/authenticate";
import { HRMicWordmark } from "@/components/hrmic-wordmark";
import { usePublicCompanies, type PublicCompany } from "@/hooks/use-public-companies";
import { preloadDashboardEmployeeSummary, resetDashboardEmployeeSummary } from "@/lib/employee/dashboard-summary-client";
import { resetEmployeeSummaryCache } from "@/lib/employee/summary-client";
import { markLoginFlow } from "@/lib/performance/login-flow-client";
import { cn } from "@/lib/utils";

type LoginKind = "employee" | "company-management";

type LoginFormProps = {
  /** Omit this to render the form immediately and load the directory in the browser. */
  initialCompanies?: PublicCompany[];
  kind: LoginKind;
};

type RememberedLogin = { email: string };

function loadRemembered(storageKey: string): RememberedLogin {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Partial<RememberedLogin>;
    return { email: saved.email ?? "" };
  } catch {
    return { email: "" };
  }
}

export function LoginForm({ initialCompanies, kind }: LoginFormProps) {
  const router = useRouter();
  const { companies, loading: companiesLoading } = usePublicCompanies(initialCompanies);
  const [showPassword, setShowPassword] = useState(false);
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"th" | "en">("th");
  const isCompanyManagement = kind === "company-management";
  const storageKey = isCompanyManagement ? "hrmic_company_management_login_remember" : "hrmic_login_remember";
  const alternateLoginHref = isCompanyManagement ? "/login" : "/company-management/login";
  const emailFieldId = isCompanyManagement ? "company-management-email" : "login-email";
  const passwordFieldId = isCompanyManagement ? "company-management-password" : "login-password";
  const copy = language === "en"
    ? isCompanyManagement
      ? {
          language: "Language", imageAlt: "Illustration of secure company-management sign in", title: "Company Management", subtitle: "Log in to manage your company information", company: "Select company", username: "Username", usernamePlaceholder: "Email or username", password: "Password", passwordPlaceholder: "Enter password", showPassword: "Show password", hidePassword: "Hide password", remember: "Remember me", forgotPassword: "Forgot password?", submit: "Log in", loading: "Signing in", noAccount: "Want to sign in as an employee?", alternateLogin: "Employee Login", invalidCredentials: "Incorrect email or password", companyAccessDenied: "", genericError: "Something went wrong. Please try again.",
        }
      : {
          language: "Language", imageAlt: "Illustration of secure sign in", title: "Log in", subtitle: "Log in to manage your workforce information", company: "Select company", username: "Username", usernamePlaceholder: "Email or username", password: "Password", passwordPlaceholder: "Enter password", showPassword: "Show password", hidePassword: "Hide password", remember: "Remember me", forgotPassword: "Forgot password?", submit: "Log in", loading: "Signing in", noAccount: "Don't have an account?", alternateLogin: "Company Management", invalidCredentials: "Incorrect email or password", companyAccessDenied: "Your account cannot access the selected company.", genericError: "Something went wrong. Please try again.",
        }
    : isCompanyManagement
      ? {
          language: "ภาษา", imageAlt: "ภาพประกอบการเข้าสู่ระบบจัดการบริษัทอย่างปลอดภัย", title: "เข้าสู่ระบบจัดการบริษัท", subtitle: "เข้าสู่ระบบเพื่อจัดการข้อมูลบริษัทของคุณ", company: "เลือกบริษัท", username: "ชื่อผู้ใช้", usernamePlaceholder: "อีเมลหรือชื่อผู้ใช้", password: "รหัสผ่าน", passwordPlaceholder: "กรอกรหัสผ่าน", showPassword: "แสดงรหัสผ่าน", hidePassword: "ซ่อนรหัสผ่าน", remember: "จดจำการเข้าสู่ระบบ", forgotPassword: "ลืมรหัสผ่าน?", submit: "เข้าสู่ระบบ", loading: "กำลังเข้าสู่ระบบ", noAccount: "ต้องการเข้าสู่ระบบสำหรับพนักงาน?", alternateLogin: "เข้าสู่ระบบสำหรับพนักงาน", invalidCredentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", companyAccessDenied: "", genericError: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        }
      : {
          language: "ภาษา", imageAlt: "ภาพประกอบการเข้าสู่ระบบอย่างปลอดภัย", title: "เข้าสู่ระบบ", subtitle: "เข้าสู่ระบบเพื่อจัดการข้อมูลบุคลากรของคุณ", company: "เลือกบริษัท", username: "ชื่อผู้ใช้", usernamePlaceholder: "อีเมลหรือชื่อผู้ใช้", password: "รหัสผ่าน", passwordPlaceholder: "กรอกรหัสผ่าน", showPassword: "แสดงรหัสผ่าน", hidePassword: "ซ่อนรหัสผ่าน", remember: "จดจำการเข้าสู่ระบบ", forgotPassword: "ลืมรหัสผ่าน?", submit: "เข้าสู่ระบบ", loading: "กำลังเข้าสู่ระบบ", noAccount: "ยังไม่มีบัญชีผู้ใช้?", alternateLogin: "เข้าสู่ระบบจัดการบริษัท", invalidCredentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", companyAccessDenied: "บัญชีผู้ใช้นี้ไม่มีสิทธิ์เข้าใช้บริษัทที่เลือก", genericError: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        };

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const saved = loadRemembered(storageKey);
      setEmail(saved.email);
      setRemember(Boolean(saved.email));
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [storageKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password || (!isCompanyManagement && !company)) return;

    setError(null);
    setLoading(true);
    markLoginFlow("login-submit");
    try {
      const result = await authenticateWithCredentials({
        email,
        password,
        ...(isCompanyManagement ? {} : { companyId: company?.id }),
        kind,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      markLoginFlow("login-authenticated");
      resetEmployeeSummaryCache();
      resetDashboardEmployeeSummary();
      if (!isCompanyManagement) {
        // The selected company was authorized in the same Credentials request.
        // Start the small dashboard request while the route transition begins.
        markLoginFlow("company-authorized");
        void preloadDashboardEmployeeSummary().catch(() => undefined);
      }
      if (remember) {
        // A device may remember a non-sensitive identifier, never a password.
        window.localStorage.setItem(storageKey, JSON.stringify({ email }));
      } else {
        window.localStorage.removeItem(storageKey);
      }
      // Credentials have committed both the signed session and the initial
      // selected-company claim. Do not add a refresh: it creates a second RSC
      // request and delays the dashboard shell.
      router.replace(isCompanyManagement ? "/organization/companies" : "/dashboard");
    } catch {
      setError("genericError");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main lang={language} className="grid h-dvh overflow-hidden place-items-center bg-[#f4f5f7] p-4 font-[family:var(--font-kanit)] text-[#454545] sm:p-8">
      <section className="grid w-full max-w-[960px] overflow-hidden rounded-sm bg-white shadow-[0_4px_24px_rgba(33,41,52,0.14)] lg:grid-cols-2">
        <aside className="hidden min-h-full overflow-hidden bg-[#0259e6] lg:flex lg:items-center">
          <Image src="/images/auth/login-illustration.jpg" alt={copy.imageAlt} width={5209} height={4167} loading="eager" sizes="(min-width: 1024px) 480px, 1px" className="h-auto w-full" />
        </aside>

        <div className="relative flex flex-col justify-center px-7 py-6 sm:px-12 lg:justify-start">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-[#4a4f55]">{copy.company}</label>
              <div className="relative">
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
              <label htmlFor={emailFieldId} className="mb-1.5 block text-sm text-[#4a4f55]">{copy.username}</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id={emailFieldId} name="email" type="email" autoComplete="username" placeholder={copy.usernamePlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-4 text-sm text-[#353a40] outline-none transition focus:border-[#135ee4] focus:ring-1 focus:ring-[#135ee4]" required />
              </div>
            </div>

            <div>
              <label htmlFor={passwordFieldId} className="mb-1.5 block text-sm text-[#4a4f55]">{copy.password}</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id={passwordFieldId} name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder={copy.passwordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-11 text-sm text-[#353a40] outline-none transition focus:border-[#135ee4] focus:ring-1 focus:ring-[#135ee4]" required />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#66707a] hover:text-[#135ee4]" aria-label={showPassword ? copy.hidePassword : copy.showPassword}>{showPassword ? <Eye className="size-[18px]" strokeWidth={1.8} /> : <EyeOff className="size-[18px]" strokeWidth={1.8} />}</button>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{copy[error as "invalidCredentials" | "companyAccessDenied" | "genericError"]}</p>}

            <div className="flex items-center justify-between pt-1 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-[#5d6570]">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 accent-[#135ee4]" />
                {copy.remember}
              </label>
              <Link href="/forgot-password" className="text-[#135ee4] hover:underline">{copy.forgotPassword}</Link>
            </div>

            <button type="submit" disabled={loading || (!isCompanyManagement && !company)} aria-disabled={!email || !password || (!isCompanyManagement && !company)} className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-full text-[16px] font-medium text-white shadow-sm transition", email && password && (isCompanyManagement || company) ? "bg-[#315ff4] hover:bg-[#1849db]" : "bg-[#b8c5ed]")}>{loading && <Loader2 className="size-4 animate-spin" />}{loading ? copy.loading : copy.submit}</button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wide text-[#b1b5ba]"><span className="h-px flex-1 bg-[#e4e6e8]" />HRMic.ai<span className="h-px flex-1 bg-[#e4e6e8]" /></div>
          <p className="-mt-[15px] text-center text-sm text-[#757b82]">
            {copy.noAccount}{" "}
            <Link href={isCompanyManagement ? "/login" : "/register"} className="font-medium text-[#315ff4] hover:underline">{isCompanyManagement ? (language === "en" ? "Log in here" : "เข้าสู่ระบบที่นี่") : (language === "en" ? "Sign up here" : "สมัครใช้งานที่นี่")}</Link>
          </p>
          <Link href={alternateLoginHref} draggable={false} className="mt-4 flex h-10 w-full items-center justify-center rounded-full bg-[#fc9a12] text-[14px] font-medium text-white shadow-sm transition hover:bg-[#e88a0a]">
            {copy.alternateLogin}
          </Link>
        </div>
      </section>
    </main>
  );
}
