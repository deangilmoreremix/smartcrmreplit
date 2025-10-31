import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Search, X, Menu, Home, Users, Briefcase, BarChart3,
  Target, Brain, Calendar, MessageSquare, Video, FileText, Zap, Grid3X3,
  CheckSquare, DollarSign, Phone, Receipt, BookOpen, Mic, Sun, Moon,
  Sparkles, Activity, Settings, User, Bell, ExternalLink, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useFeatures } from '../contexts/FeatureContext';
import { useDealStore } from "../store/dealStore";
import { useContactStore } from "../hooks/useContactStore";
import { useTaskStore } from "../store/taskStore";
import { useAppointmentStore } from "../store/appointmentStore";
import { FeatureGate } from './FeatureGate';

interface SidebarProps {
  onOpenPipelineModal?: () => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ onOpenPipelineModal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { openAITool } = useNavigation();
  const { hasFeature } = useFeatures();
  const {
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
    filteredSections
  } = useSidebar();

  // Data sources for counters
  const { deals } = useDealStore();
  const { contacts } = useContactStore();
  const { tasks } = useTaskStore();
  const { appointments } = useAppointmentStore();

  // Counters
  const counters = useMemo(() => {
    const activeDeals = Object.values(deals).filter(
      deal => deal.stage !== ('closed-won' as any) && deal.stage !== ('closed-lost' as any)
    ).length;

    const hotContacts = Object.values(contacts).filter(contact =>
      (contact as any)?.interestLevel === 'hot' ||
      (contact as any)?.status?.toLowerCase?.() === 'hot'
    ).length;

    const pendingTasks = Object.values(tasks).filter(task => !task.completed).length;

    const todayAppointments = Object.values(appointments).filter(apt => {
      if (!apt.startTime) return false;
      const today = new Date();
      const aptDate = new Date(apt.startTime);
      return aptDate.toDateString() === today.toDateString() && apt.status === 'scheduled';
    }).length;

    return {
      activeDeals,
      hotContacts,
      pendingTasks,
      todayAppointments,
      totalNotifications: hotContacts + pendingTasks + todayAppointments
    };
  }, [deals, contacts, tasks, appointments]);

  // Sidebar sections configuration
  const sidebarSections = useMemo(() => [
    {
      id: 'core',
      title: 'Core',
      icon: Home,
      color: 'from-blue-500 to-green-500',
      isExpanded: true,
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: Home,
          path: '/dashboard',
          badge: null,
          feature: 'smartcrm'
        },
        {
          id: 'contacts',
          label: 'Contacts',
          icon: Users,
          path: '/contacts',
          badge: counters.hotContacts,
          badgeColor: 'bg-purple-500',
          feature: 'contacts'
        },
        {
          id: 'pipeline',
          label: 'Pipeline',
          icon: Briefcase,
          action: () => onOpenPipelineModal?.(),
          badge: counters.activeDeals,
          badgeColor: 'bg-green-500',
          feature: 'pipeline'
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          path: '/analytics',
          badge: null,
          feature: 'analytics'
        }
      ]
    },
    {
      id: 'ai-automation',
      title: 'AI & Automation',
      icon: Brain,
      color: 'from-purple-500 to-indigo-500',
      isExpanded: true,
      items: [
        {
          id: 'ai-goals',
          label: 'AI Goals',
          icon: Target,
          path: '/ai-goals',
          badge: 58,
          badgeColor: 'bg-orange-500',
          feature: 'aiBoost'
        },
        {
          id: 'ai-tools',
          label: 'AI Tools',
          icon: Brain,
          path: '/ai-tools',
          badge: null,
          feature: 'aiTools'
        }
      ]
    },
    {
      id: 'sales-marketing',
      title: 'Sales & Marketing',
      icon: DollarSign,
      color: 'from-green-500 to-teal-500',
      isExpanded: false,
      items: [
        {
          id: 'sales-tools',
          label: 'Sales Tools',
          icon: DollarSign,
          path: '/sales-tools',
          badge: null,
          feature: 'salesMaximizer'
        },
        {
          id: 'lead-automation',
          label: 'Lead Automation',
          icon: Zap,
          path: '/lead-automation',
          badge: null,
          feature: 'leadAutomation'
        },
        {
          id: 'appointments',
          label: 'Appointments',
          icon: Calendar,
          path: '/appointments',
          badge: counters.todayAppointments,
          badgeColor: 'bg-cyan-500',
          feature: 'appointments'
        },
        {
          id: 'invoicing',
          label: 'Invoicing',
          icon: Receipt,
          path: '/invoicing',
          badge: null,
          feature: 'invoicing'
        }
      ]
    },
    {
      id: 'communication',
      title: 'Communication',
      icon: MessageSquare,
      color: 'from-blue-500 to-sky-500',
      isExpanded: false,
      items: [
        {
          id: 'video-email',
          label: 'Video Email',
          icon: Video,
          path: '/video-email',
          badge: null,
          feature: 'videoEmail'
        },
        {
          id: 'text-messages',
          label: 'Text Messages',
          icon: MessageSquare,
          path: '/text-messages',
          badge: null,
          feature: 'communication'
        },
        {
          id: 'phone-system',
          label: 'Phone System',
          icon: Phone,
          path: '/phone-system',
          badge: null,
          feature: 'phoneSystem'
        }
      ]
    },
    {
      id: 'content-management',
      title: 'Content & Forms',
      icon: FileText,
      color: 'from-amber-500 to-orange-500',
      isExpanded: false,
      items: [
        {
          id: 'forms-surveys',
          label: 'Forms & Surveys',
          icon: FileText,
          path: '/forms-surveys',
          badge: null,
          feature: 'formsSurveys'
        },
        {
          id: 'content-library',
          label: 'Content Library',
          icon: BookOpen,
          path: '/content-library',
          badge: null,
          feature: 'businessIntelligence'
        }
      ]
    },
    {
      id: 'tasks-management',
      title: 'Tasks & Activities',
      icon: CheckSquare,
      color: 'from-orange-500 to-red-500',
      isExpanded: false,
      items: [
        {
          id: 'tasks',
          label: 'Tasks',
          icon: CheckSquare,
          path: '/tasks',
          badge: counters.pendingTasks,
          badgeColor: 'bg-orange-500',
          feature: 'tasks'
        },
        {
          id: 'task-automation',
          label: 'Task Automation',
          icon: Zap,
          path: '/task-automation',
          badge: null,
          feature: 'aiBoost'
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: Grid3X3,
      color: 'from-purple-500 to-violet-500',
      isExpanded: false,
      items: [
        {
          id: 'connected-apps',
          label: 'Connected Apps',
          icon: Grid3X3,
          path: '/connected-apps',
          badge: null,
          feature: 'customIntegrations'
        },
        {
          id: 'api-access',
          label: 'API Access',
          icon: Settings,
          path: '/api-access',
          badge: null,
          feature: 'apiAccess'
        },
        {
          id: 'white-label',
          label: 'White Label',
          icon: Sparkles,
          path: '/white-label',
          badge: null,
          feature: 'whitelabelBranding'
        }
      ]
    }
  ], [counters, onOpenPipelineModal]);

