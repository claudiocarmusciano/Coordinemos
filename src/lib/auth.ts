import { SignJWT, jwtVerify } from 'jose'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'

const secret = process.env.JWT_SECRET
if (!secret) throw new Error('JWT_SECRET env variable is not set')
const JWT_SECRET = new TextEncoder().encode(secret)

export type UserRole = 'ADMIN' | 'CLUB' | 'PLAYER'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  mustChangePassword: boolean
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Bcrypt hashes (new format)
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(password, storedHash)
  }

  // Legacy SHA-256 format (salt:hash) — kept for backward compatibility with existing accounts
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const computedHash = createHash('sha256').update(salt + password).digest('hex')
  return computedHash === hash
}

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

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}
