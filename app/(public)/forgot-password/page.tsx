"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

import { AuthCard } from "@/components/layouts/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="ลืมรหัสผ่าน">
      <p className="text-sm text-muted-foreground">
        กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้คุณ
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">อีเมล</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" type="email" placeholder="you@company.com" autoComplete="email" />
        </div>
      </div>

      <Button className="w-full" size="lg">
        ส่งลิงก์รีเซ็ตรหัสผ่าน
      </Button>

      <div className="pt-1 text-center text-sm text-muted-foreground">
        จำรหัสผ่านได้แล้ว?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          เข้าสู่ระบบ
        </Link>
      </div>
    </AuthCard>
  );
}
