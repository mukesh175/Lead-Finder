-- CreateEnum
CREATE TYPE "PhoneStatus" AS ENUM ('valid', 'invalid', 'unknown', 'not_checked');

-- CreateEnum
CREATE TYPE "SearchMode" AS ENUM ('business', 'intent');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "intentQuote" TEXT,
ADD COLUMN     "phoneCarrier" TEXT,
ADD COLUMN     "phoneDigits" TEXT,
ADD COLUMN     "phoneLineType" TEXT,
ADD COLUMN     "phoneStatus" "PhoneStatus" NOT NULL DEFAULT 'not_checked',
ADD COLUMN     "sourceGroup" TEXT;

-- AlterTable
ALTER TABLE "Search" ADD COLUMN     "mode" "SearchMode" NOT NULL DEFAULT 'business',
ADD COLUMN     "sources" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Lead_userId_sourceType_idx" ON "Lead"("userId", "sourceType");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_phoneDigits_idx" ON "Lead"("phoneDigits");
