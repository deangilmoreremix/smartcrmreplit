import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserManagement from '../pages/UserManagement';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the hooks
vi.mock('../hooks/useAuditLogger', () => ({
  useAuditLogger: () => ({
    logAction: vi.fn(),
  }),
}));

vi.mock('../hooks/useRateLimiter', () => ({
  useRateLimiter: () => ({
    executeWithRateLimit: vi.fn((fn) => fn()),
  }),
}));

vi.mock('../components/admin/Pagination', () => ({
  Pagination: ({ currentPage, totalPages, onPageChange }: any) => (
    <div data-testid="pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('UserManagement', () => {
  const mockUser = {
    id: '1',
    email: 'admin@test.com',
    role: 'super_admin' as const,
    name: 'Test Admin',
  };

  beforeEach(() => {
    mockFetch.mockClear();
    // Mock successful auth check
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  it('renders loading state initially', () => {
    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('shows access denied for non-admin users', async () => {
    const nonAdminUser = { ...mockUser, role: 'regular_user' as const };

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: nonAdminUser }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  it('renders user management interface for admin users', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'user1@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'regular_user',
        status: 'active',
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        permissions: [],
        purchasedOtos: ['smartcrm'],
      },
    ];

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    expect(screen.getByText('user1@test.com')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('filters users by search term', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'john@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'regular_user',
        status: 'active',
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        permissions: [],
        purchasedOtos: ['smartcrm'],
      },
      {
        id: '2',
        email: 'jane@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'wl_user',
        status: 'active',
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        permissions: [],
        purchasedOtos: ['smartcrm'],
      },
    ];

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'jane' } });

    await waitFor(() => {
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
      expect(screen.queryByText('john@test.com')).not.toBeInTheDocument();
    });
  });

  it('opens invite user modal when button is clicked', async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    const inviteButton = screen.getByText('Invite User');
    fireEvent.click(inviteButton);

    expect(screen.getByText('Invite New User')).toBeInTheDocument();
  });

  it('displays OTO toggles for users', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'regular_user',
        status: 'active',
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        permissions: [],
        purchasedOtos: ['smartcrm', 'oto1_sales_maximizer'],
      },
    ];

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('FE: SmartCRM')).toBeInTheDocument();
      expect(screen.getByText('OTO1: Sales Maximizer')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
    });
  });
});