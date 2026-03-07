export interface WarehouseReceiptLine {
    id: number;
    date?: string;
    carrier?: string;
    package_type?: string;
    tracking_number?: string;
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

export interface WarehouseReceipt {
    id: number;
    wr_number?: string;
    client: number;
    associate_company?: number | null;
    shipping_method?: "air" | "sea" | "ground" | null;
    receipt_type?: string | null;
    location_note?: string | null;
    recipient_name?: string | null;
    recipient_address?: string | null;
    allow_repacking: boolean;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
    lines: WarehouseReceiptLine[];
}

export interface WarehouseReceiptLineCreate {
    date?: string;
    carrier?: string;
    package_type?: string;
    tracking_number?: string;
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
