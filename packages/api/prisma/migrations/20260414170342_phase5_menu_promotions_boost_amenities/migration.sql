-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('DISCOUNT', 'SPECIAL_OFFER', 'HAPPY_HOUR', 'EVENT', 'BOOKING_BONUS');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BoostLevel" AS ENUM ('BOOST', 'BOOST_PRO', 'BOOST_PREMIUM');

-- CreateEnum
CREATE TYPE "BoostStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- AlterTable: menu_categories — add new columns; updatedAt nullable first, backfill, then constrain
ALTER TABLE "menu_categories"
  ADD COLUMN "isVisible"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "nameEn"     TEXT,
  ADD COLUMN "namePl"     TEXT,
  ADD COLUMN "nameUk"     TEXT,
  ADD COLUMN "updatedAt"  TIMESTAMP(3);

UPDATE "menu_categories" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TABLE "menu_categories" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable: menu_items — add new columns; updatedAt nullable first, backfill, then constrain
ALTER TABLE "menu_items"
  ADD COLUMN "calories"         INTEGER,
  ADD COLUMN "currency"         TEXT NOT NULL DEFAULT 'PLN',
  ADD COLUMN "descriptionEn"    TEXT,
  ADD COLUMN "descriptionPl"    TEXT,
  ADD COLUMN "descriptionUk"    TEXT,
  ADD COLUMN "isAvailable"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "nameEn"           TEXT,
  ADD COLUMN "namePl"           TEXT,
  ADD COLUMN "nameUk"           TEXT,
  ADD COLUMN "restaurantId"     TEXT,
  ADD COLUMN "specialPrice"     DOUBLE PRECISION,
  ADD COLUMN "specialPriceLabel" TEXT,
  ADD COLUMN "tags"             TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "updatedAt"        TIMESTAMP(3),
  ADD COLUMN "weight"           TEXT;

-- Backfill updatedAt from createdAt
UPDATE "menu_items" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TABLE "menu_items" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Sync isAvailable from existing available field
UPDATE "menu_items" SET "isAvailable" = "available";

-- Backfill restaurantId from parent menu_categories
UPDATE "menu_items" mi
SET "restaurantId" = mc."restaurantId"
FROM "menu_categories" mc
WHERE mc.id = mi."categoryId";

-- AlterTable: restaurants — amenities, scores
ALTER TABLE "restaurants"
  ADD COLUMN "averageBill"         DOUBLE PRECISION,
  ADD COLUMN "averageBillCurrency" TEXT NOT NULL DEFAULT 'PLN',
  ADD COLUMN "baseScore"           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "boostScore"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalScore"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "hasAirConditioning"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasChildMenu"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasHighChairs"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasLiveMusic"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasOutdoorSeating"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasPrivateRooms"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasWifi"             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isSmokingAllowed"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "liveMusicDetails"    TEXT,
  ADD COLUMN "outdoorDetails"      TEXT,
  ADD COLUMN "parkingType"         TEXT,
  ADD COLUMN "paymentMethods"      TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "petsAllowed"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "priceRangeNum"       INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "privateRoomDetails"  TEXT,
  ADD COLUMN "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wifiDetails"         TEXT;

-- Migrate priceRange String → priceRangeNum Int
-- Mapping: '$'→1, '$$'→2, '$$$'→3, '$$$$'→4
UPDATE "restaurants" SET "priceRangeNum" = CASE
  WHEN "priceRange" = '$'    THEN 1
  WHEN "priceRange" = '$$'   THEN 2
  WHEN "priceRange" = '$$$'  THEN 3
  WHEN "priceRange" = '$$$$' THEN 4
  ELSE 2
END;

-- CreateTable: promotions
CREATE TABLE "promotions" (
    "id"              TEXT NOT NULL,
    "restaurantId"    TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "titleEn"         TEXT,
    "titlePl"         TEXT,
    "titleUk"         TEXT,
    "description"     TEXT NOT NULL,
    "descriptionEn"   TEXT,
    "descriptionPl"   TEXT,
    "descriptionUk"   TEXT,
    "imageUrl"        TEXT,
    "type"            "PromotionType" NOT NULL,
    "discountPercent" INTEGER,
    "discountAmount"  DOUBLE PRECISION,
    "startDate"       TIMESTAMP(3) NOT NULL,
    "endDate"         TIMESTAMP(3),
    "recurringDays"   INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "timeStart"       TEXT,
    "timeEnd"         TEXT,
    "status"          "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "isHighlighted"   BOOLEAN NOT NULL DEFAULT false,
    "conditions"      TEXT,
    "promoCode"       TEXT,
    "viewCount"       INTEGER NOT NULL DEFAULT 0,
    "clickCount"      INTEGER NOT NULL DEFAULT 0,
    "bookingCount"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: boosts
CREATE TABLE "boosts" (
    "id"              TEXT NOT NULL,
    "restaurantId"    TEXT NOT NULL,
    "level"           "BoostLevel" NOT NULL,
    "startDate"       TIMESTAMP(3) NOT NULL,
    "endDate"         TIMESTAMP(3) NOT NULL,
    "dailyRate"       DOUBLE PRECISION NOT NULL,
    "totalAmount"     DOUBLE PRECISION NOT NULL,
    "status"          "BoostStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentId" TEXT,
    "paidAt"          TIMESTAMP(3),
    "impressions"     INTEGER NOT NULL DEFAULT 0,
    "clicks"          INTEGER NOT NULL DEFAULT 0,
    "bookings"        INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boosts_pkey" PRIMARY KEY ("id")
);

-- Migrate RestaurantDeal → promotions (DISCOUNT type)
INSERT INTO "promotions" (
    "id", "restaurantId", "title", "description", "type",
    "discountAmount", "startDate", "endDate", "status", "promoCode",
    "createdAt", "updatedAt"
)
SELECT
    id,
    "restaurantId",
    title,
    COALESCE(description, title),
    'DISCOUNT'::"PromotionType",
    "discountValue",
    COALESCE("validFrom", NOW()),
    "validUntil",
    CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'PAUSED' END::"PromotionStatus",
    code,
    "createdAt",
    "updatedAt"
FROM "restaurant_deals"
ON CONFLICT DO NOTHING;

-- Migrate RestaurantEvent → promotions (EVENT type)
INSERT INTO "promotions" (
    "id", "restaurantId", "title", "description", "type",
    "imageUrl", "startDate", "status",
    "timeStart", "timeEnd",
    "createdAt", "updatedAt"
)
SELECT
    id,
    "restaurantId",
    title,
    COALESCE(description, title),
    'EVENT'::"PromotionType",
    "imageUrl",
    date,
    CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'PAUSED' END::"PromotionStatus",
    "startTime",
    "endTime",
    "createdAt",
    "updatedAt"
FROM "restaurant_events"
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "promotions_restaurantId_status_idx" ON "promotions"("restaurantId", "status");
CREATE INDEX "promotions_status_isHighlighted_idx" ON "promotions"("status", "isHighlighted");
CREATE INDEX "boosts_restaurantId_status_idx" ON "boosts"("restaurantId", "status");
CREATE INDEX "boosts_status_endDate_idx" ON "boosts"("status", "endDate");
CREATE INDEX "menu_items_categoryId_idx" ON "menu_items"("categoryId");
CREATE INDEX "menu_items_restaurantId_idx" ON "menu_items"("restaurantId");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "boosts" ADD CONSTRAINT "boosts_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
