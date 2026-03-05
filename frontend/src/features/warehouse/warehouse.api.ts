import { apiGet, apiPost } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import type { Paginated } from "../../api/types";

export interface Warehouse {
    id: number;
    code: string;
    name: string;
}

export interface CreateWarehousePayload {
    code: string;
    name: string;
}

export function listWarehouses(params?: Record<string, unknown>): Promise<Paginated<Warehouse>> {
    return apiGet<Paginated<Warehouse>>(endpoints.warehouses(), params);
}

export function createWarehouse(payload: CreateWarehousePayload): Promise<Warehouse> {
    return apiPost<Warehouse>(endpoints.warehouses(), payload);
}
