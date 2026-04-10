export interface Client {
    id: number;
    client_code: string;
    client_type: string;
    name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    cellphone?: string;
    home_phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    associate_company?: number | null;
    associate_company_details?: { id: number; name: string } | null;
    created_at?: string;
    updated_at?: string;
}

export interface ClientCreate {
    client_type?: "person" | "company";
    name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    cellphone?: string;
    home_phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    associate_company?: number | null;
}
