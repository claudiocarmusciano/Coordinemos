import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

async function seed() {
  console.log('🌱 Seeding database...')

  // ─── CLUB 1: Pádel Club Buenos Aires ───────────────
  const club1User = await db.user.create({
    data: {
      username: 'club_baires',
      password: await hashPassword('club123'),
      role: 'CLUB',
      mustChangePassword: true,
    },
  })

  const club1 = await db.club.create({
    data: {
      name: 'Pádel Club Buenos Aires',
      address: 'Av. Corrientes 1234, CABA',
      phone: '11-5555-1234',
      userId: club1User.id,
    },
  })

  // Courts for Club 1
  const court1 = await db.court.create({ data: { name: 'Cancha 1', clubId: club1.id } })
  const court2 = await db.court.create({ data: { name: 'Cancha 2', clubId: club1.id } })
  const court3 = await db.court.create({ data: { name: 'Cancha 3', clubId: club1.id } })

  // Players for Club 1
  const playerData = [
    { firstName: 'Martín', lastName: 'González', phone: '11-6001-0001', username: 'martin.g', password: 'player123' },
    { firstName: 'Lucas', lastName: 'Rodríguez', phone: '11-6001-0002', username: 'lucas.r', password: 'player123' },
    { firstName: 'Tomás', lastName: 'Fernández', phone: '11-6001-0003', username: 'tomas.f', password: 'player123' },
    { firstName: 'Facundo', lastName: 'López', phone: '11-6001-0004', username: 'facundo.l', password: 'player123' },
    { firstName: 'Nicolás', lastName: 'Martínez', phone: '11-6001-0005', username: 'nico.m', password: 'player123' },
    { firstName: 'Santiago', lastName: 'García', phone: '11-6001-0006', username: 'santi.g', password: 'player123' },
    { firstName: 'Matías', lastName: 'Pérez', phone: '11-6001-0007', username: 'matias.p', password: 'player123' },
    { firstName: 'Agustín', lastName: 'Díaz', phone: '11-6001-0008', username: 'agustin.d', password: 'player123' },
  ]

  const players: any[] = []
  for (const pd of playerData) {
    const u = await db.user.create({
      data: {
        username: pd.username,
        password: await hashPassword(pd.password),
        role: 'PLAYER',
        mustChangePassword: true,
      },
    })
    const p = await db.player.create({
      data: {
        firstName: pd.firstName,
        lastName: pd.lastName,
        phone: pd.phone,
        clubId: club1.id,
        userId: u.id,
      },
    })
    players.push(p)
  }

  // Tournaments for Club 1
  const t1 = await db.tournament.create({
    data: {
      name: 'Torneo Apertura 2025',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-06-30'),
      clubId: club1.id,
    },
  })

  const t2 = await db.tournament.create({
    data: {
      name: 'Copa Verano 2025',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-03-15'),
      clubId: club1.id,
    },
  })

  // Enroll all players in both tournaments
  for (const p of players) {
    await db.tournamentPlayer.create({ data: { tournamentId: t1.id, playerId: p.id } })
    await db.tournamentPlayer.create({ data: { tournamentId: t2.id, playerId: p.id } })
  }

  // Couples for Tournament 1
  const couple1t1 = await db.couple.create({ data: { tournamentId: t1.id, player1Id: players[0].id, player2Id: players[1].id } })
  const couple2t1 = await db.couple.create({ data: { tournamentId: t1.id, player1Id: players[2].id, player2Id: players[3].id } })
  const couple3t1 = await db.couple.create({ data: { tournamentId: t1.id, player1Id: players[4].id, player2Id: players[5].id } })
  const couple4t1 = await db.couple.create({ data: { tournamentId: t1.id, player1Id: players[6].id, player2Id: players[7].id } })

  // Couples for Tournament 2
  const couple1t2 = await db.couple.create({ data: { tournamentId: t2.id, player1Id: players[0].id, player2Id: players[2].id } })
  const couple2t2 = await db.couple.create({ data: { tournamentId: t2.id, player1Id: players[1].id, player2Id: players[3].id } })
  const couple3t2 = await db.couple.create({ data: { tournamentId: t2.id, player1Id: players[4].id, player2Id: players[6].id } })
  const couple4t2 = await db.couple.create({ data: { tournamentId: t2.id, player1Id: players[5].id, player2Id: players[7].id } })

  // Matches for Tournament 1
  const match1t1 = await db.match.create({ data: { tournamentId: t1.id, couple1Id: couple1t1.id, couple2Id: couple2t1.id } })
  const match2t1 = await db.match.create({ data: { tournamentId: t1.id, couple1Id: couple3t1.id, couple2Id: couple4t1.id } })

  // Matches for Tournament 2
  const match1t2 = await db.match.create({ data: { tournamentId: t2.id, couple1Id: couple1t2.id, couple2Id: couple2t2.id } })
  const match2t2 = await db.match.create({ data: { tournamentId: t2.id, couple1Id: couple3t2.id, couple2Id: couple4t2.id } })

  // Available slots for Club 1 (next 7 days)
  const today = new Date()
  const days = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }

  const timeSlots = [
    { start: '09:00', end: '10:30' },
    { start: '10:30', end: '12:00' },
    { start: '14:00', end: '15:30' },
    { start: '15:30', end: '17:00' },
    { start: '17:00', end: '18:30' },
    { start: '18:30', end: '20:00' },
    { start: '20:00', end: '21:30' },
    { start: '21:30', end: '23:00' },
  ]

  const courts = [court1, court2, court3]
  for (const day of days) {
    for (const time of timeSlots) {
      // Cancha 1 has all slots
      await db.slot.create({ data: { day, startTime: time.start, endTime: time.end, courtId: court1.id, clubId: club1.id, status: 'AVAILABLE' } })
      // Cancha 2 has afternoon/evening slots
      if (time.start >= '14:00') {
        await db.slot.create({ data: { day, startTime: time.start, endTime: time.end, courtId: court2.id, clubId: club1.id, status: 'AVAILABLE' } })
      }
      // Cancha 3 has evening slots only
      if (time.start >= '18:30') {
        await db.slot.create({ data: { day, startTime: time.start, endTime: time.end, courtId: court3.id, clubId: club1.id, status: 'AVAILABLE' } })
      }
    }
  }

  // ─── CLUB 2: Pádel Center Norte ────────────────────
  const club2User = await db.user.create({
    data: {
      username: 'club_norte',
      password: await hashPassword('club123'),
      role: 'CLUB',
      mustChangePassword: true,
    },
  })

  const club2 = await db.club.create({
    data: {
      name: 'Pádel Center Norte',
      address: 'Av. Cabildo 5678, Belgrano',
      phone: '11-5555-5678',
      userId: club2User.id,
    },
  })

  const court4 = await db.court.create({ data: { name: 'Cancha A', clubId: club2.id } })
  const court5 = await db.court.create({ data: { name: 'Cancha B', clubId: club2.id } })

  // Some players for Club 2
  const player2Data = [
    { firstName: 'Juan', lastName: 'Romero', phone: '11-6002-0001', username: 'juan.r', password: 'player123' },
    { firstName: 'Pedro', lastName: 'Silva', phone: '11-6002-0002', username: 'pedro.s', password: 'player123' },
    { firstName: 'Diego', lastName: 'Torres', phone: '11-6002-0003', username: 'diego.t', password: 'player123' },
    { firstName: 'Germán', lastName: 'Ruiz', phone: '11-6002-0004', username: 'german.r', password: 'player123' },
  ]

  const players2: any[] = []
  for (const pd of player2Data) {
    const u = await db.user.create({
      data: {
        username: pd.username,
        password: await hashPassword(pd.password),
        role: 'PLAYER',
        mustChangePassword: true,
      },
    })
    const p = await db.player.create({
      data: {
        firstName: pd.firstName,
        lastName: pd.lastName,
        phone: pd.phone,
        clubId: club2.id,
        userId: u.id,
      },
    })
    players2.push(p)
  }

  const t3 = await db.tournament.create({
    data: {
      name: 'Liga Invierno 2025',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-09-30'),
      clubId: club2.id,
    },
  })

  for (const p of players2) {
    await db.tournamentPlayer.create({ data: { tournamentId: t3.id, playerId: p.id } })
  }

  const couple1t3 = await db.couple.create({ data: { tournamentId: t3.id, player1Id: players2[0].id, player2Id: players2[1].id } })
  const couple2t3 = await db.couple.create({ data: { tournamentId: t3.id, player1Id: players2[2].id, player2Id: players2[3].id } })

  await db.match.create({ data: { tournamentId: t3.id, couple1Id: couple1t3.id, couple2Id: couple2t3.id } })

  // Slots for Club 2
  for (const day of days) {
    for (const time of timeSlots) {
      await db.slot.create({ data: { day, startTime: time.start, endTime: time.end, courtId: court4.id, clubId: club2.id, status: 'AVAILABLE' } })
      if (time.start >= '15:30') {
        await db.slot.create({ data: { day, startTime: time.start, endTime: time.end, courtId: court5.id, clubId: club2.id, status: 'AVAILABLE' } })
      }
    }
  }

  console.log('✅ Seed completed!')
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  USUARIOS Y CONTRASEÑAS DE EJEMPLO')
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('ADMIN:')
  console.log('  👤 admin / admin123')
  console.log('')
  console.log('CLUBES:')
  console.log('  🏢 club_baires / club123  (Pádel Club Buenos Aires)')
  console.log('  🏢 club_norte / club123   (Pádel Center Norte)')
  console.log('')
  console.log('JUGADORES Pádel Club BA:')
  console.log('  🎾 martin.g / player123   (Martín González)')
  console.log('  🎾 lucas.r / player123    (Lucas Rodríguez)')
  console.log('  🎾 tomas.f / player123    (Tomás Fernández)')
  console.log('  🎾 facundo.l / player123  (Facundo López)')
  console.log('  🎾 nico.m / player123     (Nicolás Martínez)')
  console.log('  🎾 santi.g / player123    (Santiago García)')
  console.log('  🎾 matias.p / player123   (Matías Pérez)')
  console.log('  🎾 agustin.d / player123  (Agustín Díaz)')
  console.log('')
  console.log('JUGADORES Pádel Center Norte:')
  console.log('  🎾 juan.r / player123     (Juan Romero)')
  console.log('  🎾 pedro.s / player123    (Pedro Silva)')
  console.log('  🎾 diego.t / player123    (Diego Torres)')
  console.log('  🎾 german.r / player123   (Germán Ruiz)')
  console.log('')
  console.log('═══════════════════════════════════════════')
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
