// src/App.tsx

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AIToolsProvider } from './components/AIToolsProvider';
import { ModalsProvider } from './components/ModalsProvider';
import { EnhancedHelpProvider } from './contexts/EnhancedHelpContext';
import { VideoCallProvider } from './contexts/VideoCallContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { DashboardLayoutProvider } from './contexts/DashboardLayoutContext';
import { AIProvider } from './contexts/AIContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeatureProvider } from './contexts/FeatureContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { FeatureGate } from './components/FeatureGate';
import ProtectedLayout from './components/ProtectedLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { PageLoadingState } from './components/ui/LoadingStates';

// Eager pages
import Dashboard from './pages/Dashboard';
import SystemOverview from './pages/SystemOverview';
import LandingPage from './pages/landing/LandingPage';
import AuthPage from './pages/AuthPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Lazy pages
const Tasks = lazy(() => import('./pages/Tasks'));
const TasksNew = lazy(() => import('./pages/TasksNew'));
const Communication = lazy(() => import('./pages/Communication'));
const Contacts = lazy(() => import('./pages/Contacts')); // details handled via modal inside
const Pipeline = lazy(() => import('./pages/Pipeline'));
const AITools = lazy(() => import('./pages/AITools'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AIIntegration = lazy(() => import('./pages/AIIntegration'));
const MobileResponsiveness = lazy(() => import('./pages/MobileResponsiveness'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));

import './components/styles/design-system.css';

// Reusable placeholder
const PlaceholderPage = ({ title, description }: { title: string; description?: string }) => (
  <div className="min-h-screen bg-gray-50 p-8">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{title}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">{description || 'This page is coming soon...'}</p>
      </div>
    </div>
  </div>
);

// Protected route component using real auth
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoadingState
      title="Authenticating..."
      description="Please wait while we verify your credentials"
    />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <FeatureProvider>
        <SidebarProvider>
          <ThemeProvider>
            <AIToolsProvider>
              <ModalsProvider>
                <EnhancedHelpProvider>
                  <VideoCallProvider>
                    <NavigationProvider>
                      <DashboardLayoutProvider>
                        <AIProvider>
                          <ErrorBoundary>
                            <Suspense fallback={<PageLoadingState title="Loading SmartCRM" description="Please wait while we prepare your dashboard..." />}>
                              <Routes>
                                {/* Public routes - no sidebar */}
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/auth" element={<AuthPage />} />
                                <Route path="/auth/recovery" element={<ForgotPassword />} />
                                <Route path="/auth/reset-password" element={<ResetPassword />} />

                              {/* Protected routes with sidebar layout */}
                              <Route
                                path="/dashboard"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <Dashboard />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/system-overview"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <SystemOverview />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/analytics"
                                element={
                                  <ProtectedRoute>
                                    <FeatureGate feature="analytics">
                                      <ProtectedLayout>
                                        <Analytics />
                                      </ProtectedLayout>
                                    </FeatureGate>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/ai-integration"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <AIIntegration />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/ai-tools"
                                element={
                                  <ProtectedRoute>
                                    <FeatureGate feature="aiTools">
                                      <ProtectedLayout>
                                        <AITools />
                                      </ProtectedLayout>
                                    </FeatureGate>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/pipeline"
                                element={
                                  <ProtectedRoute>
                                    <FeatureGate feature="pipeline">
                                      <ProtectedLayout>
                                        <Pipeline />
                                      </ProtectedLayout>
                                    </FeatureGate>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/mobile"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <MobileResponsiveness />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/contacts"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <Contacts />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/contacts/:id"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <Contacts />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/tasks"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <TasksNew />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/appointments"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <TasksNew />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/tasks-legacy"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <Tasks />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/sales-tools"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Sales Tools" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/lead-automation"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Lead Automation" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/circle-prospecting"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Circle Prospecting" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/phone-system"
                                element={
                                  <ProtectedRoute>
                                    <FeatureGate feature="phoneSystem">
                                      <ProtectedLayout>
                                        <PlaceholderPage title="Phone System" />
                                      </ProtectedLayout>
                                    </FeatureGate>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/invoicing"
                                element={
                                  <ProtectedRoute>
                                    <FeatureGate feature="invoicing">
                                      <ProtectedLayout>
                                        <PlaceholderPage title="Invoicing" />
                                      </ProtectedLayout>
                                    </FeatureGate>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/sales-analytics"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Sales Analytics" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/quote-builder"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Quote Builder" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/commission-tracker"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Commission Tracker" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/follow-up-reminders"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Follow-up Reminders" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/territory-management"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Territory Management" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/task-automation"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Task Automation" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/project-tracker"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Project Tracker" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/time-tracking"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Time Tracking" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/workflow-builder"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Workflow Builder" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/deadline-manager"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Deadline Manager" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/video-email"
                                element={
                                  <ProtectedRoute>
                                    <FeatureGate feature="videoEmail">
                                      <ProtectedLayout>
                                        <PlaceholderPage title="Video Email" />
                                      </ProtectedLayout>
                                    </FeatureGate>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/text-messages"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Text Messages" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/email-composer"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <Communication />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/communication"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <Communication />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/campaigns"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Campaigns" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/group-calls"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Group Calls" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/call-recording"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Call Recording" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/in-call-messaging"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="In-Call Messaging" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/call-analytics"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Call Analytics" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/connection-quality"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Connection Quality Monitor" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/content-library"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Content Library" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/voice-profiles"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Voice Profiles" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/business-analysis"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Business Analysis" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/image-generator"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Image Generator" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/forms"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Forms" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/ai-model-demo"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="AI Model Demo" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/white-label"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="White-Label Customization" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/super-admin"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <SuperAdminDashboard />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/user-management"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <UserManagement />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/settings"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Settings" description="Settings page coming soon" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/ai-goals"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="AI Goals" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/features/ai-tools"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="AI Tools Features" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/features/contacts"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Contact Management Features" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/features/pipeline"
                                element={
                                  <ProtectedRoute>
                                    <ProtectedLayout>
                                      <PlaceholderPage title="Pipeline Features" />
                                    </ProtectedLayout>
                                  </ProtectedRoute>
                                }
                              />

                              {/* Fallback */}
                              <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                          </Suspense>
                        </ErrorBoundary>
                      </AIProvider>
                      </DashboardLayoutProvider>
                    </NavigationProvider>
                  </VideoCallProvider>
                </EnhancedHelpProvider>
              </ModalsProvider>
            </AIToolsProvider>
          </ThemeProvider>
        </SidebarProvider>
      </FeatureProvider>
    </AuthProvider>
  );
}

export default App;
