/**
 * Shared API types used across the API layer.
 */

/** Standard DRF paginated list response. */
export interface Paginated<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
