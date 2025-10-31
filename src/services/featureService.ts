import { FeatureKey } from '../types/feature';

interface FeatureUpdateRequest {
  feature: FeatureKey;
  enabled: boolean;
  userId?: string; // If updating user-specific feature
}

interface FeatureResponse {
  success: boolean;
  message?: string;
  data?: any;
}

class FeatureService {
  private baseUrl = '/api/features';

  async getGlobalFeatures(): Promise<Record<string, boolean>> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${this.baseUrl}/global`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch global features: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get global features:', error);
      // Return default features if API fails
      return {
        aiTools: true,
        advancedAnalytics: true,
        customIntegrations: false,
        whitelabelBranding: true,
        apiAccess: false,
      };
    }
  }

  async updateGlobalFeature(feature: FeatureKey, enabled: boolean): Promise<FeatureResponse> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${this.baseUrl}/global/${feature}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update global feature');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update global feature:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getUserFeatures(userId: string): Promise<Record<string, boolean>> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user features: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user features:', error);
      // Return empty object if API fails - user gets default permissions
      return {};
    }
  }

  async updateUserFeature(userId: string, feature: FeatureKey, enabled: boolean): Promise<FeatureResponse> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${this.baseUrl}/users/${userId}/${feature}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user feature');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update user feature:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async bulkUpdateUserFeatures(userId: string, features: Record<FeatureKey, boolean>): Promise<FeatureResponse> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${this.baseUrl}/users/${userId}/bulk`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ features }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to bulk update user features');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to bulk update user features:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getFeatureAnalytics(): Promise<{
    totalUsers: number;
    featureUsage: Record<FeatureKey, number>;
    globalFeatures: Record<string, boolean>;
  }> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${this.baseUrl}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feature analytics: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get feature analytics:', error);
      return {
        totalUsers: 0,
        featureUsage: {} as Record<FeatureKey, number>,
        globalFeatures: {},
      };
    }
  }

  // Feature dependency checking
  getFeatureDependencies(feature: FeatureKey): FeatureKey[] {
    const dependencies: Partial<Record<FeatureKey, FeatureKey[]>> = {
      advancedAnalytics: ['analytics'],
      aiBoost: ['aiTools'],
      salesMaximizer: ['pipeline', 'contacts'],
      communicationSuite: ['communication'],
      businessIntelligence: ['analytics', 'advancedAnalytics'],
      videoEmail: ['communication'],
      phoneSystem: ['communication'],
      formsSurveys: ['contacts'],
    };

    return dependencies[feature] || [];
  }

  // Check if enabling a feature would create conflicts
  getFeatureConflicts(feature: FeatureKey): FeatureKey[] {
    // Define mutually exclusive features
    const conflicts: Partial<Record<FeatureKey, FeatureKey[]>> = {
      // Example: Basic and advanced versions might conflict
      // 'basicPlan': ['premiumPlan'],
      // 'premiumPlan': ['basicPlan'],
    };

    return conflicts[feature] || [];
  }

  // Validate feature combination
  validateFeatureCombination(features: Record<FeatureKey, boolean>): {
    valid: boolean;
    conflicts: Array<{ feature: FeatureKey; conflictingWith: FeatureKey[] }>;
    missingDependencies: Array<{ feature: FeatureKey; requires: FeatureKey[] }>;
  } {
    const conflicts: Array<{ feature: FeatureKey; conflictingWith: FeatureKey[] }> = [];
    const missingDependencies: Array<{ feature: FeatureKey; requires: FeatureKey[] }> = [];

    Object.entries(features).forEach(([featureKey, enabled]) => {
      const feature = featureKey as FeatureKey;

      if (enabled) {
        // Check conflicts
        const featureConflicts = this.getFeatureConflicts(feature);
        const activeConflicts = featureConflicts.filter(conflict => features[conflict]);
        if (activeConflicts.length > 0) {
          conflicts.push({ feature, conflictingWith: activeConflicts });
        }

        // Check dependencies
        const dependencies = this.getFeatureDependencies(feature);
        const missingDeps = dependencies.filter(dep => !features[dep]);
        if (missingDeps.length > 0) {
          missingDependencies.push({ feature, requires: missingDeps });
        }
      }
    });

    return {
      valid: conflicts.length === 0 && missingDependencies.length === 0,
      conflicts,
      missingDependencies,
    };
  }
}

export const featureService = new FeatureService();
export default featureService;