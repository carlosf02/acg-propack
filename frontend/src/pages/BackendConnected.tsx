import { useEffect, useState } from 'react';
import { getHealth, HealthResponse } from '../api/endpoints';
import { ApiError } from '../api/client';

export default function BackendConnected() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [response, setResponse] = useState<HealthResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkHealth = async () => {
        setStatus('loading');
        setError(null);
        try {
            const data = await getHealth();
            setResponse(data);
            setStatus('success');
        } catch (err: unknown) {
            console.error(err);
            setStatus('error');
            if (err instanceof ApiError) {
                setError(`${err.status} ${err.message}`);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unknown error occurred');
            }
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            <h1>Backend Connection Status</h1>

            {status === 'loading' && <p>Checking backend connection...</p>}

            {status === 'success' && (
                <div style={{ color: 'green' }}>
                    <h2>Backend Connected ✅</h2>
                    <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
                        {JSON.stringify(response, null, 2)}
                    </pre>
                </div>
            )}

            {status === 'error' && (
                <div style={{ color: 'red' }}>
                    <h2>Backend Not Reachable ❌</h2>
                    <p>Error: {error}</p>
                    <button
                        onClick={checkHealth}
                        style={{
                            padding: '8px 16px',
                            cursor: 'pointer',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px'
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
}
