import { useState } from 'react';
import './CreateLockerPage.css';

export default function CreateLockerPage() {
    const [clientType, setClientType] = useState('person');

    return (
        <div className="clp-container">
            <div className="clp-header">
                <h2>Create Locker</h2>
            </div>

            <div className="clp-card">
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
                        <label className="clp-label">Name <span>*</span></label>
                        <input type="text" className="clp-input" placeholder="e.g. John" />
                    </div>
                    <div className="clp-col">
                        <label className="clp-label">Last Name</label>
                        <input
                            type="text"
                            className="clp-input"
                            placeholder="e.g. Doe"
                            disabled={clientType === 'company'}
                        />
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col" style={{ flex: '1 0 100%' }}>
                        <label className="clp-label">Address <span>*</span></label>
                        <input type="text" className="clp-input" placeholder="Street layout, building, suite..." />
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col">
                        <label className="clp-label">Zip Code</label>
                        <input type="text" className="clp-input" placeholder="e.g. 33166" />
                    </div>
                    <div className="clp-col">
                        <label className="clp-label">City <span>*</span></label>
                        <input type="text" className="clp-input" placeholder="Search City..." list="city-options" />
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
                        <input type="tel" className="clp-input" placeholder="+1 (555) 000-0000" />
                    </div>
                    <div className="clp-col">
                        <label className="clp-label">{clientType === 'person' ? 'Home Phone' : 'Company Phone'}</label>
                        <input type="tel" className="clp-input" placeholder="+1 (555) 111-1111" />
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col">
                        <label className="clp-label">Email <span>*</span></label>
                        <input type="email" className="clp-input" placeholder="name@example.com" />
                    </div>
                    <div className="clp-col">
                        <label className="clp-label">Repeat Email <span>*</span></label>
                        <input type="email" className="clp-input" placeholder="name@example.com" />
                    </div>
                </div>

                <div className="clp-row">
                    <div className="clp-col">
                        <label className="clp-label">Password <span>*</span></label>
                        <input type="password" className="clp-input" placeholder="••••••••" />
                    </div>
                    <div className="clp-col">
                        <label className="clp-label">Repeat Password <span>*</span></label>
                        <input type="password" className="clp-input" placeholder="••••••••" />
                    </div>
                </div>

                <div className="clp-footer">
                    <button className="clp-btn clp-btn-secondary" style={{ minWidth: '100px' }}>Cancel</button>
                    <button className="clp-btn clp-btn-primary" style={{ minWidth: '100px' }}>Create</button>
                </div>
            </div>
        </div>
    );
}
