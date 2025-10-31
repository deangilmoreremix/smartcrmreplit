import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Shield, Users, Building2, DollarSign, Settings, CheckCircle, XCircle, Clock, Eye, Edit, Trash2, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAuditLogger } from '../hooks/useAuditLogger';
import { useRateLimiter } from '../hooks/useRateLimiter';
import { useFeatures } from '../contexts/FeatureContext';
import { TenantTable } from '../components/admin/TenantTable';
import { Pagination } from '../components/admin/Pagination';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  status: 'active' | 'pending' | 'suspended';
  type: 'partner' | 'customer';
  plan: 'basic' | 'pro' | 'enterprise';
  contactEmail: string;
  monthlyRevenue: number;
  userCount: number;
  createdAt: string;
  parentPartnerId?: string;
}

interface PlatformStats {
  totalTenants: number;
  totalPartners: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingApprovals: number;
}

export default function SuperAdminDashboard() {
  const { user, isAuthenticated, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { logTenantAction, logPartnerAction } = useAuditLogger();
  const { executeWithRateLimit } = useRateLimiter({ maxRequests: 10, windowMs: 60000 }); // 10 actions per minute
  const { updateGlobalFeature, globalFeatures } = useFeatures();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pendingPartners, setPendingPartners] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingTenant, setUpdatingTenant] = useState<string | null>(null);
  const [approvingPartner, setApprovingPartner] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Tenant>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    // Check authentication and permissions
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!hasRole('super_admin')) {
      navigate('/unauthorized');
      return;
    }

    fetchAdminData();
  }, [isAuthenticated, hasRole, navigate]);

  const fetchAdminData = async () => {
    try {
      setError(null);

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch all tenants
      const tenantsResponse = await fetch('/api/white-label/tenants', { headers });
      if (!tenantsResponse.ok) {
        throw new Error(`Failed to fetch tenants: ${tenantsResponse.status}`);
      }
      const tenantsData = await tenantsResponse.json();
      setTenants(tenantsData);

      // Fetch pending partners
      const pendingResponse = await fetch('/api/partners/pending', { headers });
      if (!pendingResponse.ok) {
        throw new Error(`Failed to fetch pending partners: ${pendingResponse.status}`);
      }
      const pendingData = await pendingResponse.json();
      setPendingPartners(pendingData);

      // Calculate stats
      calculatePlatformStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch admin data';
      setError(errorMessage);
      console.error('Failed to fetch admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePlatformStats = () => {
    const partners = tenants.filter(t => t.type === 'partner');
    const customers = tenants.filter(t => t.type === 'customer');
    const totalRevenue = tenants.reduce((sum, t) => sum + t.monthlyRevenue, 0);

    setStats({
      totalTenants: tenants.length,
      totalPartners: partners.length,
      totalCustomers: customers.length,
      totalRevenue,
      pendingApprovals: pendingPartners.length,
    });
  };

  const approvePartner = async (partnerId: string) => {
    if (!hasPermission('approve_partners')) {
      setError('You do not have permission to approve partners');
      return;
    }

    const result = await executeWithRateLimit(
      async () => {
        setApprovingPartner(partnerId);
        setError(null);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/partners/${partnerId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to approve partner');
        }

        setSuccessMessage('Partner approved successfully!');
        await logPartnerAction('approve', partnerId, { previousStatus: 'pending', newStatus: 'active' });
        fetchAdminData(); // Refresh data

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
        return true;
      },
      () => setError('Too many requests. Please wait before trying again.')
    );

    if (result === null) {
      // Rate limited
      return;
    }

    setApprovingPartner(null);
  };

  const suspendTenant = async (tenantId: string) => {
    if (!hasPermission('manage_tenants')) {
      setError('You do not have permission to manage tenants');
      return;
    }

    if (!confirm('Are you sure you want to suspend this tenant?')) {
      return;
    }

    const result = await executeWithRateLimit(
      async () => {
        setUpdatingTenant(tenantId);
        setError(null);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/white-label/tenants/${tenantId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'suspended' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to suspend tenant');
        }

        setSuccessMessage('Tenant suspended successfully!');
        await logTenantAction('suspend', tenantId, { previousStatus: 'active', newStatus: 'suspended' });
        fetchAdminData();

        setTimeout(() => setSuccessMessage(null), 3000);
        return true;
      },
      () => setError('Too many requests. Please wait before trying again.')
    );

    if (result === null) {
      // Rate limited
      return;
    }

    setUpdatingTenant(null);
  };

  const deleteTenant = async (tenantId: string) => {
    if (!hasPermission('delete_tenants')) {
      setError('You do not have permission to delete tenants');
      return;
    }

    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    const result = await executeWithRateLimit(
      async () => {
        setUpdatingTenant(tenantId);
        setError(null);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/white-label/tenants/${tenantId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete tenant');
        }

        setSuccessMessage('Tenant deleted successfully!');
        await logTenantAction('delete', tenantId, { tenantName: selectedTenant?.name });
        fetchAdminData();

        setTimeout(() => setSuccessMessage(null), 3000);
        return true;
      },
      () => setError('Too many requests. Please wait before trying again.')
    );

    if (result === null) {
      // Rate limited
      return;
    }

    setUpdatingTenant(null);
  };

  // Sample growth data
  const growthData = [
    { month: 'Jan', partners: 5, customers: 45, revenue: 15000 },
    { month: 'Feb', partners: 8, customers: 72, revenue: 24000 },
    { month: 'Mar', partners: 12, customers: 108, revenue: 36000 },
    { month: 'Apr', partners: 18, customers: 162, revenue: 54000 },
    { month: 'May', partners: 25, customers: 230, revenue: 76500 },
    { month: 'Jun', partners: 35, customers: 315, revenue: 105000 },
  ];

  // Input validation functions
  const validateTenantForm = (data: Partial<Tenant>): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.name?.trim()) {
      errors.name = 'Tenant name is required';
    } else if (data.name.length < 2) {
      errors.name = 'Tenant name must be at least 2 characters';
    }

    if (!data.subdomain?.trim()) {
      errors.subdomain = 'Subdomain is required';
    } else if (!/^[a-z0-9-]+$/.test(data.subdomain)) {
      errors.subdomain = 'Subdomain can only contain lowercase letters, numbers, and hyphens';
    }

    if (data.monthlyRevenue !== undefined && data.monthlyRevenue < 0) {
      errors.monthlyRevenue = 'Monthly revenue cannot be negative';
    }

    if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
    }

    return errors;
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditFormData({ ...tenant });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSaveTenant = async () => {
    if (!selectedTenant) return;

    const errors = validateTenantForm(editFormData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const result = await executeWithRateLimit(
      async () => {
        setUpdatingTenant(selectedTenant.id);
        setError(null);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/white-label/tenants/${selectedTenant.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editFormData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update tenant');
        }

        setSuccessMessage('Tenant updated successfully!');
        await logTenantAction('update', selectedTenant.id, {
          changes: editFormData,
          previousData: selectedTenant
        });
        setShowEditModal(false);
        fetchAdminData();

        setTimeout(() => setSuccessMessage(null), 3000);
        return true;
      },
      () => setError('Too many requests. Please wait before trying again.')
    );

    if (result === null) {
      // Rate limited
      return;
    }

    setUpdatingTenant(null);
  };

  // Pagination logic
  const totalPages = Math.ceil(tenants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTenants = tenants.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated or not authorized
  if (!isAuthenticated || !hasRole('super_admin')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            You don't have permission to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Super Admin Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Manage all white-label partners and tenants
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Tenant
              </button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Platform Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart },
              { id: 'tenants', label: 'All Tenants', icon: Building2 },
              { id: 'pending', label: `Pending (${pendingPartners.length})`, icon: Clock },
              { id: 'analytics', label: 'Platform Analytics', icon: DollarSign },
              { id: 'settings', label: 'System Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Total Tenants
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalTenants || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Partners
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalPartners || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Customers
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.totalCustomers || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Monthly Revenue
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${stats?.totalRevenue?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Pending Approvals
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats?.pendingApprovals || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Growth Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Platform Growth Trends
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="partners" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="customers" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Tenant Activity
              </h3>
              <div className="space-y-4">
                {tenants.slice(0, 5).map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        tenant.status === 'active' ? 'bg-green-500' :
                        tenant.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{tenant.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {tenant.type} • {tenant.plan} plan
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Tenants Tab */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <TenantTable
              tenants={currentTenants}
              updatingTenant={updatingTenant}
              onView={(tenant) => {/* TODO: Implement view functionality */}}
              onEdit={handleEditTenant}
              onSuspend={suspendTenant}
              onDelete={deleteTenant}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={tenants.length}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pending Partner Approvals
                </h3>
              </div>
              {pendingPartners.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Subdomain
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Applied
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {pendingPartners.map((partner) => (
                        <tr key={partner.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {partner.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {partner.contactEmail}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {partner.subdomain}.smartcrm.com
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {new Date(partner.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => approvePartner(partner.id)}
                                disabled={approvingPartner === partner.id}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded flex items-center gap-1"
                              >
                                {approvingPartner === partner.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Approve
                              </button>
                              <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1">
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-300">
                  No pending partner applications
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Platform Revenue Trends
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Average Revenue Per Tenant
                </h4>
                <p className="text-3xl font-bold text-blue-600">$425</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Platform Growth Rate
                </h4>
                <p className="text-3xl font-bold text-green-600">+87%</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Tenant Retention Rate
                </h4>
                <p className="text-3xl font-bold text-purple-600">96%</p>
              </div>
            </div>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Platform Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Partner Revenue Share (%)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="30"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Auto-Approve Partners
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="false">Manual Approval Required</option>
                    <option value="true">Auto-Approve All</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Users Per Tenant
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trial Period (days)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="14"
                  />
                </div>
              </div>
              <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                Save Configuration
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Feature Flag Management
              </h3>
              <div className="space-y-4">
                {[
                  { name: 'AI Tools', key: 'aiTools', description: 'AI-powered features and assistants' },
                  { name: 'Advanced Analytics', key: 'advancedAnalytics', description: 'Detailed reporting and insights' },
                  { name: 'Custom Integrations', key: 'customIntegrations', description: 'Third-party API integrations' },
                  { name: 'White-label Branding', key: 'whitelabelBranding', description: 'Custom branding options' },
                  { name: 'API Access', key: 'apiAccess', description: 'Direct API access for integrations' },
                ].map((feature) => (
                  <div key={feature.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{feature.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalFeatures[feature.key as keyof typeof globalFeatures] || false}
                        onChange={async (e) => {
                          try {
                            await updateGlobalFeature(feature.key as any, e.target.checked);
                            setSuccessMessage(`Global feature "${feature.name}" ${e.target.checked ? 'enabled' : 'disabled'} successfully!`);
                            setTimeout(() => setSuccessMessage(null), 3000);
                          } catch (error) {
                            setError(`Failed to update ${feature.name} feature`);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Tenant Modal */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Tenant: {selectedTenant.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Tenant Name
                 </label>
                 <input
                   type="text"
                   value={editFormData.name || ''}
                   onChange={(e) => handleFormChange('name', e.target.value)}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     formErrors.name ? 'border-red-500' : 'border-gray-300'
                   }`}
                 />
                 {formErrors.name && (
                   <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Subdomain
                 </label>
                 <input
                   type="text"
                   value={editFormData.subdomain || ''}
                   onChange={(e) => handleFormChange('subdomain', e.target.value)}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     formErrors.subdomain ? 'border-red-500' : 'border-gray-300'
                   }`}
                 />
                 {formErrors.subdomain && (
                   <p className="mt-1 text-sm text-red-600">{formErrors.subdomain}</p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Plan
                 </label>
                 <select
                   value={editFormData.plan || 'basic'}
                   onChange={(e) => handleFormChange('plan', e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                   <option value="basic">Basic</option>
                   <option value="pro">Pro</option>
                   <option value="enterprise">Enterprise</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Status
                 </label>
                 <select
                   value={editFormData.status || 'active'}
                   onChange={(e) => handleFormChange('status', e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                   <option value="active">Active</option>
                   <option value="suspended">Suspended</option>
                   <option value="pending">Pending</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Monthly Revenue
                 </label>
                 <input
                   type="number"
                   value={editFormData.monthlyRevenue || 0}
                   onChange={(e) => handleFormChange('monthlyRevenue', parseFloat(e.target.value) || 0)}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     formErrors.monthlyRevenue ? 'border-red-500' : 'border-gray-300'
                   }`}
                   min="0"
                   step="0.01"
                 />
                 {formErrors.monthlyRevenue && (
                   <p className="mt-1 text-sm text-red-600">{formErrors.monthlyRevenue}</p>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Contact Email
                 </label>
                 <input
                   type="email"
                   value={editFormData.contactEmail || ''}
                   onChange={(e) => handleFormChange('contactEmail', e.target.value)}
                   className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                     formErrors.contactEmail ? 'border-red-500' : 'border-gray-300'
                   }`}
                 />
                 {formErrors.contactEmail && (
                   <p className="mt-1 text-sm text-red-600">{formErrors.contactEmail}</p>
                 )}
               </div>
             </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={updatingTenant !== null}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTenant}
                disabled={updatingTenant !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {updatingTenant !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}