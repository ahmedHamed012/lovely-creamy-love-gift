import crypto from 'node:crypto';

const ROLES = {
  site: { cookie: 'lv_site', password: () => process.env.SITE_PASSWORD || 'love', days: 30 },
  admin: { cookie: 'lv_admin', password: () => process.env.ADMIN_PASSWORD || '', days: 7 },
};

const secret = () => process.env.SESSION_SECRET || 'lovely-gift-secret';

// The cookie holds an HMAC of the current password, so changing the
// password on Vercel logs everyone out automatically.
function tokenFor(role) {
  const password = ROLES[role].password();
  if (!password) return null;
  return crypto.createHmac('sha256', secret()).update(`${role}:${password.toLowerCase()}`).digest('hex');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function isEnabled(role) {
  return Boolean(ROLES[role].password());
}

export function checkPassword(role, input) {
  const password = ROLES[role].password();
  if (!password || typeof input !== 'string') return false;
  return safeEqual(input.trim().toLowerCase(), password.trim().toLowerCase());
}

export function isAuthed(req, role) {
  const expected = tokenFor(role);
  const actual = req.cookies?.[ROLES[role].cookie];
  return Boolean(expected && actual && safeEqual(actual, expected));
}

export function signIn(res, role) {
  res.cookie(ROLES[role].cookie, tokenFor(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL),
    maxAge: ROLES[role].days * 24 * 60 * 60 * 1000,
  });
}

export function signOut(res, role) {
  res.clearCookie(ROLES[role].cookie);
}
