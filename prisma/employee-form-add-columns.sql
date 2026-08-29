-- ข้อมูลพื้นฐาน
ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "fingerprintCode" TEXT,      -- รหัสลายนิ้วมือ
  ADD COLUMN IF NOT EXISTS "nicknameEN" TEXT,           -- ชื่อเล่น (ENG)
  ADD COLUMN IF NOT EXISTS "alienIdNumber" TEXT,        -- เลขประจำตัวคนซึ่งไม่มีสัญชาติไทย
  ADD COLUMN IF NOT EXISTS "workPermitNo" TEXT,         -- เลขที่ใบอนุญาตทำงาน
  ADD COLUMN IF NOT EXISTS "description" TEXT,          -- รายละเอียด
  ADD COLUMN IF NOT EXISTS "hashtag" TEXT;              -- Hashtag

-- ข้อมูลการจ้างงาน / การเงิน
ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "advanceType" TEXT,          -- ประเภทเงินเบิกล่วงหน้า
  ADD COLUMN IF NOT EXISTS "advanceLimit" DECIMAL(12, 2), -- วงเงินเบิกล่วงหน้า
  ADD COLUMN IF NOT EXISTS "retirementDate" DATE,       -- ปีที่เกษียณ
  ADD COLUMN IF NOT EXISTS "paymentChannel" TEXT,       -- ช่องทางการชำระเงิน (เงินสด/โอน/เช็ค)
  ADD COLUMN IF NOT EXISTS "companyPayoutAccount" TEXT; -- บัญชีบริษัทนำจ่าย

-- รหัสสาขาธนาคาร (ข้อมูลบัญชีเงินเดือน)
ALTER TABLE "BankAccount"
  ADD COLUMN IF NOT EXISTS "branchCode" TEXT;

-- ประกันสังคม: รูปแบบการคำนวณ + ค่าคงที่ (เดือนเริ่ม = effectiveDate ที่มีอยู่แล้ว)
ALTER TABLE "SocialSecurity"
  ADD COLUMN IF NOT EXISTS "calculationType" TEXT,
  ADD COLUMN IF NOT EXISTS "fixedAmount" DECIMAL(12, 2);

-- ภาษี: รูปแบบการคำนวณ + จำนวนภาษีคงที่ + เดือนที่เริ่มคำนวณ
ALTER TABLE "TaxInformation"
  ADD COLUMN IF NOT EXISTS "calculationType" TEXT,
  ADD COLUMN IF NOT EXISTS "fixedAmount" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "effectiveDate" DATE;
