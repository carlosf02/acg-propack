import { apiGet, apiPost, apiPatch, apiDelete } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { Paginated } from "../../api/types";
import { Consolidation, ConsolidationCreate } from "./types";

export async function listConsolidations(params?: {
    page?: number;
    status?: string;
    ship_type?: string;
}): Promise<Paginated<Consolidation> | Consolidation[]> {
    return apiGet<Paginated<Consolidation> | Consolidation[]>(
        endpoints.consolidations(),
        params
    );
}

export async function getConsolidation(id: number): Promise<Consolidation> {
    return apiGet<Consolidation>(`${endpoints.consolidations()}${id}/`);
}

export async function createConsolidation(
    payload: ConsolidationCreate
): Promise<Consolidation> {
    return apiPost<Consolidation>(endpoints.consolidations(), payload);
}

export async function updateConsolidation(
    id: number,
    payload: Partial<Consolidation>
): Promise<Consolidation> {
    return apiPatch<Consolidation>(
        `${endpoints.consolidations()}${id}/`,
        payload
    );
}

export async function deleteConsolidation(id: number): Promise<unknown> {
    return apiDelete(`${endpoints.consolidations()}${id}/`);
}

export async function addItemToConsolidation(
    id: number,
    warehouseReceiptId: number
): Promise<Consolidation> {
    return apiPost<Consolidation>(
        `${endpoints.consolidations()}${id}/add_item/`,
        { warehouse_receipt_id: warehouseReceiptId }
    );
}

export async function removeItemFromConsolidation(
    id: number,
    warehouseReceiptId: number
): Promise<Consolidation> {
    return apiPost<Consolidation>(
        `${endpoints.consolidations()}${id}/remove_item/`,
        { warehouse_receipt_id: warehouseReceiptId }
    );
}

export async function closeConsolidation(id: number): Promise<Consolidation> {
    return apiPost<Consolidation>(
        `${endpoints.consolidations()}${id}/close/`
    );
}
