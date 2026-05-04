# Task 7-a: Club API Routes

## Summary
Created all 7 API route files for the Coordinemos padel scheduling app's Club section.

## Files Created

### 1. `/src/app/api/club/courts/route.ts`
- **GET**: Returns all courts for the club (with slots count), ordered by name
- **POST**: Creates a court with `{ name }`, validates name is non-empty, trims whitespace

### 2. `/src/app/api/club/courts/[id]/route.ts`
- **PUT**: Updates court with `{ name? }`, verifies court belongs to club
- **DELETE**: Deletes court (only if belongs to the club), cascade handles related slots

### 3. `/src/app/api/club/tournaments/route.ts`
- **GET**: Returns all tournaments for the club including couples count, matches count, and tournamentPlayers with player info
- **POST**: Creates tournament with `{ name, startDate, endDate }`, validates dates (non-empty, parseable, end >= start)

### 4. `/src/app/api/club/tournaments/[id]/route.ts`
- **PUT**: Updates tournament with `{ name?, startDate?, endDate? }`, validates date logic
- **DELETE**: Deletes tournament (only if belongs to club), cascade handles related records

### 5. `/src/app/api/club/players/route.ts`
- **GET**: Returns all players for the club (with user info and tournament count)
- **POST**: Creates User (role PLAYER) + Player in a transaction with `{ firstName, lastName, phone?, username, password }`, checks username uniqueness

### 6. `/src/app/api/club/players/[id]/route.ts`
- **PUT**: Updates player with `{ firstName?, lastName?, phone? }`, verifies ownership
- **DELETE**: Deletes player and associated User (via User cascade), verifies ownership

### 7. `/src/app/api/club/tournament-players/route.ts`
- **POST**: Adds player to tournament with `{ tournamentId, playerId }`, verifies both belong to club, checks for duplicates (409)
- **DELETE**: Removes player from tournament with `{ tournamentId, playerId }` in request body, verifies both belong to club

## Auth Pattern
All routes follow the same auth pattern:
1. `getUserFromRequest(request)` — extracts Bearer token user
2. Check `role === 'CLUB'` — returns 403 if not
3. `db.club.findUnique({ where: { userId: clubUser.id } })` — gets the club
4. Returns 404 if club not found

## Route Params
Dynamic routes use `params: Promise<{ id: string }>` per Next.js 16 convention, with `const { id } = await params`.

## Verification
- Lint: Passed (no errors)
- Dev server: Running normally (no compilation errors)
