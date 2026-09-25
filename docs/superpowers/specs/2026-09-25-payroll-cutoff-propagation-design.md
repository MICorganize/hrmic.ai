# Payroll Cutoff Setting Propagation Design

## Goal

เมื่อผู้ใช้เลือก “วันที่ตัดรอบการจ่ายเงินเดือน” ในหน้า ตั้งค่า > ตั้งค่าการคำนวณ และกดบันทึก/ยืนยันแล้ว ระบบต้องเก็บค่าในระดับบริษัท และให้ทุกหน้ากับ API ที่เกี่ยวข้องกับรอบเงินเดือนคำนวณช่วงวันที่จากค่าที่บันทึกไว้เหมือนกัน โดยไม่เปลี่ยน Layout, สี, ขนาด, ข้อความ หรือโครงสร้าง UI ที่มีอยู่แล้ว

## Confirmed scope

- เปลี่ยนเฉพาะพฤติกรรมการโหลด บันทึก และกระจายค่าตั้งค่า
- คง UI ของ dropdown, Dialog, ปุ่มบันทึก และหน้าที่เกี่ยวข้องตามที่มีอยู่
- ค่ารอบจ่ายเป็นค่าเริ่มต้นระดับบริษัท:
  - `1` หมายถึงวันที่ 1 ถึงวันสุดท้ายของเดือน (EOM)
  - `2` ถึง `16` หมายถึงวันที่ N ถึงวันที่ N-1 ของเดือนถัดไป
- การตั้งงวดเฉพาะเดือนในหน้าคำนวณเงินเดือน (`PayrollRun.periodStart/periodEnd`) มีสิทธิ์สูงกว่า default ระดับบริษัท
- เมื่อไม่มีบริษัทที่ active ให้ใช้พฤติกรรม error/สถานะเดิมของระบบ ไม่สร้างค่าตั้งค่าข้ามบริษัท

## Data flow

1. หน้า General Settings โหลดค่า cutoff ของบริษัทปัจจุบันจาก settings API และใช้ค่าเดิมเป็น fallback เฉพาะกรณี API ยังโหลดไม่ได้
2. การกด “บันทึก” ยังคงเปิด Dialog เดิม การกด “ยืนยัน” จึงส่งค่าที่เลือกไป settings API
3. Settings API ตรวจสอบค่า `1..16`, บันทึกลงฟิลด์ระดับบริษัท และทำให้ read-model cache ของ payroll dashboard ใช้ค่าชุดใหม่
4. ตัวช่วยคำนวณงวดกลางอ่าน `PayrollRun` ก่อน หากมีงวดเฉพาะเดือนที่บันทึกไว้ให้ใช้ค่านั้น มิฉะนั้นอ่าน cutoff ของบริษัทและคำนวณช่วงวันที่ default
5. API/หน้าที่แสดง dashboard, payroll period, personal payroll และ work-time ใช้ตัวช่วยเดียวกัน จึงได้ช่วงวันที่ตรงกันหลังบันทึก

## Persistence and API

- เพิ่ม `Company.payrollCutoffDay Int @default(1)` ใน Prisma schema และ migration ที่ไม่ทำลายข้อมูลเดิม
- เพิ่ม route สำหรับค่าตั้งค่าทั่วไปของบริษัทปัจจุบัน เช่น `GET/PUT /api/settings/general`
- `GET` คืนค่า cutoff ที่บันทึกไว้
- `PUT` รับ `{ payrollCutoffDay }`, ปฏิเสธค่าที่ไม่ใช่จำนวนเต็ม 1 ถึง 16, ตรวจสอบ active company และคืนค่าที่บันทึกแล้ว
- การยืนยัน Dialog ต้องรอผลสำเร็จจาก API ก่อนปิดสถานะการบันทึกที่เกี่ยวข้อง; หาก API ล้มเหลวต้องไม่ทำให้หน้าตั้งค่าแสดงว่าบันทึกสำเร็จ

## Consumers

ปรับเฉพาะ logic ที่ใช้ช่วงวันที่ ไม่แตะ markup หรือ className ของ UI:

- `app/api/payroll/period/route.ts`
- `lib/payroll/dashboard.ts`
- `app/api/payroll/personal/route.ts`
- `app/api/payroll/work-time/route.ts`
- client payroll flow ที่โหลด/แสดง period ให้รีโหลดข้อมูลตามค่าที่ API คืนมาเมื่อมีการตั้งค่าใหม่

## Cache and refresh behavior

- หลังบันทึกสำเร็จให้ invalidate read model `payroll-dashboard` ของบริษัท
- หน้าคำนวณที่โหลดใหม่หรือเปลี่ยนเดือนต้องได้ช่วงวันที่จากค่าล่าสุด
- ไม่ใช้ localStorage เป็นแหล่งข้อมูลหลัก เพราะค่าต้องผูกกับบริษัทและใช้ร่วมกับ server/API ได้

## Validation and failure behavior

- ค่า `1` และ `2..16` ต้องคำนวณได้ทั้งเดือน 28/29/30/31 วัน โดยไม่สร้างวันที่ไม่มีจริง
- ช่วง default ต้องใช้ date-only boundary แบบเดิมของ API เพื่อไม่กระทบ timezone และ query attendance/leave
- งวดเฉพาะเดือนที่มีอยู่ต้องไม่ถูกทับเมื่อเปลี่ยนค่า default บริษัท
- กรณี API settings ตอบ 400/403/500 ให้คงค่าในฟอร์มไว้และแสดง error ตามกลไกเดิมของหน้า โดยไม่แก้ Layout/UI

## Verification

- Unit tests สำหรับ mapping cutoff เป็นช่วงวันที่ รวม EOM, วันที่ 2, วันที่ 16 และเดือนกุมภาพันธ์ปีอธิกสุรทิน
- API tests สำหรับ GET/PUT validation และ company scoping
- Regression tests ยืนยันว่า payroll consumers ใช้ค่าบริษัทเดียวกัน และ explicit monthly period ยัง override ได้
- รัน targeted tests, full test suite, typecheck, scoped lint และ production build
