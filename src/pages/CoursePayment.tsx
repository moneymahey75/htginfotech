import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import StripeCheckout from '../components/payment/StripeCheckout';
import { AlertCircle, CheckCircle, CreditCard, Receipt, ShieldCheck, XCircle } from 'lucide-react';

interface SuccessfulPaymentState {
    payment?: {
        tp_id?: string;
        tp_amount?: number;
        tp_currency?: string;
        tp_payment_status?: string;
        tp_payment_date?: string;
        tp_receipt_url?: string | null;
        tp_stripe_charge_id?: string | null;
    };
    purchase?: {
        courseId?: string;
        courseTitle?: string;
        amount?: number;
        currency?: string;
        paymentDate?: string;
        receiptUrl?: string | null;
        paymentIntentId?: string;
        chargeId?: string | null;
    };
}

const CoursePayment: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
    const [checkingEnrollment, setCheckingEnrollment] = useState(true);
    const [paymentResult, setPaymentResult] = useState<SuccessfulPaymentState | null>(null);

    const { courseId, amount, courseName } = location.state || {};

    useEffect(() => {
        console.log('CoursePayment - Current user:', user);

        if (!user) {
            console.log('No user found, redirecting to login');
            navigate('/login');
            return;
        }

        if (!courseId || !amount) {
            console.log('Missing course data, redirecting to courses');
            navigate('/courses');
            return;
        }

        checkEnrollmentStatus();
    }, [user, courseId, amount, navigate]);

    const checkEnrollmentStatus = async () => {
        if (!user || !courseId) return;

        try {
            setCheckingEnrollment(true);
            const { data, error } = await supabase
                .from('tbl_course_enrollments')
                .select('tce_id')
                .eq('tce_user_id', user.id)
                .eq('tce_course_id', courseId)
                .maybeSingle();

            if (error) {
                console.error('Error checking enrollment:', error);
            }

            if (data) {
                setAlreadyEnrolled(true);
            }
        } catch (err) {
            console.error('Error checking enrollment:', err);
        } finally {
            setCheckingEnrollment(false);
        }
    };

    const handlePaymentSuccess = (result: SuccessfulPaymentState) => {
        setPaymentResult(result);
        setShowSuccess(true);
        setTimeout(() => {
            navigate('/learner/dashboard');
        }, 6000);
    };

    const handleCancel = () => {
        navigate(`/courses/${courseId}`);
    };

    if (checkingEnrollment) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (alreadyEnrolled) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-6">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
                            <AlertCircle className="h-10 w-10 text-yellow-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Enrolled</h2>
                    <p className="text-gray-600 mb-6">
                        You are already enrolled in <span className="font-semibold">{courseName}</span>
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/learner/dashboard')}
                            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
                        >
                            Go to My Courses
                        </button>
                        <button
                            onClick={() => navigate('/courses')}
                            className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300"
                        >
                            Browse Courses
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (showSuccess) {
        const paidAmount = paymentResult?.purchase?.amount ?? amount;
        const paymentDate = paymentResult?.purchase?.paymentDate || paymentResult?.payment?.tp_payment_date;
        const receiptUrl = paymentResult?.purchase?.receiptUrl || paymentResult?.payment?.tp_receipt_url;
        const paymentReference = paymentResult?.payment?.tp_id;

        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4">
                <div className="max-w-3xl mx-auto bg-white rounded-[28px] shadow-xl shadow-slate-200/70 p-8">
                    <div className="text-center mb-8">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-4">
                            <CheckCircle className="h-11 w-11 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful</h2>
                        <p className="text-gray-600">
                            You are now enrolled in <span className="font-semibold">{courseName}</span>.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-3xl bg-blue-50 border border-blue-100 p-6">
                            <div className="flex items-center space-x-2 mb-4">
                                <CreditCard className="h-5 w-5 text-blue-600" />
                                <h3 className="font-semibold text-gray-900">Purchase Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <div className="text-gray-500">Course</div>
                                    <div className="font-semibold text-gray-900">{courseName}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">Amount Paid</div>
                                    <div className="font-semibold text-blue-700">
                                        ${Number(paidAmount || 0).toFixed(2)}
                                    </div>
                                </div>
                                {paymentDate && (
                                    <div>
                                        <div className="text-gray-500">Paid On</div>
                                        <div className="font-medium text-gray-900">
                                            {new Date(paymentDate).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6">
                            <div className="flex items-center space-x-2 mb-4">
                                <Receipt className="h-5 w-5 text-slate-700" />
                                <h3 className="font-semibold text-gray-900">Transaction Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                {paymentReference && (
                                    <div>
                                        <div className="text-gray-500">Payment ID</div>
                                        <div className="font-medium text-gray-900 break-all">{paymentReference}</div>
                                    </div>
                                )}
                                {paymentResult?.purchase?.paymentIntentId && (
                                    <div>
                                        <div className="text-gray-500">Stripe Payment Intent</div>
                                        <div className="font-medium text-gray-900 break-all">
                                            {paymentResult.purchase.paymentIntentId}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-gray-500">Status</div>
                                    <div className="inline-flex px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                                        Completed
                                    </div>
                                </div>
                                {receiptUrl && (
                                    <div>
                                        <a
                                            href={receiptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            View Stripe Receipt
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate('/learner/dashboard')}
                            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700"
                        >
                            Go to Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/courses')}
                            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl hover:bg-gray-300"
                        >
                            Browse More Courses
                        </button>
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        A confirmation email with your transaction details has been sent. Redirecting to your dashboard shortly...
                    </p>
                </div>
            </div>
        );
    }

    if (showError) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-6">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                            <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
                    <p className="text-gray-600 mb-6">
                        There was an issue processing your payment. Please try again.
                    </p>
                    <button
                        onClick={() => setShowError(false)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!user || !courseId || !amount) {
        return null;
    }

    console.log('Rendering StripeCheckout with userId:', user.id);

    const payerName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined;

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_40%,#f8fafc_100%)] py-10 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 shadow-sm backdrop-blur-sm">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Secure Stripe Enrollment
                    </div>
                    <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
                        Complete Your Enrollment
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                        Review your purchase details and continue with secure payment.
                    </p>
                </div>

                <StripeCheckout
                    courseId={courseId}
                    courseTitle={courseName || 'Course'}
                    amount={parseFloat(amount)}
                    userId={user.id}
                    payerName={payerName}
                    payerEmail={user.email}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};

export default CoursePayment;
