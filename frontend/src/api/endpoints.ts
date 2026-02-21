import { apiGet } from './client';

export const ENDPOINTS = {
    HEALTH: '/api/health',
};

export interface HealthResponse {
    status?: string;
    message?: string;
    [key: string]: unknown;
}

export async function getHealth(): Promise<HealthResponse> {
    return apiGet<HealthResponse>(ENDPOINTS.HEALTH);
}
