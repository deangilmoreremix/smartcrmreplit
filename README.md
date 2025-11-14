# SmartCRM Dashboard

A modern, AI-powered Customer Relationship Management (CRM) dashboard with glassmorphic design and advanced features for sales teams.

![SmartCRM Dashboard](./public/icon.svg)

## Overview

SmartCRM is a cutting-edge CRM solution built with React, TypeScript, and TailwindCSS. It features a beautiful glassmorphic design, real-time data visualization, AI-powered insights, and integrated communication tools to help sales teams manage their pipeline effectively.

## Features

### Core Features
- 📊 **Interactive Dashboard** with drag-and-drop customizable layout
- 👥 **Contact & Lead Management** with AI-powered scoring
- 💼 **Deal Pipeline Visualization** with analytics
- ✅ **Task Management** with advanced filtering
- 🎯 **AI Goals Tracking** for performance measurement
- 📅 **Appointment Scheduling** with reminders
- 📞 **Integrated Video Calling** with screen sharing

### AI-Powered Features
- 🧠 **Multi-model AI Orchestration** (Gemini, Gemma, GPT models)
- 🔍 **Smart AI Controls** with model recommendation
- 📊 **AI Usage Analytics** with cost monitoring
- 💬 **Real-time Smart Search** with semantic understanding
- 📈 **Live Deal Analysis** with intelligent insights
- 📧 **AI Email Generation** with personalization
- 📝 **Meeting Summarization** for better follow-ups

### UI/UX Features
- 🌓 **Dark/Light Mode** with smooth transitions
- 🔮 **Glassmorphic Design** with blur effects
- 📱 **Responsive Layout** for all devices
- 🚀 **Modern Animations** for enhanced UX
- 🎨 **Customizable Themes** for white-labeling

## Technologies & Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "vite": "^5.4.2",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.6.3",
    "recharts": "^2.5.0",
    "simple-peer": "^9.11.1",
    "socket.io-client": "^4.7.4",
    "zustand": "^4.3.6"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@types/simple-peer": "^9.11.8",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "eslint": "^9.9.1",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.11",
    "globals": "^15.9.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.3.0"
  }
}
```

### UI Components
- **Lucide React** for beautiful SVG icons
- **Tailwind CSS** for utility-first styling
- **Recharts** for interactive data visualization

### State Management
- **Zustand** for lightweight state management
- **React Context** for theme and feature-specific state

### Backend Integration
- **Supabase** for database, authentication, and storage
- **Custom AI Services** for model orchestration

### Real-time Features
- **Simple Peer** for WebRTC video calling
- **Socket.io** for real-time communication

## Project Structure

```
smartcrm/
├── public/                # Static assets
├── src/
│   ├── components/        # UI components
│   │   ├── ai/            # AI-specific components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── modals/        # Modal components
│   │   ├── sections/      # Page sections
│   │   ├── ui/            # Reusable UI components
│   │   └── styles/        # CSS and style definitions
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Library code (Supabase client, etc.)
│   ├── services/          # Service integrations (AI services, etc.)
│   ├── store/             # Zustand stores
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main app component
│   ├── index.css          # Global styles
│   └── main.tsx           # Application entry point
├── netlify/               # Netlify-specific files
│   └── transforms/        # Netlify transforms
├── .env.example           # Example environment variables
├── index.html             # HTML entry point
├── package.json           # Project dependencies
├── postcss.config.js      # PostCSS configuration
├── tailwind.config.js     # TailwindCSS configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Setup Instructions

### Prerequisites
- Node.js 18+ (v20 recommended)
- npm or yarn
- Supabase account (optional, for backend functionality)
- Google AI API key (optional, for Gemini/Gemma models)
- OpenAI API key (optional, for GPT models)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smartcrm.git
   cd smartcrm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Copy the `.env.example` file to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

   Required environment variables:
   ```
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Google AI Configuration (for Gemini and Gemma models)
   VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key

   # Optional: OpenAI Configuration
   VITE_OPENAI_API_KEY=your_openai_api_key

   # Optional: Anthropic Configuration
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` to see the app

## Database Setup (Optional)

If you want to use Supabase for backend functionality:

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Copy the project URL and anon key to your `.env` file
3. Run the SQL migrations located in `/supabase/migrations/` to set up the database schema

## Component Structure

The app uses a component-based architecture with these key components:

### UI Components
- **Avatar**: Custom avatar component with status indicators
- **GlassCard**: Glassmorphic card component with light/dark mode support
- **ModernButton**: Enhanced button component with multiple variants
- **StatusIndicator**: Status indicator for various states
- **HelpTooltip**: Contextual help tooltips

### Layout Components
- **Navbar**: Main navigation with responsive design
- **Dashboard**: Main dashboard layout with customizable sections
- **DraggableSection**: Draggable dashboard section component
- **TaskCard**: Task display with status indicators
- **ContactCard**: Contact information card
- **DealAnalytics**: Deal visualization and analytics

### AI Components
- **SmartAIControls**: Controls for AI model selection and operation
- **AIModelSelector**: UI for selecting optimal AI models
- **AIInsightsPanel**: Display for AI-generated insights
- **AIGoalsPanel**: AI goal tracking and visualization
- **EnhancedAIInsightsPanel**: Advanced AI insights with controls

### Feature Components
- **VideoCallOverlay**: WebRTC-based video calling interface
- **PipelineModal**: Deal pipeline visualization and management
- **CallHistory**: Video/audio call history tracking
- **AppointmentWidget**: Appointment scheduling and display

## Customization Guide

### Theme Customization

The app uses a context-based theming system with dark/light mode support:

```typescript
// To access theme context
import { useTheme } from '../contexts/ThemeContext';

const MyComponent = () => {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <div className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};
```

### Dashboard Layout Customization

Users can customize their dashboard layout using the `DashboardLayoutContext`:

```typescript
import { useDashboardLayout } from '../contexts/DashboardLayoutContext';

const MyComponent = () => {
  const { sectionOrder, setSectionOrder } = useDashboardLayout();
  
  // Reorder sections, add new sections, etc.
};
```

### AI Model Customization

Different AI models can be selected for various tasks:

```typescript
import { useSmartAI } from '../hooks/useSmartAI';

const MyComponent = () => {
  const { smartScoreContact, getTaskRecommendations } = useSmartAI();
  
  // Get model recommendations
  const recommendations = getTaskRecommendations('contact_scoring');
  
  // Use the recommended model
  const result = await smartScoreContact(contactId, contact);
};
```

## Deployment

### Netlify Deployment

1. Create a Netlify account at [https://netlify.com](https://netlify.com)
2. Connect your repository to Netlify
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in the Netlify dashboard
5. Deploy!

The included `netlify.toml` already has the correct configuration:

```toml
[build]
  command = "npm ci && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
  NODE_ENV = "production"
```

## Performance Considerations

- The app uses React.memo extensively to prevent unnecessary re-renders
- Lazy loading is implemented for video components to improve initial load time
- CSS transitions use hardware acceleration with `will-change` and `transform: translateZ(0)`
- Heavy operations like AI model inference are debounced and optimized

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

WebRTC features (video calling) require browser permissions for camera and microphone access.

## Security Notes

- API keys should be kept secure and never exposed in client-side code
- For production, use environment variables and proper API proxying
- Supabase Row Level Security (RLS) is used to secure data access

## Credits

- Icons by [Lucide Icons](https://lucide.dev/)
- Sample avatars from [Pexels](https://www.pexels.com/)
- Design inspiration from modern dashboards and glassmorphic UI trends

## License

MIT License
