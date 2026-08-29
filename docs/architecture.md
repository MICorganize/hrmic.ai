# โครงสร้างโปรเจกต์ (Project Structure)

โครงสร้างนี้จัดตามข้อกำหนด **HRMic.ai V1.0** — Next.js 16 App Router สำหรับระบบ HR & Payroll

## หลักการ (Guidelines)

- **`app/`** รับผิดชอบ Routing และ Composition ของหน้าเท่านั้น — ห้ามวาง Business Logic จำนวนมากใน `page.tsx`
- **`modules/`** เป็นเจ้าของกฎธุรกิจของแต่ละโดเมน (Payroll, Attendance, Leave …) โดยเก็บ component, action, schema และ service เฉพาะโมดูลไว้ภายในโมดูลนั้น
- **`components/`** และ **`lib/`** เก็บเฉพาะสิ่งที่ใช้ร่วมกันจริง เพื่อป้องกันการอ้างอิงข้ามโมดูลจนแก้ไขยาก
- **Multi-tenant:** ตารางธุรกิจหลักต้องมี `tenantId`/`companyId` พร้อม Data Scope และ Permission ในทุกคำสั่ง Query
- **งานหนัก** เช่น คำนวณเงินเดือน ส่งอีเมล สร้างรายงาน และนำเข้าข้อมูล ต้องทำผ่าน Background Job/Queue

## ผังโฟลเดอร์

```
app/                          # Routing, Layout, API และสถานะของหน้า
├── (public)/                 # Route Group — หน้าสาธารณะ (ไม่เพิ่มชื่อลง URL)
│   ├── page.tsx              # Landing page (หน้าแรก /)
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (portal)/                 # Route Group — โซนระบบหลักหลังเข้าสู่ระบบ
│   ├── dashboard/
│   ├── organization/
│   ├── employees/
│   ├── attendance/
│   ├── payroll/
│   ├── recruitment/
│   ├── onboarding/
│   ├── performance/
│   ├── training/
│   ├── documents/
│   ├── workflows/
│   ├── communication/
│   ├── reports/
│   ├── settings/
│   └── profile/
├── api/                      # REST API, Integration และ Webhook
│   ├── auth/                 # (Auth.js [...nextauth])
│   ├── inngest/              # Inngest handler
│   ├── organization/
│   ├── employee/
│   ├── attendance/
│   ├── payroll/
│   ├── recruitment/
│   ├── report/
│   └── webhooks/
├── layout.tsx                # Root layout
├── loading.tsx
├── error.tsx
├── not-found.tsx
└── globals.css

modules/                      # เจ้าของกฎธุรกิจของแต่ละโดเมน
├── auth/  organization/  employee/  attendance/  leave/
├── overtime/  shift/  payroll/  recruitment/  onboarding/
├── performance/  learning/  workflow/  approval/  announcement/
└── reward/  todo/  report/  audit/  notification/

components/                   # คอมโพเนนต์ที่นำกลับมาใช้ซ้ำได้
├── ui/  forms/  tables/  charts/  dialogs/
├── layouts/  navigation/
└── payroll/  attendance/  employee/    # เฉพาะโดเมนที่ใช้ข้ามหลายหน้า

lib/                          # Utility ส่วนกลางที่ไม่ขึ้นกับ UI
├── auth/       # Auth.js, Session helper, Password policy
├── prisma/     # Prisma client + transaction helper
├── db/         # Repository base
├── cache/      # Redis, cache และ revalidation strategy
├── logger/  permissions/  encryption/
├── upload/     # R2, ตรวจสอบไฟล์ และ Attachment
├── mail/  sms/  pdf/  excel/
├── thai/       # วันที่ พ.ศ., เลขไทย, ภาษีไทย
└── payroll/    # สูตรคำนวณ ค่าจ้าง ภาษี ประกันสังคม

services/                     # ประสานงานข้าม Module / External API
├── api/  payroll/  attendance/  notification/  report/

actions/                      # Server Actions ที่ใช้ร่วมกันข้ามโมดูล
hooks/                        # Hook ส่วนกลาง (Permission, Debounce, …)
store/                        # Zustand store (เฉพาะข้อมูล UI ที่จำเป็น)
providers/                    # Auth, Theme, Query, Locale
middleware/                   # Authentication, Tenant, Rate limit (proxy)
types/                        # Type ที่แชร์ข้ามโดเมน
constants/                    # Enum, Route name, Status, Default values
validations/                  # Zod schemas + Business validation
schemas/                      # Contract ที่แชร์ระหว่าง Client/Server
configs/                      # Environment, Feature flags, Integration
locales/                      # ไฟล์แปลภาษา (th, en)
emails/                       # เทมเพลตอีเมล (Reset password, Payslip alert)
public/                       # Logo, Icon, Template, รูปภาพ
prisma/                       # Schema + Seed data
scripts/                      # Seed, Import, Cleanup, Payroll batch
tests/
├── unit/                     # ทดสอบฟังก์ชัน สูตรคำนวณ Domain logic
├── integration/              # ทดสอบ Database, API, Queue
├── e2e/                      # ทดสอบ Workflow ผ่าน Browser (Playwright)
└── performance/              # Benchmark งาน Payroll
docs/                         # Architecture, ERD, API, Business rules
```

## หมายเหตุ

- โฟลเดอร์ในวงเล็บ เช่น `(public)` และ `(portal)` เป็น **Route Group** ของ Next.js ใช้จัดกลุ่มหน้าโดยไม่เพิ่มชื่อโฟลเดอร์ลงใน URL
- ไฟล์ `lib/inngest/` เป็นส่วนของ Inngest (Background Jobs) ที่ใช้งานอยู่แล้ว แม้จะไม่ได้ระบุในเอกสาร V1.0
- Next.js 16 เปลี่ยนจาก `middleware` เป็น `proxy` — ยังไม่ได้สร้างไฟล์ `proxy.ts` ที่ root จนกว่าจะมี logic จริง
