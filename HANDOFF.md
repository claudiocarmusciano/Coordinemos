# SYNC — Proyecto "Coordinemos" (gestión de turnos/torneos de pádel)

> Documento de handoff entre sesiones de chat. Leer completo antes de continuar.

## 1. OBJETIVO
App web multi-tenant para clubes de pádel: ADMIN gestiona clubes; cada CLUB gestiona
canchas, turnos, torneos y jugadores; los PLAYERS reservan turnos y coordinan partidos.
Modelo de negocio futuro: cobrar comisión por reserva.

## 2. STACK (NO es Vite/Vercel/CORS — ignorar eso)
- Next.js 16 App Router + TypeScript (monolito: front + API en el mismo server).
  Única ruta real: "/", el routing es por Zustand (useViewStore.currentView).
- Prisma + SQLite. Local: `file:./db/custom.db` · Prod: `file:/data/db.sqlite` (volumen Railway).
- Auth: JWT (jose, HS256) + bcryptjs. Roles: ADMIN|CLUB|PLAYER. username de PLAYER = DNI.
- Deploy: Railway (proyecto "charismatic-gentleness", ID 515f3adc-...). Push a `main` → rebuild.
  El arranque corre `prisma db push --accept-data-loss` (scripts/railway-start.sh) → el schema
  se aplica solo a prod. NO hay migraciones formales.
- Email: Brevo (MAIL_TOKEN). URLs: coordinemos.com.ar (Cloudflare) y coordinemos-production.up.railway.app.
- Vars en Railway (NO en repo): DATABASE_URL, JWT_SECRET, MAIL_TOKEN. `.env` ya NO se trackea (queda local).

## 3. ESTADO ACTUAL — PROD OK (home 200)
Deployado y funcionando (últimos commits en `main`):
- `3fdac32` privacidad: el PLAYER ve turnos ocupados solo como "Reservado" (sin nombre); el CLUB sí ve el nombre.
- `9ffc642` seguridad: `.env` sacado del repo (era público con JWT_SECRET).
- `c3e4e7d` fix: quitado `@unique` de User.email (prod tenía emails vacíos duplicados; login/register/resend usan findFirst).
- `f6e7de0` features: reservas EVENTUALES (club walk-in / player autoservicio), reservas FIJAS semanales
  (RecurringBooking + materialización idempotente 8 semanas, con prioridad+notificación sobre eventuales
  y partidos confirmados), auto-registro de jugadores con verificación de email (+ flujo "reclamar cuenta"),
  precio opcional en turnos (prep. comisión).

Seguridad cerrada: JWT_SECRET rotado en Railway (el secreto viejo ya da 401).

Credenciales test locales: `admin`/`admin123` · CLUB `loadtest_club_01..10`/`ClubTest123!` · PLAYER (DNI `9XXXXXXX`)/`PlayerTest123!`.
Demo prod (CLAUDE.md): CLUB `uno`/`Club123` · PLAYER `11111111`/`Player123`.

## 4. PRÓXIMO PASO INMEDIATO
**(a) BACKFILL PENDIENTE** (lo corre el USUARIO por SSH; el asistente está bloqueado para shell a prod):
```bash
railway ssh
cd /app && node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.updateMany({data:{emailVerified:true}}).then(r=>{console.log('verificados:',r.count);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"
exit
```
Motivo: los players creados antes del deploy quedaron `emailVerified=false` y no pueden auto-reservar.

**(b) FEATURE HECHA (sin commit todavía)**: coordinación de torneos cuando NO hay match común.
Implementado y verificado end-to-end (API + UI) el 2026-07-14:
- `src/app/api/player/preferences/route.ts`: `checkAndConfirmMatch` ahora devuelve `boolean`; si no
  confirma, se llama `notifyIfNoCommonSlot()` → cuando los 4 cargaron ≥1 turno y no coinciden, notifica
  a los 4 (tipo `NO_COMMON_SLOT`), deduplicando por notificación no leída del mismo match (no spammea al
  re-guardar). Al confirmarse el partido, esas notificaciones se marcan leídas.
- `src/app/api/player/tournaments/route.ts`: cada match ahora expone `teamPreferences` (los 4 jugadores
  con sus turnos + flag `isMe`), además de `mySlotPreferences`.
- `src/components/player/PlayerViews.tsx` (`PlayerMatches`): panel "Disponibilidad del equipo" con los
  turnos de cada jugador, y contador "N/3 compañeros" por turno (verde cuando los otros 3 ya pueden).

## GOTCHAS
- Next 16 usa Turbopack; si `npm run dev` cuelga: `node --max-old-space-size=4096 node_modules/.bin/next dev -p 3000`.
- Fechas en DB = strings 'YYYY-MM-DD'; horas 'HH:mm'. Slot.status: AVAILABLE|CONFIRMED|RESERVED|CANCELLED.
- Materialización de reservas fijas corre en GET /api/club/slots (write-on-read, igual que la limpieza de pasados).
- `db/custom.db` NO se commitea (tiene hashes). eslint es estricto con `set-state-in-effect` (evitar setState síncrono en useEffect).
- Verificación sin browser: se prueba por API con curl/node contra localhost:3000 o prod.
