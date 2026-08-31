"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f5f7] p-4 font-[family:var(--font-kanit)] text-[#454545] sm:p-8">
      <section className="grid w-full max-w-[960px] overflow-hidden rounded-sm bg-white shadow-[0_4px_24px_rgba(33,41,52,0.14)] md:min-h-[410px] md:grid-cols-2">
        <aside className="hidden min-h-full overflow-hidden border-r border-[#eef0f2] bg-white md:flex md:items-center">
          <Image src="/images/auth/forgot-password-illustration.jpg" alt="ภาพประกอบการรีเซ็ตรหัสผ่าน" width={800} height={600} priority className="h-auto w-full" />
        </aside>

        <div className="flex min-h-[410px] flex-col justify-center px-7 py-10 sm:px-12">
          <div className="mb-9">
            <h1 className="text-2xl font-semibold text-[#333]">ลืมรหัสผ่าน?</h1>
            <p className="mt-2 text-sm text-[#777]">กรอกอีเมลที่ลงทะเบียนไว้เพื่อรีเซ็ตรหัสผ่าน</p>
          </div>

          <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div>
              <label htmlFor="reset-email" className="mb-1.5 block text-sm text-[#4a4f55]">อีเมล</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#5e6670]" strokeWidth={1.8} />
                <input id="reset-email" name="email" type="email" autoComplete="email" placeholder="กรอกอีเมล" className="h-11 w-full rounded-full border border-[#e0e3e7] bg-white pl-11 pr-4 text-sm text-[#353a40] outline-none transition focus:border-[#315ff4] focus:ring-1 focus:ring-[#315ff4]" required />
              </div>
            </div>
            <button type="submit" className="flex h-11 w-full items-center justify-center rounded-full bg-[#315ff4] text-[16px] font-medium text-white shadow-sm transition hover:bg-[#1849db]">ส่งลิงก์รีเซ็ตรหัสผ่าน</button>
          </form>

          <Link href="/login" className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-[#f4f5f7] text-[16px] font-medium text-[#34383d] transition hover:bg-[#e8eaee]">กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </section>
    </main>
  );
}
