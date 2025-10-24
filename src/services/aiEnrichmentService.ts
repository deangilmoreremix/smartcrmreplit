// Types for contact enrichment data
export interface ContactEnrichmentData {
  firstName: string;
  lastName?: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  industry?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  bio?: string;
  confidence: number;
  notes?: string;
  [key: string]: any;
}

// This service would contain the actual implementation of contact enrichment
// For now, it's just a type definition file