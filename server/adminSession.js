import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE = "paqtebi_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;
const ADMIN_ROLES = new Set(["owner", "admin"]);

function getHeader(request, name) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : String(value || "");
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SECRET_CODE || "";
}

function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionToken(admin, now = Date.now()) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Admin session secret is not configured");

  const payload = Buffer.from(JSON.stringify({
    sub: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    exp: Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS,
  })).toString("base64url");

  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifyAdminSessionToken(token, now = Date.now()) {
  const secret = getSessionSecret();
  const parts = String(token || "").split(".");
  if (!secret || parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [payload, signature] = parts;
  const expected = signPayload(payload, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.sub || !ADMIN_ROLES.has(data.role)) return null;
    if (!data.exp || data.exp < Math.floor(now / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function getAdminSessionFromRequest(request) {
  const cookies = getHeader(request, "cookie").split(";");

  for (const entry of cookies) {
    const separator = entry.indexOf("=");
    if (separator < 1) continue;
    const name = entry.slice(0, separator).trim();
    if (name !== ADMIN_SESSION_COOKIE) continue;

    try {
      return verifyAdminSessionToken(decodeURIComponent(entry.slice(separator + 1).trim()));
    } catch {
      return null;
    }
  }

  return null;
}

export function setAdminSessionCookie(response, admin) {
  const token = createAdminSessionToken(admin);
  response.setHeader(
    "set-cookie",
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
  );
}

export function clearAdminSessionCookie(response) {
  response.setHeader(
    "set-cookie",
    `${ADMIN_SESSION_COOKIE}=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  );
}
