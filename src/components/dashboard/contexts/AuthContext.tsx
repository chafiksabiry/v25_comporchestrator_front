import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface AuthContextType {
  currentUser: { id: string } | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    // Clear all related auth data
    Cookies.remove('userId');
    Cookies.remove('token');
    localStorage.removeItem('token');
    localStorage.removeItem('zoho_access_token');
    localStorage.removeItem('zoho_refresh_token');
    setCurrentUser(null);

    // Redirect to login
    window.location.href = '/auth';
  };

  // Set current user based on userId cookie
  useEffect(() => {
    const userId = import.meta.env.VITE_ENV === 'test'
      ? '6807abfc2c1ca099fe2b13c5'
      : Cookies.get('userId');
    

    if (userId) {
      setCurrentUser({ id: userId });
    } else {
      setCurrentUser(null);
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      logout
    }}>
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
