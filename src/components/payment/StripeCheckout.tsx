import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ArrowRight,
    CheckCircle,
    CreditCard,
    Loader,
    Lock,
    ShieldCheck,
    XCircle
} from 'lucide-react';

interface StripeCheckoutProps {
    courseId: string;
    courseTitle: string;
    amount: number;
    userId: string;
    payerName?: string;
    payerEmail?: string;
    onSuccess: (result: any) => void;
    onCancel: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
    courseId,
    courseTitle,
    amount,
    userId,
    payerName,
    payerEmail,
    onSuccess,
    onCancel,
}) => {
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stripe, setStripe] = useState<any>(null);
    const [elements, setElements] = useState<any>(null);
    const [cardElement, setCardElement] = useState<any>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
    const [paymentRecordId, setPaymentRecordId] = useState<string | null>(null);

    const resolvedBillingName = payerName?.trim() || payerEmail?.split('@')[0] || 'Customer';

    useEffect(() => {
        return () => {
            const mountedElement = document.getElementById('card-element');
            if (mountedElement) {
                mountedElement.innerHTML = '';
            }
        };
    }, []);

    useEffect(() => {
        if (clientSecret && stripe && !elements) {
            const timer = setTimeout(() => {
                try {
                    const paymentContainer = document.getElementById('card-element');
                    if (paymentContainer) {
                        paymentContainer.innerHTML = '';
                        const elementsInstance = stripe.elements();
                        const mountedCardElement = elementsInstance.create('card', {
                            disableLink: true,
                            hidePostalCode: true,
                            style: {
                                base: {
                                    color: '#0f172a',
                                    fontFamily: 'system-ui, sans-serif',
                                    fontSize: '16px',
                                    lineHeight: '24px',
                                    '::placeholder': {
                                        color: '#94a3b8',
                                    },
                                },
                                invalid: {
                                    color: '#dc2626',
                                },
                            },
                        });
                        mountedCardElement.mount('#card-element');
                        setElements(elementsInstance);
                        setCardElement(mountedCardElement);
                    }
                } catch (err: any) {
                    console.error('Error mounting card element:', err);
                    setError('Failed to load payment form. Please try again.');
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [clientSecret, stripe, elements]);

    const ensureStripeLoaded = async (publishableKey: string) => {
        if ((window as any).Stripe) {
            return (window as any).Stripe(publishableKey);
        }

        await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/"]') as HTMLScriptElement | null;

            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(), { once: true });
                existingScript.addEventListener('error', () => reject(new Error('Failed to load Stripe.js')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Stripe.js'));
            document.body.appendChild(script);
        });

        return (window as any).Stripe(publishableKey);
    };

    const invokeFunctionWithDetailedError = async (functionName: string, body: Record<string, unknown>) => {
        const { data: sessionData } = await supabase.auth.getSession();
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: anonKey,
                Authorization: `Bearer ${sessionData.session?.access_token || anonKey}`,
            },
            body: JSON.stringify(body),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                payload?.error ||
                payload?.message ||
                payload?.details ||
                `Function ${functionName} failed with status ${response.status}`
            );
        }

        return payload;
    };

    const createPaymentIntent = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await invokeFunctionWithDetailedError('create-payment-intent', {
                courseId,
                userId,
                amount,
            });

            console.log('Payment intent created:', data);

            if (!data?.publishableKey) {
                throw new Error('Stripe is not configured. Please contact administrator.');
            }

            const stripeInstance = await ensureStripeLoaded(data.publishableKey);
            if (!stripeInstance) {
                throw new Error('Failed to initialize Stripe');
            }

            setStripe(stripeInstance);
            setClientSecret(data.clientSecret);
            setPaymentIntentId(data.paymentIntentId);
            setPaymentRecordId(data.payment?.id || null);
            setElements(null);
            setCardElement(null);

        } catch (err: any) {
            console.error('Error creating payment intent:', err);
            setError(err.message || 'Failed to initialize payment');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements || !cardElement || !clientSecret) {
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const { error: submitError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: resolvedBillingName,
                        email: payerEmail || undefined,
                    },
                },
            });

            if (submitError) {
                setError(submitError.message);
                setProcessing(false);
                return;
            }

            // Use the confirmed payment intent ID or fall back to the original
            const finalPaymentIntentId = confirmedPaymentIntent?.id || paymentIntentId;

            console.log('Payment confirmed by Stripe, verifying with backend...', {
                paymentIntentId: finalPaymentIntentId,
                status: confirmedPaymentIntent?.status
            });

            const data = await invokeFunctionWithDetailedError('confirm-payment', {
                paymentIntentId: finalPaymentIntentId,
                userId,
                courseId,
            });

            console.log('Backend verification response:', data);

            if (data && data.success) {
                onSuccess(data);
            } else {
                const errorMsg = data?.error || data?.details || 'Payment was not successful. Please try again.';
                console.error('Payment confirmation failed:', data);
                setError(errorMsg);
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.message || 'Payment failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_52%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_40%)]" />

            <div className="relative space-y-6">
                <div>
                    <div className="mb-6 flex items-start space-x-4">
                        <div className="rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 p-4 shadow-inner shadow-blue-200/60">
                            <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Complete Payment</h2>
                            <p className="mt-2 max-w-xl text-base leading-7 text-slate-600">
                                Review your purchase and continue with secure Stripe checkout.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-5 p-4 bg-red-50 border-l-4 border-red-400 flex items-start space-x-3 rounded-r-xl">
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-700">{error}</div>
                        </div>
                    )}

                    {!clientSecret ? (
                        <div className="space-y-5">
                            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700/80">Purchase details</p>
                                <h3 className="mt-3 text-2xl font-bold leading-tight text-slate-900">{courseTitle}</h3>
                                <div className="mt-5 text-4xl font-black tracking-tight text-blue-600">${amount.toFixed(2)}</div>
                                <div className="mt-4 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">
                                    <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                    Secure Stripe payment
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={createPaymentIntent}
                                    disabled={loading}
                                    className="group flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader className="h-5 w-5 animate-spin" />
                                            <span className="ml-2">Preparing Payment...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Continue to Payment</span>
                                            <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="w-full rounded-2xl bg-slate-100 py-3.5 font-medium text-slate-700 transition-colors hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Card details</p>
                                        <p className="mt-1 text-sm text-slate-600">Enter your card information to finish your enrollment.</p>
                                    </div>
                                    <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                        <Lock className="mr-1.5 h-3.5 w-3.5" />
                                        Encrypted
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                    <div id="card-element"></div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="submit"
                                    disabled={processing || !stripe}
                                    className="flex flex-1 items-center justify-center rounded-2xl bg-blue-600 py-4 font-semibold text-white transition-all duration-300 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <Loader className="h-5 w-5 animate-spin" />
                                            <span className="ml-2">Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5" />
                                            <span className="ml-2">Pay ${amount.toFixed(2)}</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={processing}
                                    className="rounded-2xl bg-slate-100 px-6 py-4 font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StripeCheckout;
