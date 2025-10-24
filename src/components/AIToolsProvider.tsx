import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface AIToolsContextType {
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

  const openTool = useCallback((toolName: string) => {
    setCurrentTool(toolName);
  }, []);

  const closeTool = useCallback(() => {
    setCurrentTool(null);
  }, []);

  const contextValue = useMemo(() => ({
    openTool,
    closeTool,
    currentTool
  }), [openTool, closeTool, currentTool]);

  return (
    <AIToolsContext.Provider value={contextValue}>
      {children}
    </AIToolsContext.Provider>
  );
};