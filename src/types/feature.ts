export type FeatureKey =
  | 'aiTools'
  | 'advancedAnalytics'
  | 'customIntegrations'
  | 'whitelabelBranding'
  | 'apiAccess'
  | 'smartcrm'
  | 'salesMaximizer'
  | 'aiBoost'
  | 'communicationSuite'
  | 'businessIntelligence'
  | 'videoEmail'
  | 'phoneSystem'
  | 'pipeline'
  | 'contacts'
  | 'tasks'
  | 'appointments'
  | 'invoicing'
  | 'analytics'
  | 'communication'
  | 'formsSurveys'
  | 'leadAutomation';

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  category: 'core' | 'advanced' | 'premium' | 'enterprise';
  dependencies?: FeatureKey[];
  conflicts?: FeatureKey[];
  defaultEnabled: boolean;
  requiresPlan?: string[];
}

export interface UserFeatures {
  [key: string]: boolean;
}

export interface GlobalFeatures {
  [key: string]: boolean;
}

export interface FeatureContextType {
  userFeatures: UserFeatures;
  globalFeatures: GlobalFeatures;
  isLoading: boolean;
  hasFeature: (feature: FeatureKey) => boolean;
  hasUserFeature: (feature: FeatureKey) => boolean;
  hasGlobalFeature: (feature: FeatureKey) => boolean;
  updateUserFeature: (userId: string, feature: FeatureKey, enabled: boolean) => Promise<void>;
  updateGlobalFeature: (feature: FeatureKey, enabled: boolean) => Promise<void>;
  refreshFeatures: () => Promise<void>;
  validateFeatureCombination: (features: Record<FeatureKey, boolean>) => {
    valid: boolean;
    conflicts: Array<{ feature: FeatureKey; conflictingWith: FeatureKey[] }>;
    missingDependencies: Array<{ feature: FeatureKey; requires: FeatureKey[] }>;
  };
}

export interface FeatureUpdateRequest {
  feature: FeatureKey;
  enabled: boolean;
  userId?: string;
}

export interface FeatureResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface FeatureAnalytics {
  totalUsers: number;
  featureUsage: Record<FeatureKey, number>;
  globalFeatures: Record<string, boolean>;
  userFeatureDistribution: Record<FeatureKey, { enabled: number; disabled: number }>;
}

