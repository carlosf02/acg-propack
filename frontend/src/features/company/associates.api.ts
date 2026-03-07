import { apiGet } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { Paginated } from "../../api/types";
import { AssociateCompany } from "./associates.types";

export async function listAssociateCompanies(params?: {
    page?: number;
    include_inactive?: boolean;
}): Promise<Paginated<AssociateCompany> | AssociateCompany[]> {
    return apiGet<Paginated<AssociateCompany> | AssociateCompany[]>(
        endpoints.associateCompanies(),
        params
    );
}
