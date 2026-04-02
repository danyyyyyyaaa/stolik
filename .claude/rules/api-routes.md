# Rules for packages/api/routes/**/*.ts

## Every route file MUST:
1. Import and use Zod schema for input validation
2. Use authMiddleware on protected routes
3. Return errors as `{error: string}` with correct HTTP codes
4. Use try/catch with next(error) for unhandled errors
5. Use prisma.$transaction() for multi-table writes

## HTTP codes:
- 200: success (GET, PATCH, DELETE)
- 201: created (POST)
- 400: validation error
- 401: not authenticated
- 403: not authorized (wrong role/ownership)
- 404: not found
- 409: conflict (duplicate)
- 429: rate limited

## Socket.io events — emit after DB write:
- POST /bookings → io.to(`restaurant:${restaurantId}`).emit('booking:new', data)
- PATCH /bookings/:id → io.to(...).emit('booking:updated', data)
- DELETE /bookings/:id → io.to(...).emit('booking:cancelled', data)
