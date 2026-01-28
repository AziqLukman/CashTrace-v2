'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/dateUtils';
import Modal from '../components/Modal';
import DownloadReportModal from '../components/DownloadReportModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LaporanPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Date Range State
  const [dateRange, setDateRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (dateRange === 'custom' && (!customStart || !customEnd)) {
        setLoading(false);
        return;
      }
      const res = await api.getReportData(dateRange, customStart, customEnd);
      setData(res.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const getRangeLabel = () => {
    if (dateRange === 'day') return 'Hari Ini';
    if (dateRange === 'week') return 'Minggu Ini';
    if (dateRange === 'month') return 'Bulan Ini';
    if (dateRange === 'year') return 'Tahun Ini';
    if (dateRange === 'custom' && data?.range) {
      try {
        const s = formatDate(data.range.start, { day: 'numeric', month: 'short', year: 'numeric' });
        const e = formatDate(data.range.end, { day: 'numeric', month: 'short', year: 'numeric' });
        return `${s} - ${e}`;
      } catch { return 'Range Kustom'; }
    }
    return 'Periode';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 w-full text-slate-900 dark:text-white">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white">
              Laporan & Analisis
            </h1>
            <p className="text-base font-normal leading-normal text-slate-500 dark:text-slate-400">
              Tinjauan keuangan periode {getRangeLabel()}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Filter */}
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
              <option value="day">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
              <option value="year">Tahun Ini</option>
              <option value="custom">Kustom</option>
            </select>
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="flex items-center justify-center rounded-lg h-10 px-5 bg-primary hover:bg-blue-700 text-white gap-2 text-sm font-bold shadow-sm transition-colors dark:shadow-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span>Download</span>
            </button>
          </div>
        </div>

        <Modal isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} title="Download Laporan">
          <DownloadReportModal onClose={() => setIsDownloadModalOpen(false)} />
        </Modal>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-4 lg:col-span-1">
                {/* Income */}
                <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pemasukan Total</p>
                    <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                      <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.summary?.income || 0)}</h3>
                </div>
                {/* Expense */}
                <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pengeluaran Total</p>
                    <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                      <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.summary?.expense || 0)}</h3>
                </div>
                {/* Savings */}
                <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Sisa Saldo</p>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.summary?.balance || 0)}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Savings Rate: {data?.summary?.savingsRate || 0}%
                  </p>
                </div>
              </div>

              {/* Trend Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Tren (Pemasukan vs Pengeluaran)</h2>
                <div className="h-[300px] w-full">
                  {(data?.trend || []).length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      Tidak ada data untuk periode ini
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.trend || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          dy={10}
                          tickFormatter={(value) => formatDate(value, { day: 'numeric', month: 'short' })}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => `Rp${value / 1000}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          cursor={{ fill: '#f1f5f9' }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => formatDate(label, { day: 'numeric', month: 'long', year: 'numeric' })}
                        />
                        <Bar
                          dataKey="income"
                          fill="#10B981"
                          name="Pemasukan"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="expense"
                          fill="#EF4444"
                          name="Pengeluaran"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Categories Breakdown */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Proporsi Pengeluaran</h2>
                <div className="space-y-4">
                  {(data?.breakdown || []).map((cat: any) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{cat.name}</p>
                          <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${cat.percentage}%` }} className="h-full bg-primary rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(cat.total)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{cat.percentage}%</p>
                      </div>
                    </div>
                  ))}
                  {(data?.breakdown || []).length === 0 && <p className="text-center text-slate-500">Belum ada data pengeluaran.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
