-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'MOCK';

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "sha256" SET DEFAULT '';
