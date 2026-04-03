import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { WarehouseFormData, PackageFormData } from "../types";
import { SenderCard } from "../components/SenderCard";
import { RecipientCard } from "../components/RecipientCard";
import { WarehouseInfoCard } from "../components/WarehouseInfoCard";
import { PackagesTable } from "../components/PackagesTable";
import { TotalsSummary } from "../components/TotalsSummary";

import { listClients } from "../../clients/clients.api";
import { listAssociateCompanies } from "../../company/associates.api";
import { createWarehouseReceipt } from "../../receiving/receiving.api";
import { Client } from "../../clients/types";
import { AssociateCompany } from "../../company/associates.types";
import { WarehouseReceiptCreate, WarehouseReceiptLineCreate } from "../../receiving/types";
import { ApiError } from "../../../api/client";

const INITIAL_PACKAGE: PackageFormData = {
    date: new Date().toISOString().split('T')[0],
    carrier: "",
    type: "",
    trackingNumbers: [""],
    description: "",
    value: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    pieces: "",
    volume: 0,
    repackable: false,
    billInvoice: false,
};

export default function CreateWarehousePage() {
    const navigate = useNavigate();

    // Data lists for dropdowns
    const [clients, setClients] = useState<Client[]>([]);
    const [agencies, setAgencies] = useState<AssociateCompany[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form submission state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Field States
    const [selectedClientId, setSelectedClientId] = useState<number | "">("");
    const [selectedRecipientId, setSelectedRecipientId] = useState<number | "">("");
    const [allowRepacking, setAllowRepacking] = useState(false);

    const [warehouseData, setWarehouseData] = useState<WarehouseFormData>({
        agency: "",
        shippingMethod: "",
        type: "",
        location: "",
        notes: "",
    });

    const [packages, setPackages] = useState<PackageFormData[]>([
        { ...INITIAL_PACKAGE, id: Date.now().toString() }
    ]);

    // Fetch dropdowns on mount
    useEffect(() => {
        let isMounted = true;
        setLoadingData(true);

        Promise.all([
            listClients(),
            listAssociateCompanies()
        ]).then(([clientsRes, agenciesRes]) => {
            if (!isMounted) return;
            setClients(Array.isArray(clientsRes) ? clientsRes : clientsRes.results);
            setAgencies(Array.isArray(agenciesRes) ? agenciesRes : agenciesRes.results);
        }).catch(err => {
            if (!isMounted) return;
            console.error("Failed to load dropdown data:", err);
            setError("Failed to load necessary form data. Please refresh.");
        }).finally(() => {
            if (isMounted) setLoadingData(false);
        });

        return () => { isMounted = false; };
    }, []);

    // When a new client is created via the modal, prepend it to the list
    const handleClientAdded = (newClient: Client) => {
        setClients(prev => [newClient, ...prev]);
    };

    // Helpers to modify package array inline
    const handlePackageChange = (index: number, field: keyof PackageFormData, value: any) => {
        setPackages(prev => {
            const updated = [...prev];
            const pkg = { ...updated[index], [field]: value };

            if (field === 'length' || field === 'width' || field === 'height') {
                const l = Number(pkg.length) || 0;
                const w = Number(pkg.width) || 0;
                const h = Number(pkg.height) || 0;
                pkg.volume = Math.round(((l * w * h) / 1728) * 10000) / 10000;
            }

            if (field === 'pieces') {
                const count = Math.max(1, Number(value) || 1);
                const current = pkg.trackingNumbers;
                if (count > current.length) {
                    pkg.trackingNumbers = [...current, ...Array(count - current.length).fill('')];
                } else if (count < current.length) {
                    pkg.trackingNumbers = current.slice(0, count);
                }
            }

            updated[index] = pkg;
            return updated;
        });
    };

    const handleWarehouseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setWarehouseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddRow = (index: number) => {
        setPackages(prev => {
            const updated = [...prev];
            updated.splice(index + 1, 0, { ...INITIAL_PACKAGE, id: Date.now().toString() });
            return updated;
        });
    };

    const handleRemoveRow = (index: number) => {
        setPackages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        if (!selectedClientId) {
            setError("Sender (Client) is required.");
            setSubmitting(false);
            return;
        }

        try {
            // Map lines
            const lines: WarehouseReceiptLineCreate[] = packages.map(pkg => ({
                date: pkg.date || undefined,
                carrier: pkg.carrier || undefined,
                package_type: pkg.type || undefined,
                tracking_numbers: Array.from(
                    { length: Math.max(1, Number(pkg.pieces) || 1) },
                    (_, i) => ({ tracking_number: (pkg.trackingNumbers[i] ?? '').trim(), order: i })
                ).filter(t => t.tracking_number !== ''),
                description: pkg.description || undefined,
                declared_value: pkg.value ? String(pkg.value) : undefined,
                length: pkg.length ? String(pkg.length) : undefined,
                width: pkg.width ? String(pkg.width) : undefined,
                height: pkg.height ? String(pkg.height) : undefined,
                weight: pkg.weight ? String(pkg.weight) : undefined,
                pieces: pkg.pieces ? Number(pkg.pieces) : 1, // Default 1
                volume_cf: pkg.volume ? (Math.round(pkg.volume * 10000) / 10000).toFixed(4) : undefined,
                repackable: pkg.repackable,
                bill_invoice: pkg.billInvoice ? "true" : "false", // or map to string if your backend expects that
                // No specific notes row in PackageFormData yet, so omitting
            }));

            // Resolve recipient from selected client
            const recipientClient = selectedRecipientId
                ? clients.find(c => c.id === selectedRecipientId)
                : undefined;
            const recipientName = recipientClient
                ? (recipientClient.client_type === 'company'
                    ? recipientClient.name
                    : `${recipientClient.name || ''} ${recipientClient.last_name || ''}`.trim())
                : undefined;
            const recipientAddress = recipientClient
                ? [recipientClient.address, recipientClient.city, recipientClient.postal_code].filter(Boolean).join(', ')
                : undefined;

            // Map Header
            const payload: WarehouseReceiptCreate = {
                client: selectedClientId as number,
                associate_company: warehouseData.agency ? Number(warehouseData.agency) : undefined,
                shipping_method: warehouseData.shippingMethod ? (warehouseData.shippingMethod as "air" | "sea" | "ground") : undefined,
                receipt_type: warehouseData.type || undefined,
                location_note: warehouseData.location || undefined,
                recipient_name: recipientName || undefined,
                recipient_address: recipientAddress || undefined,
                allow_repacking: allowRepacking,
                notes: warehouseData.notes || undefined,
                lines: lines.length > 0 ? lines : undefined,
            };

            await createWarehouseReceipt(payload);

            navigate('/warehouses');

        } catch (err) {
            console.error('Failed to create warehouse receipt:', err);
            if (err instanceof ApiError) {
                setError(`API Error: ${err.message}`);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingData) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading form data...</div>;
    }

    return (
        <form onSubmit={handleSubmit} style={{ padding: "0 0 40px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ margin: 0, fontSize: "28px", color: "#1a1a1a" }}>Create Warehouse Receipt</h1>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {error && <span style={{ color: "#dc2626", fontWeight: 500 }}>{error}</span>}
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        style={{ padding: "10px 20px", background: "white", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontWeight: 600, color: "#555" }}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{ padding: "10px 24px", background: "#0052cc", border: "none", borderRadius: "6px", color: "white", cursor: "pointer", fontWeight: 600 }}
                        disabled={submitting}
                    >
                        {submitting ? "Saving..." : "Save Receipt"}
                    </button>
                </div>
            </div>

            {/* Top Grid: Sender, Recipient, Warehouse Info */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px", marginBottom: "24px", alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <SenderCard
                        clients={clients}
                        selectedClientId={selectedClientId}
                        onChange={setSelectedClientId}
                        onClientCreated={handleClientAdded}
                    />
                    <RecipientCard
                        clients={clients}
                        selectedClientId={selectedRecipientId}
                        onChange={setSelectedRecipientId}
                        onClientCreated={handleClientAdded}
                    />
                </div>

                <div style={{ height: "100%" }}>
                    <WarehouseInfoCard
                        data={warehouseData}
                        agencies={agencies}
                        onChange={handleWarehouseChange}
                    />
                </div>
            </div>

            {/* Bottom Section: Packages */}
            <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "12px", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", color: "#333" }}>Packages</h2>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none", fontSize: "14px", fontWeight: 600, color: "#444" }}>
                            <div
                                onClick={() => setAllowRepacking(prev => !prev)}
                                style={{
                                    position: "relative",
                                    width: "42px",
                                    height: "24px",
                                    borderRadius: "12px",
                                    background: allowRepacking ? "#22c55e" : "#ccc",
                                    transition: "background 0.25s",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{
                                    position: "absolute",
                                    top: "3px",
                                    left: allowRepacking ? "21px" : "3px",
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    background: "white",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                                    transition: "left 0.25s",
                                }} />
                            </div>
                            Allow Repacking
                        </label>

                        <button type="button" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#9c6bd1ff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M5.713 20.713Q5.425 21 5 21H2q-.425 0-.712-.288T1 20v-3q0-.425.288-.712T2 16t.713.288T3 17v2h2q.425 0 .713.288T6 20t-.288.713m17-4.426Q23 16.575 23 17v3q0 .425-.288.713T22 21h-3q-.425 0-.712-.288T18 20t.288-.712T19 19h2v-2q0-.425.288-.712T22 16t.713.288M4.5 18q-.2 0-.35-.15T4 17.5v-11q0-.2.15-.35T4.5 6h1q.2 0 .35.15T6 6.5v11q0 .2-.15.35T5.5 18zm2.65-.15Q7 17.7 7 17.5v-11q0-.2.15-.35T7.5 6t.35.15t.15.35v11q0 .2-.15.35T7.5 18t-.35-.15m3.35.15q-.2 0-.35-.15T10 17.5v-11q0-.2.15-.35T10.5 6h1q.2 0 .35.15t.15.35v11q0 .2-.15.35t-.35.15zm3 0q-.2 0-.35-.15T13 17.5v-11q0-.2.15-.35T13.5 6h2q.2 0 .35.15t.15.35v11q0 .2-.15.35t-.35.15zm3.65-.15Q17 17.7 17 17.5v-11q0-.2.15-.35T17.5 6t.35.15t.15.35v11q0 .2-.15.35t-.35.15t-.35-.15m2 0Q19 17.7 19 17.5v-11q0-.2.15-.35T19.5 6t.35.15t.15.35v11q0 .2-.15.35t-.35.15t-.35-.15M5.713 4.712Q5.425 5 5 5H3v2q0 .425-.288.713T2 8t-.712-.288T1 7V4q0-.425.288-.712T2 3h3q.425 0 .713.288T6 4t-.288.713m12.576-1.425Q18.575 3 19 3h3q.425 0 .713.288T23 4v3q0 .425-.288.713T22 8t-.712-.288T21 7V5h-2q-.425 0-.712-.288T18 4t.288-.712" /></svg> Scan
                        </button>
                    </div>
                </div>

                <PackagesTable
                    packages={packages}
                    onChange={handlePackageChange}
                    onAddRow={handleAddRow}
                    onRemoveRow={handleRemoveRow}
                />

                <TotalsSummary packages={packages} />
            </div>
        </form>
    );
}
