# Task 7-b: Club API Routes for Coordinemos

## Summary
Created 7 API route files for the Club role in the Coordinemos padel scheduling app.

## Files Created

### 1. `/src/app/api/club/couples/route.ts`
- **GET**: Returns all couples for a given tournamentId, includes player1 and player2 details and match counts
- **POST**: Creates a couple with validations:
  - Both players belong to the club
  - Both players are registered in the tournament (TournamentPlayer exists)
  - Neither player is already in another couple in this tournament
  - player1Id !== player2Id
  - Specific error messages for each validation failure

### 2. `/src/app/api/club/couples/[id]/route.ts`
- **DELETE**: Deletes a couple only if it belongs to a tournament of this club and is not part of any match

### 3. `/src/app/api/club/matches/route.ts`
- **GET**: Returns all matches for a tournamentId with couple details (including player info), matchAssignment with slot info, and slotPreferences
- **POST**: Creates a match with validations:
  - Both couples belong to the tournament
  - couple1Id !== couple2Id
  - The two couples don't share any players

### 4. `/src/app/api/club/matches/[id]/route.ts`
- **DELETE**: Deletes a match (only if belonging to a tournament of this club). Deletes related SlotPreferences and MatchAssignment in a transaction.

### 5. `/src/app/api/club/slots/route.ts`
- **GET**: Returns all slots for the club with court info, optional status filter, and matchAssignment details
- **POST**: Creates a slot with validations:
  - The court belongs to the club
  - No overlapping slot exists for the same court on the same day (startTime < existing.endTime AND endTime > existing.startTime)

### 6. `/src/app/api/club/slots/[id]/route.ts`
- **PUT**: Updates slot status with special CANCELLED handling:
  - If CANCELLED with existing MatchAssignment: deletes assignment, sets slot to AVAILABLE, creates notifications for all 4 players and the club user
- **DELETE**: Deletes a slot only if it belongs to the club and status is AVAILABLE

### 7. `/src/app/api/club/dashboard/route.ts`
- **GET**: Returns dashboard data:
  - Total tournaments, players, courts, available slots count
  - Per-tournament: name, totalCouples, totalMatches, matchesWithConfirmedSlots, matchesPending
  - Recent match assignments (last 10) with match and slot details

## Patterns Used
- Consistent auth check pattern: `getUserFromRequest` → role check → club lookup
- `NextResponse.json()` for all responses
- `params: Promise<{ id: string }>` for dynamic route params (Next.js 16)
- Transaction usage for multi-step operations (match delete, slot cancellation)
- Spanish notification messages for slot cancellations
- Proper error handling with specific status codes (400, 403, 404, 409, 500)

## Lint Status
✅ All files pass ESLint checks cleanly.
