export interface WarehouseFormData {
    agency: string;
    shippingMethod: string;
    type: string;
    location: string;
    notes: string;
}

export interface PackageFormData {
    id?: string; // used internally for saved packages
    date: string;
    carrier: string;
    type: string;
    tracking: string;
    description: string;
    value: number | "";
    length: number | "";
    width: number | "";
    height: number | "";
    weight: number | "";
    pieces: number | "";
    volume: number; // Calculated based on L * W * H
    repackable: boolean;
    billInvoice: boolean;
}
