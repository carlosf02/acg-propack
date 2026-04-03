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
    auth_role?: string;
    must_change_password?: boolean;
    profile_completed?: boolean;
    notifications_configured?: boolean;
    client?: {
        id: number;
        client_code: string;
        client_type?: string;
        name: string;
        last_name?: string | null;
        email?: string | null;
        cellphone?: string | null;
        phone?: string | null;
        home_phone?: string | null;
        address?: string | null;
        city?: string | null;
        postal_code?: string | null;
        company_name?: string | null;
        alt_address_line1?: string | null;
        alt_address_line2?: string | null;
        alt_city?: string | null;
        alt_state?: string | null;
        alt_zip?: string | null;
    } | null;
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

/**
 * Returns the correct post-login destination path for a given user.
 * CLIENT users are routed to onboarding if any onboarding flags are unset,
 * otherwise to the client portal. All other roles go to the dashboard.
 */
export function getPostLoginDestination(user: MeResponse): string {
    if (user.auth_role === "CLIENT") {
        const needsOnboarding = user.must_change_password || !user.profile_completed || !user.notifications_configured;
        return needsOnboarding ? "/client/onboarding" : "/client";
    }
    return "/dashboard";
}

/** Create a new company/tenant for the authenticated user. */
export async function createCompany(name: string): Promise<{ id: number; name: string }> {
    return apiPost<{ id: number; name: string }>(endpoints.companies(), { name });
}
