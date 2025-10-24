import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Loader2 } from 'lucide-react';

interface ModernButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  children,
  onClick,
  loading = false,
  disabled = false,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button'
}) => {
  const { isDark } = useTheme();

  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return `${
          isDark
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
        }`;
      case 'secondary':
        return `${
          isDark
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        }`;
      case 'outline':
        return `${
          isDark
            ? 'bg-transparent border border-gray-700 hover:bg-gray-700/10 text-white'
            : 'bg-transparent border border-gray-300 hover:bg-gray-100 text-gray-800'
        }`;
      case 'danger':
        return `${
          isDark
            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
            : 'bg-red-100 hover:bg-red-200 text-red-600 border border-red-200'
        }`;
      case 'glass':
        return `${
          isDark
            ? 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30'
            : 'bg-white/20 backdrop-blur-md border border-gray-300/30 text-gray-800 hover:bg-white/30'
        }`;
      case 'ghost':
        return `${
          isDark
            ? 'bg-transparent hover:bg-gray-700/20 text-gray-200'
            : 'bg-transparent hover:bg-gray-100 text-gray-700'
        }`;
      default:
        return `${
          isDark
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
        }`;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'px-3 py-1.5 text-sm';
      case 'md': return 'px-4 py-2';
      case 'lg': return 'px-6 py-3 text-lg';
      default: return 'px-4 py-2';
    }
  };

  // Only apply hover effects to certain variants
  const getHoverEffects = () => {
    const isTransformVariant = ['primary', 'secondary', 'danger'].includes(variant);
    return isTransformVariant && !disabled && !loading ? 'transform hover:-translate-y-1 hover:shadow-md' : '';
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        rounded-lg transition-all duration-200 font-medium
        ${getVariantClass()} ${getSizeClass()} 
        ${getHoverEffects()}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </div>
    </button>
  );
};