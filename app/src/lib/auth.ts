// Username/password login with an HMAC-signed session cookie. Users live in data/users.json.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { DATA_DIR, readJson, writeJson } from './data';

export const COOKIE = 'pc_session';
const USERS = path.join(DATA_DIR, 'users.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type User = { username: string; salt: string; hash: string };

function secret() {
  if (!fs.existsSync(SECRET_FILE)) fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString('hex'));
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}
const hashPw = (pw: string, salt: string) => crypto.scryptSync(pw, salt, 64).toString('hex');

function users(): User[] {
  const list = readJson<User[]>(USERS, []);
  if (list.length) return list;
  // first start: default account, shown on the login page until the password is changed
  const salt = crypto.randomBytes(16).toString('hex');
  const seeded = [{ username: 'admin', salt, hash: hashPw('admin123', salt) }];
  writeJson(USERS, seeded);
  return seeded;
}

export function isDefaultPassword() {
  const u = users().find((x) => x.username === 'admin');
  return !!u && hashPw('admin123', u.salt) === u.hash;
}

export function checkPassword(username: string, password: string) {
  const u = users().find((x) => x.username === username.trim().toLowerCase());
  if (!u) return false;
  const a = Buffer.from(hashPw(password, u.salt), 'hex');
  return crypto.timingSafeEqual(a, Buffer.from(u.hash, 'hex'));
}

export function setPassword(username: string, password: string) {
  const list = users();
  const salt = crypto.randomBytes(16).toString('hex');
  const next = list.map((u) => (u.username === username ? { ...u, salt, hash: hashPw(password, salt) } : u));
  writeJson(USERS, next);
}

export function signSession(username: string) {
  const body = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token?: string | null): string | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(body, 'base64url').toString());
    return exp > Date.now() ? u : null;
  } catch {
    return null;
  }
}

export async function currentUser() {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE)?.value);
}

/** Use at the top of API route handlers. Returns a 401 Response when not logged in. */
export async function requireUser(): Promise<string | Response> {
  const u = await currentUser();
  return u ?? Response.json({ error: 'Not logged in' }, { status: 401 });
}

export const sessionCookie = (token: string) => ({
  name: COOKIE,
  value: token,
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
});
