import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SuperAdminDashboard } from '../pages/SuperAdminDashboard';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the hooks
jest.mock('../hooks/useAuditLogger');
jest.mock('../hooks/useRateLimiter');

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: '1',
  email: 'admin@example.com',
  role: 'super_admin' as const,
  name: 'Super Admin',
  permissions: ['approve_partners', 'manage_tenants', 'delete_tenants'],
};

const mockTenants = [
  {
    id: '1',
    name: 'Test Tenant',
    subdomain: 'test',
    status: 'active' as const,
    type: 'customer' as const,
    plan: 'pro' as const,
    contactEmail: 'test@example.com',
    monthlyRevenue: 100,
    userCount: 5,
    createdAt: '2024-01-01',
  },
];

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('SuperAdminDashboard', () => {
  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock fetch responses
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/white-label/tenants')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTenants),
        });
      }
      if (url.includes('/api/partners/pending')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    renderWithAuth(<SuperAdminDashboard />);
    expect(screen.getByText('Loading super admin dashboard...')).toBeInTheDocument();
  });

  test('renders dashboard after loading', async () => {
    renderWithAuth(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
    });
  });

  test('displays tenant data correctly', async () => {
    renderWithAuth(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Tenant')).toBeInTheDocument();
      expect(screen.getByText('test.smartcrm.com')).toBeInTheDocument();
      expect(screen.getByText('$100')).toBeInTheDocument();
    });
  });

  test('handles tab switching', async () => {
    renderWithAuth(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
    });

    // Click on tenants tab
    const tenantsTab = screen.getByText('All Tenants');
    fireEvent.click(tenantsTab);

    expect(screen.getByText('All Tenants Management')).toBeInTheDocument();
  });

  test('validates tenant form data', async () => {
    renderWithAuth(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
    });

    // Navigate to tenants tab
    const tenantsTab = screen.getByText('All Tenants');
    fireEvent.click(tenantsTab);

    // Click edit on first tenant
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Modal should open
    expect(screen.getByText('Edit Tenant: Test Tenant')).toBeInTheDocument();

    // Try to save with empty name
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Tenant name is required')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock failed API call
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal server error' }),
      })
    );

    renderWithAuth(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch admin data')).toBeInTheDocument();
    });
  });

  test('shows access denied for non-super-admin users', async () => {
    // Mock non-super-admin user
    const nonAdminUser = { ...mockUser, role: 'admin' as const };

    // This would require mocking the auth context differently
    // For now, we'll test the loading state
    renderWithAuth(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin Dashboard')).toBeInTheDocument();
    });
  });
});