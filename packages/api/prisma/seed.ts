import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Clean up ──────────────────────────────────────────────────────────────
  await prisma.booking.deleteMany()
  await prisma.table.deleteMany()
  await prisma.restaurant.deleteMany()
  await prisma.user.deleteMany()

  // ─── Owner ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('test123', 10)

  const owner = await prisma.user.create({
    data: {
      email:        'test@stolik.pl',
      passwordHash,
      firstName:    'Marek',
      lastName:     'Kowalski',
      role:         'owner',
      isVerified:   true,
    },
  })

  console.log(`✅ User: ${owner.email}`)

  // ─── Restaurants ───────────────────────────────────────────────────────────
  const rozana = await prisma.restaurant.create({
    data: {
      name:        'Różana',
      slug:        'rozana-mokotow',
      description: 'Romantyczna włoska restauracja z ogródkiem w sercu Mokotowa.',
      cuisine:     'italian',
      district:    'Mokotów',
      city:        'Warszawa',
      address:     'ul. Puławska 12, Warszawa',
      phone:       '+48 22 123 45 67',
      email:       'rozana@stolik.pl',
      priceRange:  '$$$',
      emoji:       '🌹',
      isPremium:   true,
      rating:      4.7,
      reviewCount: 84,
      openMonday:    null,
      openTuesday:   '12:00-23:00',
      openWednesday: '12:00-23:00',
      openThursday:  '12:00-23:00',
      openFriday:    '12:00-00:00',
      openSaturday:  '12:00-00:00',
      openSunday:    '13:00-22:00',
      slotDuration:  90,
      ownerId:       owner.id,
    },
  })

  const sowa = await prisma.restaurant.create({
    data: {
      name:        'Sowa',
      slug:        'sowa-srodmiescie',
      description: 'Nowoczesna kuchnia polska w samym centrum Warszawy.',
      cuisine:     'polish',
      district:    'Śródmieście',
      city:        'Warszawa',
      address:     'ul. Nowy Świat 22, Warszawa',
      phone:       '+48 22 987 65 43',
      email:       'sowa@stolik.pl',
      priceRange:  '$$',
      emoji:       '🦉',
      isPremium:   false,
      rating:      4.3,
      reviewCount: 52,
      openMonday:    '11:00-22:00',
      openTuesday:   '11:00-22:00',
      openWednesday: '11:00-22:00',
      openThursday:  '11:00-23:00',
      openFriday:    '11:00-23:00',
      openSaturday:  '12:00-23:00',
      openSunday:    '12:00-21:00',
      slotDuration:  90,
      ownerId:       owner.id,
    },
  })

  console.log(`✅ Restaurants: ${rozana.name}, ${sowa.name}`)

  // ─── Tables — Różana ───────────────────────────────────────────────────────
  const rozanaTables = await Promise.all([
    prisma.table.create({ data: { name: 'A1', capacity: 2, minCapacity: 1, shape: 'round',     posX: 10, posY: 10, restaurantId: rozana.id } }),
    prisma.table.create({ data: { name: 'A2', capacity: 4, minCapacity: 2, shape: 'square',    posX: 10, posY: 30, restaurantId: rozana.id } }),
    prisma.table.create({ data: { name: 'A3', capacity: 6, minCapacity: 2, shape: 'rectangle', posX: 10, posY: 55, restaurantId: rozana.id } }),
    prisma.table.create({ data: { name: 'T1', capacity: 4, minCapacity: 2, shape: 'round',     posX: 60, posY: 20, restaurantId: rozana.id } }),
  ])

  // ─── Tables — Sowa ─────────────────────────────────────────────────────────
  const sowaTables = await Promise.all([
    prisma.table.create({ data: { name: 'Stół 1', capacity: 2, minCapacity: 1, shape: 'round',     posX: 15, posY: 15, restaurantId: sowa.id } }),
    prisma.table.create({ data: { name: 'Stół 2', capacity: 4, minCapacity: 2, shape: 'square',    posX: 15, posY: 40, restaurantId: sowa.id } }),
    prisma.table.create({ data: { name: 'Stół 3', capacity: 8, minCapacity: 4, shape: 'rectangle', posX: 50, posY: 15, restaurantId: sowa.id } }),
  ])

  console.log(`✅ Tables: ${rozanaTables.length} for Różana, ${sowaTables.length} for Sowa`)

  // ─── Bookings — today ──────────────────────────────────────────────────────
  const today = new Date()
  const date = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const d = new Date(today)
    d.setHours(h, m, 0, 0)
    return d
  }

  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        bookingRef:  '#ST1001',
        status:      'confirmed',
        date:        date('19:00'),
        time:        '19:00',
        guestCount:  2,
        guestName:   'Anna Nowak',
        guestPhone:  '+48 600 111 222',
        guestEmail:  'anna@example.com',
        source:      'app',
        restaurantId: rozana.id,
        tableId:      rozanaTables[0].id,
      },
    }),
    prisma.booking.create({
      data: {
        bookingRef:  '#ST1002',
        status:      'confirmed',
        date:        date('20:30'),
        time:        '20:30',
        guestCount:  4,
        guestName:   'Piotr Wiśniewski',
        guestPhone:  '+48 601 333 444',
        notes:       'Urodziny — prosić o tort',
        source:      'widget',
        restaurantId: rozana.id,
        tableId:      rozanaTables[1].id,
      },
    }),
    prisma.booking.create({
      data: {
        bookingRef:  '#ST1003',
        status:      'pending',
        date:        date('18:00'),
        time:        '18:00',
        guestCount:  3,
        guestName:   'Katarzyna Maj',
        guestPhone:  '+48 602 555 666',
        source:      'instagram',
        restaurantId: sowa.id,
        tableId:      sowaTables[1].id,
      },
    }),
  ])

  console.log(`✅ Bookings: ${bookings.length} for today`)
  console.log('')
  console.log('─────────────────────────────────────────')
  console.log('  Login:    test@stolik.pl')
  console.log('  Password: test123')
  console.log('─────────────────────────────────────────')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
