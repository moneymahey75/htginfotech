import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Receipt, Search, Filter, Download, Eye, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface Payment {
  tp_id: string;
  tp_user_id: string;
  tp_amount: number;
  tp_currency: string;
  tp_payment_status: string;
  tp_payment_date: string;
  tp_payment_method: string;
  tp_receipt_url: string | null;
  tp_stripe_payment_intent_id: string | null;
  tbl_courses: {
    tc_title: string;
  };
  tbl_users: {
    tu_email: string;
  };
}

interface PaymentSplitTransaction {
  tpst_split_amount: number;
  tpst_split_percentage: number;
  tpst_status: string;
  tbl_stripe_connect_accounts: {
    tsca_account_name: string;
  };
}

const AdminPaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitTransaction[]>([]);
  const [showSplits, setShowSplits] = useState(false);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [searchTerm, statusFilter, payments]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tbl_payments')
        .select(`
          *,
          tbl_courses (tc_title),
          tbl_users (tu_email)
        `)
        .order('tp_payment_date', { ascending: false });

      if (error) throw error;

      setPayments(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData: Payment[]) => {
    const totalRevenue = paymentsData
      .filter(p => p.tp_payment_status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.tp_amount.toString()), 0);

    const completedCount = paymentsData.filter(p => p.tp_payment_status === 'completed').length;
    const pendingCount = paymentsData.filter(p => p.tp_payment_status === 'pending').length;
    const failedCount = paymentsData.filter(p => p.tp_payment_status === 'failed').length;

    setStats({
      totalRevenue,
      completedPayments: completedCount,
      pendingPayments: pendingCount,
      failedPayments: failedCount,
    });
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(
        p =>
          p.tbl_users.tu_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tbl_courses.tc_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tp_stripe_payment_intent_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.tp_payment_status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const viewPaymentSplits = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('tbl_payment_split_transactions')
        .select(`
          *,
          tbl_stripe_connect_accounts (tsca_account_name)
        `)
        .eq('tpst_payment_id', paymentId);

      if (error) throw error;

      setPaymentSplits(data || []);
      setSelectedPayment(paymentId);
      setShowSplits(true);
    } catch (error) {
      console.error('Failed to load payment splits:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'User', 'Course', 'Amount', 'Status', 'Payment Method', 'Transaction ID'],
      ...filteredPayments.map(p => [
        formatDate(p.tp_payment_date),
        p.tbl_users.tu_email,
        p.tbl_courses.tc_title,
        `$${parseFloat(p.tp_amount.toString()).toFixed(2)}`,
        p.tp_payment_status,
        p.tp_payment_method,
        p.tp_stripe_payment_intent_id || 'N/A',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="animate-pulse">Loading payment history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedPayments}</p>
            </div>
            <TrendingUp className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
            </div>
            <Calendar className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
            </div>
            <Receipt className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Receipt className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email, course, or transaction ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Course</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.tp_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(payment.tp_payment_date)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {payment.tbl_users.tu_email}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {payment.tbl_courses.tc_title}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    ${parseFloat(payment.tp_amount.toString()).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.tp_payment_status)}`}>
                      {payment.tp_payment_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => viewPaymentSplits(payment.tp_id)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Splits</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payments found</p>
          </div>
        )}
      </div>

      {showSplits && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Payment Splits</h3>
              <button
                onClick={() => setShowSplits(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {paymentSplits.length > 0 ? (
              <div className="space-y-3">
                {paymentSplits.map((split, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">
                        {split.tbl_stripe_connect_accounts.tsca_account_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {split.tpst_split_percentage}% of total
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        ${parseFloat(split.tpst_split_amount.toString()).toFixed(2)}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(split.tpst_status)}`}>
                        {split.tpst_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 py-4">No splits configured for this payment</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentHistory;