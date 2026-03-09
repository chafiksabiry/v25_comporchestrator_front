import React, { createContext, useContext } from 'react';
import { User } from '../../core/entities/User';
import { useAuth } from '../../hooks/useAuth';
import AuthForm from './AuthForm';
import LoadingSpinner from '../UI/LoadingSpinner';

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  if (auth.loading) {
    return <LoadingSpinner />;
  }

  if (!auth.user) {
    return <AuthForm onSignIn={auth.signIn} onSignUp={auth.signUp} />;
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}