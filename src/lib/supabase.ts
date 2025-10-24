import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const getSupabaseUrl = () => {
  if (typeof window !== 'undefined' && window.ENV_VARS?.SUPABASE_URL) {
    return window.ENV_VARS.SUPABASE_URL;
  }
  return import.meta.env.VITE_SUPABASE_URL || '';
};

const getSupabaseAnonKey = () => {
  if (typeof window !== 'undefined' && window.ENV_VARS?.SUPABASE_ANON_KEY) {
    return window.ENV_VARS.SUPABASE_ANON_KEY;
  }
  return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Check if configuration is valid
const isValidUrl = (url: string) => {
  try {
    // Only try to create URL if it's a non-empty string
    if (url) {
      new URL(url);
    }
    return url !== '' && !url.includes('your_') && !url.includes('placeholder');
  } catch {
    return false;
  }
};

const isValidKey = (key: string) => {
  return key !== '' && !key.includes('your_') && !key.includes('placeholder') && key.length > 20;
};

const isConfigured = isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey);

// Create Supabase client with proper error handling
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : createClient('https://example.org', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

// Storage bucket names
export const STORAGE_BUCKETS = {
  COMPANY_LOGOS: 'company-logos',
  PROFILE_AVATARS: 'profile-avatars',
  DOCUMENTS: 'documents'
} as const;

// Add a helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return isConfigured;
};

// Log configuration status for debugging
if (!isConfigured) {
  console.warn('Supabase is not properly configured. Some features may not work.');
}