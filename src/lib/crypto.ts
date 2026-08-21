import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>

/**
 * Password hashing with scrypt from Node's standard library.
 *
 * scrypt is memory-hard and ships with the runtime, so there is no native
 * addon to build and nothing to keep patched (§171). Parameters follow the
 * OWASP minimum for scrypt (N=2^16, r=8, p=1 via Node's defaults for keylen).
 */
const SCRYPT_KEYLEN = 64
const SALT_BYTES = 16

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN)
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false
  const salt = Buffer.from(saltB64, 'base64url')
  const expected = Buffer.from(hashB64, 'base64url')
  const derived = await scrypt(password, salt, expected.length)
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

/** Opaque, high-entropy token for sessions, invitations and password resets. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** Tokens are stored hashed so a database leak does not hand over sessions. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** HMAC used by the local storage provider to sign download URLs (§73). */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  return constantTimeEquals(signPayload(payload, secret), signature)
}
