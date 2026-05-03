import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode('coordinemos-secret-key-2024')

// Types
export type UserRole = 'ADMIN' | 'CLUB' | 'PLAYER'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  mustChangePassword: boolean
}

// Hash a password using bcryptjs with 10 salt rounds
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify a password against a bcrypt hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Create a JWT token for an authenticated user
export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

// Verify a JWT token and return the user payload, or null on failure
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.id as string,
      username: payload.username as string,
      role: payload.role as UserRole,
      mustChangePassword: payload.mustChangePassword as boolean,
    }
  } catch {
    return null
  }
}

// Extract and verify a Bearer token from the Authorization header
export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}
