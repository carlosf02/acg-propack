import { apiGet, apiPost, apiPatch, apiDelete } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { Paginated } from "../../api/types";
import { WarehouseReceipt, WarehouseReceiptCreate } from "./types";

export async function listWarehouseReceipts(params?: {
    page?: number;
    eligible_for?: 'repack';
    is_repack?: boolean;
}): Promise<Paginated<WarehouseReceipt> | WarehouseReceipt[]> {
    return apiGet<Paginated<WarehouseReceipt> | WarehouseReceipt[]>(
        endpoints.warehouseReceipts(),
        params
    );
}

export async function getWarehouseReceipt(
    id: number
): Promise<WarehouseReceipt> {
    return apiGet<WarehouseReceipt>(`${endpoints.warehouseReceipts()}${id}/`);
}

export async function createWarehouseReceipt(
    payload: WarehouseReceiptCreate
): Promise<WarehouseReceipt> {
    return apiPost<WarehouseReceipt>(endpoints.warehouseReceipts(), payload);
}

export async function updateWarehouseReceipt(
    id: number,
    payload: Partial<WarehouseReceiptCreate>
): Promise<WarehouseReceipt> {
    return apiPatch<WarehouseReceipt>(
        `${endpoints.warehouseReceipts()}${id}/`,
        payload
    );
}

export async function deleteWarehouseReceipt(id: number): Promise<unknown> {
    return apiDelete(`${endpoints.warehouseReceipts()}${id}/`);
}
