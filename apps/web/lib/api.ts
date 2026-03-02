import type { UserProfileResponse } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export const api = {
  getOAuthConfig: async () => {
    const response = await fetch(`${API_BASE_URL}/api/oauth/login`);
    if (!response.ok) {
      throw new Error('Failed to fetch OAuth config');
    }
    return response.json();
  },

  getUserProfile: async (token: string): Promise<UserProfileResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    return response.json();
  },
};
