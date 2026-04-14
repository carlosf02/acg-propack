import { apiGet, apiPost } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { Paginated } from "../../api/types";

export interface RepackOutputLine {
    date?: string;
    carrier?: string;
    package_type?: string;
    tracking_number?: string;
    description?: string;
    declared_value?: number;
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    pieces?: number;
    volume_cf?: number;
}

export interface RepackOutput {
    tracking_number?: string;
    carrier?: string;
    description?: string;
    location_note?: string;
    notes?: string;
    lines?: RepackOutputLine[];
}

export interface CreateRepackPayload {
    client: number;
    input_wrs: number[];
    to_location?: number | null;
    output?: RepackOutput;
    notes?: string;
}

export interface CreateRepackResponse {
    status: string;
    repack_operation_id: number;
    output_wr_id: number;
    output_wr_number: string;
    input_wr_ids: number[];
    consume_transaction_id: number;
    produce_transaction_id: number;
    to_location: number;
}

export async function createRepack(
    payload: CreateRepackPayload
): Promise<CreateRepackResponse> {
    return apiPost<CreateRepackResponse>(endpoints.repackConsolidate(), payload);
}

export interface StorageLocation {
    id: number;
    code: string;
    description?: string | null;
    location_type?: string;
    warehouse: number;
    is_active: boolean;
}

export interface Repack {
    id: number;
    performed_at: string;
    created_at: string;
    operation_type: string;
    operation_type_display: string;
    notes: string;
    client: number;
    client_name: string;
    client_code: string;
    input_wr_count: number;
    input_wr_numbers: string[];
    output_wr_id: number | null;
    output_wr_number: string | null;
    output_tracking_number: string | null;
}

export async function listRepacks(params?: {
    page?: number;
    search?: string;
    operation_type?: string;
    client?: number;
}): Promise<Paginated<Repack> | Repack[]> {
    return apiGet<Paginated<Repack> | Repack[]>(endpoints.repacks(), params);
}
