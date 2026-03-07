import { apiGet } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { Paginated } from "../../api/types";
import { Office } from "./offices.types";

export async function listOffices(params?: {
    page?: number;
    type?: "own";
    associate_company_id?: number;
    include_inactive?: boolean;
}): Promise<Paginated<Office> | Office[]> {
    return apiGet<Paginated<Office> | Office[]>(endpoints.offices(), params);
}
