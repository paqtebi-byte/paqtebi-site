import crypto from "node:crypto";
import {
  clearAdminSessionCookie,
  getAdminSessionFromRequest,
  setAdminSessionCookie,
} from "../server/adminSession.js";
import { fetchWithTimeout } from "./_fetchWithTimeout.js";

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

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, serviceKey } = getConfig();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase server credentials are not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    throw new Error(isTimeout ? "Supabase request timed out" : "Supabase request failed");
  } finally {
    clearTimeout(timeoutId);
  }

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(responseText || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error("Supabase returned invalid JSON");
  }
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

async function requireAdmin(request, requiredRole = "admin") {
  const tokenData = getAdminSessionFromRequest(request);
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

  // Resolve the user first so we know their role before enforcing the secret.
  const admin = await findAdminByLogin(body.login);
  if (!admin || !ADMIN_ROLES.has(admin.role)) {
    return json(response, 401, { success: false, message: "მომხმარებელი ან პაროლი არასწორია" });
  }

  // Owners MUST supply the correct ADMIN_SECRET_CODE.
  // Standard admins do NOT use the secret code — skip the check entirely.
  if (admin.role === "owner") {
    if (body.secretCode !== adminSecret) {
      return json(response, 401, { success: false, message: "საიდუმლო კოდი არასწორია" });
    }
  }

  let isValid = false;
  const hasValidHash = Boolean(admin.password_hash && verifyPassword(body.password || "", admin.password_hash));
  const hasValidLegacyPassword = Boolean(admin.password && admin.password === body.password);

  if (hasValidHash || hasValidLegacyPassword) {
    isValid = true;
  } else if (admin.email) {
    // Fallback: Verify via Supabase Auth API
    const { supabaseUrl, serviceKey } = getConfig();
    const authResponse = await fetchWithTimeout(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
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

  setAdminSessionCookie(response, safeAdmin);
  return json(response, 200, {
    success: true,
    message: "წარმატებით შეხვედით სისტემაში",
    admin: safeAdmin,
  });
}

async function handleSession(response, request) {
  const admin = await requireAdmin(request);
  if (!admin) return json(response, 401, { success: false });
  return json(response, 200, { success: true, admin });
}

async function handleListAdmins(response, request) {
  const owner = await requireAdmin(request, "owner");
  if (!owner) return json(response, 403, { success: false, message: "მხოლოდ owner-ს შეუძლია ადმინების მართვა" });

  const admins = await supabaseRequest(
    "users?role=in.(owner,admin)&select=id,username,email,role,created_at&order=created_at.desc",
  );
  return json(response, 200, { success: true, admins });
}

async function handleListPublicUsers(response, request) {
  try {
    const admin = await requireAdmin(request, "admin");
    if (!admin) {
      return json(response, 403, { success: false, message: "მხოლოდ ადმინებს აქვთ წვდომა" });
    }

    console.log("[handleListPublicUsers] Fetching users with role=user...");
    
    const users = await supabaseRequest(
      "users?role=eq.user&select=id,username,email,created_at&order=created_at.desc",
    );
    
    console.log(`[handleListPublicUsers] Successfully fetched ${Array.isArray(users) ? users.length : 0} public users. Response type: ${typeof users}`);
    
    return json(response, 200, { success: true, users: Array.isArray(users) ? users : [] });
  } catch (error) {
    console.error("[handleListPublicUsers] Error fetching public users:", error);
    return json(response, 500, { 
      success: false, 
      message: "მომხმარებლების ჩატვირთვა ვერ მოხერხდა", 
      error: error.message || "Unknown error"
    });
  }
}

async function handleCreateAdmin(body, response, request) {
  const owner = await requireAdmin(request, "owner");
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

  // 1. Create user in Supabase Auth so signInWithPassword works for RLS
  const { supabaseUrl, serviceKey } = getConfig();
  let authUserId = crypto.randomUUID(); // fallback if auth creation fails

  try {
    const authResponse = await fetchWithTimeout(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // auto-confirm so signInWithPassword works immediately
      }),
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData?.id) {
        authUserId = authData.id; // use the auth.users UUID as public.users.id
      }
    } else {
      const errText = await authResponse.text();
      console.warn(`[handleCreateAdmin] Supabase Auth user creation failed (${authResponse.status}): ${errText}. Falling back to random UUID.`);
    }
  } catch (authErr) {
    console.warn("[handleCreateAdmin] Supabase Auth user creation error:", authErr);
  }

  // 2. Insert into public.users with the same ID as auth.users
  const rows = await supabaseRequest("users?select=id,username,email,role,created_at", {
    method: "POST",
    body: JSON.stringify({
      id: authUserId,
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

async function handleRegisterPublic(body, response) {
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim() || null;
  const password = String(body.password || "");

  if (!username) {
    return json(response, 400, { success: false, message: "Username is required" });
  }

  try {
    const existing = await findAdminByLogin(username);
    if (existing) {
      return json(response, 409, { success: false, message: "User already exists" });
    }

    const { supabaseUrl, serviceKey } = getConfig();
    let authUserId = crypto.randomUUID();

    const rows = await supabaseRequest("users?select=id,username,email,role,created_at", {
      method: "POST",
      body: JSON.stringify({
        id: authUserId,
        username,
        email,
        password_hash: hashPassword(password),
        password: null,
        role: "user",
        created_at: new Date().toISOString(),
      }),
      headers: { prefer: "return=representation" },
    });

    return json(response, 200, { success: true, user: rows?.[0] });
  } catch (error) {
    console.error("handleRegisterPublic error", error);
    return json(response, 500, { success: false, message: "Failed to register user" });
  }
}

async function handleUpdateRole(body, response, request) {
  const owner = await requireAdmin(request, "owner");
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

async function handleDeleteAdmin(body, response, request) {
  const owner = await requireAdmin(request, "owner");
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

  try {
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
      return json(response, 200, { success: false });
    }

    return json(response, 200, { success: true, email: row.email, role: row.role });
  } catch (error) {
    console.error("resolveLogin failed", error);
    return json(response, 200, { success: false });
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, 405, { success: false, message: "Method not allowed" });
  }

  try {
    const body = await readBody(request);
    if (body.action === "login") return handleLogin(body, response);
    if (body.action === "logout") {
      clearAdminSessionCookie(response);
      return json(response, 200, { success: true });
    }
    if (body.action === "session") return handleSession(response, request);
    if (body.action === "resolveLogin") return handleResolveLogin(body, response);
    if (body.action === "listAdmins") return handleListAdmins(response, request);
    if (body.action === "listPublicUsers") return handleListPublicUsers(response, request);
    if (body.action === "createAdmin") return handleCreateAdmin(body, response, request);
    if (body.action === "registerPublic") return handleRegisterPublic(body, response);
    if (body.action === "updateRole") return handleUpdateRole(body, response, request);
    if (body.action === "deleteAdmin") return handleDeleteAdmin(body, response, request);
    return json(response, 400, { success: false, message: "Unknown action" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return json(response, 500, { success: false, message });
  }
}
