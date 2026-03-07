export interface ConsolidationFormData {
    agency: string;
    shippingMethod: string;
    type: string;
    notes: string;
    sendingOffice: string;
    receivingOffice: string;
}

export interface Consolidation {
    id: number;
    reference_code?: string;
    associate_company: number;
    ship_type: "AIR" | "SEA" | "GROUND";
    consolidation_type?: string | null;
    sending_office: number;
    receiving_office: number;
    alt_name?: string;
    note?: string;
    status: string;
    created_at?: string;
    updated_at?: string;
}

export interface ConsolidationCreate {
    associate_company: number;
    ship_type: "AIR" | "SEA" | "GROUND";
    sending_office: number;
    receiving_office: number;
    consolidation_type?: string | null;
    alt_name?: string;
    note?: string;
    status?: string;
    warehouse_receipts?: number[];
}
