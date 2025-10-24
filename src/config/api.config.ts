export interface ApiEndpoint {
  baseURL: string;
  timeout: number;
}

export interface ApiConfig {
  auth: {
    tokenKey: string;
    refreshTokenKey: string;
    endpoint: ApiEndpoint;
  };
  endpoints: {
    [key: string]: ApiEndpoint;
  };
}

const apiConfig: ApiConfig = {
  auth: {
    tokenKey: 'auth_token',
    refreshTokenKey: 'refresh_token',
    endpoint: {
      baseURL: '/api/auth',
      timeout: 10000,
    },
  },
  endpoints: {
    api: {
      baseURL: '/api',
      timeout: 30000,
    },
  },
};

export default apiConfig;
export type { ApiEndpoint };