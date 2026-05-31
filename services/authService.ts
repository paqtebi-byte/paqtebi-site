import { User, AuthResponse } from "../types";
import type { Provider, User as SupabaseAuthUser } from "@supabase/supabase-js";
import getSupabaseClient from "./supabaseClient";
import { hashPassword, generateResetToken, isPasswordValid } from "../utils/passwordUtils";

// Storage Keys
const STORAGE_KEY_ADMIN_AUTH = 'paqtebi_admin_auth';
const STORAGE_KEY_ADMIN_ACCOUNTS = 'paqtebi_admin_accounts';
const STORAGE_KEY_USERS = 'paqtebi_users';
const STORAGE_KEY_CURRENT_USER = 'paqtebi_current_user';
const STORAGE_KEY_CURRENT_ADMIN = 'paqtebi_current_admin';

// Types
export interface AdminAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  emailVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  lastLogin?: string;
}

export interface AdminAuthResponse {
  success: boolean;
  message: string;
  admin?: Omit<AdminAccount, 'passwordHash'>;
}

// --- Admin Account Management ---

export const getAdminAccounts = (): AdminAccount[] => {
  const accounts = localStorage.getItem(STORAGE_KEY_ADMIN_ACCOUNTS);
  return accounts ? JSON.parse(accounts) : [];
};

const saveAdminAccounts = (accounts: AdminAccount[]): void => {
  localStorage.setItem(STORAGE_KEY_ADMIN_ACCOUNTS, JSON.stringify(accounts));
};

const clearAdminCache = (): void => {
  localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
  localStorage.removeItem(STORAGE_KEY_CURRENT_ADMIN);
};

const cacheAdmin = (
  id: string,
  username: string,
  email: string,
): Omit<AdminAccount, 'passwordHash'> => {
  const safeAdmin = {
    id,
    username,
    email,
    createdAt: new Date().toISOString(),
    emailVerified: true,
    failedLoginAttempts: 0,
  };

  localStorage.setItem(STORAGE_KEY_CURRENT_ADMIN, JSON.stringify(safeAdmin));
  return safeAdmin;
};

export const getAdminFromSession = async (): Promise<Omit<AdminAccount, 'passwordHash'> | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    clearAdminCache();
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;

  if (sessionError || !authUser) {
    clearAdminCache();
    return null;
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, username, email')
    .eq('id', authUser.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    clearAdminCache();
    return null;
  }

  return cacheAdmin(
    authUser.id,
    userData.username || authUser.email || 'Admin',
    userData.email || authUser.email || '',
  );
};

export const registerAdmin = (username: string, email: string, password: string): AdminAuthResponse => {
  return {
    success: false,
    message: 'Registration is disabled for security reasons.'
  };
};

export const loginAdmin = async (email: string, password: string): Promise<AdminAuthResponse> => {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, message: 'Supabase client not configured' };

  // 1. Authenticate user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { success: false, message: 'ელ-ფოსტა ან პაროლი არასწორია (Invalid email or password)' };
  }

  // 2. Validate admin role in public.users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, username, email')
    .eq('id', authData.user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    await supabase.auth.signOut();
    return { success: false, message: 'თქვენ არ გაქვთ ადმინისტრატორის უფლებები (Unauthorized role)' };
  }

  const safeAdmin = cacheAdmin(
    authData.user.id,
    userData.username || email,
    userData.email || email,
  );

  return {
    success: true,
    message: 'წარმატებით შეხვედით სისტემაში',
    admin: safeAdmin as any,
  };
};

export const requestPasswordReset = async (email: string): Promise<AdminAuthResponse> => {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, message: 'Supabase client not configured' };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/reset-password`,
  });

  if (error) return { success: false, message: error.message };

  return {
    success: true,
    message: 'If this email is registered, a password reset link has been sent.',
  };

  const accounts = getAdminAccounts();
  const admin = accounts.find(a => a.email === email);

  if (!admin) {
    // Don't reveal if email exists for security
    return {
      success: true,
      message: 'თუ ეს ელ-ფოსტა რეგისტრირებულია, პაროლის აღდგენის ინსტრუქცია გამოიგზავნება',
    };
  }

  // Generate reset token (valid for 1 hour)
  admin.resetToken = generateResetToken();
  admin.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  saveAdminAccounts(accounts);

  // In production, send email with reset link
  console.log(`🔐 Password Reset Link: http://localhost:3000/admin/reset-password/${admin.resetToken}`);
  console.log(`⏰ Valid for: 1 hour`);

  return {
    success: true,
    message: 'პაროლის აღდგენის ინსტრუქცია გამოიგზავნება თქვენს ელ-ფოსტაზე',
  };
};

export const verifyResetToken = async (token?: string): Promise<AdminAuthResponse> => {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, message: 'Supabase client not configured' };

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return { success: false, message: 'Invalid or expired password reset link' };
  }

  return { success: true, message: 'Reset session is valid' };

  const accounts = getAdminAccounts();
  const admin = accounts.find(a => a.resetToken === token);

  if (!admin || !admin.resetTokenExpiry) {
    return { success: false, message: 'არასწორი ან ვადაგასული ლინკი' };
  }

  const expiryTime = new Date(admin.resetTokenExpiry);
  if (expiryTime < new Date()) {
    return { success: false, message: 'ლინკის ვადა გასულია' };
  }

  return { success: true, message: 'ტოკენი ვალიდურია' };
};

