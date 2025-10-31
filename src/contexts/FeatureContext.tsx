import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { featureService } from '../services/featureService';
import {
  FeatureKey,
  FeatureContextType,
  UserFeatures,
  GlobalFeatures,
  FEATURE_DEFINITIONS,
  getFeatureDependencies,
  getFeatureConflicts
} from '../types/feature';

// Re-export types from the centralized types file
export type { FeatureKey, FeatureContextType, UserFeatures, GlobalFeatures } from '../types/feature';

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
      const features = await featureService.getUserFeatures(user.id);
      setUserFeatures(features);
    } catch (error) {
      console.error('Failed to load user features:', error);
    }
  }, [user?.id]);

  // Load global features
  const loadGlobalFeatures = useCallback(async () => {
    try {
      const features = await featureService.getGlobalFeatures();
      setGlobalFeatures(prev => ({ ...prev, ...features }));
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
    const result = await featureService.updateUserFeature(userId, feature, enabled);
    if (!result.success) {
      throw new Error(result.message || 'Failed to update user feature');
    }

    // Update local state
    setUserFeatures(prev => ({
      ...prev,
      [feature]: enabled,
    }));
  }, []);

  // Update global feature
  const updateGlobalFeature = useCallback(async (feature: FeatureKey, enabled: boolean) => {
    const result = await featureService.updateGlobalFeature(feature, enabled);
    if (!result.success) {
      throw new Error(result.message || 'Failed to update global feature');
    }

    // Update local state
    setGlobalFeatures(prev => ({
      ...prev,
      [feature]: enabled,
    }));
  }, []);

  // Validate feature combination
  const validateFeatureCombination = useCallback((features: Record<FeatureKey, boolean>) => {
    return featureService.validateFeatureCombination(features);
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
    validateFeatureCombination,
  };

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
};