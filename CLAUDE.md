# Coordinemos — Cheat Sheet

## Stack
- **Framework:** Next.js 16 App Router + TypeScript | Deploy: Railway | DNS: Cloudflare
- **DB:** Prisma + SQLite (Railway volume `/data/db.sqlite`; local `file:./dev.db`)
- **Auth:** JWT 7d via `jose` + `bcryptjs` | Roles: `ADMIN | CLUB | PLAYER`
- **UI:** Tailwind CSS v4 + shadcn/ui + Framer Motion + Zustand (estado global)
- **Email:** Nodemailer + Brevo SMTP (solo recuperación de contraseña de jugadores)

## Arquitectura no obvia
- **SPA de una sola ruta:** No hay páginas separadas. Todo el routing es por Zustand (`useViewStore` con `currentView`). La única ruta real es `/`.
- **Turbopack obligatorio:** Next.js 16 no acepta `--no-turbopack`. Si cuelga, usar: `node --max-old-space-size=4096 node_modules/.bin/next dev -p 3000`
- **Confirmación automática de turno:** La lógica central está en `POST /api/player/preferences` → llama a `checkAndConfirmMatch()`. Cuando los 4 jugadores de un partido eligen al menos 1 turno en común, el sistema confirma automáticamente y notifica a todos.
- **Username de PLAYER = DNI del jugador** (número sin puntos ni guiones).
- **Contraseñas legacy:** `verifyPassword()` soporta dos formatos: bcrypt (`$2b$...`) y SHA-256 antiguo (`salt:hash`). No tocar esa lógica.
- **Slots pasados se limpian solos:** `GET /api/club/slots` borra automáticamente los slots `AVAILABLE` con fecha anterior a hoy.
- **`reactStrictMode: false`** en `next.config.ts` (evita doble ejecución de efectos en desarrollo).

## Convenciones
- **Colores:** NUNCA hardcodear. Usar variables CSS: `--primary` (#9BFF00), `--background` (#050505), `--foreground` (#FFFFFF), etc. Solo excepción: `rgba(155,255,0,...)` en sombras Tailwind arbitrarias.
- **Fechas en DB:** `YYYY-MM-DD` como string (no DateTime). Horas: `HH:mm` como string.
- **API responses:** Errores siempre `{ message: string }`. Éxito: datos directos o envueltos en la entidad (`{ slot }`, `{ tournament }`, etc.).
- **Status de Slot:** `AVAILABLE | CONFIRMED | CANCELLED`
- **Status de Membership:** `PENDING | CONFIRMED | REJECTED`
- **Archivos de vistas del Club** están divididos en 3 partes: `ClubViewsPart1/2/3.tsx` + `ClubSchedule.tsx`.

## Dev local
```bash
# Variables mínimas en .env
DATABASE_URL=file:./dev.db
JWT_SECRET=secreto-local-cualquiera

# Arrancar (npm run dev puede colgar — usar este comando)
node --max-old-space-size=4096 node_modules/.bin/next dev -p 3000

# Sincronizar schema después de cambios en prisma/schema.prisma
npx prisma db push --accept-data-loss

# Crear primer admin local
curl -X POST http://localhost:3000/api/admin/init
# → usuario: admin / contraseña: admin123
```

## Producción (Railway)
- **URLs:** `https://coordinemos.com.ar` · `https://www.coordinemos.com.ar` · `https://coordinemos-production.up.railway.app`
- **Proyecto Railway:** `charismatic-gentleness` → servicio `Coordinemos`
- **DB en contenedor:** `/data/db.sqlite` | Working dir: `/app`
- **Credenciales demo:** CLUB → `uno` / `Club123` | PLAYER → `11111111` / `Player123`
- **SSH para emergencias:** `railway ssh` (módulos en `/app/node_modules/`)
