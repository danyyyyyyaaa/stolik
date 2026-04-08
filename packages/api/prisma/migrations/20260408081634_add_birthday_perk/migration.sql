-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "isBirthdayBooking" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "birthdayPerkDescription" TEXT,
ADD COLUMN     "birthdayPerkEnabled" BOOLEAN NOT NULL DEFAULT false;
