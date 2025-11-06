import React, { useState, useEffect, useRef } from 'react';
import { useDealStore } from '../store/dealStore';
import { useContactStore } from '../hooks/useContactStore';
import { useGemini } from '../services/geminiService';
import { useTaskStore } from '../store/taskStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { useAITools } from './AIToolsProvider';
import { useTheme } from '../contexts/ThemeContext';
import { useDashboardLayout } from '../contexts/DashboardLayoutContext';
import { useFeatures } from '../contexts/FeatureContext';
import DraggableSection from './DraggableSection';
import DashboardLayoutControls from './DashboardLayoutControls';

// Import section components
import ExecutiveOverviewSection from './sections/ExecutiveOverviewSection';
import AISmartFeaturesHub from './sections/AISmartFeaturesHub';
import SalesPipelineDealAnalytics from './sections/SalesPipelineDealAnalytics';
import CustomerLeadManagement from './sections/CustomerLeadManagement';
import ActivitiesCommunications from './sections/ActivitiesCommunications';
import IntegrationsSystem from './sections/IntegrationsSystem';

// Keep legacy components for backward compatibility
import MetricsCards from './dashboard/MetricsCards';
import InteractionHistory from './dashboard/InteractionHistory';
import TasksAndFunnel from './dashboard/TasksAndFunnel';
import CustomerProfile from './dashboard/CustomerProfile';
import RecentActivity from './dashboard/RecentActivity';
import DashboardHeader from './dashboard/DashboardHeader';
import ChartsSection from './dashboard/ChartsSection';
import ConnectedApps from './dashboard/ConnectedApps';
import AIInsightsPanel from './dashboard/AIInsightsPanel';
import NewLeadsSection from './dashboard/NewLeadsSection';
import KPICards from './dashboard/KPICards';
import QuickActions from './dashboard/QuickActions';

// Video call components
import PersistentVideoCallButton from './PersistentVideoCallButton';
import VideoCallPreviewWidget from './VideoCallPreviewWidget';
import VideoCallOverlay from './VideoCallOverlay';

// Memo Dashboard component to prevent unnecessary re-renders
const Dashboard: React.FC = React.memo(() => {
  const {
    deals,
    fetchDeals,
    isLoading
  } = useDealStore();

  const {
    contacts,
    fetchContacts,
    isLoading: contactsLoading
  } = useContactStore();

  const { appointments, fetchAppointments } = useAppointmentStore();
  const { openTool } = useAITools();
  const { isDark } = useTheme();
  const { sectionOrder } = useDashboardLayout();
  const { hasFeature } = useFeatures();
  
  const gemini = useGemini();
  
  // Prevent repeated data fetching by using a ref to track initialization
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only fetch data once
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Fetch all data when component mounts
    fetchDeals();
    fetchContacts();

    // Wrap in try/catch to prevent errors from breaking the app
    try {
      fetchAppointments();
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }

    // Set up timer to refresh data periodically
    const intervalId = setInterval(() => {
      fetchDeals();
      fetchContacts();
    }, 300000); // Refresh every 5 minutes

    // Proper cleanup
    return () => clearInterval(intervalId);
  }, [fetchDeals, fetchContacts, fetchAppointments]);
  
  // Render section content based on section ID
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      // Check if section component exists before rendering
      case 'executive-overview-section':
        return typeof ExecutiveOverviewSection === 'function' ? <ExecutiveOverviewSection /> : null;

      case 'ai-smart-features-hub':
        return hasFeature('aiTools') && typeof AISmartFeaturesHub === 'function' ? <AISmartFeaturesHub /> : null;

      case 'sales-pipeline-deal-analytics':
        return hasFeature('pipeline') && typeof SalesPipelineDealAnalytics === 'function' ? <SalesPipelineDealAnalytics /> : null;

      case 'customer-lead-management':
        return hasFeature('contacts') && typeof CustomerLeadManagement === 'function' ? <CustomerLeadManagement /> : null;

      case 'activities-communications':
        return hasFeature('communication') && typeof ActivitiesCommunications === 'function' ? <ActivitiesCommunications /> : null;

      case 'integrations-system':
        return hasFeature('customIntegrations') && typeof IntegrationsSystem === 'function' ? <IntegrationsSystem /> : null;

      // Legacy sections (kept for backward compatibility)
      case 'metrics-cards-section':
        return <MetricsCards />;

      case 'kpi-cards-section':
        return <KPICards />;

      case 'quick-actions-section':
        return <QuickActions />;

      case 'ai-insights-section':
        return hasFeature('aiTools') && <AIInsightsPanel />;

      case 'interaction-history-section':
        return <InteractionHistory />;

      case 'customer-profile-section':
        return <CustomerProfile />;

      case 'recent-activity-section':
        return <RecentActivity />;

      case 'tasks-and-funnel-section':
        return hasFeature('tasks') && <TasksAndFunnel />;

      case 'charts-section':
        return hasFeature('analytics') && <ChartsSection />;

      case 'analytics-section':
        return hasFeature('analytics') && <ChartsSection />;

      case 'apps-section':
        return hasFeature('customIntegrations') && <ConnectedApps />;

      default:
        return null;
    }
  };

  return (
    <main className="w-full h-full overflow-y-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      {/* Dashboard Layout Controls */}
      <DashboardLayoutControls />

      {/* Draggable Sections */}
      <div className="space-y-8 pb-20">
        {sectionOrder.map((sectionId, index) => (
          <DraggableSection
            key={sectionId}
            sectionId={sectionId}
            index={index}
          >
            <div id={sectionId}>
              {renderSectionContent(sectionId)}
            </div>
          </DraggableSection>
        ))}
      </div>

      {/* Video Call Components */}
      <PersistentVideoCallButton />
      <VideoCallPreviewWidget />
      <VideoCallOverlay />
    </main>
  );
});

export default Dashboard;