import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  name: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: User['role']) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🔐 AuthProvider: Initializing...');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider: Setting up auth listeners...');
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔐 AuthProvider: Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('🔐 AuthProvider: Error getting session:', error);
        }
        if (session?.user) {
          console.log('🔐 AuthProvider: Found existing session, loading profile...');
          await loadUserProfile(session.user.id);
        } else {
          console.log('🔐 AuthProvider: No existing session found');
        }
        setIsLoading(false);
        console.log('🔐 AuthProvider: Initial session check complete');
      } catch (error) {
        console.error('🔐 AuthProvider: Error in getInitialSession:', error);
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    // Don't await Supabase calls inside this callback: supabase-js holds its auth lock
    // while the callback runs, so awaiting a query here deadlocks (stuck on "Authenticating...").
    // Defer the profile load to after the callback returns.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 AuthProvider: Auth state changed:', event, session?.user ? 'user present' : 'no user');
        if (session?.user) {
          const userId = session.user.id;
          setTimeout(() => {
            loadUserProfile(userId).finally(() => setIsLoading(false));
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔐 AuthProvider: Loading user profile for:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('🔐 AuthProvider: Error fetching profile:', error);
        throw error;
      }

      console.log('🔐 AuthProvider: Profile loaded successfully:', profile.email);
      setUser({
        id: profile.id,
        email: profile.email,
        role: profile.role || 'user',
        name: profile.name || profile.email,
        permissions: profile.permissions || []
      });
    } catch (error) {
      console.error('🔐 AuthProvider: Error loading user profile:', error);
      // Fallback to basic user info
      console.log('🔐 AuthProvider: Attempting fallback user info...');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        console.log('🔐 AuthProvider: Using fallback user info');
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          role: 'user',
          name: authUser.email || '',
          permissions: []
        });
      } else {
        console.log('🔐 AuthProvider: No fallback user info available');
      }
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: User['role']): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};