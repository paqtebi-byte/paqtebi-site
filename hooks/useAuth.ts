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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminAuthLoading, setIsAdminAuthLoading] = useState(true);

  // Listen for storage changes (optional, but good for multi-tab sync)
  useEffect(() => {
    let mounted = true;

    const refreshAdminSession = async () => {
      setIsAdminAuthLoading(true);
      const admin = await getAdminFromSession();
      if (mounted) {
        setIsAdminAuthenticated(Boolean(admin));
        setIsAdminAuthLoading(false);
      }
    };

    refreshAdminSession();

    syncOAuthPublicUser().then((user) => {
      if (mounted && user) setCurrentUser(user);
    });

    const unsubscribeOAuth = subscribeToOAuthPublicUser((user) => {
      setCurrentUser(user);
    });

    const handleStorageChange = () => {
      refreshAdminSession();
      setCurrentUser(getPublicCurrentUser());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      mounted = false;
      unsubscribeOAuth();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const logoutAdmin = () => {
    logoutAdminService();
    setIsAdminAuthenticated(false);
  };

  const logoutPublic = () => {
    logoutPublicService();
    setCurrentUser(null);
  };

  const refreshUser = () => {
    setCurrentUser(getPublicCurrentUser());
  };

  const refreshAuth = () => {
    setIsAdminAuthLoading(true);
    getAdminFromSession().then((admin) => {
      setIsAdminAuthenticated(Boolean(admin));
      setIsAdminAuthLoading(false);
    });
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
    currentAdmin: getCurrentAdmin(),
  };
};
