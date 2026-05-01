import { useAppStore } from '@/store/useAppStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface ApiOptions extends RequestInit {
    skipAuth?: boolean;
}

async function refreshTokens() {
    const { refreshToken, setSession, logout, user } = useAppStore.getState();
    if (!refreshToken) return false;
    try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            credentials: 'include',
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string; refreshToken: string };
        setSession({
            user: user ?? null,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
        });
        return true;
    } catch (error) {
        console.error('Refresh token failed', error);
        logout();
        return false;
    }
}

export async function apiFetch<T>(path: string, method: HttpMethod = 'GET', body?: unknown, options: ApiOptions = {}): Promise<T> {
    const { accessToken, logout } = useAppStore.getState();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
    };

    if (!options.skipAuth && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    const doFetch = async () =>
        fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            credentials: 'include',
            body: body ? JSON.stringify(body) : undefined,
        });

    let response = await doFetch();

    if (response.status === 401 && !options.skipAuth) {
        const refreshed = await refreshTokens();
        if (refreshed) {
            const newToken = useAppStore.getState().accessToken;
            if (newToken) {
                headers.Authorization = `Bearer ${newToken}`;
            }
            response = await doFetch();
        } else {
            logout();
        }
    }

    if (!response.ok) {
        let message = response.statusText;
        try {
            const data = await response.json();
            if (data?.message) message = data.message;
        } catch {
            // ignore
        }
        throw new Error(message || 'Request failed');
    }

    try {
        return (await response.json()) as T;
    } catch {
        // No JSON body
        return undefined as T;
    }
}
