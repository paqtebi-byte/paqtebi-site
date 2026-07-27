import { useState, useEffect } from 'react';
import { User } from '../types';
import {
  getAdminFromSession,
  getCurrentAdmin,
  getPublicCurrentUser,
  logoutAdmin as logoutAdminService,
  logoutPublicUser as logoutPublicService,
  subscribeToOAuthPublicUser,
  syncOAuthPublicUser
} from '../services/authService';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(getPublicCurrentUser());
  const [currentAdmin, setCurrentAdmin] = useState(getCurrentAdmin());
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminAuthLoading, setIsAdminAuthLoading] = useState(true);

  // Listen for storage changes (optional, but good for multi-tab sync)
  useEffect(() => {
    let mounted = true;

    const refreshAdminSession = async (showLoading = false) => {
      if (showLoading) setIsAdminAuthLoading(true);
      const admin = await getAdminFromSession();
      if (mounted) {
        setCurrentAdmin(admin);
        setIsAdminAuthenticated(Boolean(admin));
        setIsAdminAuthLoading(false);
      }
    };

    refreshAdminSession(true);

    syncOAuthPublicUser().then((user) => {
      if (mounted && user) setCurrentUser(user);
    });

    const unsubscribeOAuth = subscribeToOAuthPublicUser((user) => {
      setCurrentUser(user);
    });

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'paqtebi_current_admin') {
        const admin = getCurrentAdmin();
        setCurrentAdmin(admin);
        setIsAdminAuthenticated(Boolean(admin));
      } else if (event.key === 'paqtebi_current_user') {
        setCurrentUser(getPublicCurrentUser());
      } else if (event.key === null) {
        refreshAdminSession();
        setCurrentUser(getPublicCurrentUser());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      mounted = false;
      unsubscribeOAuth();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const logoutAdmin = async () => {
    await logoutAdminService();
    setCurrentAdmin(null);
    setIsAdminAuthenticated(false);
  };

  const logoutPublic = () => {
    logoutPublicService();
    setCurrentUser(null);
  };

  const refreshUser = () => {
    setCurrentUser(getPublicCurrentUser());
  };

  const refreshAuth = async () => {
    setIsAdminAuthLoading(true);
    const admin = await getAdminFromSession();
    setCurrentAdmin(admin);
    setIsAdminAuthenticated(Boolean(admin));
    setIsAdminAuthLoading(false);
    return Boolean(admin);
  };

  return {
    currentUser,
    isAdminAuthenticated,
    isAdminAuthLoading,
    logoutAdmin,
    logoutPublic,
    refreshUser,
    refreshAuth,
    setCurrentUser, // Exposed for direct updates from AuthModal
    currentAdmin,
  };
};
