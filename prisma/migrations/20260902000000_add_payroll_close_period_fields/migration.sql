ALTER TABLE "PayrollRun"
ADD COLUMN "paymentDate" DATE,
ADD COLUMN "taxPaymentDate" DATE,
ADD COLUMN "closedAt" TIMESTAMP(3);
