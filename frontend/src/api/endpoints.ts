/**
 * API Endpoints — single source of truth for all API paths.
 *
 * Usage:
 *   import { endpoints } from '@/api/endpoints';
 *   apiGet(endpoints.me())
 *   apiGet(endpoints.shipments(), { page: 1 })
 */

export const endpoints = {
    // Auth
    csrf: () => "/api/v1/csrf/",
    login: () => "/api/v1/login/",
    logout: () => "/api/v1/logout/",
    signup: () => "/api/v1/signup/",

    // Auth / current user
    me: () => "/api/v1/me/",

    // Core resources
    warehouses: () => "/api/v1/warehouses/",
    locations: () => "/api/v1/locations/",
    clients: () => "/api/v1/clients/",
    shipments: () => "/api/v1/shipments/",
    warehouseReceipts: () => "/api/v1/wrs/",

    // Company / membership
    associateCompanies: () => "/api/v1/associate-companies/",
    offices: () => "/api/v1/offices/",
    consolidations: () => "/api/v1/consolidations/",
    companyMembers: () => "/api/v1/company/members/",
    companies: () => "/api/v1/companies/",
} as const;

export type EndpointKey = keyof typeof endpoints;
