# Task 3-a: Auth Library & Dark Theme CSS

## Summary
Created two files for the Coordinemos padel scheduling app:

### File 1: `/home/z/my-project/src/lib/auth.ts`
- JWT authentication library using `jose` and `bcryptjs`
- Exports: `UserRole` type, `AuthUser` interface
- Functions:
  - `hashPassword(password)` — bcryptjs with 10 salt rounds
  - `verifyPassword(password, hash)` — bcryptjs compare
  - `createToken(user)` — JWT signed with HS256, 7d expiry
  - `verifyToken(token)` — JWT verification, returns null on failure
  - `getUserFromRequest(request)` — extracts Bearer token from Authorization header

### File 2: `/home/z/my-project/src/app/globals.css`
- Complete dark theme for Coordinemos
- Color palette: #121212 background, #1E1E1E cards, #FF7835 orange accent, #FFFFFF text, #A0A0A0 secondary text, #181818 input bg, #2A2A2A borders
- Inter font family
- Custom scrollbar styling
- Tailwind CSS 4 + shadcn/ui variable system

## Verification
- ESLint passes with no errors
- Dev server compiles and runs successfully
