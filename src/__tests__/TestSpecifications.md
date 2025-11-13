# SmartCRM App - Test Specifications

This document outlines the comprehensive test cases that should be implemented when proper testing infrastructure (Vitest + React Testing Library) is set up.

## Setup Requirements

To implement these tests, install the required dependencies:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

## Component Tests

### ProtectedLayout Component

**File:** `src/components/ProtectedLayout.tsx`

**Test Cases:**
- ✅ renders children correctly
- ✅ renders sidebar component
- ✅ applies correct CSS layout classes
- ✅ passes onOpenPipelineModal prop to Sidebar
- ✅ handles missing onOpenPipelineModal prop gracefully

**Example Implementation:**
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProtectedLayout from '../components/ProtectedLayout';

vi.mock('../components/Sidebar', () => ({
  default: ({ onOpenPipelineModal }: { onOpenPipelineModal: () => void }) => (
    <div data-testid="sidebar" onClick={onOpenPipelineModal}>
      Sidebar Component
    </div>
  ),
}));

describe('ProtectedLayout', () => {
  it('renders children correctly', () => {
    render(
      <ProtectedLayout>
        <div>Test Content</div>
      </ProtectedLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
```

### ErrorBoundary Component

**File:** `src/components/ErrorBoundary.tsx`

**Test Cases:**
- ✅ renders children when no error occurs
- ✅ catches and displays error UI when error occurs
- ✅ shows custom fallback when provided
- ✅ displays error details in development mode
- ✅ calls onError callback when provided
- ✅ allows retry functionality
- ✅ provides go home functionality

### LoadingStates Components

**File:** `src/components/ui/LoadingStates.tsx`

**Test Cases:**
- ✅ LoadingSpinner renders with correct size and message
- ✅ Skeleton shows animated placeholder
- ✅ SkeletonCard renders with specified number of lines
- ✅ PageLoadingState displays title and description
- ✅ PageLoadingState shows progress bar when provided
- ✅ StatusIndicator renders correct icon and color for each status
- ✅ DataLoadingState shows loading component when loading
- ✅ DataLoadingState shows error component when error occurs
- ✅ DataLoadingState renders children when loaded successfully
- ✅ DashboardSkeleton renders all expected placeholder sections

## Integration Tests

### App Routing

**File:** `src/App.tsx`

**Test Cases:**
- ✅ renders landing page at root path
- ✅ redirects to auth page when accessing protected route while unauthenticated
- ✅ renders dashboard for authenticated users
- ✅ lazy loads components correctly
- ✅ handles unknown routes with fallback
- ✅ preserves route state during navigation

### App Error Handling

**Test Cases:**
- ✅ displays error boundary when component throws error
- ✅ continues functioning after error recovery
- ✅ logs errors appropriately
- ✅ handles async errors in data fetching

### App Loading States

**Test Cases:**
- ✅ shows loading spinner during initial app load
- ✅ displays authentication loading state
- ✅ shows dashboard skeleton while data loads
- ✅ transitions smoothly between loading and loaded states

## End-to-End Tests (Playwright)

### User Journeys

**Test Cases:**
- ✅ user can navigate from landing to login
- ✅ authenticated user can access dashboard
- ✅ user can navigate between different sections
- ✅ app handles network errors gracefully
- ✅ app works offline with cached data
- ✅ mobile responsive design functions correctly

## Performance Tests

### Component Performance
- ✅ ProtectedLayout renders within performance budget
- ✅ ErrorBoundary handles errors without memory leaks
- ✅ LoadingStates components render efficiently
- ✅ Dashboard skeleton loads quickly

### Bundle Analysis
- ✅ App bundle size stays within limits
- ✅ Lazy-loaded chunks load on demand
- ✅ Vendor chunks are properly split

## Accessibility Tests

### Component Accessibility
- ✅ ErrorBoundary error messages are accessible
- ✅ LoadingStates provide proper screen reader support
- ✅ ProtectedLayout maintains focus management
- ✅ StatusIndicator uses semantic colors

## Current Implementation Status

### ✅ Completed Improvements:
1. **Refactored route layout duplication** - Created reusable `ProtectedLayout` component
2. **Added comprehensive error boundaries** - `ErrorBoundary` component with retry functionality
3. **Implemented loading states** - Enhanced `LoadingStates` components with skeletons and progress indicators
4. **Created test specifications** - Comprehensive test plan for future implementation

### 🔄 Ready for Testing Infrastructure:
- All components are designed to be easily testable
- Clear separation of concerns
- Proper error boundaries and loading states
- Comprehensive test specifications documented

## Next Steps

1. **Install Testing Dependencies:**
   ```bash
   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
   ```

2. **Configure Vitest:**
   - Create `vitest.config.ts`
   - Set up test environment
   - Configure global test utilities

3. **Implement Tests:**
   - Start with component tests
   - Add integration tests
   - Implement E2E tests with Playwright

4. **Add CI/CD:**
   - Configure automated testing in CI pipeline
   - Add test coverage reporting
   - Set up visual regression testing

## Test Coverage Goals

- **Component Tests:** 80%+ coverage
- **Integration Tests:** All critical user flows
- **E2E Tests:** Core user journeys
- **Performance Tests:** Key performance metrics
- **Accessibility Tests:** WCAG 2.1 AA compliance