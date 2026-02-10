const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ApiRequestOptions extends RequestInit {
    body?: any;
}

export class ApiError extends Error {
    status: number;
    data: any;

    constructor(message: string, status: number, data: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers);
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    };

    try {
        const response = await fetch(url, config);

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw new ApiError(`API Error: ${response.status} ${response.statusText}`, response.status, data);
        }

        return data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new Error(error instanceof Error ? error.message : 'Unknown network error');
    }
}

export function apiGet<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'body' | 'method'>): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

export function apiPost<T>(endpoint: string, body: any, options?: Omit<ApiRequestOptions, 'body' | 'method'>): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, body, method: 'POST' });
}
