-- AlterTable: add shortCode to bookings
ALTER TABLE "bookings" ADD COLUMN "shortCode" TEXT;
CREATE UNIQUE INDEX "bookings_shortCode_key" ON "bookings"("shortCode");

-- AlterTable: add newEmail to email_verifications
ALTER TABLE "email_verifications" ADD COLUMN "newEmail" TEXT;

-- CreateTable: phone_verifications
CREATE TABLE "phone_verifications" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newPhone" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "phone_verifications_userId_idx" ON "phone_verifications"("userId");
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: waitlist
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guestEmail" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "waitlist_restaurantId_date_timeSlot_idx" ON "waitlist"("restaurantId", "date", "timeSlot");
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
