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
    associate_company_name?: string;
    ship_type: "AIR" | "SEA" | "GROUND";
    ship_type_display?: string;
    consolidation_type?: string | null;
    sending_office: number;
    sending_office_name?: string;
    receiving_office: number;
    receiving_office_name?: string;
    alt_name?: string;
    note?: string;
    status: string;
    status_display?: string;
    warehouse_receipt_ids?: number[];
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
