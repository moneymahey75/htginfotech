import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
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
      <div className="bg-white rounded-lg shadow-sm p-6">
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
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
        <p className="text-gray-600">You haven't made any payments yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Receipt className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {payments.map((payment) => (
          <div key={payment.tp_id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <img
                  src={payment.tbl_courses.tc_thumbnail_url}
                  alt={payment.tbl_courses.tc_title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {payment.tbl_courses.tc_title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(payment.tp_payment_date)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CreditCard className="h-4 w-4" />
                      <span className="capitalize">{payment.tp_payment_method}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    {getStatusIcon(payment.tp_payment_status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.tp_payment_status)}`}>
                      {payment.tp_payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  ${parseFloat(payment.tp_amount).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500 uppercase">
                  {payment.tp_currency}
                </div>
                {payment.tp_receipt_url && payment.tp_payment_status === 'completed' && (
                  <a
                    href={payment.tp_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
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