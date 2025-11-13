import React from 'react';
import { Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center py-8 space-y-4", className)}>
      <Loader2 className={cn(`${sizeClasses[size]} animate-spin text-blue-600`)} />
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
          {message}
        </p>
      )}
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, animate = true }) => {
  return (
    <div
      className={cn(
        "bg-gray-200 dark:bg-gray-700 rounded",
        animate && "animate-pulse",
        className
      )}
    />
  );
};

interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  showAvatar = false,
  className
}) => {
  return (
    <div className={cn("p-6 bg-white dark:bg-gray-800 rounded-lg shadow", className)}>
      {showAvatar && (
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-4",
              i === lines - 1 ? "w-3/4" : "w-full"
            )}
          />
        ))}
      </div>
    </div>
  );
};

interface PageLoadingStateProps {
  title?: string;
  description?: string;
  showProgress?: boolean;
  progress?: number;
}

export const PageLoadingState: React.FC<PageLoadingStateProps> = ({
  title = "Loading...",
  description,
  showProgress = false,
  progress
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-4">
          <LoadingSpinner size="lg" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {showProgress && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {progress || 0}% complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'warning';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  size = 'md'
}) => {
  const icons = {
    loading: Loader2,
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle
  };

  const colors = {
    loading: 'text-blue-600',
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600'
  };

  const Icon = icons[status];
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center space-x-2">
      <Icon className={cn(`${sizeClasses[size]} ${colors[status]}`, status === 'loading' && 'animate-spin')} />
      {message && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {message}
        </span>
      )}
    </div>
  );
};

interface DataLoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

export const DataLoadingState: React.FC<DataLoadingStateProps> = ({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent
}) => {
  if (isLoading) {
    return loadingComponent || <LoadingSpinner message="Loading data..." />;
  }

  if (error) {
    return errorComponent || (
      <div className="flex items-center justify-center py-8">
        <StatusIndicator status="error" message={error} />
      </div>
    );
  }

  return <>{children}</>;
};

// Dashboard-specific loading states
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="w-64 h-8" />
          <Skeleton className="w-96 h-4" />
        </div>
        <Skeleton className="w-32 h-10" />
      </div>

      {/* Metrics cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
            <Skeleton className="w-20 h-8 mt-4" />
            <Skeleton className="w-24 h-3 mt-2" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={6} />
        </div>
        <div className="space-y-6">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </div>
  );
};

// Route transition loading
export const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="animate-in fade-in-0 duration-300">
      {children}
    </div>
  );
};