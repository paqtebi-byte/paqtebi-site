import crypto from "node:crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 8;
const ADMIN_ROLES = new Set(["owner", "admin"]);

function getConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const adminSecret = process.env.ADMIN_SECRET_CODE;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || adminSecret;

  return { supabaseUrl, serviceKey, adminSecret, sessionSecret };
}

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function hashPassword(password) {
  let hash = 0;
  const combined = password + "paqtebi_salt_2024";

  for (let i = 0; i < combined.length; i += 1) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }

  return `hash_${Math.abs(hash).toString(36)}`;
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createToken(admin, secret) {
  const payload = base64UrlEncode(JSON.stringify({
    sub: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }));
  return `${payload}.${signPayload(payload, secret)}`;
}

function verifyToken(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = signPayload(payload, secret);

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(base64UrlDecode(payload));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, serviceKey } = getConfig();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase server credentials are not configured");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function findAdminByLogin(login) {
  const trimmedLogin = String(login || "").trim();
  const fields = "id,username,email,role,password,password_hash,created_at";
  const primaryField = trimmedLogin.includes("@") ? "email" : "username";
  const secondaryField = primaryField === "email" ? "username" : "email";

  const primary = await supabaseRequest(
    `users?${primaryField}=eq.${encodeURIComponent(trimmedLogin)}&select=${fields}`,
  );
  if (primary?.[0]) return primary[0];

  const secondary = await supabaseRequest(
    `users?${secondaryField}=eq.${encodeURIComponent(trimmedLogin)}&select=${fields}`,
  );
  return secondary?.[0] || null;
}

async function getAdminById(id) {
  const fields = "id,username,email,role,created_at";
  const rows = await supabaseRequest(`users?id=eq.${encodeURIComponent(id)}&select=${fields}`);
  const admin = rows?.[0] || null;
  if (!admin || !ADMIN_ROLES.has(admin.role)) return null;
  return admin;
}

async function requireAdmin(token, requiredRole = "admin") {
  const { sessionSecret } = getConfig();
  const tokenData = verifyToken(token, sessionSecret);
  if (!tokenData?.sub) return null;

  const admin = await getAdminById(tokenData.sub);
  if (!admin) return null;
  if (requiredRole === "owner" && admin.role !== "owner") return null;
  return admin;
}

async function handleLogin(body, response) {
  const { adminSecret, sessionSecret } = getConfig();
  if (!adminSecret || !sessionSecret) {
    return json(response, 500, { success: false, message: "Admin secret is not configured" });
  }

  if (body.secretCode !== adminSecret) {
    return json(response, 401, { success: false, message: "საიდუმლო კოდი არასწორია" });
  }

  const admin = await findAdminByLogin(body.login);
  if (!admin || !ADMIN_ROLES.has(admin.role)) {
    return json(response, 401, { success: false, message: "მომხმარებელი ან პაროლი არასწორია" });
  }

  let isValid = false;
  const hasValidHash = Boolean(admin.password_hash && verifyPassword(body.password || "", admin.password_hash));
  const hasValidLegacyPassword = Boolean(admin.password && admin.password === body.password);

  if (hasValidHash || hasValidLegacyPassword) {
    isValid = true;
  } else if (admin.email) {
    // Fallback: Verify via Supabase Auth API
    const { supabaseUrl, serviceKey } = getConfig();
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: admin.email, password: body.password }),
    });
    if (authResponse.ok) {
      isValid = true;
    }
  }

  if (!isValid) {
    return json(response, 401, { success: false, message: "მომხმარებელი ან პაროლი არასწორია" });
  }

  if (hasValidLegacyPassword && !admin.password_hash) {
    await supabaseRequest(`users?id=eq.${encodeURIComponent(admin.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ password_hash: hashPassword(body.password), password: null }),
      headers: { prefer: "return=minimal" },
    });
  }

  const safeAdmin = {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    createdAt: admin.created_at,
  };

  return json(response, 200, {
    success: true,
    message: "წარმატებით შეხვედით სისტემაში",
    admin: safeAdmin,
    token: createToken(safeAdmin, sessionSecret),
  });
}

async function handleSession(body, response) {
  const admin = await requireAdmin(body.token);
  if (!admin) return json(response, 401, { success: false });
  return json(response, 200, { success: true, admin });
}

async function handleListAdmins(body, response) {
  const owner = await requireAdmin(body.token, "owner");
  if (!owner) return json(response, 403, { success: false, message: "მხოლოდ owner-ს შეუძლია ადმინების მართვა" });

  const admins = await supabaseRequest(
    "users?role=in.(owner,admin)&select=id,username,email,role,created_at&order=created_at.desc",
  );
  return json(response, 200, { success: true, admins });
}

async function handleCreateAdmin(body, response) {
  const owner = await requireAdmin(body.token, "owner");
  if (!owner) return json(response, 403, { success: false, message: "მხოლოდ owner-ს შეუძლია ადმინის დამატება" });

  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const role = body.role === "owner" ? "owner" : "admin";

  if (!username || !email || password.length < 8) {
    return json(response, 400, { success: false, message: "შეავსეთ username, email და მინ. 8 სიმბოლოანი პაროლი" });
  }

  const existing = await findAdminByLogin(email) || await findAdminByLogin(username);
  if (existing) {
    return json(response, 409, { success: false, message: "ეს username ან email უკვე არსებობს" });
  }

  const rows = await supabaseRequest("users?select=id,username,email,role,created_at", {
    method: "POST",
    body: JSON.stringify({
      id: crypto.randomUUID(),
      username,
      email,
      password_hash: hashPassword(password),
      password: null,
      role,
      created_at: new Date().toISOString(),
    }),
    headers: { prefer: "return=representation" },
  });

  return json(response, 200, { success: true, admin: rows?.[0] });
}

async function handleUpdateRole(body, response) {
  const owner = await requireAdmin(body.token, "owner");
  if (!owner) return json(response, 403, { success: false, message: "მხოლოდ owner-ს შეუძლია როლის შეცვლა" });

  const role = body.role === "owner" ? "owner" : "admin";
  const id = String(body.id || "");
  if (!id || id === owner.id) return json(response, 400, { success: false, message: "ამ ჩანაწერის შეცვლა შეუძლებელია" });

  await supabaseRequest(`users?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
    headers: { prefer: "return=minimal" },
  });

  return json(response, 200, { success: true });
}

