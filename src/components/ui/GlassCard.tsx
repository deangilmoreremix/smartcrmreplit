import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick,
  hover = true 
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`
        ${isDark 
          ? 'bg-white/5 backdrop-blur-xl border border-white/10' 
          : 'bg-white/95 backdrop-blur-xl border border-gray-200'
        } rounded-2xl 
        ${hover ? `transition-all duration-300 ${isDark ? 'hover:bg-white/10' : 'hover:bg-white/100'} ${hover ? 'hover:shadow-xl hover:scale-[1.02]' : ''}` : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};