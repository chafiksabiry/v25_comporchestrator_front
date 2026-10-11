import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { resolveSessionUserId } from '../../../lib/sessionUserId';
import { broadcastAuthChanged, subscribeAuthChanged } from '../../../lib/authSync';

interface AuthContextType {
  currentUser: { id: string } | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const syncFromStorage = useCallback(() => {
    const userId =
      import.meta.env.VITE_ENV === 'test'
        ? '6807abfc2c1ca099fe2b13c5'
        : resolveSessionUserId();
    setCurrentUser(userId ? { id: userId } : null);
    return userId;
  }, []);

  const logout = () => {
    Cookies.remove('userId');
    Cookies.remove('token');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('zoho_access_token');
    localStorage.removeItem('zoho_refresh_token');
    setCurrentUser(null);
    broadcastAuthChanged({ token: null, userId: null, source: 'company' });
    window.location.href = '/';
  };

  useEffect(() => {
    syncFromStorage();
    setLoading(false);
  }, [syncFromStorage]);

  useEffect(() => {
    return subscribeAuthChanged(() => {
      syncFromStorage();
    });
  }, [syncFromStorage]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
