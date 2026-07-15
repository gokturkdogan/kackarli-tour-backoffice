-- CreateEnum
CREATE TYPE "ItineraryStopType" AS ENUM ('BOARDING', 'STOP', 'REST', 'VIEWPOINT', 'MEAL');

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "distance" TEXT,
ADD COLUMN     "departureTime" TEXT,
ADD COLUMN     "returnTime" TEXT,
ADD COLUMN     "maxGroupSize" INTEGER,
ADD COLUMN     "highlights" TEXT;

-- AlterTable
ALTER TABLE "TourItineraryItem" ADD COLUMN     "stopType" "ItineraryStopType" NOT NULL DEFAULT 'STOP',
ADD COLUMN     "time" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;
