import { useState, useEffect } from 'react';
import { User } from '../types';
import {
  checkAdminAuth,
  getCurrentAdmin,
  getPublicCurrentUser,
  logoutAdmin as logoutAdminService,
  logoutPublicUser as logoutPublicService,
  subscribeToOAuthPublicUser,
  syncOAuthPublicUser
} from '../services/authService';

export const useAuth = () => {
  // Initialize state synchronously to avoid redirect loops in ProtectedRoute
  const [currentUser, setCurrentUser] = useState<User | null>(getPublicCurrentUser());
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(checkAdminAuth());

  // Listen for storage changes (optional, but good for multi-tab sync)
  useEffect(() => {
    let mounted = true;

    syncOAuthPublicUser().then((user) => {
      if (mounted && user) setCurrentUser(user);
    });

    const unsubscribeOAuth = subscribeToOAuthPublicUser((user) => {
      setCurrentUser(user);
    });

    const handleStorageChange = () => {
      setIsAdminAuthenticated(checkAdminAuth());
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
    setIsAdminAuthenticated(checkAdminAuth());
  };

  return {
    currentUser,
    isAdminAuthenticated,
    logoutAdmin,
    logoutPublic,
    refreshUser,
    refreshAuth,
    setCurrentUser, // Exposed for direct updates from AuthModal
    currentAdmin: getCurrentAdmin(),
  };
};
