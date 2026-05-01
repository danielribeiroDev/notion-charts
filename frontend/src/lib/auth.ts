import { apiFetch } from './api';

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
}

export interface UserProfile {
    email: string;
}

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/register', 'POST', { email, password }, { skipAuth: true });
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/login', 'POST', { email, password }, { skipAuth: true });
}

export async function refreshTokens(refreshToken: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/refresh', 'POST', { refreshToken }, { skipAuth: true });
}
