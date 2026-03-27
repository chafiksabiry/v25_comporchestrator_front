import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

interface CheckoutFormProps {
  clientSecret: string;
  amount: number;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: any) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ clientSecret, amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (error) {
      setError(error.message || 'An unexpected error occurred.');
      setProcessing(false);
      if (onError) onError(error);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setSucceeded(true);
      setProcessing(false);
      if (onSuccess) onSuccess(paymentIntent);
    } else {
      setError('Payment status is: ' + (paymentIntent?.status || 'unknown'));
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        color: '#1a1a1a',
        fontFamily: '"Inter", sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#9ca3af',
        },
        padding: '12px',
      },
      invalid: {
        color: '#ff4d4d',
        iconColor: '#ff4d4d',
      },
    },
    hidePostalCode: true,
  };

  if (succeeded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in bg-white rounded-3xl border border-green-100 shadow-xl">
        <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6 shadow-sm ring-1 ring-green-100">
          <CheckCircle2 size={40} strokeWidth={2.5} />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Payment Successful!</h3>
        <p className="text-gray-500 font-medium">Thank you for your purchase. Your access is now being activated.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-harx-500/5 border border-gray-100 relative overflow-hidden group">
        {/* Abstract Deco */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-harx opacity-[0.03] rounded-full blur-3xl group-hover:opacity-[0.08] transition-opacity duration-700" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-gradient-to-br from-gray-900 to-black rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-harx-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-harx-500">Secure Payment</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Checkout</h2>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Card Details</label>
              <div className="p-4 rounded-2xl border-2 border-gray-100 focus-within:border-harx-500/50 transition-all duration-300 bg-gray-50/30">
                <CardElement options={cardElementOptions} />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 animate-fade-in">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!stripe || processing}
              className={`w-full py-5 px-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 relative overflow-hidden group/btn ${
                processing || !stripe
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-gray-900 text-white hover:bg-black shadow-xl shadow-black/10'
              }`}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {processing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Payment • €{(amount / 100).toFixed(2)}</span>
                  </>
                )}
              </div>
              
              {!processing && stripe && (
                <div className="absolute inset-0 bg-gradient-harx opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 -z-0" />
              )}
            </button>

            <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest leading-relaxed">
              Powered by <span className="text-gray-900">Stripe</span> • SSL Encrypted
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CheckoutForm;
