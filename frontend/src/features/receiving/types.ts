export interface WarehouseReceiptLine {
    id: number;
    date?: string;
    carrier?: string;
    package_type?: string;
    tracking_number?: string;
    tracking_numbers?: Array<{ id: number; tracking_number: string; order: number }>;
    description?: string;
    declared_value?: string; // Often returned as decimal string
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
    pieces: number;
    volume_cf?: string;
    repackable: boolean;
    bill_invoice?: string;
    notes?: string;
}

export interface ClientMinimal {
    id: number;
    client_code: string;
    name: string;
    city?: string | null;
}

export interface AssociateCompanyMinimal {
    id: number;
    name: string;
}

export interface WarehouseMinimal {
    id: number;
    code: string;
    name: string;
}

export interface WRParentMinimal {
    id: number;
    wr_number: string;
    tracking_number?: string | null;
}

export type WRStatusDisplay = {
    type: "not_processed" | "processed" | "repacked";
    reference: string | null;
};

export interface WarehouseReceipt {
    id: number;
    wr_number?: string;
    client: number;
    client_details?: ClientMinimal | null;
    received_warehouse?: number | null;
    warehouse_details?: WarehouseMinimal | null;
    tracking_number?: string | null;
    carrier?: string | null;
    status?: string;
    received_at?: string | null;
    parent_wr?: number | null;
    parent_wr_details?: WRParentMinimal | null;
    associate_company?: number | null;
    associate_company_details?: AssociateCompanyMinimal | null;
    shipping_method?: "air" | "sea" | "ground" | null;
    receipt_type?: string | null;
    location_note?: string | null;
    recipient_name?: string | null;
    recipient_address?: string | null;
    allow_repacking: boolean;
    is_repack?: boolean;
    notes?: string | null;
    wr_status_display?: WRStatusDisplay | null;
    created_at?: string;
    updated_at?: string;
    lines: WarehouseReceiptLine[];
}

export interface WarehouseReceiptLineCreate {
    date?: string;
    carrier?: string;
    package_type?: string;
    tracking_numbers?: Array<{ tracking_number: string; order: number }>;
    description?: string;
    declared_value?: string;
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
    pieces?: number; // Defaults to 1 if omitted as per spec
    volume_cf?: string;
    repackable?: boolean;
    bill_invoice?: string;
    notes?: string;
}

export interface WarehouseReceiptCreate {
    client: number;
    associate_company?: number | null;
    shipping_method?: "air" | "sea" | "ground" | null;
    receipt_type?: string | null;
    location_note?: string | null;
    recipient_name?: string | null;
    recipient_address?: string | null;
    allow_repacking?: boolean;
    notes?: string | null;
    lines?: WarehouseReceiptLineCreate[];
}
