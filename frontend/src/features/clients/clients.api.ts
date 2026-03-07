import { apiGet, apiPost, apiPatch, apiDelete } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { Paginated } from "../../api/types";
import { Client, ClientCreate } from "./types";

export async function listClients(params?: {
    page?: number;
}): Promise<Paginated<Client> | Client[]> {
    return apiGet<Paginated<Client> | Client[]>(endpoints.clients(), params);
}

export async function getClient(id: number): Promise<Client> {
    return apiGet<Client>(`${endpoints.clients()}${id}/`);
}

export async function createClient(payload: ClientCreate): Promise<Client> {
    return apiPost<Client>(endpoints.clients(), payload);
}

export async function updateClient(
    id: number,
    payload: Partial<ClientCreate>
): Promise<Client> {
    return apiPatch<Client>(`${endpoints.clients()}${id}/`, payload);
}

export async function deleteClient(id: number): Promise<unknown> {
    return apiDelete(`${endpoints.clients()}${id}/`);
}
