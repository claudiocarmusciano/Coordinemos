# Task 8: Player API Routes for Coordinemos

## Summary
Created 4 Player API route files for the padel scheduling app, implementing tournaments, preferences (with critical slot matching logic), notifications, and available slots endpoints.

## Files Created

### 1. `/src/app/api/player/tournaments/route.ts`
- **GET**: Returns all tournaments the player is enrolled in (via TournamentPlayer)
- For each tournament includes:
  - Tournament details (name, startDate, endDate)
  - Club info (id, name)
  - Player's matches in the tournament (where player is in couple1 or couple2)
  - For each match: couple1/couple2 with both players, matchAssignment if exists, player's slotPreferences
  - Available slots for the club (status = 'AVAILABLE')

### 2. `/src/app/api/player/preferences/route.ts`
- **POST**: Set player's slot preferences for a match (replaces all existing)
- Critical validations:
  - (a) Player must be part of the match (couple1 or couple2)
  - (b) Match must NOT have a confirmed MatchAssignment
  - (c) Cross-tournament blocking: checks if player has conflicting preferences in different tournaments of the same club
  - (d) Each slot day+startTime+endTime must correspond to at least one AVAILABLE slot in the club
- **checkAndConfirmMatch()**: Inline helper function that:
  - Groups slot preferences by day|startTime|endTime
  - Finds slots where ALL 4 players agree
  - Creates MatchAssignment + updates slot status to CONFIRMED in a transaction
  - Sends notifications to all 4 players and the club
  - Only confirms one slot per match (breaks after first match)

### 3. `/src/app/api/player/notifications/route.ts`
- **GET**: Returns all unread notifications for the player's user
- Marks notifications as read after returning them
- Returns: id, message, type, createdAt, read, relatedId

### 4. `/src/app/player/slots/route.ts`
- **GET**: Returns available slots for the player's club (status = 'AVAILABLE'), grouped by day
- Optional `tournamentId` query param to filter slots within a tournament's date range
- Grouped result format: `{ slotsByDay: [{ day, slots: [{ id, startTime, endTime, courtId, court }] }] }`

## Auth Pattern Used
All routes follow the same auth pattern:
```typescript
const authUser = await getUserFromRequest(request)
if (!authUser || authUser.role !== 'PLAYER') return 403
const player = await db.player.findUnique({ where: { userId: authUser.id } })
if (!player) return 404
```

## Lint Status
✅ All files pass ESLint with zero errors.
