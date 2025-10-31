import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export type FeatureKey =
  | 'aiTools'
  | 'advancedAnalytics'
  | 'customIntegrations'
  | 'whitelabelBranding'
  | 'apiAccess'
  | 'smartcrm'
  | 'salesMaximizer'
  | 'aiBoost'
  | 'communicationSuite'
  | 'businessIntelligence'
  | 'videoEmail'
  | 'phoneSystem'
  | 'pipeline'
  | 'contacts'
  | 'tasks'
  | 'appointments'
  | 'invoicing'
  | 'analytics'
  | 'communication'
  | 'formsSurveys'
  | 'leadAutomation';

interface UserFeatures {
  [key: string]: boolean;
}

interface GlobalFeatures {
  [key: string]: boolean;
}

interface FeatureContextType {
  userFeatures: UserFeatures;
  globalFeatures: GlobalFeatures;
  isLoading: boolean;
  hasFeature: (feature: FeatureKey) => boolean;
  hasUserFeature: (feature: FeatureKey) => boolean;
  hasGlobalFeature: (feature: FeatureKey) => boolean;
  updateUserFeature: (userId: string, feature: FeatureKey, enabled: boolean) => Promise<void>;
  updateGlobalFeature: (feature: FeatureKey, enabled: boolean) => Promise<void>;
  refreshFeatures: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};

interface FeatureProviderProps {
  children: React.ReactNode;
}

export const FeatureProvider: React.FC<FeatureProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [userFeatures, setUserFeatures] = useState<UserFeatures>({});
  const [globalFeatures, setGlobalFeatures] = useState<GlobalFeatures>({
    aiTools: true,
    advancedAnalytics: true,
    customIntegrations: false,
    whitelabelBranding: true,
    apiAccess: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load user features
  const loadUserFeatures = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/users/${user.id}/features`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const features = await response.json();
        setUserFeatures(features);
      }
    } catch (error) {
      console.error('Failed to load user features:', error);
    }
  }, [user?.id]);

  // Load global features
  const loadGlobalFeatures = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/features/global', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const features = await response.json();
        setGlobalFeatures(prev => ({ ...prev, ...features }));
      }
    } catch (error) {
      console.error('Failed to load global features:', error);
    }
  }, []);

  // Load all features
  const refreshFeatures = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    await Promise.all([loadUserFeatures(), loadGlobalFeatures()]);
    setIsLoading(false);
  }, [isAuthenticated, loadUserFeatures, loadGlobalFeatures]);

  useEffect(() => {
    refreshFeatures();
  }, [refreshFeatures]);

  // Check if user has a specific feature
  const hasFeature = useCallback((feature: FeatureKey): boolean => {
    // Check user-specific features first
    if (userFeatures[feature] !== undefined) {
      return userFeatures[feature];
    }

    // Fall back to global features
    return globalFeatures[feature] || false;
  }, [userFeatures, globalFeatures]);

  // Check user-specific features only
  const hasUserFeature = useCallback((feature: FeatureKey): boolean => {
    return userFeatures[feature] || false;
  }, [userFeatures]);

  // Check global features only
  const hasGlobalFeature = useCallback((feature: FeatureKey): boolean => {
    return globalFeatures[feature] || false;
  }, [globalFeatures]);

  // Update user feature
  const updateUserFeature = useCallback(async (userId: string, feature: FeatureKey, enabled: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`/api/users/${userId}/features/${feature}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user feature');
      }

      // Update local state
      setUserFeatures(prev => ({
        ...prev,
        [feature]: enabled,
      }));
    } catch (error) {
      console.error('Failed to update user feature:', error);
      throw error;
    }
  }, []);

  // Update global feature
  const updateGlobalFeature = useCallback(async (feature: FeatureKey, enabled: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`/api/features/global/${feature}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update global feature');
      }

      // Update local state
      setGlobalFeatures(prev => ({
        ...prev,
        [feature]: enabled,
      }));
    } catch (error) {
      console.error('Failed to update global feature:', error);
      throw error;
    }
  }, []);

  const value: FeatureContextType = {
    userFeatures,
    globalFeatures,
    isLoading,
    hasFeature,
    hasUserFeature,
    hasGlobalFeature,
    updateUserFeature,
    updateGlobalFeature,
    refreshFeatures,
  };

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
};