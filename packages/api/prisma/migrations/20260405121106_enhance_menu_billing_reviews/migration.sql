-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPopular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "planStatus" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "ownerRepliedAt" TIMESTAMP(3),
ADD COLUMN     "ownerReply" TEXT;
