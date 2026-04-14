import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConsolidationFormData, ConsolidationCreate } from "../types";
import { createConsolidation } from "../consolidation.api";
import { listAssociateCompanies } from "../../company/associates.api";
import { listOffices } from "../../company/offices.api";
import { AssociateCompany } from "../../company/associates.types";
import { Office } from "../../company/offices.types";
import { ApiError } from "../../../api/client";
import "./CreateConsolidationPage.css";

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CreateConsolidationPage() {
    const navigate = useNavigate();

    // ── Data lists for dropdowns ───────────────────────────────────────────────
    const [agencies, setAgencies] = useState<AssociateCompany[]>([]);
    const [sendingOffices, setSendingOffices] = useState<Office[]>([]);
    const [receivingOffices, setReceivingOffices] = useState<Office[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form submission state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // ── Details form state ─────────────────────────────────────────────────────
    const [formData, setFormData] = useState<ConsolidationFormData>({
        agency: "",
        shippingMethod: "",
        type: "",
        notes: "",
        sendingOffice: "",
        receivingOffice: "",
    });

    // Fetch dropdowns on mount
    useEffect(() => {
        let isMounted = true;
        setLoadingData(true);
        setError('');

        Promise.all([
            listAssociateCompanies(),
            listOffices(),
            listOffices(),
        ]).then(([agenciesRes, sendingRes, receivingRes]) => {
            if (!isMounted) return;
            setAgencies(Array.isArray(agenciesRes) ? agenciesRes : agenciesRes.results);
            setSendingOffices(Array.isArray(sendingRes) ? sendingRes : sendingRes.results);
            setReceivingOffices(Array.isArray(receivingRes) ? receivingRes : receivingRes.results);
        }).catch(err => {
            if (!isMounted) return;
            console.error("Failed to load create consolidation data:", err);
            setError("Failed to load necessary form data. Please refresh.");
        }).finally(() => {
            if (isMounted) setLoadingData(false);
        });

        return () => { isMounted = false; };
    }, []);

    // ── Details handlers ───────────────────────────────────────────────────────
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        if (!formData.agency || !formData.sendingOffice || !formData.receivingOffice || !formData.shippingMethod) {
            setError("Agency, Shipping Method, Sending Office, and Receiving Office are required.");
            setSubmitting(false);
            return;
        }

        const payload: ConsolidationCreate = {
            associate_company: Number(formData.agency),
            sending_office: Number(formData.sendingOffice),
            receiving_office: Number(formData.receivingOffice),
            ship_type: formData.shippingMethod as "AIR" | "SEA" | "GROUND",
            consolidation_type: formData.type || undefined,
            note: formData.notes || undefined,
        };

        try {
            await createConsolidation(payload);
            navigate('/consolidated');
        } catch (err) {
            console.error('Failed to create consolidation:', err);
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

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="ccp-container">
            {/* Page header */}
            <div className="ccp-header">
                <div>
                    <h2>Create Consolidation</h2>
                </div>
                <div className="ccp-header-actions">
                    {error && <span style={{ color: "#dc2626", fontWeight: 500 }}>{error}</span>}
                    <button
                        type="button"
                        className="ccp-btn ccp-btn-secondary"
                        onClick={() => navigate('/consolidated')}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ccp-btn ccp-btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? "Saving..." : "Save Consolidation"}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* ── Details card ── */}
                <div className="ccp-card">
                    <div className="ccp-section-header">
                        <h3 className="ccp-section-title">Details</h3>
                    </div>

                    {/* Row 1 — Agency, Shipping Method, Type */}
                    <div className="ccp-grid-3">
                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="agency">
                                Agency
                            </label>
                            <select
                                id="agency"
                                name="agency"
                                value={formData.agency}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select an agency…</option>
                                {agencies.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="shippingMethod">
                                Shipping Method
                            </label>
                            <select
                                id="shippingMethod"
                                name="shippingMethod"
                                value={formData.shippingMethod}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select…</option>
                                <option value="AIR">Air</option>
                                <option value="SEA">Sea</option>
                                <option value="GROUND">Ground</option>
                            </select>
                        </div>

                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="type">
                                Type
                            </label>
                            <input
                                id="type"
                                name="type"
                                type="text"
                                placeholder="e.g. Standard"
                                value={formData.type}
                                onChange={handleChange}
                                className="ccp-input"
                            />
                        </div>
                    </div>

                    {/* Row 2 — Sending Office, Receiving Office */}
                    <div className="ccp-grid-2">
                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="sendingOffice">
                                Sending Office
                            </label>
                            <select
                                id="sendingOffice"
                                name="sendingOffice"
                                value={formData.sendingOffice}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select sending office…</option>
                                {sendingOffices.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="ccp-field">
                            <label className="ccp-label" htmlFor="receivingOffice">
                                Receiving Office
                            </label>
                            <select
                                id="receivingOffice"
                                name="receivingOffice"
                                value={formData.receivingOffice}
                                onChange={handleChange}
                                className="ccp-select"
                            >
                                <option value="">Select receiving office…</option>
                                {receivingOffices.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3 — Additional Notes */}
                    <div className="ccp-field ccp-field-full">
                        <label className="ccp-label" htmlFor="notes">
                            Additional Notes
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            className="ccp-textarea"
                            placeholder="Add any additional notes or instructions for this consolidation…"
                        />
                    </div>
                </div>
            </form>
        </div>
    );
}
