export interface Office {
    id: number;
    name: string;
    code?: string;
    associate_company?: number | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
