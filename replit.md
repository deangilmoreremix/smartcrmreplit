# SmartCRM - AI-Powered Customer Relationship Management System

## Overview

SmartCRM is an enterprise-grade Customer Relationship Management system built with React 18.3.1, TypeScript, and modern web technologies. The application provides comprehensive sales pipeline management, contact relationship tracking, AI-powered automation and insights, integrated video calling, email communication, and advanced analytics capabilities.

The system has completed 10 development phases including foundation setup, sales pipeline management, task & activity tracking, email & communication tools, reporting & analytics, AI integration & automation, mobile responsiveness, and integration & API management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 7.0.5 with optimized code splitting and bundle management
- **Routing**: React Router DOM 7.6.3 for SPA navigation
- **State Management**: Zustand 4.5.7 for lightweight, scalable global state
- **Styling**: TailwindCSS with custom glassmorphic design system and dark mode support

**Code Splitting Strategy**:
- Lazy-loaded pages (Tasks, Communication, Analytics, Pipeline, AI Tools)
- Manual chunk splitting for vendors (React, Charts, AI Services)
- Dynamic imports for heavy components with React Suspense
- Bundle size optimized from 2.2MB to ~540KB largest chunk

**UI Component Library**:
- Custom component system with reusable primitives (Button, Input, Card, Dialog, etc.)
- Radix UI primitives for accessible, unstyled components
- Lucide React for consistent iconography
- Framer Motion for smooth animations and transitions

**Design Patterns**:
- Context API for cross-cutting concerns (Theme, Video Call, AI, Navigation, Dashboard Layout)
- Custom hooks for business logic encapsulation (useContactStore, useTaskStore, useDealStore)
- Provider pattern for global functionality (AIToolsProvider, ModalsProvider, VideoCallProvider)
- Compound component pattern for complex UI (Tabs, Dropdown, Select)

### State Management Architecture

**Store Structure** (Zustand):
- `dealStore`: Sales pipeline, deal stages, forecasting, analytics
- `contactStore`: Contact management, lead scoring, relationship tracking
- `taskStore`: Task management, activities, calendar events
- `appointmentStore`: Scheduling, video calls, meeting management
- `communicationStore`: Email templates, threads, analytics
- `aiIntegrationStore`: AI automation rules, insights, workflows, suggestions

**Data Flow**:
- Unidirectional data flow with Zustand actions
- Optimistic updates for better UX
- Persistent state with localStorage integration
- Minimal re-renders through selector-based subscriptions

### AI Integration Architecture

**Multi-Model Orchestration**:
- AI model selector supporting Gemini 2.5 Flash, Gemma 2-9B, GPT models
- Model recommendation engine based on use case (email generation, lead scoring, analytics)
- Cost monitoring and usage analytics per model
- Fallback strategies for model failures

**AI Services**:
- `aiOrchestrator`: Central AI request routing and provider management
- `contactAI`: Contact enrichment, lead scoring, insight generation
- `communicationAI`: Email generation, sentiment analysis, reply suggestions
- `geminiService`: Direct Gemini API integration with streaming support

**Automation Framework**:
- Rule-based automation with trigger conditions
- Visual workflow builder for complex automation
- AI-powered smart suggestions and recommendations
- Real-time insight generation and notifications

### Video Communication System

**WebRTC Implementation**:
- SimplePeer for peer-to-peer video/audio connections
- Media stream management for local and remote video
- Screen sharing capabilities
- Connection quality monitoring and adaptive streaming

**Call Management**:
- One-to-one and group call support
- In-call messaging with data channels
- Call recording functionality
- Persistent call controls overlay

### Responsive Design Strategy

**Mobile-First Approach**:
- Responsive breakpoints with TailwindCSS
- Touch-optimized interactions with Framer Motion
- Progressive Web App (PWA) capabilities with service workers
- Offline support with workbox caching strategies

**Performance Optimizations**:
- Virtual scrolling for large lists (react-window)
- Image lazy loading and optimization
- Bundle analyzer for ongoing optimization monitoring
- React DevTools profiler integration

### Data Visualization

**Chart Library**: Recharts 2.15.4
- Line charts for trends and forecasting
- Bar charts for pipeline and stage analysis
- Pie charts for distribution metrics
- Responsive containers with dark mode support

### Authentication & Security

**Authentication Pattern**:
- Context-based auth state management
- Protected route wrapper components
- Session management with token refresh
- Role-based access control foundation

### Form Management

**React Hook Form 7.62.0**:
- Uncontrolled components for performance
- Schema validation integration ready
- Custom form builders for complex forms
- Optimistic validation with error handling

## External Dependencies

### Backend & Database

**Supabase Integration** (@supabase/supabase-js 2.38.0):
- PostgreSQL database for structured data storage
- Real-time subscriptions for live updates
- Row-level security for data access control
- Authentication and user management
- Storage for file attachments

**Environment Configuration**:
- Runtime environment variables via window.ENV_VARS
- Supabase URL and anonymous key injection
- Dotenv for local development

### Third-Party APIs & Services

**AI & Machine Learning**:
- Gemini API for AI-powered insights and generation
- Multi-model support (OpenAI, Gemini, Gemma)
- Streaming API responses for better UX

**Communication Services**:
- Email service integration (SMTP/API ready)
- Video calling infrastructure (WebRTC/SimplePeer)
- Socket.io client 4.7.4 for real-time features

### Key Dependencies

**Core Libraries**:
- React 18.3.1 & React DOM
- TypeScript with strict mode enabled
- Date-fns 4.1.0 for date manipulation
- Moment.js 2.30.1 for calendar integration

**UI & Interaction**:
- @hello-pangea/dnd 18.0.1 for drag-and-drop (Kanban boards)
- React Big Calendar 1.19.4 for scheduling
- React Select 5.10.2 for advanced dropdowns
- React Avatar 5.0.4 for user avatars

**Data Management**:
- @tanstack/react-table 8.21.3 for advanced tables
- Fuse.js 7.1.0 for fuzzy search
- XLSX 0.18.5 for spreadsheet export
- React CSV 2.2.2 for CSV operations

**File Handling**:
- React Dropzone 14.3.8 for file uploads
- Buffer polyfill for file processing
- Stream-browserify for stream handling

**Development Tools**:
- ESLint with TypeScript support
- Rollup plugin visualizer for bundle analysis
- Vite PWA plugin for progressive web app features

### Build & Deployment

**Production Build**:
- Vite production optimization with tree-shaking
- Manual chunk splitting for optimal caching
- Gzip and Brotli compression support
- Static asset optimization

**Hosting Requirements**:
- Node.js 20.x runtime
- SPA routing configuration (fallback to index.html)
- Environment variable injection at runtime
- HTTPS for WebRTC functionality

### Integration Points

**Iframe Integration**:
- Navbar overlap prevention scripts
- Message-based communication with parent frames
- Dynamic route mapping for embedded apps
- Automatic padding adjustment for embedded contexts

**External App Integration**:
- Netlify landing page integration
- Cross-origin message handling
- Route synchronization between apps
- Shared authentication state