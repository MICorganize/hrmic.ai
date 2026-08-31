"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  List,
  Loader2,
  Mail,
} from "lucide-react";

import { HRMicWordmark } from "@/components/hrmic-wordmark";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hrmic_login_remember";

type RememberedLogin = { email: string; password: string };

function loadRemembered(): RememberedLogin {
  if (typeof window === "undefined") return { email: "", password: "" };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<RememberedLogin>;
    return { email: saved.email ?? "", password: saved.password ?? "" };
  } catch {
    return { email: "", password: "" };
  }
}

const COMPANIES = [{ id: "mic", name: "MIC" }];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [company, setCompany] = useState(COMPANIES[0]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"th" | "en">("th");

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const saved = loadRemembered();
      setEmail(saved.email);
      setPassword(saved.password);
      setRemember(Boolean(saved.email || saved.password));
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) return;

    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
      if (remember) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f5f7] p-4 font-[family:var(--font-kanit)] text-[#454545] sm:p-8">
      <section className="grid w-full max-w-[960px] overflow-hidden rounded-sm bg-white shadow-[0_4px_24px_rgba(33,41,52,0.14)] lg:min-h-[580px] lg:grid-cols-2">
        <aside className="hidden min-h-full overflow-hidden bg-[#0259e6] lg:flex lg:items-center">
          <Image src="/images/auth/login-illustration.jpg" alt="ภาพประกอบการเข้าสู่ระบบอย่างปลอดภัย" width={5209} height={4167} priority className="h-auto w-full" />
        </aside>

        <div className="relative flex min-h-[580px] flex-col justify-center px-7 py-10 sm:px-12">
          <div className="absolute right-7 top-6 flex items-center gap-1 text-xs text-[#8d949b] sm:right-10">
            <span>ภาษา</span>
            <button type="button" onClick={() => setLanguage("th")} className={cn("grid size-6 place-items-center rounded-full text-[11px]", language === "th" ? "bg-[#135ee4] text-white" : "text-[#8d949b]")}>TH</button>
            <button type="button" onClick={() => setLanguage("en")} className={cn("grid size-6 place-items-center rounded-full text-[11px]", language === "en" ? "bg-[#135ee4] text-white" : "text-[#8d949b]")}>EN</button>
          </div>

          <div className="mb-7 sm:mb-8">
            <div className="origin-center -translate-y-4 scale-[.64] sm:scale-[.72]"><HRMicWordmark primaryClassName="text-[#315ff4] [text-shadow:0_0_1.5px_#1849db]" /></div>
            <h1 className="-mt-4 text-2xl font-semibold text-[#333]">เข้าสู่ระบบ</h1>
            <p className="mt-1 text-sm text-[#777]">เข้าสู่ระบบเพื่อจัดการข้อมูลบุคลากรของคุณ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-[#4a4f55]">เลือกบริษัท</label>
              <div className="relative">
                <button type="button" onClick={() => setCompanyOpen((open) => !open)} className="flex h-10 w-full items-center justify-between rounded-full border border-[#e0e3e7] px-4 text-sm text-[#555d66] transition-colors hover:border-[#a8b3c3]">
                  <span className="flex items-center gap-3"><List className="size-4 text-[#5d6670]" strokeWidth={1.8} />{company.name}</span>
                  <ChevronDown className={cn("size-4 text-[#7d858e] transition-transform", companyOpen && "rotate-180")} />
                </button>
                {companyOpen && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#dce2e6] bg-white py-1 shadow-lg">
                  {COMPANIES.map((option) => <button key={option.id} type="button" onClick={() => { setCompany(option); setCompanyOpen(false); }} className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[#4c535b] hover:bg-[#edf4ff]">{option.name}{option.id === company.id && <Check className="size-4 text-[#135ee4]" />}</button>)}
                </div>}
              </div>
            </div>

            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm text-[#4a4f55]">ชื่อผู้ใช้</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="login-email" name="email" type="email" autoComplete="username" placeholder="อีเมลหรือชื่อผู้ใช้" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-4 text-sm text-[#353a40] outline-none transition focus:border-[#135ee4] focus:ring-1 focus:ring-[#135ee4]" required />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm text-[#4a4f55]">รหัสผ่าน</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="กรอกรหัสผ่าน" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-11 text-sm text-[#353a40] outline-none transition focus:border-[#135ee4] focus:ring-1 focus:ring-[#135ee4]" required />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#66707a] hover:text-[#135ee4]" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>{showPassword ? <Eye className="size-[18px]" strokeWidth={1.8} /> : <EyeOff className="size-[18px]" strokeWidth={1.8} />}</button>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between pt-1 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-[#5d6570]">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 accent-[#135ee4]" />
                จดจำการเข้าสู่ระบบ
              </label>
              <Link href="/forgot-password" className="text-[#135ee4] hover:underline">ลืมรหัสผ่าน?</Link>
            </div>

            <button type="submit" disabled={loading} aria-disabled={!email || !password} className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-full text-[16px] font-medium text-white shadow-sm transition", email && password ? "bg-[#315ff4] hover:bg-[#1849db]" : "bg-[#b8c5ed]")}>{loading && <Loader2 className="size-4 animate-spin" />}เข้าสู่ระบบ</button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wide text-[#b1b5ba]"><span className="h-px flex-1 bg-[#e4e6e8]" />HRMic.ai<span className="h-px flex-1 bg-[#e4e6e8]" /></div>
          <p className="text-center text-sm text-[#757b82]">
            ยังไม่มีบัญชีผู้ใช้?{" "}
            <Link href="/register" className="font-medium text-[#315ff4] hover:underline">สมัครใช้งานที่นี่</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
