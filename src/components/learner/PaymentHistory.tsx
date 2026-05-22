import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import CourseImage from '../ui/CourseImage';
import { Receipt, Download, Calendar, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Payment {
  tp_id: string;
  tp_amount: number;
  tp_currency: string;
  tp_payment_status: string;
  tp_payment_date: string;
  tp_payment_method: string;
  tp_receipt_url: string | null;
  tbl_courses: {
    tc_title: string;
    tc_thumbnail_url: string;
  };
}

const PaymentHistory: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tbl_payments')
        .select(`
          *,
          tbl_courses (
            tc_title,
            tc_thumbnail_url
          )
        `)
        .eq('tp_user_id', user?.id)
        .order('tp_payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center sm:p-8">
        <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
        <p className="text-gray-600">You haven't made any payments yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4 sm:p-6">
        <div className="flex items-center space-x-3">
          <Receipt className="h-6 w-6 flex-shrink-0 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Payment History</h2>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {payments.map((payment) => (
          <div key={payment.tp_id} className="p-4 transition-colors hover:bg-gray-50 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                <CourseImage
                  src={payment.tbl_courses?.tc_thumbnail_url}
                  alt={payment.tbl_courses?.tc_title || 'Course'}
                  className="h-16 w-16 flex-shrink-0 rounded-lg sm:h-20 sm:w-20"
                  imageClassName="object-cover"
                  fallbackClassName="object-contain opacity-20 p-3 bg-gray-50 sm:p-4"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 break-words font-semibold leading-snug text-gray-900">
                    {payment.tbl_courses?.tc_title || 'Course'}
                  </h3>
                  <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDate(payment.tp_payment_date)}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <CreditCard className="h-4 w-4 flex-shrink-0" />
                      <span className="break-words capitalize">{payment.tp_payment_method}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {getStatusIcon(payment.tp_payment_status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.tp_payment_status)}`}>
                      {payment.tp_payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:ml-4 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0 sm:text-right">
                <div>
                  <div className="text-xl font-bold text-gray-900 sm:text-2xl">
                    ${Number(payment.tp_amount).toFixed(2)}
                  </div>
                  <div className="text-sm uppercase text-gray-500">
                    {payment.tp_currency}
                  </div>
                </div>
                {payment.tp_receipt_url && payment.tp_payment_status === 'completed' && (
                  <a
                    href={payment.tp_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 sm:mt-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Receipt</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentHistory;
