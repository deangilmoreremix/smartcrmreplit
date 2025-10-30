import React from 'react';
import { Eye, Edit, XCircle, Trash2, Loader2 } from 'lucide-react';

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

interface TenantTableProps {
  tenants: Tenant[];
  updatingTenant: string | null;
  onView: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onSuspend: (tenantId: string) => void;
  onDelete: (tenantId: string) => void;
}

export const TenantTable: React.FC<TenantTableProps> = ({
  tenants,
  updatingTenant,
  onView,
  onEdit,
  onSuspend,
  onDelete,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          All Tenants Management
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {tenant.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {tenant.subdomain}.smartcrm.com
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    tenant.type === 'partner' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {tenant.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    tenant.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                    tenant.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {tenant.plan}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                    tenant.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {tenant.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {tenant.userCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  ${tenant.monthlyRevenue}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      onClick={() => onEdit(tenant)}
                      className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => onSuspend(tenant.id)}
                      disabled={updatingTenant === tenant.id}
                      className="text-yellow-600 hover:text-yellow-900 disabled:text-yellow-400 flex items-center gap-1"
                    >
                      {updatingTenant === tenant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Suspend
                    </button>
                    <button
                      onClick={() => onDelete(tenant.id)}
                      disabled={updatingTenant === tenant.id}
                      className="text-red-600 hover:text-red-900 disabled:text-red-400 flex items-center gap-1"
                    >
                      {updatingTenant === tenant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};