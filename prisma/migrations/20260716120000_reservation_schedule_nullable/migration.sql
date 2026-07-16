-- AlterTable
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_scheduleId_fkey";

ALTER TABLE "Reservation" ALTER COLUMN "scheduleId" DROP NOT NULL;

ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TourSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
