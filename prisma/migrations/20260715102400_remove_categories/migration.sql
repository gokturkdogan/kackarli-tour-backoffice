-- DropForeignKey
ALTER TABLE "Tour" DROP CONSTRAINT "Tour_categoryId_fkey";

-- AlterTable
ALTER TABLE "Tour" DROP COLUMN "categoryId";

-- DropTable
DROP TABLE "Category";
