# Coordinemos — Documentación Técnica Completa

> Plataforma SaaS de gestión de turnos y torneos de pádel. Multi-tenant: un admin supervisa N clubes, cada club gestiona sus jugadores y torneos.

---

## Tabla de contenido

1. [Resumen del proyecto](#1-resumen-del-proyecto)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [URLs y dominios](#3-urls-y-dominios)
4. [Infraestructura y despliegue](#4-infraestructura-y-despliegue)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Base de datos](#6-base-de-datos)
7. [Autenticación y autorización](#7-autenticación-y-autorización)
8. [Roles y vistas](#8-roles-y-vistas)
9. [API REST — Referencia completa](#9-api-rest--referencia-completa)
10. [Flujos principales de negocio](#10-flujos-principales-de-negocio)
11. [Sistema de notificaciones](#11-sistema-de-notificaciones)
12. [Sistema de email](#12-sistema-de-email)
13. [Estructura de archivos](#13-estructura-de-archivos)
14. [Desarrollo local](#14-desarrollo-local)

---

## 1. Resumen del proyecto

**Coordinemos** es una aplicación web (PWA-ready) para clubes de pádel que resuelve la coordinación de turnos de cancha entre jugadores de torneo.

**Problema que resuelve:** En un torneo de pádel americano, los 4 jugadores de un partido deben acordar una fecha y hora para jugar. Actualmente esto se hace por WhatsApp o teléfono, con mucha fricción. Coordinemos automatiza ese proceso: el club publica sus turnos disponibles, los jugadores eligen sus preferencias, y el sistema confirma automáticamente cuando los 4 coinciden.

**Modelo de negocio (multi-tenant):**
- Un ADMIN global crea y gestiona cuentas de club.
- Cada CLUB tiene su propio usuario, canchas, torneos y jugadores.
- Los jugadores (PLAYER) se registran a través del club y acceden con su DNI.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework frontend/backend | Next.js (App Router) | 16.x |
| Lenguaje | TypeScript | 5.x |
| ORM | Prisma | 6.x |
| Base de datos | SQLite | — |
| Autenticación | JWT (jose) + bcryptjs | — |
| UI Components | shadcn/ui + Radix UI | — |
| Estilos | Tailwind CSS v4 | — |
| Animaciones | Framer Motion | 12.x |
| Estado global | Zustand | 5.x |
| Íconos | Lucide React | 0.5x |
| Toast/alertas | Sonner | 2.x |
| Email | Nodemailer | 7.x |
| Bundler | Turbopack (integrado en Next 16) | — |
| Deploy | Railway | — |
| DNS | Cloudflare | — |

---

## 3. URLs y dominios

| URL | Estado |
|---|---|
| `https://coordinemos.com.ar` | **Producción** (dominio principal) |
| `https://www.coordinemos.com.ar` | **Producción** (alias www) |
| `https://coordinemos-production.up.railway.app` | URL interna de Railway (siempre activa) |

**DNS:** Cloudflare (nameservers `jack.ns.cloudflare.com` / `natasha.ns.cloudflare.com`)
**Registrador:** NIC Argentina (gratuito, dominio `.com.ar`)

---

## 4. Infraestructura y despliegue

### Railway

- **Proyecto:** `charismatic-gentleness`
- **Servicio:** `Coordinemos`
- **Runtime:** Node.js (imagen standalone de Next.js, `output: "standalone"` en `next.config.ts`)
- **Base de datos:** SQLite montada en volumen persistente de Railway en `/data/db.sqlite`
- **Working directory en contenedor:** `/app`

### Build y despliegue

Railway detecta automáticamente Next.js y hace `npm run build` en cada push a la rama principal. El proceso:

1. `prisma generate` (genera el cliente Prisma)
2. `next build` → produce carpeta `.next/standalone`
3. El servidor arranca con `node server.js`

### Inicialización del admin

Al primer deploy (o cuando no existe ningún usuario ADMIN en la DB), se llama manualmente:

```
POST https://coordinemos.com.ar/api/admin/init
```

Crea el usuario `admin` / `admin123` con `mustChangePassword: true`.

---

## 5. Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | Path del SQLite. En Railway: `file:/data/db.sqlite` | Sí |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT (HS256) | Sí |
| `EMAIL_HOST` | Servidor SMTP (ej: `smtp-relay.brevo.com`) | Para email |
| `EMAIL_PORT` | Puerto SMTP (ej: `587`) | Para email |
| `EMAIL_USER` | Usuario SMTP | Para email |
| `EMAIL_PASS` | Contraseña SMTP | Para email |
| `EMAIL_FROM` | Dirección remitente (ej: `no-reply@coordinemos.com.ar`) | Para email |

---

## 6. Base de datos

**Motor:** SQLite  
**ORM:** Prisma  
**Schema:** `prisma/schema.prisma`

### Diagrama de entidades

```
User (1) ──── (1) Club ──── (N) Court
                │               │
                │               └── (N) Slot ──── (0-1) MatchAssignment
                │
                ├── (N) Tournament ──── (N) Couple ──── (N) Match ──── (N) SlotPreference
                │         │                                  │
                │         └── (N) TournamentPlayer           └── (0-1) MatchAssignment
                │
                ├── (N) ClubMembership
                │
User (1) ──── (1) Player ──── (N) ClubMembership
                │              ├── (N) TournamentPlayer
                │              ├── (N) Couple (como player1)
                │              ├── (N) Couple (como player2)
                │              └── (N) SlotPreference
                │
User (1) ──── (N) Notification
```

### Modelos

#### `User`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `username` | String unique | Login. Para PLAYER = DNI, para CLUB = nombre elegido |
| `password` | String | Hash bcrypt (o SHA-256 legacy `salt:hash`) |
| `role` | String | `ADMIN` \| `CLUB` \| `PLAYER` |
| `mustChangePassword` | Boolean | Fuerza cambio de contraseña en primer login |
| `email` | String? | Solo para PLAYERs (recuperación de contraseña) |
| `createdAt` | DateTime | — |
| `updatedAt` | DateTime | — |

#### `Club`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | Nombre del club |
| `address` | String | Dirección (puede estar vacía) |
| `phone` | String | Teléfono (puede estar vacío) |
| `userId` | String unique | FK → User (relación 1:1) |

#### `ScheduleBand`
Franjas horarias que definen el horario habitual del club por día de semana.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `clubId` | String | FK → Club |
| `dayOfWeek` | Int | 0=Domingo, 1=Lunes, …, 6=Sábado |
| `startTime` | String | `HH:mm` — primer turno empieza aquí |
| `endTime` | String | `HH:mm` — último turno empieza antes de este horario |
| `slotDuration` | Int | Duración en minutos (ej: 90) |

**Unique:** `(clubId, dayOfWeek, startTime)`

#### `Court`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `name` | String | Nombre de la cancha (ej: "Cancha 1") |
| `clubId` | String | FK → Club |

#### `Tournament`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `name` | String | Nombre del torneo |
| `startDate` | DateTime | Fecha de inicio |
| `endDate` | DateTime | Fecha de fin |
| `clubId` | String | FK → Club |

#### `Player`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `firstName` | String | Nombre |
| `lastName` | String | Apellido |
| `phone` | String | Teléfono (puede estar vacío) |
| `userId` | String unique | FK → User (relación 1:1) |

#### `ClubMembership`
Relación entre jugador y club (solicitud de membresía).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `clubId` | String | FK → Club |
| `playerId` | String | FK → Player |
| `status` | String | `PENDING` \| `CONFIRMED` \| `REJECTED` |
| `createdAt` | DateTime | — |

**Unique:** `(clubId, playerId)`

#### `TournamentPlayer`
Inscripción de un jugador en un torneo (tabla intermedia N:N).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `tournamentId` | String | FK → Tournament |
| `playerId` | String | FK → Player |

**Unique:** `(tournamentId, playerId)`

#### `Couple`
Pareja de jugadores dentro de un torneo.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `tournamentId` | String | FK → Tournament |
| `player1Id` | String | FK → Player |
| `player2Id` | String | FK → Player |

**Unique:** `(tournamentId, player1Id, player2Id)`

#### `Match`
Partido entre dos parejas en un torneo.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `tournamentId` | String | FK → Tournament |
| `couple1Id` | String | FK → Couple |
| `couple2Id` | String | FK → Couple |

#### `Slot`
Turno de cancha disponible publicado por el club.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `day` | String | Fecha en formato `YYYY-MM-DD` |
| `startTime` | String | Hora inicio `HH:mm` |
| `endTime` | String | Hora fin `HH:mm` |
| `courtId` | String | FK → Court |
| `clubId` | String | FK → Club |
| `status` | String | `AVAILABLE` \| `CONFIRMED` \| `CANCELLED` |

#### `SlotPreference`
Preferencia de turno declarada por un jugador para un partido.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `matchId` | String | FK → Match |
| `playerId` | String | FK → Player |
| `day` | String | Fecha `YYYY-MM-DD` |
| `startTime` | String | Hora inicio `HH:mm` |
| `endTime` | String | Hora fin `HH:mm` |

**Unique:** `(matchId, playerId, day, startTime, endTime)`

#### `MatchAssignment`
Turno confirmado para un partido (cuando los 4 jugadores coinciden).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `matchId` | String unique | FK → Match |
| `slotId` | String unique | FK → Slot |
| `confirmedAt` | DateTime | Fecha de confirmación automática |
| `cancelledAt` | DateTime? | Si fue cancelado posteriorrmente |

#### `Notification`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String | PK |
| `userId` | String | FK → User (destinatario) |
| `message` | String | Texto de la notificación |
| `type` | String | `SLOT_CONFIRMED` \| `SLOT_CANCELLED` \| `INFO` |
| `read` | Boolean | Leída o no |
| `relatedId` | String? | matchId o slotId relacionado |
| `createdAt` | DateTime | — |

---

## 7. Autenticación y autorización

### Tokens JWT

- Algoritmo: **HS256** via librería `jose`
- Expiración: **7 días**
- Payload: `{ id, username, role, mustChangePassword }`
- Se incluye en cada request como header: `Authorization: Bearer <token>`

### Contraseñas

- **Nuevo formato:** bcrypt con salt rounds = 12 (`$2b$...`)
- **Formato legacy (backward compat):** SHA-256 con salt propio: `salt:sha256(salt+password)`
- La función `verifyPassword` detecta el formato automáticamente por el prefijo `$2`.

### Flujo de login

1. `POST /api/auth/login` con `{ username, password }`
2. El backend verifica la contraseña, genera token JWT
3. El frontend guarda el token en `localStorage`
4. Cada request autenticado incluye el token en el header `Authorization`

### Recuperación de contraseña (solo PLAYERs)

1. Player ingresa su DNI en el formulario "¿Olvidaste tu contraseña?"
2. `POST /api/auth/forgot-password` con `{ dni }`
3. Si el usuario existe y tiene email, se genera una contraseña temporal aleatoria, se hashea y se actualiza en DB con `mustChangePassword: true`
4. Se envía el email con la contraseña temporal (no bloqueante: si el SMTP falla, el request igual responde OK)
5. El player entra con la contraseña temporal y es forzado a cambiarla

### Cambio de contraseña obligatorio

Al hacer login con `mustChangePassword: true`, el `AppShell` renderiza solo la pantalla de cambio de contraseña (sin navbar ni acceso a ninguna otra vista) hasta que el usuario cambie su contraseña.

---

## 8. Roles y vistas

### ADMIN

Accede al panel de administración global.

| Vista | Ruta lógica | Descripción |
|---|---|---|
| Dashboard | `admin-dashboard` | Resumen general |
| Clubes | `admin-clubs` | Lista de clubes, crear/editar/eliminar club y su usuario |

**Qué puede hacer el ADMIN:**
- Ver todos los clubes registrados
- Crear nuevos clubes (genera usuario CLUB automáticamente con contraseña temporal)
- Editar datos del club (nombre, dirección, teléfono)
- Eliminar un club (cascade: elimina usuario, canchas, torneos, etc.)

### CLUB

Gestiona su club deportivo completo.

| Vista | Ruta lógica | Descripción |
|---|---|---|
| Dashboard | `club-dashboard` | Stats: canchas, jugadores, torneos, partidos |
| Canchas | `club-courts` | CRUD de canchas del club |
| Torneos | `club-tournaments` | CRUD de torneos; inscripción de jugadores |
| Jugadores | `club-players` | CRUD de jugadores; buscar por DNI |
| Parejas | `club-couples` | Armar parejas dentro de un torneo |
| Partidos | `club-matches` | Crear partidos entre parejas; ver asignaciones |
| Turnos | `club-slots` | Publicar y gestionar turnos de cancha |
| Horario | `club-schedule` | Definir franjas horarias por día de semana |
| Notificaciones | `club-notifications` | Ver notificaciones del club |

### PLAYER

Vista simplificada para el jugador.

| Vista | Ruta lógica | Descripción |
|---|---|---|
| Mis Clubes | `player-memberships` | Ver y solicitar membresía a clubes |
| Mis Torneos | `player-tournaments` | Ver torneos inscriptos, partidos y elegir horarios |
| Mis Partidos | `player-matches` | Vista rápida de partidos y su estado |
| Notificaciones | `player-notifications` | Notificaciones personales |

---

## 9. API REST — Referencia completa

Todas las rutas usan `Content-Type: application/json`.  
Las rutas protegidas requieren `Authorization: Bearer <token>`.

### Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | No | Login con `{ username, password }` |
| `GET` | `/api/auth/me` | Sí | Devuelve datos del usuario autenticado |
| `POST` | `/api/auth/forgot-password` | No | Recuperar contraseña por DNI → envía email |
| `POST` | `/api/auth/change-password` | Sí | Cambiar contraseña `{ currentPassword, newPassword }` |

### Admin

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/admin/init` | No* | Bootstrap del primer admin |
| `GET` | `/api/admin/clubs` | ADMIN | Lista todos los clubes |
| `POST` | `/api/admin/clubs` | ADMIN | Crea un club (y su usuario CLUB) |
| `PUT` | `/api/admin/clubs/[id]` | ADMIN | Edita datos del club |
| `DELETE` | `/api/admin/clubs/[id]` | ADMIN | Elimina club y en cascada todo lo relacionado |

> *`/api/admin/init`: Si ya existe un ADMIN en la DB, requiere auth ADMIN para ejecutarse.

### Club — Canchas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/courts` | CLUB | Lista canchas del club |
| `POST` | `/api/club/courts` | CLUB | Crea cancha `{ name }` |
| `PUT` | `/api/club/courts/[id]` | CLUB | Edita nombre de cancha |
| `DELETE` | `/api/club/courts/[id]` | CLUB | Elimina cancha |

### Club — Torneos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/tournaments` | CLUB | Lista torneos (con contadores de parejas y partidos) |
| `POST` | `/api/club/tournaments` | CLUB | Crea torneo `{ name, startDate, endDate }` |
| `PUT` | `/api/club/tournaments/[id]` | CLUB | Edita torneo |
| `DELETE` | `/api/club/tournaments/[id]` | CLUB | Elimina torneo y en cascada |

### Club — Jugadores

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/players` | CLUB | Lista jugadores del club (con membresía CONFIRMED) |
| `POST` | `/api/club/players` | CLUB | Crea jugador `{ firstName, lastName, phone, dni, email }` — genera User con role PLAYER |
| `PUT` | `/api/club/players/[id]` | CLUB | Edita datos del jugador |
| `DELETE` | `/api/club/players/[id]` | CLUB | Elimina jugador |
| `GET` | `/api/club/players/lookup` | CLUB | Busca jugador por DNI (para solicitudes de membresía) |
| `GET` | `/api/club/available-players` | CLUB | Jugadores del club aún no inscriptos en un torneo dado |

### Club — Membresías (desde el lado del club)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| (gestionadas vía `/api/club/players`) | — | — | El club crea directamente el jugador con membresía CONFIRMED |

### Club — Parejas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/couples` | CLUB | Lista parejas `?tournamentId=X` |
| `POST` | `/api/club/couples` | CLUB | Crea pareja `{ tournamentId, player1Id, player2Id }` |
| `DELETE` | `/api/club/couples/[id]` | CLUB | Elimina pareja |

### Club — Partidos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/matches` | CLUB | Lista partidos `?tournamentId=X` (con asignación si existe) |
| `POST` | `/api/club/matches` | CLUB | Crea partido `{ tournamentId, couple1Id, couple2Id }` |
| `DELETE` | `/api/club/matches/[id]` | CLUB | Elimina partido y sus preferencias/asignación |

### Club — Turnos (Slots)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/slots` | CLUB | Lista turnos futuros (AVAILABLE + CONFIRMED). Limpia automáticamente los AVAILABLE pasados |
| `POST` | `/api/club/slots` | CLUB | Crea turno individual `{ day, startTime, endTime, courtId }`. Valida superposición |
| `PUT` | `/api/club/slots/[id]` | CLUB | Edita turno |
| `DELETE` | `/api/club/slots/[id]` | CLUB | Elimina turno |
| `POST` | `/api/club/slots/bulk` | CLUB | Genera turnos masivos para una fecha usando el horario configurado `{ date: "YYYY-MM-DD" }` |
| `GET` | `/api/club/schedule/preview` | CLUB | Vista previa de los turnos que se generarían para una fecha |

### Club — Horario

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/schedule` | CLUB | Lista franjas horarias del club ordenadas por día |
| `POST` | `/api/club/schedule` | CLUB | Crea franja `{ dayOfWeek, startTime, endTime, slotDuration }` |
| `PUT` | `/api/club/schedule/[id]` | CLUB | Edita franja |
| `DELETE` | `/api/club/schedule/[id]` | CLUB | Elimina franja |

### Club — Inscripciones a torneos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/tournament-players` | CLUB | Lista inscripciones `?tournamentId=X` |
| `POST` | `/api/club/tournament-players` | CLUB | Inscribe jugador `{ tournamentId, playerId }` |
| `DELETE` | `/api/club/tournament-players` | CLUB | Desinscribe `{ tournamentId, playerId }` |

### Club — Notificaciones

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/club/notifications` | CLUB | Lista últimas 50 notificaciones |
| `GET` | `/api/club/notifications?count=true` | CLUB | Solo devuelve `{ count: N }` (no leídas) |
| `PUT` | `/api/club/notifications` | CLUB | Marcar como leídas: `{ markAllRead: true }` o `{ notificationIds: [...] }` |

### Player — Membresías

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/player/memberships` | PLAYER | Lista membresías del jugador (con datos del club) |
| `POST` | `/api/player/memberships` | PLAYER | Solicita membresía a un club `{ clubId }` → estado PENDING |
| `DELETE` | `/api/player/memberships/[id]` | PLAYER | Cancela membresía |

### Player — Torneos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/player/tournaments` | PLAYER | Torneos inscriptos, con los partidos del jugador, asignaciones y turnos disponibles del club |

### Player — Preferencias de turno

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/player/preferences` | PLAYER | Guarda preferencias de turno para un partido. **Reemplaza todas las anteriores** del jugador en ese partido. Dispara la lógica de confirmación automática. Body: `{ matchId, slots: [{ day, startTime, endTime }] }` |

### Player — Turnos disponibles

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/player/slots` | PLAYER | Turnos AVAILABLE del club, agrupados por día. Param opcional: `?tournamentId=X` para filtrar por rango de fechas del torneo |

### Player — Notificaciones

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/player/notifications` | PLAYER | Lista últimas 50 notificaciones del jugador |
| `GET` | `/api/player/notifications?count=true` | PLAYER | Solo devuelve `{ count: N }` (no leídas) |
| `PUT` | `/api/player/notifications` | PLAYER | Marcar como leídas: `{ markAllRead: true }` o `{ notificationIds: [...] }` |

### Ruta raíz

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api` | No | Health check. Devuelve `{ status: "ok" }` |

---

## 10. Flujos principales de negocio

### Flujo completo de un torneo

```
ADMIN crea Club
    └─> CLUB inicia sesión (cambia contraseña)
         ├─> Configura Horario (ScheduleBands por día)
         ├─> Crea Canchas
         ├─> Crea Torneo (nombre, fechas)
         ├─> Crea Jugadores (DNI = username, genera contraseña temporal)
         │       └─> Jugador inicia sesión y cambia contraseña
         ├─> Inscribe Jugadores al Torneo (TournamentPlayer)
         ├─> Arma Parejas (Couple: jugador1 + jugador2)
         ├─> Crea Partidos (Match: pareja1 vs pareja2)
         └─> Publica Turnos (Slots) para las fechas del torneo
                 ├─> Manual: slot individual
                 └─> Masivo: "Generar turnos para fecha" (usa ScheduleBands)

JUGADOR (x4 en cada partido):
    └─> Ve sus partidos en "Mis Torneos"
         └─> Para cada partido, selecciona uno o más turnos disponibles
              └─> Sistema llama a checkAndConfirmMatch()
                   └─> Si los 4 jugadores tienen al menos 1 turno en común:
                        ├─> Crea MatchAssignment (party → slot)
                        ├─> Slot pasa a status CONFIRMED
                        └─> Se crean Notifications para los 4 jugadores + el club
```

### Lógica de confirmación automática (`checkAndConfirmMatch`)

Se ejecuta en cada `POST /api/player/preferences`. El algoritmo:

1. Carga el partido con los 4 jugadores y todas sus preferencias.
2. Si ya tiene un `MatchAssignment` activo (sin `cancelledAt`), no hace nada.
3. Agrupa preferencias por clave `"day|startTime|endTime"`.
4. Busca alguna clave donde **los 4 IDs de jugadores requeridos** estén presentes.
5. Si encuentra coincidencia, busca un `Slot` con estado `AVAILABLE` para esa fecha/hora en el club del torneo.
6. Verifica que ninguno de los 4 jugadores ya tenga un `MatchAssignment` activo en otro partido a la misma hora (anti double-booking).
7. Si todo está bien, en una transacción:
   - Crea `MatchAssignment`
   - Actualiza `Slot.status = CONFIRMED`
8. Crea notificaciones para los 4 jugadores y el club.

### Alta de jugador por el club

El club ingresa `{ firstName, lastName, phone, dni, email? }`:
1. Se crea un `User` con `username = dni`, contraseña temporal, `role = PLAYER`, `mustChangePassword = true`.
2. Se crea un `Player` vinculado al `User`.
3. Se crea una `ClubMembership` con `status = CONFIRMED`.

Si el jugador ya existe (mismo DNI), se reutiliza y solo se crea la membresía.

### Generación masiva de turnos (Bulk Slots)

`POST /api/club/slots/bulk` con `{ date: "YYYY-MM-DD" }`:
1. Determina el día de semana de la fecha.
2. Busca todas las `ScheduleBand` del club para ese día.
3. Genera los intervalos de tiempo según `startTime`, `endTime`, `slotDuration`.
4. Para cada cancha × cada intervalo: crea el `Slot` si no existe ya uno con ese `startTime` en esa cancha+día. Si ya existe, cuenta como `skipped`.
5. Devuelve `{ created, skipped }`.

---

## 11. Sistema de notificaciones

### Modelo

Las notificaciones son registros en la tabla `Notification` ligados al `userId` del destinatario.

**Tipos:** `SLOT_CONFIRMED` | `SLOT_CANCELLED` | `INFO`

### Cuándo se generan

- **`SLOT_CONFIRMED`:** Cuando `checkAndConfirmMatch` confirma un partido → 5 notificaciones (4 jugadores + 1 club)
- **`SLOT_CANCELLED`:** Actualmente no generado automáticamente (previsto para futuro)
- **`INFO`:** Uso manual o futuras integraciones

### Polling en el frontend

`AppShell.tsx` hace polling cada **30 segundos** a:
- `/api/club/notifications?count=true` (si rol = CLUB)
- `/api/player/notifications?count=true` (si rol = PLAYER)

El contador se muestra como badge en el ícono de campana y en el ítem de nav "Notificaciones".

Además, re-consulta inmediatamente al navegar fuera de la vista de notificaciones (para reflejar que se leyeron).

### Sonido in-app

Cuando el contador de no leídas **sube** (nuevo desde el último poll), se reproduce un chime de dos tonos vía **Web Audio API** (880 Hz → 1100 Hz, ~0.5s, volumen 25%). No requiere ningún archivo de audio externo. Solo funciona si el usuario ya interactuó con la página (política anti-autoplay de browsers).

---

## 12. Sistema de email

Usado exclusivamente para recuperación de contraseña de jugadores.

**Librería:** Nodemailer  
**SMTP configurado:** Brevo (smtp-relay.brevo.com:587)

### Función de envío

`src/lib/email.ts` exporta:
- `sendEmail({ to, subject, html })` — envía el email
- `generateTempPassword()` — genera contraseña temporal de 8 caracteres alfanuméricos
- `buildPasswordResetEmail(firstName, tempPassword)` — construye el template HTML con logo y botón

El envío es **no bloqueante**: si falla, el request al usuario igual responde con éxito (se loguea el error en consola).

El template incluye el logo de Coordinemos (fondo verde `#9BFF00`, letra C oscura) y está diseñado en HTML inline para máxima compatibilidad con clientes de email.

---

## 13. Estructura de archivos

```
CoordinemosGLM5/
├── prisma/
│   └── schema.prisma              # Schema de la base de datos
├── public/
│   └── logo.svg                   # Favicon (C verde sobre fondo neon green)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Layout raíz: fuente Inter, Toaster, metadata
│   │   ├── page.tsx               # Punto de entrada: LoadingScreen → LoginPage → AppShell
│   │   ├── globals.css            # Paleta de colores (CSS variables), scrollbar custom
│   │   └── api/
│   │       ├── route.ts           # GET /api — health check
│   │       ├── admin/
│   │       │   ├── init/route.ts
│   │       │   └── clubs/
│   │       │       ├── route.ts
│   │       │       └── [id]/route.ts
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── me/route.ts
│   │       │   ├── forgot-password/route.ts
│   │       │   └── change-password/route.ts
│   │       ├── club/
│   │       │   ├── dashboard/route.ts
│   │       │   ├── courts/[route.ts, [id]/route.ts]
│   │       │   ├── tournaments/[route.ts, [id]/route.ts]
│   │       │   ├── players/[route.ts, [id]/route.ts, lookup/route.ts]
│   │       │   ├── available-players/route.ts
│   │       │   ├── couples/[route.ts, [id]/route.ts]
│   │       │   ├── matches/[route.ts, [id]/route.ts]
│   │       │   ├── tournament-players/route.ts
│   │       │   ├── slots/[route.ts, [id]/route.ts, bulk/route.ts]
│   │       │   ├── schedule/[route.ts, [id]/route.ts, preview/route.ts]
│   │       │   └── notifications/route.ts
│   │       └── player/
│   │           ├── memberships/[route.ts, [id]/route.ts]
│   │           ├── tournaments/route.ts
│   │           ├── preferences/route.ts   # ← lógica de confirmación automática aquí
│   │           ├── slots/route.ts
│   │           └── notifications/route.ts
│   ├── components/
│   │   ├── shared/
│   │   │   ├── AppShell.tsx       # Layout principal: nav, sidebar, polling notificaciones, sonido
│   │   │   ├── LoginPage.tsx      # Pantalla de login + recuperar contraseña
│   │   │   └── ChangePasswordPage.tsx
│   │   ├── admin/
│   │   │   └── AdminViews.tsx     # Vistas del panel admin
│   │   ├── club/
│   │   │   ├── ClubViewsPart1.tsx # Dashboard + Canchas + Torneos
│   │   │   ├── ClubViewsPart2.tsx # Jugadores + Parejas + Partidos
│   │   │   ├── ClubViewsPart3.tsx # Turnos + Notificaciones
│   │   │   └── ClubSchedule.tsx   # Configuración de horario
│   │   ├── player/
│   │   │   └── PlayerViews.tsx    # Mis Clubes + Mis Torneos + Mis Partidos + Notificaciones
│   │   └── ui/                    # shadcn/ui components (accordion, button, card, dialog, etc.)
│   ├── lib/
│   │   ├── auth.ts                # JWT (jose), bcrypt, verifyPassword, getUserFromRequest
│   │   ├── db.ts                  # Singleton Prisma Client
│   │   ├── email.ts               # Nodemailer, templates HTML
│   │   └── scheduleUtils.ts       # generateTimesFromBands (lógica de franjas → intervalos)
│   └── store/
│       └── auth.ts                # Zustand stores: useAuthStore, useViewStore, useNotificationStore + apiFetch helper
├── next.config.ts                 # output: standalone, ignoreBuildErrors: true, reactStrictMode: false
├── DOCUMENTACION.md               # Este archivo
└── package.json
```

---

## 14. Desarrollo local

### Requisitos

- Node.js (recomendado v22 LTS; la app fue desarrollada con v26)
- npm

### Setup inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Crear .env.local con las variables
DATABASE_URL=file:./dev.db
JWT_SECRET=cualquier-string-secreto-largo

# 3. Crear la base de datos local y aplicar el schema
npx prisma db push

# 4. Correr el servidor de desarrollo
node --max-old-space-size=4096 node_modules/.bin/next dev -p 3000
```

> **Nota:** `npm run dev` puede colgar en Next.js 16 + Turbopack + Node v26 si no se aumenta la memoria. Usar el comando directo con `--max-old-space-size=4096`.

### Crear el primer admin local

```bash
curl -X POST http://localhost:3000/api/admin/init
```

Credenciales: `admin` / `admin123` (forzará cambio de contraseña en primer login).

### Sincronizar schema después de cambios en Prisma

```bash
npx prisma db push --accept-data-loss
```

> `--accept-data-loss` es necesario si se agregaron columnas que Prisma no puede migrar automáticamente en SQLite.

### Credenciales de producción (Railway)

| Rol | Usuario | Contraseña |
|---|---|---|
| ADMIN | `admin` | (cambiada en producción) |
| CLUB demo | `uno` | `Club123` |
| PLAYER demo | `11111111` | `Player123` |

Para resetear contraseñas en producción via Railway SSH:

```bash
railway ssh
# Dentro del contenedor:
node -e "
const {PrismaClient} = require('/app/node_modules/@prisma/client');
const bcrypt = require('/app/node_modules/bcryptjs');
const db = new PrismaClient();
bcrypt.hash('NuevaPass123', 12).then(h => db.user.update({ where: { username: 'usuario' }, data: { password: h, mustChangePassword: false } })).then(console.log);
"
```
