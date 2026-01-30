export interface RegisterDTO {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  token: string;
  refreshToken: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  username: string;
}
