import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onReady: () => void;
  mode: 'payment' | 'setup';
  submitLabel?: string;
}

export default function StripePaymentForm({ onSuccess, onCancel, onReady, mode, submitLabel }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'setup') {
        const { error } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required',
        });
        if (error) throw error;
      } else {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required',
        });
        if (error) throw error;
      }
      
      // Success!
      onSuccess();
    } catch (err: any) {
      console.error(`Stripe ${mode} error`, err);
      setMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} style={{ marginTop: '0.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <PaymentElement 
          id="payment-element" 
          onReady={onReady}
          options={{
            layout: 'accordion',
            business: { name: 'ACG ProPack' },
            developerTools: { assistant: { enabled: false } }
          } as any}
        />
      </div>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            color: '#4b5563',
            border: '1px solid #d1d5db',
            padding: '10px 20px',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button 
          disabled={isLoading || !stripe || !elements} 
          id="submit"
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: 6,
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          <span id="button-text">
            {isLoading ? "Processing..." : (submitLabel || (mode === 'setup' ? "Save Card Details" : "Confirm Payment"))}
          </span>
        </button>
      </div>

      {/* Show any error or success messages */}
      {message && (
        <div id="payment-message" style={{ color: "#ef4444", marginTop: 12, fontSize: "0.875rem", textAlign: "center" }}>
          {message}
        </div>
      )}
    </form>
  );
}
