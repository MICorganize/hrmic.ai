import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/** Hash a plaintext password (bcrypt — matches the production database format). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Verify a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (!stored.startsWith("$2a$") && !stored.startsWith("$2b$") && !stored.startsWith("$2y$")) {
    return false;
  }
  return bcrypt.compare(password, stored);
}