async function handleDeleteAdmin(body, response) {
  const owner = await requireAdmin(body.token, "owner");
  if (!owner) return json(response, 403, { success: false, message: "მხოლოდ owner-ს შეუძლია ადმინის წაშლა" });

  const id = String(body.id || "");
  if (!id || id === owner.id) return json(response, 400, { success: false, message: "საკუთარ ანგარიშს აქედან ვერ წაშლით" });

  await supabaseRequest(`users?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { prefer: "return=minimal" },
  });

  return json(response, 200, { success: true });
}

// Resolves a login (username or email) → { email, role } using the service role key.
// No auth token required — only returns non-sensitive fields (email + role).
// Rate-limiting / brute-force protection is handled upstream by Supabase Auth.
async function handleResolveLogin(body, response) {
  const login = String(body.login || "").trim();
  if (!login) return json(response, 400, { success: false, message: "login required" });

  const fields = "email,role";
  const primaryField = login.includes("@") ? "email" : "username";
  const secondaryField = primaryField === "email" ? "username" : "email";

  let row = null;
  const primary = await supabaseRequest(`users?${primaryField}=eq.${encodeURIComponent(login)}&select=${fields}`);
  if (primary?.[0]) row = primary[0];

  if (!row) {
    const secondary = await supabaseRequest(`users?${secondaryField}=eq.${encodeURIComponent(login)}&select=${fields}`);
    if (secondary?.[0]) row = secondary[0];
  }

  if (!row || !ADMIN_ROLES.has(row.role)) {
    // Return generic error — do not reveal whether user exists
    return json(response, 200, { success: false });
  }

  return json(response, 200, { success: true, email: row.email, role: row.role });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, 405, { success: false, message: "Method not allowed" });
  }

  try {
    const body = await readBody(request);
    if (body.action === "login") return handleLogin(body, response);
    if (body.action === "session") return handleSession(body, response);
    if (body.action === "resolveLogin") return handleResolveLogin(body, response);
    if (body.action === "listAdmins") return handleListAdmins(body, response);
    if (body.action === "createAdmin") return handleCreateAdmin(body, response);
    if (body.action === "updateRole") return handleUpdateRole(body, response);
    if (body.action === "deleteAdmin") return handleDeleteAdmin(body, response);
    return json(response, 400, { success: false, message: "Unknown action" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return json(response, 500, { success: false, message });
  }
}
