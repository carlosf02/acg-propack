import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '../clients.api';
import { ClientCreate } from '../types';
import { ApiError } from '../../../api/client';
import './CreateLockerPage.css';

export default function CreateLockerPage() {
    const navigate = useNavigate();

    // UI State
    const [clientType, setClientType] = useState<'person' | 'company'>('person');
    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [cellphone, setCellphone] = useState('');
    const [homePhone, setHomePhone] = useState('');
    const [email, setEmail] = useState('');

    // We ignore repeatEmail/passwords visually for this API integration since the backend 
    // endpoint just creates a Client record (not a full user auth record with password yet).
    // The instructions specified mapping these basic fields.

    // Form submission state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        if (!name || !address || !city || !email) {
            setError('Please fill in all required fields (*)');
            setSubmitting(false);
            return;
        }

        const payload: ClientCreate = {
            client_type: clientType,
            name: name,
            last_name: clientType === 'person' ? lastName : undefined,
            address: address,
            city: city,
            postal_code: postalCode,
            cellphone: cellphone,
            home_phone: homePhone,
            email: email,
        };

        try {
            await createClient(payload);
            navigate('/lockers'); // Assuming this lists them, based on current layout standard
        } catch (err) {
            console.error('Failed to create client:', err);
            if (err instanceof ApiError) {
                setError(`API Error: ${err.message}`);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
            setSubmitting(false);
        }
    };

    return (
        <form className="clp-container" onSubmit={handleSubmit}>
            <div className="clp-header">
                <h2>Create Locker</h2>
            </div>

            <div className="clp-card">
                {error && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
                        {error}
                    </div>
                )}

                <div className="clp-section-header">
                    <h3 className="clp-section-title">Client Data</h3>
                    <div className="clp-radio-group">
                        <label className="clp-radio-label">
                            <input
                                type="radio"
                                name="clientType"
                                value="person"
                                className="clp-radio-input"
                                checked={clientType === 'person'}
                                onChange={() => setClientType('person')}
                            />
                            Person
                        </label>
                        <label className="clp-radio-label">
                            <input
                                type="radio"
                                name="clientType"
                                value="company"
                                className="clp-radio-input"
                                checked={clientType === 'company'}
                                onChange={() => setClientType('company')}
                            />
                            Company
                        </label>
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col">
                        <label className="clp-label">Name / Company Name <span>*</span></label>
                        <input
                            type="text"
                            className="clp-input"
                            placeholder="e.g. John or Acme Corp"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="clp-col">
                        <label className="clp-label">Last Name</label>
                        <input
                            type="text"
                            className="clp-input"
                            placeholder="e.g. Doe"
                            disabled={clientType === 'company'}
                            value={clientType === 'company' ? '' : lastName}
                            onChange={e => setLastName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col" style={{ flex: '1 0 100%' }}>
                        <label className="clp-label">Address <span>*</span></label>
                        <input
                            type="text"
                            className="clp-input"
                            placeholder="Street layout, building, suite..."
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col">
                        <label className="clp-label">Zip Code</label>
                        <input
                            type="text"
                            className="clp-input"
                            placeholder="e.g. 33166"
                            value={postalCode}
                            onChange={e => setPostalCode(e.target.value)}
                        />
                    </div>
                    <div className="clp-col">
                        <label className="clp-label">City <span>*</span></label>
                        <input
                            type="text"
                            className="clp-input"
                            placeholder="Search City..."
                            list="city-options"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            required
                        />
                        <datalist id="city-options">
                            <option value="Miami" />
                            <option value="Caracas" />
                            <option value="Orlando" />
                            <option value="Maracaibo" />
                        </datalist>
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col">
                        <label className="clp-label">Cellphone</label>
                        <input
                            type="tel"
                            className="clp-input"
                            placeholder="+1 (555) 000-0000"
                            value={cellphone}
                            onChange={e => setCellphone(e.target.value)}
                        />
                    </div>
                    <div className="clp-col">
                        <label className="clp-label">{clientType === 'person' ? 'Home Phone' : 'Company Phone'}</label>
                        <input
                            type="tel"
                            className="clp-input"
                            placeholder="+1 (555) 111-1111"
                            value={homePhone}
                            onChange={e => setHomePhone(e.target.value)}
                        />
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col">
                        <label className="clp-label">Email <span>*</span></label>
                        <input
                            type="email"
                            className="clp-input"
                            placeholder="name@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="clp-footer">
                    <button
                        type="button"
                        className="clp-btn clp-btn-secondary"
                        style={{ minWidth: '100px' }}
                        onClick={() => navigate(-1)}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="clp-btn clp-btn-primary"
                        style={{ minWidth: '100px' }}
                        disabled={submitting}
                    >
                        {submitting ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </form>
    );
}