export const resetPassword = async (token: string | undefined, newPassword: string): Promise<AdminAuthResponse> => {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, message: 'Supabase client not configured' };

  if (!isPasswordValid(newPassword)) {
    return { success: false, message: 'Password does not meet the requirements' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, message: error.message };

  return { success: true, message: 'Password was updated successfully' };

  const accounts = getAdminAccounts();
  const admin = accounts.find(a => a.resetToken === token);

  if (!admin || !admin.resetTokenExpiry) {
    return { success: false, message: 'არასწორი ან ვადაგასული ლინკი' };
  }

  const expiryTime = new Date(admin.resetTokenExpiry);
  if (expiryTime < new Date()) {
    return { success: false, message: 'ლინკის ვადა გასულია' };
  }

  if (!isPasswordValid(newPassword)) {
    return { success: false, message: 'პაროლი არ აკმაყოფილებს მოთხოვნებს' };
  }

  // Update password
  admin.passwordHash = hashPassword(newPassword);
  admin.resetToken = undefined;
  admin.resetTokenExpiry = undefined;
  admin.failedLoginAttempts = 0;
  admin.lockedUntil = undefined;
  saveAdminAccounts(accounts);

  return { success: true, message: 'პაროლი წარმატებით შეიცვალა' };
};

export const verifyEmail = (token: string): AdminAuthResponse => {
  const accounts = getAdminAccounts();
  const admin = accounts.find(a => a.verificationToken === token);

  if (!admin) {
    return { success: false, message: 'არასწორი ვერიფიკაციის ლინკი' };
  }

  admin.emailVerified = true;
  admin.verificationToken = undefined;
  saveAdminAccounts(accounts);

  return { success: true, message: 'ელ-ფოსტა წარმატებით დადასტურდა' };
};

export const checkAdminAuth = (): boolean => {
  return false;
};

export const getCurrentAdmin = (): Omit<AdminAccount, 'passwordHash'> | null => {
  const data = localStorage.getItem(STORAGE_KEY_CURRENT_ADMIN);
  return data ? JSON.parse(data) : null;
};

export const logoutAdmin = (): void => {
  const supabase = getSupabaseClient();
  if (supabase) {
    supabase.auth.signOut().catch(() => undefined);
  }
  clearAdminCache();
};

// --- Public User Auth (unchanged) ---

export const getRegisteredUsers = (): User[] => {
  const users = localStorage.getItem(STORAGE_KEY_USERS);
  return users ? JSON.parse(users) : [];
};

const saveCurrentPublicUser = (user: User): User => {
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
  return user;
};

const upsertRegisteredPublicUser = (safeUser: User): void => {
  const users = getRegisteredUsers();
  const existingIndex = users.findIndex((user) => (
    (safeUser.email && user.email === safeUser.email) ||
    user.username === safeUser.username
  ));

  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      username: safeUser.username,
      email: safeUser.email || users[existingIndex].email,
    };
  } else {
    users.push(safeUser);
  }

  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};

const getOAuthDisplayName = (authUser: SupabaseAuthUser): string => {
  const metadata = authUser.user_metadata || {};
  const rawName =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    metadata.preferred_username ||
    authUser.email?.split("@")[0] ||
    "მომხმარებელი";

  return String(rawName).trim() || "მომხმარებელი";
};

const persistOAuthPublicUser = (authUser: SupabaseAuthUser): User => {
  const safeUser = {
    username: getOAuthDisplayName(authUser),
    email: authUser.email || authUser.user_metadata?.email,
  };

  upsertRegisteredPublicUser(safeUser);
  return saveCurrentPublicUser(safeUser);
};

export const registerPublicUser = (user: User): AuthResponse => {
  const users = getRegisteredUsers();

  if (users.some(u => u.username === user.username)) {
    return { success: false, message: 'მომხმარებელი ამ სახელით უკვე არსებობს' };
  }

  users.push(user);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  // Auto login
  const safeUser = { username: user.username, email: user.email };
  saveCurrentPublicUser(safeUser);

  return { success: true, message: 'რეგისტრაცია წარმატებით დასრულდა', user: safeUser };
};

export const loginPublicUser = (username: string, password: string): AuthResponse => {
  const users = getRegisteredUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    const safeUser = { username: user.username, email: user.email };
    saveCurrentPublicUser(safeUser);
    return { success: true, user: safeUser, message: 'წარმატებული შესვლა' };
  }

  return { success: false, message: 'სახელი ან პაროლი არასწორია' };
};

export const loginWithOAuthProvider = async (provider: Provider): Promise<AuthResponse> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      success: false,
      message: "Google/Facebook-ით შესვლისთვის საჭიროა Supabase-ის და OAuth პროვაიდერების კონფიგურაცია.",
    };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      scopes: provider === "facebook" ? "email public_profile" : "email profile",
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "გადამისამართება ავტორიზაციის გვერდზე..." };
};

export const syncOAuthPublicUser = async (): Promise<User | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return getPublicCurrentUser();

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return getPublicCurrentUser();

  return persistOAuthPublicUser(data.session.user);
};

export const subscribeToOAuthPublicUser = (
  onUserChange: (user: User | null) => void,
): (() => void) => {
  const supabase = getSupabaseClient();
  if (!supabase) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      onUserChange(persistOAuthPublicUser(session.user));
      return;
    }

    if (event === "SIGNED_OUT") {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      onUserChange(null);
    }
  });

  return () => data.subscription.unsubscribe();
};

export const getPublicCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

export const logoutPublicUser = (): void => {
  const supabase = getSupabaseClient();
  if (supabase) {
    supabase.auth.signOut().catch(() => undefined);
  }
  localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
};
