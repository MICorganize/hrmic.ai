"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { AuthCard } from "@/components/layouts/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthCard title="ลงทะเบียน" tagline="สมัครใช้งาน HRMic.ai">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">ชื่อ-นามสกุล</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="ชื่อ นามสกุล" autoComplete="name" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">อีเมล</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" type="email" placeholder="you@company.com" autoComplete="email" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">ชื่อบริษัท</label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="บริษัทของคุณ" autoComplete="organization" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">รหัสผ่าน</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            className="pl-9 pr-10"
            placeholder="สร้างรหัสผ่าน"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button className="w-full" size="lg">
        ลงทะเบียน
      </Button>

      <div className="pt-1 text-center text-sm text-muted-foreground">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          เข้าสู่ระบบ
        </Link>
      </div>
    </AuthCard>
  );
}
