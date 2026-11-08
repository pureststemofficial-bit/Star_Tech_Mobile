import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt) as (
  password: string, salt: Buffer, keylen: number, options: crypto.ScryptOptions,
) => Promise<Buffer>;
const N = 16384, r = 8, p = 1, KEYLEN = 64;

const encode = (salt: Buffer, hash: Buffer) => `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  return encode(salt, await scrypt(password, salt, KEYLEN, { N, r, p }));
}

export function hashPasswordSync(password: string): string {
  const salt = crypto.randomBytes(16);
  return encode(salt, crypto.scryptSync(password, salt, KEYLEN, { N, r, p }));
}

// A fixed dummy hash lets login spend the same time whether or not the email exists,
// so response timing doesn't reveal which accounts are registered.
let dummyHash: string | undefined;

export async function verifyPassword(input: unknown, stored: string | null | undefined): Promise<boolean> {
  let password = String(input ?? '').slice(0, 200);
  if (!stored) {
    dummyHash ??= await hashPassword('timing-equaliser');
    stored = dummyHash;
    password += '\0invalid';
  }
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, rr, pp, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N: +n, r: +rr, p: +pp });
  return crypto.timingSafeEqual(expected, actual);
}

const PASSWORD_MESSAGES = {
  short: 'Password must be at least 10 characters.',
  long: 'Password is too long.',
  mix: 'Password must contain letters and numbers.',
};

/** Pass `messages` to get the reasons in the visitor's language. */
export function passwordProblem(pw: unknown, messages = PASSWORD_MESSAGES): string | null {
  if (typeof pw !== 'string' || pw.length < 10) return messages.short;
  if (pw.length > 200) return messages.long;
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return messages.mix;
  return null;
}