// Feature definitions with metadata
export const FEATURE_DEFINITIONS: Record<FeatureKey, FeatureDefinition> = {
  // Core features
  smartcrm: {
    key: 'smartcrm',
    name: 'SmartCRM Core',
    description: 'Basic CRM functionality including contacts, deals, and tasks',
    category: 'core',
    defaultEnabled: true,
  },
  contacts: {
    key: 'contacts',
    name: 'Contact Management',
    description: 'Advanced contact features and management tools',
    category: 'core',
    defaultEnabled: true,
  },
  tasks: {
    key: 'tasks',
    name: 'Task Management',
    description: 'Task and project management functionality',
    category: 'core',
    defaultEnabled: true,
  },
  appointments: {
    key: 'appointments',
    name: 'Appointments',
    description: 'Calendar and scheduling functionality',
    category: 'core',
    defaultEnabled: true,
  },

  // Advanced features
  analytics: {
    key: 'analytics',
    name: 'Basic Analytics',
    description: 'Basic reporting and analytics',
    category: 'advanced',
    defaultEnabled: true,
  },
  communication: {
    key: 'communication',
    name: 'Communication',
    description: 'Email and messaging tools',
    category: 'advanced',
    defaultEnabled: true,
  },
  pipeline: {
    key: 'pipeline',
    name: 'Pipeline Management',
    description: 'Deal pipeline management and tracking',
    category: 'advanced',
    defaultEnabled: true,
  },

  // Premium features
  aiTools: {
    key: 'aiTools',
    name: 'AI Tools',
    description: 'AI-powered features and assistants',
    category: 'premium',
    defaultEnabled: false,
  },
  advancedAnalytics: {
    key: 'advancedAnalytics',
    name: 'Advanced Analytics',
    description: 'Detailed reporting and business intelligence',
    category: 'premium',
    dependencies: ['analytics'],
    defaultEnabled: false,
  },
  salesMaximizer: {
    key: 'salesMaximizer',
    name: 'Sales Maximizer',
    description: 'Advanced sales tools and automation',
    category: 'premium',
    dependencies: ['pipeline', 'contacts'],
    defaultEnabled: false,
  },
  communicationSuite: {
    key: 'communicationSuite',
    name: 'Communication Suite',
    description: 'Advanced communication and engagement tools',
    category: 'premium',
    dependencies: ['communication'],
    defaultEnabled: false,
  },
  formsSurveys: {
    key: 'formsSurveys',
    name: 'Forms & Surveys',
    description: 'Form creation and survey tools',
    category: 'premium',
    dependencies: ['contacts'],
    defaultEnabled: false,
  },
  invoicing: {
    key: 'invoicing',
    name: 'Invoicing',
    description: 'Invoice creation and management',
    category: 'premium',
    defaultEnabled: false,
  },

  // Enterprise features
  customIntegrations: {
    key: 'customIntegrations',
    name: 'Custom Integrations',
    description: 'Third-party API integrations and custom connections',
    category: 'enterprise',
    defaultEnabled: false,
  },
  whitelabelBranding: {
    key: 'whitelabelBranding',
    name: 'White-label Branding',
    description: 'Custom branding and white-label options',
    category: 'enterprise',
    defaultEnabled: false,
  },
  apiAccess: {
    key: 'apiAccess',
    name: 'API Access',
    description: 'Direct API access for integrations',
    category: 'enterprise',
    defaultEnabled: false,
  },
  aiBoost: {
    key: 'aiBoost',
    name: 'AI Boost Unlimited',
    description: 'Unlimited AI usage and advanced AI features',
    category: 'enterprise',
    dependencies: ['aiTools'],
    defaultEnabled: false,
  },
  businessIntelligence: {
    key: 'businessIntelligence',
    name: 'Business Intelligence',
    description: 'Advanced BI tools and predictive analytics',
    category: 'enterprise',
    dependencies: ['analytics', 'advancedAnalytics'],
    defaultEnabled: false,
  },
  videoEmail: {
    key: 'videoEmail',
    name: 'Video Email',
    description: 'Video email functionality',
    category: 'enterprise',
    dependencies: ['communication'],
    defaultEnabled: false,
  },
  phoneSystem: {
    key: 'phoneSystem',
    name: 'Phone System',
    description: 'Integrated phone system and VoIP',
    category: 'enterprise',
    dependencies: ['communication'],
    defaultEnabled: false,
  },
  leadAutomation: {
    key: 'leadAutomation',
    name: 'Lead Automation',
    description: 'Advanced lead nurturing and automation',
    category: 'enterprise',
    dependencies: ['contacts', 'communication'],
    defaultEnabled: false,
  },
};

// Feature categories for UI organization
export const FEATURE_CATEGORIES = {
  core: {
    name: 'Core Features',
    description: 'Essential functionality available to all users',
    color: 'blue',
  },
  advanced: {
    name: 'Advanced Features',
    description: 'Enhanced capabilities for growing businesses',
    color: 'green',
  },
  premium: {
    name: 'Premium Features',
    description: 'Professional tools and automation',
    color: 'purple',
  },
  enterprise: {
    name: 'Enterprise Features',
    description: 'Advanced capabilities for large organizations',
    color: 'red',
  },
} as const;

// Helper functions
export const getFeaturesByCategory = (category: keyof typeof FEATURE_CATEGORIES): FeatureDefinition[] => {
  return Object.values(FEATURE_DEFINITIONS).filter(feature => feature.category === category);
};

export const getFeatureDefinition = (key: FeatureKey): FeatureDefinition => {
  return FEATURE_DEFINITIONS[key];
};

export const getFeatureDependencies = (feature: FeatureKey): FeatureKey[] => {
  return FEATURE_DEFINITIONS[feature]?.dependencies || [];
};

export const getFeatureConflicts = (feature: FeatureKey): FeatureKey[] => {
  return FEATURE_DEFINITIONS[feature]?.conflicts || [];
};

export const isFeatureEnabledByDefault = (feature: FeatureKey): boolean => {
  return FEATURE_DEFINITIONS[feature]?.defaultEnabled || false;
};