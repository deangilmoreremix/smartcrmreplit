import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Mail, Calendar, Search, Filter, UserCheck, UserX, AlertCircle, CheckCircle, Loader2, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAuditLogger } from '../hooks/useAuditLogger';
import { useRateLimiter } from '../hooks/useRateLimiter';
import { useFeatures } from '../contexts/FeatureContext';
import { Pagination } from '../components/admin/Pagination';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'super_admin' | 'wl_user' | 'regular_user';
  purchasedOtos?: ('smartcrm' | 'oto1_sales_maximizer' | 'oto2_ai_boost' | 'oto3_communication_suite' | 'oto4_business_intelligence')[];
  productTier?: 'smartcrm' | 'sales_maximizer' | 'ai_boost_unlimited'; // Legacy field
  tenantId: string;
  status: 'active' | 'inactive' | 'suspended';
  lastActive: string;
  createdAt: string;
  permissions: string[];
  invitedBy?: string;
  twoFactorEnabled: boolean;
}

interface InviteUserData {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  permissions: string[];
}

export default function UserManagement() {
  const { user, isAuthenticated, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { logAction, logUserFeatureAction } = useAuditLogger();
  const { executeWithRateLimit } = useRateLimiter({ maxRequests: 20, windowMs: 60000 }); // 20 actions per minute for user management
  const { updateUserFeature, hasUserFeature } = useFeatures();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [inviteData, setInviteData] = useState<InviteUserData>({
    email: '',
    role: 'regular_user',
    firstName: '',
    lastName: '',
    permissions: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [invitingUser, setInvitingUser] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedUserForFeatures, setSelectedUserForFeatures] = useState<User | null>(null);

  useEffect(() => {
    // Check authentication and permissions
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!hasRole('super_admin') && user?.email !== 'dev@smartcrm.local') {
      navigate('/unauthorized');
      return;
    }

    fetchUsers();
  }, [isAuthenticated, hasRole, user, navigate]);

  const fetchUsers = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch('/api/users', { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const usersData = await response.json();
      setUsers(usersData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
      setError(errorMessage);
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const inviteUser = async () => {
    const result = await executeWithRateLimit(
      async () => {
        try {
          setInvitingUser(true);
          setError(null);

          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/users/invite', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(inviteData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send invitation');
          }

          setSuccessMessage('User invitation sent successfully!');
          await logAction({
            action: 'invite_user',
            resource: 'user',
            details: { email: inviteData.email, role: inviteData.role }
          });

          setShowInviteModal(false);
          setInviteData({ email: '', role: 'regular_user', firstName: '', lastName: '', permissions: [] });
          fetchUsers();

          setTimeout(() => setSuccessMessage(null), 3000);
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error sending invitation';
          setError(errorMessage);
          return false;
        } finally {
          setInvitingUser(false);
        }
      },
      () => setError('Too many requests. Please wait before trying again.')
    );

    if (result === null) {
      // Rate limited
      return;
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const result = await executeWithRateLimit(
      async () => {
        try {
          setUpdatingUser(userId);
          setError(null);

          const token = localStorage.getItem('authToken');
          const response = await fetch(`/api/users/${userId}/role`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: newRole }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update user role');
          }

          setSuccessMessage('User role updated successfully!');
          await logAction({
            action: 'update_user_role',
            resource: 'user',
            resourceId: userId,
            details: { newRole, previousRole: users.find(u => u.id === userId)?.role }
          });

          fetchUsers();
          setTimeout(() => setSuccessMessage(null), 3000);
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
          setError(errorMessage);
          return false;
        } finally {
          setUpdatingUser(null);
        }
      },
      () => setError('Too many requests. Please wait before trying again.')
    );

    if (result === null) {
      // Rate limited
      return;
    }
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
    const result = await executeWithRateLimit(
      async () => {
        try {
          setUpdatingUser(userId);
          setError(null);

          const token = localStorage.getItem('authToken');
          const response = await fetch(`/api/users/${userId}/status`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update user status');
          }

          setSuccessMessage('User status updated successfully!');
          await logAction({
            action: 'update_user_status',
            resource: 'user',
            resourceId: userId,
            details: { newStatus, previousStatus: users.find(u => u.id === userId)?.status }
          });

          fetchUsers();
          setTimeout(() => setSuccessMessage(null), 3000);
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user status';
          setError(errorMessage);
          return false;
        } finally {
          setUpdatingUser(null);
        }
      },
      () => setError('Too many requests. Please wait before trying again.')
    );

    if (result === null) {
      // Rate limited
      return;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    const result = await executeWithRateLimit(
      async () => {
        try {
          setUpdatingUser(userId);
          setError(null);

          const token = localStorage.getItem('authToken');
          const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete user');
          }

          setSuccessMessage('User deleted successfully!');
          await logAction({
            action: 'delete_user',
            resource: 'user',
            resourceId: userId,
            details: { deletedUser: users.find(u => u.id === userId)?.email }
          });

          fetchUsers();
          setTimeout(() => setSuccessMessage(null), 3000);
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
          setError(errorMessage);
          return false;
        } finally {
          setUpdatingUser(null);
        }
      },
      () => setError('Too many requests. Please wait before trying again.')
    );

    if (result === null) {
      // Rate limited
      return;
    }
  };

  const resendInvitation = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/resend-invite`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Invitation resent successfully!');
      }
    } catch (error) {
      alert('Failed to resend invitation');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleManageFeatures = (user: User) => {
    setSelectedUserForFeatures(user);
    setShowFeatureModal(true);
  };

  const handleFeatureToggle = async (feature: string, enabled: boolean) => {
    if (!selectedUserForFeatures) return;

    try {
      await updateUserFeature(selectedUserForFeatures.id, feature as any, enabled);
      await logUserFeatureAction('update', selectedUserForFeatures.id, feature, {
        enabled,
        previousState: hasUserFeature(feature as any)
      });
      setSuccessMessage('User feature updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError('Failed to update user feature');
    }
  };

  const availableRoles = [
    { value: 'regular_user', label: 'Regular User', description: 'Core CRM features only' },
    { value: 'wl_user', label: 'WL User', description: 'Full CRM + AI tools' },
    { value: 'super_admin', label: 'Super Admin', description: 'Full platform access' },
  ];

  const availablePermissions = [
    'users.create', 'users.edit', 'users.delete',
    'contacts.create', 'contacts.edit', 'contacts.delete',
    'deals.create', 'deals.edit', 'deals.delete',
    'tasks.create', 'tasks.edit', 'tasks.delete',
    'analytics.view', 'billing.view', 'settings.edit',
    'ai_tools.use', 'integrations.manage', 'reports.export'
  ];

  // Show access denied if not authenticated or not authorized
  if (!isAuthenticated || (!hasRole('super_admin') && user?.email !== 'dev@smartcrm.local')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
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
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  User Management
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Manage users and their permissions
                </p>
              </div>
            </div>
            {hasPermission('users.create') && (
              <button
                onClick={() => setShowInviteModal(true)}
                disabled={invitingUser}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                {invitingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" />
                Invite User
              </button>
            )}
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

        {/* Filters and Search */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="wl_user">WL User</option>
            <option value="regular_user">Regular User</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'wl_user' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'regular_user' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' :
                        user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.lastActive).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {hasPermission('users.edit') && (
                          <button
                            onClick={() => setEditingUser(user)}
                            disabled={updatingUser === user.id}
                            className="text-blue-600 hover:text-blue-900 disabled:text-blue-400 flex items-center gap-1"
                          >
                            {updatingUser === user.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                        )}

                        {hasPermission('users.edit') && (
                          <button
                            onClick={() => handleManageFeatures(user)}
                            disabled={updatingUser === user.id}
                            className="text-purple-600 hover:text-purple-900 disabled:text-purple-400 flex items-center gap-1"
                          >
                            <Settings className="h-4 w-4" />
                            Features
                          </button>
                        )}

                        {user.status === 'active' ? (
                          <button
                            onClick={() => updateUserStatus(user.id, 'suspended')}
                            disabled={updatingUser === user.id}
                            className="text-yellow-600 hover:text-yellow-900 disabled:text-yellow-400 flex items-center gap-1"
                          >
                            {updatingUser === user.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            <UserX className="h-4 w-4" />
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserStatus(user.id, 'active')}
                            disabled={updatingUser === user.id}
                            className="text-green-600 hover:text-green-900 disabled:text-green-400 flex items-center gap-1"
                          >
                            {updatingUser === user.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            <UserCheck className="h-4 w-4" />
                            Activate
                          </button>
                        )}

                        {hasPermission('users.delete') && user.id !== user?.id && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={updatingUser === user.id}
                            className="text-red-600 hover:text-red-900 disabled:text-red-400 flex items-center gap-1"
                          >
                            {updatingUser === user.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {/* User Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            { label: 'Total Users', value: users.length, color: 'blue' },
            { label: 'Active Users', value: users.filter(u => u.status === 'active').length, color: 'green' },
            { label: 'Suspended', value: users.filter(u => u.status === 'suspended').length, color: 'red' },
            { label: 'Admins', value: users.filter(u => u.role.includes('admin')).length, color: 'purple' },
            { label: 'Pending Invites', value: users.filter(u => u.status === 'inactive').length, color: 'orange' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</h3>
              <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Invite New User
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={inviteData.firstName}
                  onChange={(e) => setInviteData({...inviteData, firstName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={inviteData.lastName}
                  onChange={(e) => setInviteData({...inviteData, lastName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Permissions
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {availablePermissions.map((permission) => (
                  <label key={permission} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={inviteData.permissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInviteData({
                            ...inviteData,
                            permissions: [...inviteData.permissions, permission]
                          });
                        } else {
                          setInviteData({
                            ...inviteData,
                            permissions: inviteData.permissions.filter(p => p !== permission)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{permission}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={inviteUser}
                disabled={!inviteData.email || !inviteData.role || invitingUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {invitingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit User: {editingUser.email}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => updateUserRole(editingUser.id, e.target.value)}
                  disabled={updatingUser === editingUser.id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={editingUser.status}
                  onChange={(e) => updateUserStatus(editingUser.id, e.target.value)}
                  disabled={updatingUser === editingUser.id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Permissions
              </h4>
              <div className="flex flex-wrap gap-2">
                {editingUser.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                disabled={updatingUser === editingUser.id}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Management Modal */}
      {showFeatureModal && selectedUserForFeatures && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Manage Features: {selectedUserForFeatures.email}
            </h3>

            <div className="space-y-4">
              {[
                { key: 'aiTools', label: 'AI Tools', description: 'Access to AI-powered features and assistants' },
                { key: 'advancedAnalytics', label: 'Advanced Analytics', description: 'Detailed reporting and insights' },
                { key: 'customIntegrations', label: 'Custom Integrations', description: 'Third-party API integrations' },
                { key: 'whitelabelBranding', label: 'White-label Branding', description: 'Custom branding options' },
                { key: 'apiAccess', label: 'API Access', description: 'Direct API access for integrations' },
                { key: 'smartcrm', label: 'SmartCRM Core', description: 'Basic CRM functionality' },
                { key: 'salesMaximizer', label: 'Sales Maximizer', description: 'Advanced sales tools and automation' },
                { key: 'aiBoost', label: 'AI Boost Unlimited', description: 'Unlimited AI usage' },
                { key: 'communicationSuite', label: 'Communication Suite', description: 'Advanced communication tools' },
                { key: 'businessIntelligence', label: 'Business Intelligence', description: 'Advanced BI and reporting' },
                { key: 'videoEmail', label: 'Video Email', description: 'Video email functionality' },
                { key: 'phoneSystem', label: 'Phone System', description: 'Integrated phone system' },
                { key: 'pipeline', label: 'Pipeline Management', description: 'Deal pipeline management' },
                { key: 'contacts', label: 'Contact Management', description: 'Advanced contact features' },
                { key: 'tasks', label: 'Task Management', description: 'Task and project management' },
                { key: 'appointments', label: 'Appointments', description: 'Calendar and scheduling' },
                { key: 'invoicing', label: 'Invoicing', description: 'Invoice creation and management' },
                { key: 'analytics', label: 'Analytics', description: 'Basic analytics and reporting' },
                { key: 'communication', label: 'Communication', description: 'Email and messaging tools' },
                { key: 'formsSurveys', label: 'Forms & Surveys', description: 'Form creation and survey tools' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{feature.label}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasUserFeature(feature.key as any)}
                      onChange={(e) => handleFeatureToggle(feature.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowFeatureModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}