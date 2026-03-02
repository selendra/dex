export interface User {
  id: string;
  userId: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profile?: string;
  email?: string;
  phone?: string;
  telegramId?: number;
  walletAddress?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface UserProfileResponse {
  user: User;
}
