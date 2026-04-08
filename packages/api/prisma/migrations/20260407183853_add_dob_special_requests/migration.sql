-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "allergies" TEXT[],
ADD COLUMN     "seatingPreference" TEXT,
ADD COLUMN     "specialRequests" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dateOfBirth" TIMESTAMP(3);