  // Initialize sections
  useEffect(() => {
    setSections(sidebarSections);
  }, [sidebarSections, setSections]);

  // Update active item based on current route
  useEffect(() => {
    const path = location.pathname;
    let foundActiveItem = null;

    for (const section of sections) {
      for (const item of section.items) {
        if (item.path === path) {
          foundActiveItem = item.id;
          break;
        }
      }
      if (foundActiveItem) break;
    }

    setActiveItem(foundActiveItem);
  }, [location.pathname, sections, setActiveItem]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }

      // Toggle collapse with Ctrl/Cmd + \
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleCollapse();
      }

      // Focus search with Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search navigation..."]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleCollapse]);

  const handleItemClick = (item: any) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    } else if (item.id?.includes('ai-tool')) {
      openAITool(item.id);
      navigate('/ai-tools');
    }
    setActiveItem(item.id);
  };

  const renderBadge = (count: number | null, color: string = 'bg-red-500') => {
    if (!count || count === 0) return null;
    return (
      <div className={`absolute -top-1 -right-1 ${color} text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse shadow-lg`}>
        {count > 99 ? '99+' : count}
      </div>
    );
  };

  const displaySections = searchQuery ? filteredSections : sections;

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
        border-r shadow-xl
      `}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Smart<span className="text-green-400">CRM</span>
              </h1>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <button
              onClick={toggleCollapse}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
            </button>

            <button
              onClick={toggleSidebar}
              className={`p-1.5 rounded-lg transition-colors lg:hidden ${
                isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-2">
            {displaySections.map((section) => (
              <div key={section.id} className="mb-2">
                {/* Section Header */}
                {!isCollapsed && (
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                      isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <section.icon size={14} className="opacity-70" />
                      <span>{section.title}</span>
                    </div>
                    {section.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}

                {/* Section Items */}
                {(isCollapsed || section.isExpanded) && (
                  <div className="mt-1 space-y-1">
                    {section.items.map((item) => (
                      <FeatureGate key={item.id} feature={item.feature as any} fallback={null}>
                        <div className="relative">
                          <button
                            onClick={() => handleItemClick(item)}
                            className={`
                              w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 group
                              ${activeItem === item.id
                                ? `bg-gradient-to-r ${section.color} text-white shadow-lg`
                                : isDark
                                  ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                              }
                              ${isCollapsed ? 'justify-center' : 'justify-start'}
                            `}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <item.icon
                              size={16}
                              className={`transition-transform duration-200 ${
                                activeItem === item.id ? 'scale-110' : 'group-hover:scale-110'
                              } ${isCollapsed ? '' : 'mr-3'}`}
                            />
                            {!isCollapsed && (
                              <span className="text-sm font-medium truncate">{item.label}</span>
                            )}
                            {activeItem === item.id && !isCollapsed && (
                              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full`} />
                            )}
                          </button>
                          {item.badge && renderBadge(item.badge, item.badgeColor)}
                        </div>
                      </FeatureGate>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <div className="relative">
                  <button className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}>
                    <Bell size={16} />
                  </button>
                  {counters.totalNotifications > 0 && renderBadge(counters.totalNotifications)}
                </div>
              </div>

              <button className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}>
                <User size={16} />
              </button>
            </div>
          )}

          {isCollapsed && (
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
              </button>

              <div className="relative">
                <button className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}>
                  <Bell size={14} />
                </button>
                {counters.totalNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>

              <button className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}>
                <User size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;