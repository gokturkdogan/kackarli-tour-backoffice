-- CreateEnum
CREATE TYPE "OrganizationLeadSource" AS ENUM ('PHONE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "tourDate" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "adultCount" INTEGER NOT NULL,
    "childCount" INTEGER NOT NULL DEFAULT 0,
    "boardingPoint" TEXT,
    "note" TEXT,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "leadSource" "OrganizationLeadSource" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_tourDate_idx" ON "Organization"("tourDate");

-- CreateIndex
CREATE INDEX "Organization_scheduleId_idx" ON "Organization"("scheduleId");

-- CreateIndex
CREATE INDEX "Organization_tourId_tourDate_idx" ON "Organization"("tourId", "tourDate");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TourSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
