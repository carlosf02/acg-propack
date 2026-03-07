/**
 * Auth API module
 *
 * All calls use relative paths so the Vite proxy forwards them to the
 * Django backend and session cookies work correctly.
 */

import { apiGet, apiPost } from "../../api/client";
import { endpoints } from "../../api/endpoints";

export interface MeResponse {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    company?: {
        id: number;
        name: string;
    };
    role?: string;
}

/** Set the Django csrftoken cookie so subsequent POST requests are accepted. */
export async function ensureCsrf(): Promise<void> {
    await apiGet<{ csrf: string }>(endpoints.csrf());
}

/** Return current user info, or throw ApiError(401) if not authenticated. */
export async function me(): Promise<MeResponse> {
    return apiGet<MeResponse>(endpoints.me());
}

/** Log in with username or email + password. */
export async function login(
    identifier: string,
    password: string
): Promise<{ ok: boolean }> {
    await ensureCsrf();
    return apiPost<{ ok: boolean }>(endpoints.login(), { identifier, password });
}

/** Log out the current session. */
export async function logout(): Promise<{ ok: boolean }> {
    await ensureCsrf();
    return apiPost<{ ok: boolean }>(endpoints.logout(), {});
}

/** Create a new account and start a session immediately. */
export async function signup(
    username: string,
    email: string,
    password: string
): Promise<{ ok: boolean }> {
    await ensureCsrf();
    return apiPost<{ ok: boolean }>(endpoints.signup(), {
        username,
        email,
        password,
    });
}

/** Create a new company/tenant for the authenticated user. */
export async function createCompany(name: string): Promise<{ id: number; name: string }> {
    return apiPost<{ id: number; name: string }>(endpoints.companies(), { name });
}
