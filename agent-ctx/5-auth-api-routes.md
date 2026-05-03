# Task 5 - Auth API Routes

## Summary
Created three authentication API route files for the Coordinemos padel scheduling app.

## Files Created

### 1. `/src/app/api/auth/login/route.ts`
- **POST** handler for user login
- Validates `username` and `password` from request body
- Looks up user in `db.user` by username
- Verifies password using `verifyPassword` from `@/lib/auth`
- Creates JWT token using `createToken`
- Returns `{ token, user: { id, username, role, mustChangePassword } }`
- Returns 400 if fields missing, 401 if credentials invalid, 500 on server error

### 2. `/src/app/api/auth/me/route.ts`
- **GET** handler to fetch current authenticated user info
- Extracts user from `Authorization: Bearer <token>` header via `getUserFromRequest`
- Returns 401 if no valid token
- For CLUB role: queries `db.club` by `userId` and includes `clubId`
- For PLAYER role: queries `db.player` by `userId` and includes `playerId` and `clubId`
- Returns full user info object

### 3. `/src/app/api/auth/change-password/route.ts`
- **POST** handler for password change
- Requires authentication (Bearer token)
- Validates `currentPassword` and `newPassword` from request body
- Verifies current password against stored hash
- Hashes new password with `hashPassword`
- Updates user record: sets new password hash and `mustChangePassword = false`
- Creates a new JWT token (with `mustChangePassword = false`)
- Returns `{ token, user }` with updated info

## Dependencies Used
- `@/lib/auth`: `hashPassword`, `verifyPassword`, `createToken`, `getUserFromRequest`, `AuthUser` type
- `@/lib/db`: Prisma client for database queries
- `next/server`: `NextResponse` for API responses

## Lint Status
All files pass ESLint with zero errors.
