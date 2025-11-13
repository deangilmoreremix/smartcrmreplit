import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProtectedLayout from '../components/ProtectedLayout';

// Mock the Sidebar component
vi.mock('../components/Sidebar', () => ({
  default: ({ onOpenPipelineModal }: { onOpenPipelineModal: () => void }) => (
    <div data-testid="sidebar" onClick={onOpenPipelineModal}>
      Sidebar Component
    </div>
  ),
}));

describe('ProtectedLayout', () => {
  it('renders children correctly', () => {
    const testContent = 'Test Content';
    render(
      <ProtectedLayout>
        <div>{testContent}</div>
      </ProtectedLayout>
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('renders sidebar component', () => {
    render(
      <ProtectedLayout>
        <div>Content</div>
      </ProtectedLayout>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <ProtectedLayout>
        <div>Content</div>
      </ProtectedLayout>
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('min-h-screen', 'bg-gray-50', 'dark:bg-gray-900', 'flex');

    const sidebarContainer = mainContainer.firstChild as HTMLElement;
    expect(sidebarContainer).toHaveClass('flex-1', 'flex', 'flex-col', 'min-w-0');

    const mainElement = sidebarContainer.querySelector('main');
    expect(mainElement).toHaveClass('flex-1', 'overflow-auto');
  });

  it('passes onOpenPipelineModal prop to Sidebar', () => {
    const mockOnOpen = vi.fn();
    render(
      <ProtectedLayout onOpenPipelineModal={mockOnOpen}>
        <div>Content</div>
      </ProtectedLayout>
    );

    const sidebar = screen.getByTestId('sidebar');
    sidebar.click();

    expect(mockOnOpen).toHaveBeenCalledTimes(1);
  });

  it('uses default onOpenPipelineModal when not provided', () => {
    render(
      <ProtectedLayout>
        <div>Content</div>
      </ProtectedLayout>
    );

    const sidebar = screen.getByTestId('sidebar');
    // Should not throw error when clicked
    expect(() => sidebar.click()).not.toThrow();
  });
});