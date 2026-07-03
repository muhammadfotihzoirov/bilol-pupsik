// SECURITY: shared-password admin gate.
// - Password never stored in plaintext; only SHA-256 hash is compared.
// - Rate limit: 5 attempts / 60s lockout, persisted in localStorage.
// - Session token in sessionStorage, expires after 30 min inactivity.
// NOTE: this is a client-only site; the gate protects UI. For true
// server-side auth, enable Lovable Cloud and move admin behind Supabase.

// Default password: "neoanime2026" — change ADMIN_HASH below to rotate.
// SHA-256("neoanime2026") =
const ADMIN_HASH =
  "955c56f80c1bb5b8c1a43f29c74ce1f3c0e16f58deb114a8f3254dbc343a99c7";

const SESSION_KEY = "neoanime:admin:session";
const LOCK_KEY = "neoanime:admin:lock";
const SESSION_TTL = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60 * 1000;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type LockState = { attempts: number; lockedUntil: number };

function readLock(): LockState {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function writeLock(s: LockState) {
  localStorage.setItem(LOCK_KEY, JSON.stringify(s));
}

export function getLockRemainingMs(): number {
  const { lockedUntil } = readLock();
  return Math.max(0, lockedUntil - Date.now());
}

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  const remaining = getLockRemainingMs();
  if (remaining > 0) {
    return { ok: false, error: `Слишком много попыток. Подождите ${Math.ceil(remaining / 1000)}с` };
  }
  if (typeof password !== "string" || password.length < 4 || password.length > 128) {
    return { ok: false, error: "Неверный формат пароля" };
  }
  const hash = await sha256(password);
  // Constant-time-ish compare
  let diff = hash.length ^ ADMIN_HASH.length;
  for (let i = 0; i < Math.max(hash.length, ADMIN_HASH.length); i++) {
    diff |= (hash.charCodeAt(i) || 0) ^ (ADMIN_HASH.charCodeAt(i) || 0);
  }
  if (diff !== 0) {
    const state = readLock();
    const attempts = state.attempts + 1;
    const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0;
    writeLock({ attempts: attempts >= MAX_ATTEMPTS ? 0 : attempts, lockedUntil });
    return {
      ok: false,
      error: lockedUntil
        ? `Блокировка на ${LOCK_MS / 1000}с из-за многих попыток`
        : `Неверный пароль (осталось попыток: ${MAX_ATTEMPTS - attempts})`,
    };
  }
  writeLock({ attempts: 0, lockedUntil: 0 });
  const token = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt: Date.now() + SESSION_TTL }));
  return { ok: true };
}

export function isAuthed(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function touchSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    s.expiresAt = Date.now() + SESSION_TTL;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
