-- CreateIndex
CREATE INDEX "bookings_restaurantId_date_idx" ON "bookings"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "bookings_restaurantId_status_idx" ON "bookings"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_date_idx" ON "bookings"("date");

-- CreateIndex
CREATE INDEX "restaurants_ownerId_idx" ON "restaurants"("ownerId");

-- CreateIndex
CREATE INDEX "restaurants_status_idx" ON "restaurants"("status");

-- CreateIndex
CREATE INDEX "restaurants_isActive_idx" ON "restaurants"("isActive");
