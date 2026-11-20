import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface AIToolsContextType {
  /** Open an AI tool by id (see components/aiTools/registry.tsx) on the /ai-tools hub. */
  openTool: (toolName: string) => void;
  closeTool: () => void;
  currentTool: string | null;
}

const AIToolsContext = createContext<AIToolsContextType | undefined>(undefined);

export const useAITools = () => {
  const context = useContext(AIToolsContext);
  if (!context) {
    throw new Error('useAITools must be used within an AIToolsProvider');
  }
  return context;
};

export const AIToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const navigate = useNavigate();

  const openTool = useCallback(
    (toolName: string) => {
      // "ai-tools" is the hub itself (sidebar item), not a tool.
      if (!toolName || toolName === 'ai-tools') {
        setCurrentTool(null);
        navigate('/ai-tools');
        return;
      }
      setCurrentTool(toolName);
      navigate(`/ai-tools?tool=${encodeURIComponent(toolName)}`);
    },
    [navigate],
  );

  const closeTool = useCallback(() => {
    setCurrentTool(null);
  }, []);

  const contextValue = useMemo(() => ({ openTool, closeTool, currentTool }), [openTool, closeTool, currentTool]);

  return <AIToolsContext.Provider value={contextValue}>{children}</AIToolsContext.Provider>;
};
