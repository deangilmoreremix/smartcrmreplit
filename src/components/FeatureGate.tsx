import React from 'react';
import { useFeatures } from '../contexts/FeatureContext';
import { FeatureKey, FEATURE_DEFINITIONS } from '../types/feature';
import { AlertCircle, Lock, Loader2 } from 'lucide-react';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
  loadingComponent?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showMessage = true,
  loadingComponent
}) => {
  const { hasFeature, isLoading } = useFeatures();

  // Show loading state while features are being loaded
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading features...</p>
        </div>
      </div>
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showMessage) {
    const featureDef = FEATURE_DEFINITIONS[feature];
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-md">
          <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Feature Not Available
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {featureDef?.description || 'This feature is not enabled for your account. Please contact your administrator to enable it.'}
          </p>
          <div className="space-y-2">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Feature: {featureDef?.name || feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </div>
            {featureDef?.category && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                Category: {featureDef.category}
              </div>
            )}
          </div>
          {featureDef?.dependencies && featureDef.dependencies.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Requires:</strong> {featureDef.dependencies.map(dep => FEATURE_DEFINITIONS[dep]?.name || dep).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// Higher-order component for feature gating
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: FeatureKey,
  options?: Omit<FeatureGateProps, 'feature' | 'children'>
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature} {...options}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}

// Hook for conditional feature access
export const useFeatureGate = (feature: FeatureKey) => {
  const { hasFeature, isLoading } = useFeatures();
  return {
    hasAccess: hasFeature(feature),
    isLoading,
    featureDefinition: FEATURE_DEFINITIONS[feature],
  };
};

export default FeatureGate;