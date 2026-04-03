/**
 * E2E Smoke Test — Stolik API
 * Run: npm run test:smoke (from packages/api)
 * Targets production API unless SMOKE_API_URL env var is set.
 */

import assert from 'node:assert/strict'

const BASE = process.env.SMOKE_API_URL || 'https://stolik-production.up.railway.app'
const TIMEOUT_MS = 10_000

let passed = 0
let failed = 0

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; data: any }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = text }
    return { status: res.status, data }
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error(`Timeout after ${TIMEOUT_MS}ms — is the API reachable at ${BASE}?`)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

function step(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      console.log(`  ✓  ${name}`)
      passed++
    })
    .catch((err: Error) => {
      console.error(`  ✗  ${name}`)
      console.error(`       ${err.message}`)
      failed++
    })
}

// ─── State shared across steps ────────────────────────────────────────────────

const testEmail = `smoke+${Date.now()}@stolik-test.dev`
const testPassword = 'smoketest123'
let accessToken = ''
let refreshToken = ''
let restaurantId = ''
let bookingId = ''

// ─── Test suite ───────────────────────────────────────────────────────────────

console.log(`\nStolik API Smoke Test`)
console.log(`Target: ${BASE}\n`)

async function run() {

  // 1. Register
  await step('POST /auth/register → 201 + tokens', async () => {
    const { status, data } = await req('POST', '/api/auth/register', {
      firstName: 'Smoke',
      lastName:  'Test',
      email:     testEmail,
      password:  testPassword,
    })
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`)
    assert.ok(data.token || data.accessToken, 'No token in response')
    accessToken  = data.accessToken || data.token
    refreshToken = data.refreshToken || ''
  })

  // Small delay to avoid rate limiting
  await new Promise(r => setTimeout(r, 300))

  // 2. Login
  await step('POST /auth/login → 200 + tokens', async () => {
    const { status, data } = await req('POST', '/api/auth/login', {
      email: testEmail, password: testPassword,
    })
    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`)
    assert.ok(data.token || data.accessToken, 'No token in response')
    accessToken  = data.accessToken || data.token
    refreshToken = data.refreshToken || refreshToken
  })

  // 3. Refresh token (only if we got a refresh token)
  if (refreshToken) {
    await step('POST /auth/refresh → 200 + new tokens', async () => {
      const { status, data } = await req('POST', '/api/auth/refresh', { refreshToken })
      assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`)
      assert.ok(data.accessToken || data.token, 'No accessToken in refresh response')
      accessToken  = data.accessToken || data.token
      refreshToken = data.refreshToken || refreshToken
    })
  } else {
    console.log('  -  POST /auth/refresh skipped (no refresh token issued)')
  }

  await new Promise(r => setTimeout(r, 300))

  // 4. GET restaurants
  await step('GET /restaurants → 200 + array', async () => {
    const { status, data } = await req('GET', '/api/restaurants', undefined, accessToken)
    assert.equal(status, 200, `Expected 200, got ${status}`)
    assert.ok(Array.isArray(data), 'Expected array of restaurants')
    if (data.length > 0) restaurantId = data[0].id
  })

  // 5. GET restaurant details (requires a restaurantId from step 4)
  if (restaurantId) {
    await step(`GET /restaurants/:id → 200`, async () => {
      const { status, data } = await req('GET', `/api/restaurants/${restaurantId}`)
      assert.equal(status, 200, `Expected 200, got ${status}`)
      assert.ok(data.id, 'No id in restaurant response')
    })

    await new Promise(r => setTimeout(r, 300))

    // 6. GET available slots
    const today = new Date().toISOString().slice(0, 10)
    await step('GET /bookings/slots → 200', async () => {
      const { status, data } = await req('GET', `/api/bookings/slots?restaurantId=${restaurantId}&date=${today}`)
      assert.equal(status, 200, `Expected 200, got ${status}`)
      assert.ok(Array.isArray(data.slots), 'Expected slots array')
    })

    await new Promise(r => setTimeout(r, 300))

    // 7. Create booking
    await step('POST /bookings → 201', async () => {
      const { status, data } = await req('POST', '/api/bookings', {
        restaurantId,
        date:       today,
        time:       '19:00',
        guestCount: 2,
        guestName:  'Smoke Test',
        guestPhone: '+48500000000',
        source:     'app',
      }, accessToken)
      assert.ok(status === 200 || status === 201, `Expected 200/201, got ${status}: ${JSON.stringify(data)}`)
      assert.ok(data.booking?.id || data.id, 'No booking id in response')
      bookingId = data.booking?.id || data.id
    })

    await new Promise(r => setTimeout(r, 300))

    // 8. GET bookings (booking visible in list)
    if (bookingId) {
      await step('GET /bookings/today/:restaurantId → booking in list', async () => {
        const { status, data } = await req('GET', `/api/bookings/today/${restaurantId}`, undefined, accessToken)
        assert.equal(status, 200, `Expected 200, got ${status}`)
        assert.ok(Array.isArray(data), 'Expected array')
        const found = data.find((b: any) => b.id === bookingId)
        assert.ok(found, `Booking ${bookingId} not found in list`)
      })

      await new Promise(r => setTimeout(r, 300))

      // 9. Update booking status
      await step('PATCH /bookings/:id/status → confirmed', async () => {
        const { status, data } = await req('PATCH', `/api/bookings/${bookingId}/status`, { status: 'confirmed' }, accessToken)
        assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`)
        assert.equal(data.status, 'confirmed', 'Status not updated')
      })
    }
  } else {
    console.log('  -  Steps 5-9 skipped (no restaurants in DB)')
  }

  await new Promise(r => setTimeout(r, 300))

  // 10. Delete test account
  await step('DELETE /auth/account → 200', async () => {
    const { status } = await req('DELETE', '/api/auth/account', undefined, accessToken)
    assert.equal(status, 200, `Expected 200, got ${status}`)
  })

  // ─── Phase 2 additional checks ────────────────────────────────────────────

  await new Promise(r => setTimeout(r, 300))

  // Re-register to test Phase 2 endpoints (account was deleted above)
  let p2Token = ''
  await step('POST /auth/register (phase2 user) → 201', async () => {
    const { status, data } = await req('POST', '/api/auth/register', {
      firstName: 'Smoke2',
      lastName:  'Test2',
      email:     `smoke2+${Date.now()}@stolik-test.dev`,
      password:  testPassword,
    })
    assert.ok(status === 200 || status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`)
    p2Token = data.accessToken || data.token
  })

  await new Promise(r => setTimeout(r, 300))

  // 11. Forgot password
  await step('POST /auth/forgot-password → 200', async () => {
    const { status } = await req('POST', '/api/auth/forgot-password', {
      email: 'nonexistent@stolik-test.dev',
    })
    assert.equal(status, 200, `Expected 200, got ${status}`)
  })

  await new Promise(r => setTimeout(r, 300))

  // 12. Admin stats (skip if no admin token — just check endpoint exists)
  await step('GET /admin/stats → 200 or 401', async () => {
    const { status } = await req('GET', '/api/admin/stats', undefined, p2Token)
    assert.ok(status === 200 || status === 403, `Expected 200 or 403, got ${status}`)
  })

  // 13. Admin users
  await step('GET /admin/users → 200 or 403', async () => {
    const { status, data } = await req('GET', '/api/admin/users', undefined, p2Token)
    assert.ok(status === 200 || status === 403, `Expected 200 or 403, got ${status}`)
    if (status === 200) assert.ok(Array.isArray(data) || Array.isArray(data?.users), 'Expected users array')
  })

  await new Promise(r => setTimeout(r, 300))

  // 14. Restaurant menu (requires restaurantId from earlier)
  if (restaurantId) {
    await step('GET /menu/:restaurantId → 200', async () => {
      const { status, data } = await req('GET', `/api/menu/${restaurantId}`)
      assert.equal(status, 200, `Expected 200, got ${status}`)
      assert.ok(Array.isArray(data), 'Expected menu array')
    })

    await new Promise(r => setTimeout(r, 300))

    // 15. Restaurant reviews
    await step('GET /restaurants/:id/reviews → 200', async () => {
      const { status, data } = await req('GET', `/api/restaurants/${restaurantId}/reviews`)
      assert.ok(status === 200 || status === 404, `Expected 200 or 404, got ${status}`)
      if (status === 200) assert.ok(data.rating !== undefined || data.reviews !== undefined, 'Expected reviews data')
    })
  } else {
    console.log('  -  Steps 14-15 skipped (no restaurants in DB)')
  }

  await new Promise(r => setTimeout(r, 300))

  // 16. Google Places search (returns empty array if no key)
  await step('GET /restaurants/search-google → 200', async () => {
    const { status, data } = await req('GET', '/api/restaurants/search-google?query=pizza+warszawa')
    assert.equal(status, 200, `Expected 200, got ${status}`)
    assert.ok(Array.isArray(data?.places), 'Expected places array')
  })

  await new Promise(r => setTimeout(r, 300))

  // 17. Push token registration
  await step('POST /push/register-token → 200', async () => {
    const { status } = await req('POST', '/api/push/register-token', {
      expoPushToken: 'ExponentPushToken[smoke-test-token]',
    }, p2Token)
    assert.ok(status === 200 || status === 201, `Expected 200/201, got ${status}`)
  })

  // Cleanup phase2 account
  if (p2Token) {
    await req('DELETE', '/api/auth/account', undefined, p2Token).catch(() => {})
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run().catch(err => {
  console.error('\nUnhandled error:', err.message)
  process.exit(1)
})
