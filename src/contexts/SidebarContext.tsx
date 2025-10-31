import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SidebarSection {
  id: string;
  title: string;
  icon: any; // Lucide icon component
  items: SidebarItem[];
  color: string;
  isExpanded: boolean;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any; // Lucide icon component
  path?: string;
  action?: () => void;
  badge?: number | null;
  badgeColor?: string;
  isActive?: boolean;
  feature?: string; // Feature gate key
  external?: boolean;
  children?: SidebarItem[];
}

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  toggleCollapse: () => void;
  sections: SidebarSection[];
  setSections: React.Dispatch<React.SetStateAction<SidebarSection[]>>;
  toggleSection: (sectionId: string) => void;
  activeItem: string | null;
  setActiveItem: (itemId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredSections: SidebarSection[];
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: React.ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  // Load persisted state
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar-open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('sidebar-open', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev: boolean) => !prev);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev: boolean) => !prev);
  }, []);

  // Placeholder sections - will be populated by the Sidebar component
  const [sections, setSections] = useState<SidebarSection[]>([]);

  const toggleSection = useCallback((sectionId: string) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    );
  }, []);

  // Filter sections based on search query
  const filteredSections = React.useMemo(() => {
    if (!searchQuery.trim()) return sections;

    return sections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(section => section.items.length > 0 || section.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [sections, searchQuery]);

  const value: SidebarContextType = {
    isOpen,
    isCollapsed,
    toggleSidebar,
    toggleCollapse,
    sections,
    setSections,
    toggleSection,
    activeItem,
    setActiveItem,
    searchQuery,
    setSearchQuery,
    filteredSections,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};