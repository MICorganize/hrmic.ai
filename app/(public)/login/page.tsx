"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  List,
  Loader2,
  UserRound,
} from "lucide-react";

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

const COMPANIES = [
  { id: "mic", name: "MIC" },
];

function HRMicWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("select-none text-center font-semibold leading-none tracking-tight antialiased", compact ? "text-[29.76px]" : "text-[59.52px]") }>
      <span className="text-[#0799f4] [text-shadow:0_0_1.5px_#047ac4]">HRMic</span>
      <span className="text-[#ff6b00] [text-shadow:0_0_1.5px_#cc5500]">.ai</span>
      <p className={cn("font-light tracking-normal text-[#4f5660] antialiased [text-shadow:0_0_18px_#c3c8d0]", compact ? "-mt-[11.5px] text-[12.48px]" : "-mt-[16.8px] text-[17.472px]")}>Automated HRM Solutions</p>
    </div>
  );
}

function SocialButton({ children, className, label }: { children: React.ReactNode; className: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("grid size-10 place-items-center rounded-full transition-transform hover:scale-105", className)}
    >
      {children}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [company, setCompany] = useState(COMPANIES[0]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"th" | "en">("th");

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const saved = loadRemembered();
      setEmail(saved.email);
      setPassword(saved.password);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex h-dvh min-h-0 items-start justify-center overflow-hidden bg-[#e7f3fe] text-[#3b3f45] md:px-6">
      <svg className="pointer-events-none fixed inset-x-0 bottom-0 h-[43%] w-full" preserveAspectRatio="none" viewBox="0 0 1536 310" aria-hidden="true">
        <path d="M0 100C219 180 437 207 654 193C1004 172 1289 111 1536 56V310H0V100Z" fill="#078df3" />
      </svg>

      <div className="absolute right-10 top-5 hidden lg:block">
        <HRMicWordmark compact />
      </div>

      <section className="relative z-10 h-full min-h-0 w-[90%] max-w-[568.8px] bg-white px-7 pb-8 pt-4 shadow-[0_1px_12px_rgba(33,67,100,0.4)] sm:rounded-t-[22px] sm:px-12 md:mt-0">
        <button type="button" className="absolute left-4 top-4 grid size-7 place-items-center rounded-full border-2 border-[#0c9cf4] text-[#0c9cf4] transition hover:bg-[#eaf7ff]" aria-label="กลับ">
          <ArrowLeft className="size-4" strokeWidth={2} />
        </button>

        <div className="absolute right-5 top-4 flex items-center gap-1 text-sm text-[#acb2b9]">
          <span>ภาษา :</span>
          <button type="button" onClick={() => setLanguage("th")} className={cn("grid size-6 place-items-center rounded-full text-xs", language === "th" ? "bg-[#0b9df4] text-white shadow-sm" : "text-[#9da5ae]")}>TH</button>
          <button type="button" onClick={() => setLanguage("en")} className={cn("grid size-6 place-items-center rounded-full text-xs", language === "en" ? "bg-[#0b9df4] text-white shadow-sm" : "text-[#9da5ae]")}>EN</button>
        </div>

        <div className="-mt-3"><HRMicWordmark /></div>
        <h1 className="mt-2 text-center text-[23px] font-semibold text-[#353535]">เข้าสู่ระบบ</h1>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div>
            <label className="mb-1 block text-[15px] text-[#545454]">เลือกบริษัท</label>
            <div className="relative">
              <button type="button" onClick={() => setCompanyOpen((open) => !open)} className="flex h-12 w-full items-center justify-between rounded border border-[#e0e0e0] px-3 text-sm text-[#4c535b] transition-colors hover:border-[#bfc7ce]">
                <span className="flex items-center gap-5"><List className="size-4" strokeWidth={2} />{company.name}</span>
                <ChevronDown className={cn("size-4 text-[#777f88] transition-transform", companyOpen && "rotate-180")} />
              </button>
              {companyOpen && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded border border-[#dce2e6] bg-white py-1 shadow-lg">
                {COMPANIES.map((option) => <button key={option.id} type="button" onClick={() => { setCompany(option); setCompanyOpen(false); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-[#4c535b] hover:bg-[#edf7ff]">{option.name}{option.id === company.id && <Check className="size-4 text-[#0b9df4]" />}</button>)}
              </div>}
            </div>
          </div>

          <div>
            <label htmlFor="login-email" className="mb-1 block text-[15px] text-[#545454]">ชื่อผู้ใช้</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-[#31363b]" strokeWidth={1.8} />
              <input id="login-email" name="email" type="email" autoComplete="username" placeholder="Username" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded border border-[#e0e0e0] bg-white pl-11 pr-3 text-sm text-[#353a40] outline-none transition focus:border-[#049af3] focus:ring-1 focus:ring-[#049af3]" required />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-[15px] text-[#545454]">รหัสผ่าน</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-[#31363b]" strokeWidth={1.8} />
              <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded border border-[#e0e0e0] bg-white pl-11 pr-11 text-sm text-[#353a40] outline-none transition focus:border-[#049af3] focus:ring-1 focus:ring-[#049af3]" required />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#41474d] hover:text-[#049af3]" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>{showPassword ? <Eye className="size-5" strokeWidth={1.8} /> : <EyeOff className="size-5" strokeWidth={1.8} />}</button>
            </div>
          </div>

          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <Link href="/forgot-password" className="block text-[15px] text-[#0b9cf2] hover:underline">ลืมรหัสผ่าน</Link>
          <button type="submit" disabled={loading} aria-disabled={!email || !password} className={cn("mx-auto flex h-10 w-[220px] items-center justify-center gap-2 rounded-full text-[18px] font-medium text-white shadow-sm transition", email && password ? "bg-[#0b9cf2] hover:bg-[#0589db]" : "bg-[#e7e7e7]")}>{loading && <Loader2 className="size-4 animate-spin" />}เข้าสู่ระบบ</button>
        </form>

        <div className="my-6 flex items-center gap-3 text-[15px] text-[#555b62]"><span className="h-px flex-1 bg-[#eeeeee]" />หรือ<span className="h-px flex-1 bg-[#eeeeee]" /></div>
        <div className="flex justify-center gap-2.5">
          <SocialButton label="Google" className="bg-white text-[31px] font-bold text-[#4285f4] shadow-sm"><span><i className="text-[#ea4335] not-italic">G</i></span></SocialButton>
          <SocialButton label="Facebook" className="bg-[#2584e8] text-[31px] font-bold text-white">f</SocialButton>
          <SocialButton label="LINE" className="bg-[#25c438] text-[11px] font-bold text-white">LINE</SocialButton>
          <SocialButton label="Microsoft" className="bg-white shadow-sm"><span className="grid grid-cols-2 gap-0.5"><i className="size-2 bg-[#f25022]" /><i className="size-2 bg-[#7fba00]" /><i className="size-2 bg-[#00a4ef]" /><i className="size-2 bg-[#ffb900]" /></span></SocialButton>
          <SocialButton label="HumanSoft" className="bg-[#5d9ce3] text-[27px] font-bold text-white">H</SocialButton>
        </div>
        <div className="mt-4 border-t border-[#eeeeee] pt-3 text-center"><button type="button" className="h-9 rounded-full bg-[#ff7100] px-8 text-[17px] font-medium text-white shadow-sm transition hover:bg-[#ea6800]">เข้าสู่ระบบจัดการบริษัท</button></div>
      </section>
    </main>
  );
}
