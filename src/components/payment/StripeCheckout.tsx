import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, CheckCircle, XCircle, Loader } from 'lucide-react';

interface StripeCheckoutProps {
    courseId: string;
    courseTitle: string;
    amount: number;
    userId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
                                                           courseId,
                                                           courseTitle,
                                                           amount,
                                                           userId,
                                                           onSuccess,
                                                           onCancel,
                                                       }) => {
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stripe, setStripe] = useState<any>(null);
    const [elements, setElements] = useState<any>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

    useEffect(() => {
        loadStripe();
    }, []);

    const loadStripe = async () => {
        try {
            const { data: config } = await supabase
                .from('tbl_stripe_config')
                .select('tsc_publishable_key')
                .single();

            if (!config) {
                setError('Stripe is not configured. Please contact administrator.');
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.async = true;
            script.onload = () => {
                const stripeInstance = (window as any).Stripe(config.tsc_publishable_key);
                setStripe(stripeInstance);
            };
            document.body.appendChild(script);
        } catch (err) {
            console.error('Error loading Stripe:', err);
            setError('Failed to load payment system');
        }
    };

    const createPaymentIntent = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: functionError } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    courseId,
                    userId,
                    amount,
                },
            });

            if (functionError) throw functionError;

            setClientSecret(data.clientSecret);
            setPaymentIntentId(data.paymentIntentId);

            if (stripe) {
                const elementsInstance = stripe.elements({ clientSecret: data.clientSecret });
                const paymentElement = elementsInstance.create('payment');
                paymentElement.mount('#payment-element');
                setElements(elementsInstance);
            }
        } catch (err: any) {
            console.error('Error creating payment intent:', err);
            setError(err.message || 'Failed to initialize payment');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const { error: submitError } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
            });

            if (submitError) {
                setError(submitError.message);
                setProcessing(false);
                return;
            }

            const { data, error: confirmError } = await supabase.functions.invoke('confirm-payment', {
                body: {
                    paymentIntentId,
                    userId,
                    courseId,
                },
            });

            if (confirmError) throw confirmError;

            if (data.success) {
                onSuccess();
            } else {
                setError('Payment was not successful. Please try again.');
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.message || 'Payment failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Course</div>
                    <div className="font-semibold text-gray-900">{courseTitle}</div>
                    <div className="text-2xl font-bold text-blue-600 mt-2">${amount.toFixed(2)}</div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 flex items-start space-x-3">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">{error}</div>
                </div>
            )}

            {!clientSecret ? (
                <div className="space-y-4">
                    <button
                        onClick={createPaymentIntent}
                        disabled={loading || !stripe}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        {loading ? (
                            <>
                                <Loader className="h-5 w-5 animate-spin" />
                                <span>Initializing...</span>
                            </>
                        ) : (
                            <span>Continue to Payment</span>
                        )}
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div id="payment-element"></div>

                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            disabled={processing || !stripe}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {processing ? (
                                <>
                                    <Loader className="h-5 w-5 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Pay ${amount.toFixed(2)}</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={processing}
                            className="px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-6 text-xs text-gray-500 text-center">
                <p>Secured by Stripe</p>
                <p className="mt-1">Your payment information is encrypted and secure</p>
            </div>
        </div>
    );
};

export default StripeCheckout;