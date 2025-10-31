import React from 'react';
import { useFeatures, FeatureKey } from '../contexts/FeatureContext';
import { AlertCircle, Lock } from 'lucide-react';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showMessage = true
}) => {
  const { hasFeature } = useFeatures();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showMessage) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-md">
          <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Feature Not Available
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            This feature is not enabled for your account. Please contact your administrator to enable it.
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Feature: {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default FeatureGate;