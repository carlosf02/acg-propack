/**
 * API Client — Phase A Foundation
 *
 * Thin fetch wrapper that:
 * - Always sends cookies (credentials: "include") for session auth
 * - Reads the Django CSRF cookie and injects X-CSRFToken on unsafe methods
 * - Builds URLs from VITE_API_BASE_URL (defaults to http://localhost:8000)
 * - Throws a descriptive ApiError on non-2xx responses
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

// ---------------------------------------------------------------------------
// CSRF helper
// ---------------------------------------------------------------------------

/** Read a cookie value by name. Returns empty string if not found. */
function getCookie(name: string): string {
    if (typeof document === "undefined") return "";
    const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split("=")[1]) : "";
}

const UNSAFE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

async function apiRequest<T>(
    method: string,
    path: string,
    {
        body,
        params,
    }: { body?: unknown; params?: Record<string, unknown> } = {}
): Promise<T> {
    // Build URL (append query string for GET-style params)
    let url = `${BASE_URL}${path}`;
    if (params && Object.keys(params).length > 0) {
        const qs = new URLSearchParams(
            Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)])
        ).toString();
        url = `${url}?${qs}`;
    }

    const headers: Record<string, string> = {
        Accept: "application/json",
    };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    if (UNSAFE_METHODS.has(method.toUpperCase())) {
        const token = getCookie("csrftoken");
        if (token) {
            headers["X-CSRFToken"] = token;
        }
    }

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // Parse response body (prefer JSON)
    let data: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        // DRF typically puts the human message in `detail`
        let message: string;
        if (
            data &&
            typeof data === "object" &&
            "detail" in (data as Record<string, unknown>)
        ) {
            message = String((data as Record<string, unknown>).detail);
        } else {
            message = `${response.status} ${response.statusText}`;
        }
        throw new ApiError(message, response.status, data);
    }

    return data as T;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** GET — supports optional query params object */
export function apiGet<T>(
    path: string,
    params?: Record<string, unknown>
): Promise<T> {
    return apiRequest<T>("GET", path, { params });
}

/** POST with JSON body */
export function apiPost<T>(path: string, body?: unknown): Promise<T> {
    return apiRequest<T>("POST", path, { body });
}

/** PATCH with JSON body */
export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
    return apiRequest<T>("PATCH", path, { body });
}

/** PUT with JSON body */
export function apiPut<T>(path: string, body?: unknown): Promise<T> {
    return apiRequest<T>("PUT", path, { body });
}

/** DELETE (body rarely needed but kept generic) */
export function apiDelete<T>(path: string): Promise<T> {
    return apiRequest<T>("DELETE", path);
}
