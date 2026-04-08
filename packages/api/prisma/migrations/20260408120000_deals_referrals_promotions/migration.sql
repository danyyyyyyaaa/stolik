-- Add referralCode and referredById to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");

-- Referral table
CREATE TABLE IF NOT EXISTS "referrals" (
  "id"          TEXT NOT NULL,
  "referrerId"  TEXT NOT NULL,
  "referredId"  TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referrerId_referredId_key" ON "referrals"("referrerId","referredId");
CREATE INDEX IF NOT EXISTS "referrals_referredId_idx" ON "referrals"("referredId");

-- Restaurant deals table
CREATE TABLE IF NOT EXISTS "restaurant_deals" (
  "id"            TEXT NOT NULL,
  "restaurantId"  TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "discountType"  TEXT NOT NULL DEFAULT 'percent',
  "discountValue" DOUBLE PRECISION,
  "code"          TEXT,
  "validFrom"     TIMESTAMP(3),
  "validUntil"    TIMESTAMP(3),
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "maxUses"       INTEGER,
  "usedCount"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_deals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "restaurant_deals_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "restaurant_deals_restaurantId_idx" ON "restaurant_deals"("restaurantId");

-- Restaurant promotions table
CREATE TABLE IF NOT EXISTS "restaurant_promotions" (
  "id"            TEXT NOT NULL,
  "restaurantId"  TEXT NOT NULL,
  "isActive"      BOOLEAN NOT NULL DEFAULT false,
  "startsAt"      TIMESTAMP(3),
  "endsAt"        TIMESTAMP(3),
  "budget"        DOUBLE PRECISION,
  "impressions"   INTEGER NOT NULL DEFAULT 0,
  "clicks"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_promotions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "restaurant_promotions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_promotions_restaurantId_key" ON "restaurant_promotions"("restaurantId");
