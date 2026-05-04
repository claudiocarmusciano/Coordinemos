import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomBytes } from 'crypto'

const JWT_SECRET = new TextEncoder().encode('coordinemos-secret-key-2024')

// Types
export type UserRole = 'ADMIN' | 'CLUB' | 'PLAYER'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  mustChangePassword: boolean
}

// Hash a password using SHA-256 with a salt (lighter than bcrypt for sandbox environments)
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(salt + password).digest('hex')
  return `${salt}:${hash}`
}

// Verify a password against a SHA-256 salt:hash
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Support both old bcrypt format and new SHA-256 format
  if (storedHash.startsWith('$2')) {
    // Old bcrypt hash - can't verify in this lightweight mode
    // For migration: the user will need to reset their password
    return false
  }
  
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  
  const computedHash = createHash('sha256').update(salt + password).digest('hex')
  return computedHash === hash
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
