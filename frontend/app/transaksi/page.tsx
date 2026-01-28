'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { formatDate, getTodayLocal } from '../lib/dateUtils';
import Modal from '../components/Modal';
import AddTransactionModal from '../components/AddTransactionModal';

interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  transaction_date: string;
  category_name: string;
  category_id: number;
  category_color?: string;
  category_icon?: string;
}

export default function TransaksiPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Date Range State
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate date range
  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateRange === 'day') {
      startDate = getTodayLocal();
      endDate = startDate;
    } else if (dateRange === 'week') {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      startDate = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      endDate = getTodayLocal();
    } else if (dateRange === 'month') {
      const now = new Date();
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = getTodayLocal();
    } else if (dateRange === 'year') {
      const now = new Date();
      startDate = `${now.getFullYear()}-01-01`;
      endDate = getTodayLocal();
    } else if (dateRange === 'custom' && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    }

    return { startDate, endDate };
  }, [dateRange, customStart, customEnd]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const params: any = { page: currentPage, limit: 10 };

      if (debouncedSearch) params.search = debouncedSearch;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.getTransactions(params);

      if (res.data && Array.isArray(res.data)) {
        setData(res.data);
        setTotalItems(res.total || res.data.length);
        setTotalPages(res.totalPages || 1);
      } else {
        setData([]);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, getDateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, dateRange, customStart, customEnd]);

  const handleTransactionAdded = () => {
    fetchTransactions();
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      await api.deleteTransaction(id);
      setDeleteConfirmId(null);
      fetchTransactions();
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Gagal menghapus transaksi: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
    fetchTransactions();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDateRangeLabel = () => {
    if (dateRange === 'custom' && customStart && customEnd) {
      try {
        const s = formatDate(customStart, { day: 'numeric', month: 'short' });
        const e = formatDate(customEnd, { day: 'numeric', month: 'short' });
        return `${s} - ${e}`;
      } catch { return 'Kustom'; }
    }
    return '';
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full text-slate-900 dark:text-white">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Daftar Transaksi
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola dan pantau semua pemasukan dan pengeluaran Anda.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          TAMBAH TRANSAKSI
        </button>
      </div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Transaksi Baru"
      >
        <AddTransactionModal
          onSuccess={handleTransactionAdded}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingTransaction(null); }}
        title="Edit Transaksi"
      >
        <AddTransactionModal
          onSuccess={handleEditSuccess}
          onClose={() => { setIsEditModalOpen(false); setEditingTransaction(null); }}
          editMode={true}
          initialData={editingTransaction}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Konfirmasi Hapus"
      >
        <div className="p-4">
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-surface-dark dark:border-slate-800 transition-colors duration-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              search
            </span>
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 transition-all"
              placeholder="Cari transaksi..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-600 outline-none dark:text-slate-300"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-600 outline-none dark:text-slate-300"
                />
              </div>
            )}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">Semua Waktu</option>
              <option value="day">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
              <option value="year">Tahun Ini</option>
              <option value="custom">Kustom</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(debouncedSearch || dateRange !== 'all') && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Filter aktif:</span>
            {debouncedSearch && (
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">
                Pencarian: "{debouncedSearch}"
              </span>
            )}
            {dateRange !== 'all' && (
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">
                {dateRange === 'day' ? 'Hari Ini' :
                  dateRange === 'week' ? 'Minggu Ini' :
                    dateRange === 'month' ? 'Bulan Ini' :
                      dateRange === 'year' ? 'Tahun Ini' :
                        getDateRangeLabel()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-surface-dark dark:border-slate-800 transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800">
                <tr>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900 dark:text-white">Tanggal</th>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900 dark:text-white">Kategori</th>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900 dark:text-white w-full">Deskripsi</th>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Nominal</th>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <span>Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      {debouncedSearch || dateRange !== 'all'
                        ? 'Tidak ada transaksi yang sesuai dengan filter'
                        : 'Belum ada transaksi'}
                    </td>
                  </tr>
                ) : (
                  data.map((transaction) => (
                    <tr key={transaction.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {formatDate(transaction.transaction_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${transaction.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {transaction.type === 'income' ? 'trending_up' : 'trending_down'}
                          </span>
                          {transaction.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-white truncate max-w-xs">
                          {transaction.description}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <span className={`font-bold ${transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(transaction)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirmId(transaction.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 dark:bg-surface-dark dark:border-slate-800 transition-colors">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Halaman {currentPage} dari {totalPages} ({totalItems} transaksi)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm disabled:opacity-50 hover:bg-slate-50 dark:bg-surface-dark dark:border-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm disabled:opacity-50 hover:bg-slate-50 dark:bg-surface-dark dark:border-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
