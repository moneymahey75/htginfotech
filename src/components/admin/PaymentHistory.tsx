import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';

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

// Skeleton Loader Component
const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
      <>
        {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100 animate-pulse">
              <td className="py-3 px-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="py-3 px-4">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </td>
              <td className="py-3 px-4">
                <div className="h-4 bg-gray-200 rounded w-40"></div>
              </td>
              <td className="py-3 px-4">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </td>
              <td className="py-3 px-4">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </td>
              <td className="py-3 px-4">
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </td>
            </tr>
        ))}
      </>
  );
};

// Loader Component
const Loader: React.FC = () => {
  return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading payments...</p>
      </div>
  );
};

const AdminPaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitTransaction[]>([]);
  const [showSplits, setShowSplits] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });

  // Load payments with pagination
  const loadPayments = async () => {
    try {
      setLoading(true);
      setListLoading(true);
      setError(null);

      // Build base query with count
      let query = supabase
          .from('tbl_payments')
          .select(`
          *,
          tbl_courses (tc_title),
          tbl_users (tu_email)
        `, { count: 'exact' })
          .order('tp_payment_date', { ascending: false });

      // Apply filters if any
      if (statusFilter !== 'all') {
        query = query.eq('tp_payment_status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`
          tbl_users.tu_email.ilike.%${searchTerm}%,
          tbl_courses.tc_title.ilike.%${searchTerm}%,
          tp_stripe_payment_intent_id.ilike.%${searchTerm}%
        `);
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setPayments(data || []);
      setTotalCount(count || 0);
      calculateStats(data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  };

  // Load data when component mounts or filters/pagination change
  useEffect(() => {
    loadPayments();
  }, [searchTerm, statusFilter, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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
      ...payments.map(p => [
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

  // Pagination logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Get page numbers with ellipsis for better navigation
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);

      // Calculate start and end of visible page range
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        endPage = 4;
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }

      // Always include last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  const paginate = (pageNumber: number | string) => {
    if (pageNumber !== '...' && typeof pageNumber === 'number') {
      setCurrentPage(pageNumber);
    }
  };

  if (loading && payments.length === 0) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Loader />
        </div>
    );
  }

  if (error && payments.length === 0) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Payments</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
                onClick={loadPayments}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Stats Cards */}
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

        {/* Payment History Table */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-3">
              <Receipt className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>

              <div className="text-sm text-gray-500">
                Total: {totalCount} payments
              </div>

              <button
                  onClick={exportToCSV}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by email, course, or transaction ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">User</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Course</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Actions</th>
              </tr>
              </thead>
              <tbody>
              {listLoading ? (
                  <TableSkeleton rows={itemsPerPage} />
              ) : (
                  <>
                    {payments.map((payment) => (
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
                  </>
              )}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination Controls */}
          {totalCount > 0 && (
              <div className="px-4 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> payments
                </div>

                <div className="flex items-center space-x-1">
                  <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md ${
                          currentPage === 1
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md ${
                          currentPage === 1
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {getPageNumbers().map((page, index) => (
                      <button
                          key={index}
                          onClick={() => paginate(page)}
                          className={`px-3 py-1 rounded-md text-sm ${
                              page === currentPage
                                  ? 'bg-blue-600 text-white'
                                  : page === '...'
                                      ? 'bg-transparent text-gray-500 cursor-default'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          disabled={page === '...'}
                      >
                        {page === '...' ? <MoreHorizontal className="h-4 w-4" /> : page}
                      </button>
                  ))}

                  <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-md ${
                          currentPage === totalPages
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-md ${
                          currentPage === totalPages
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
          )}

          {payments.length === 0 && !listLoading && (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search criteria'
                      : 'No payment transactions yet'
                  }
                </p>
              </div>
          )}
        </div>

        {/* Payment Splits Modal */}
        {showSplits && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Payment Splits</h3>
                  <button
                      onClick={() => setShowSplits(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
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