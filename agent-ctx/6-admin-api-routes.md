# Task 6 - Admin API Routes

## Summary
Created all three Admin API route files for the Coordinemos padel scheduling app.

## Files Created

### 1. `/home/z/my-project/src/app/api/admin/clubs/route.ts`
- **GET**: Returns all clubs with user info and counts (courts, players, tournaments) using `_count` via Prisma include
- **POST**: Creates a new User (role: CLUB) + Club in a transaction, hashes password, checks for duplicate usernames, returns 201

### 2. `/home/z/my-project/src/app/api/admin/clubs/[id]/route.ts`
- **PUT**: Updates club fields (name, address, phone) — partial update, only provided fields are updated
- **DELETE**: Deletes a club by ID (cascade handles related records per schema design)
- Uses `params: Promise<{ id: string }>` type for Next.js 16 async params

### 3. `/home/z/my-project/src/app/api/admin/init/route.ts`
- **POST**: Seeds initial admin user (username: "admin", password: "admin123", role: "ADMIN", mustChangePassword: true)
- Returns `{ created: boolean, message: string }` — `created: false` if admin already exists

## Key Design Decisions
- All routes verify ADMIN role via `getUserFromRequest` before proceeding
- Consistent error handling with try/catch, proper HTTP status codes (400, 403, 404, 409, 500)
- Username uniqueness check before club creation (409 Conflict)
- Transaction used for User+Club creation to ensure atomicity
- Follows existing code style from `/api/auth/login/route.ts`
- Lint passes with zero errors
