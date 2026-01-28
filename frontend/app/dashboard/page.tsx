'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate, getTodayLocal } from '../lib/dateUtils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [dateTime, setDateTime] = useState<Date | null>(null);

  // Stats State
  const [statsV2, setStatsV2] = useState<any>(null);
  const [statsRange, setStatsRange] = useState('month');
  const [statsStart, setStatsStart] = useState('');
  const [statsEnd, setStatsEnd] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);

  // Charts State
  // Charts State
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartRange, setChartRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Category State
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [categoryRange, setCategoryRange] = useState('month');
  const [catStart, setCatStart] = useState('');
  const [catEnd, setCatEnd] = useState('');

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Clock Effect
  useEffect(() => {
    setDateTime(new Date());
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Init User & Default Custom Dates
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    // Default custom range: last 7 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    
    // Use local date formatting to avoid timezone issues
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const sStr = formatLocalDate(start);
    const eStr = formatLocalDate(end);

    setCustomEnd(eStr);
    setCustomStart(sStr);
    setStatsEnd(eStr);
    setStatsStart(sStr);
    setCatEnd(eStr);
    setCatStart(sStr);
  }, []);

  // Fetch Stats V2
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        if (statsRange === 'custom' && (!statsStart || !statsEnd)) return;
        const res = await api.getDashboardStatsV2(statsRange, statsStart, statsEnd);
        setStatsV2(res.data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [statsRange, statsStart, statsEnd]);

  // Fetch Chart Data
  useEffect(() => {
    const fetchChart = async () => {
      try {
        if (chartRange === 'custom' && (!customStart || !customEnd)) return;

        const res = await api.getChartData(chartRange, customStart, customEnd);
        setChartData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchChart();
  }, [chartRange, customStart, customEnd]);

  // Fetch Category Data
  useEffect(() => {
    const fetchCat = async () => {
      try {
        if (categoryRange === 'custom' && (!catStart || !catEnd)) return;
        const res = await api.getCategoryChartData(categoryRange, catStart, catEnd);
        setCategoryData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCat();
  }, [categoryRange, catStart, catEnd]);

  // Fetch Recent Transactions (Initial Load)
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        // Still fetch summary for quick load or legacy reasons if needed, 
        // but mainly getting recent transactions here
        const res = await api.getDashboardData();
        setRecentTransactions(res.data?.recent_transactions || []);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  // Helper for percentage badge
  const PercentageBadge = ({ value, label, hideCompareText = false }: { value: number, label: string, hideCompareText?: boolean }) => {
    const isNeutral = value === 0;

    // Unified Logic (Standard):
    // Icons: Always trending_up for +, trending_down for -
    // Colors: Always Green for +, Red for - (Regardless of label)

    const isIncrease = value > 0;

    // Icon depends strictly on value direction
    const icon = isIncrease ? 'trending_up' : 'trending_down';

    // Color depends strictly on value direction (User Request: + ijo, - merah)
    const colorClass = isIncrease
      ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
      : 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';

    if (isNeutral) return null;

    let compareText = '';
    if (!hideCompareText) {
      if (statsRange === 'day') compareText = ' vs Kemarin';
      else if (statsRange === 'week') compareText = ' vs Minggu Lalu';
      else if (statsRange === 'month') compareText = ' vs Bulan Lalu';
      else if (statsRange === 'year') compareText = ' vs Tahun Lalu';
      else compareText = ' vs Lalu';
    }

    return (
      <div className={`mt-2 flex items-center gap-1 rounded-lg px-2 py-1 w-fit text-xs font-semibold ${colorClass}`}>
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        <span>{value > 0 ? '+' : ''}{value.toFixed(1)}%{compareText}</span>
      </div>
    );
  };

  const getBalanceTitle = () => {
    if (statsRange === 'custom' && statsStart && statsEnd) {
      try {
        const s = new Date(statsStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const e = new Date(statsEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return `Saldo (${s} - ${e})`;
      } catch (e) { return 'Total Saldo (Range)'; }
    }
    return 'Total Saldo';
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-10">

      {/* Page Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Selamat Datang, {user?.name || 'User'} 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Berikut ringkasan keuangan Anda.
          </p>
        </div>
        {/* Date/Time Widget */}
        <div className="hidden md:flex flex-col items-end text-right">
          <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
            {dateTime?.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {dateTime?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </header>

      {/* Stats Filter & Grid */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Statistik</h3>
        <div className="flex flex-wrap items-center gap-2">
          {statsRange === 'custom' && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              <input
                type="date"
                value={statsStart}
                onChange={(e) => setStatsStart(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-600 outline-none dark:text-slate-300"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={statsEnd}
                onChange={(e) => setStatsEnd(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-600 outline-none dark:text-slate-300"
              />
            </div>
          )}
          <select
            value={statsRange}
            onChange={(e) => setStatsRange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="day">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
            <option value="custom">Kustom</option>
          </select>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Balance Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-600 p-6 text-white shadow-lg lg:col-span-1 xl:col-span-1">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">{getBalanceTitle()}</p>
              <h3 className="text-2xl font-bold tracking-tight">
                {statsLoading ? '...' : formatCurrency(statsV2?.current?.balance || 0)}
              </h3>
            </div>
            {/* Custom styled percentage for the blue card - Manual implementation to match design */}
            {!statsLoading && statsV2?.percentage && statsV2.percentage.balance !== 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 w-fit backdrop-blur-sm">
                <span className="material-symbols-outlined text-[16px]">
                  {statsV2.percentage.balance > 0 ? 'trending_up' : 'trending_down'}
                </span>
                <span className="text-xs font-semibold">
                  {statsV2.percentage.balance > 0 ? '+' : ''}{statsV2.percentage.balance.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-blue-400/20 blur-3xl"></div>
        </div>

        {/* Income Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-surface-dark dark:ring-white/10 transition-colors duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <span className="material-symbols-outlined">arrow_downward</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pemasukan</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                  {statsLoading ? '...' : formatCurrency(statsV2?.current?.income || 0)}
                </h4>
              </div>
            </div>
          </div>
          {!statsLoading && <PercentageBadge value={statsV2?.percentage?.income || 0} label="Pemasukan" />}
        </div>

        {/* Expense Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-surface-dark dark:ring-white/10 transition-colors duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <span className="material-symbols-outlined">arrow_upward</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pengeluaran</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                  {statsLoading ? '...' : formatCurrency(statsV2?.current?.expense || 0)}
                </h4>
              </div>
            </div>
          </div>
          {!statsLoading && <PercentageBadge value={statsV2?.percentage?.expense || 0} label="Pengeluaran" />}
        </div>

        {/* Savings Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-surface-dark dark:ring-white/10 transition-colors duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <span className="material-symbols-outlined">savings</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Net (Tabungan)</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                  {statsLoading ? '...' : formatCurrency((statsV2?.current?.income || 0) - (statsV2?.current?.expense || 0))}
                </h4>
              </div>
            </div>
          </div>
          {/* Reuse PercentageBadge? Usually net savings correlates with Balance change somewhat, let's skip or duplicate logic if strict */}
          {!statsLoading && (
            <div className="mt-2 text-xs font-semibold text-slate-500">
              {(() => {
                if (statsRange === 'day') return 'Hari ini';
                if (statsRange === 'week') return 'Minggu ini';
                if (statsRange === 'month') return 'Bulan ini';
                if (statsRange === 'year') return 'Tahun ini';
                if (statsRange === 'custom' && statsStart && statsEnd) {
                  try {
                    const s = new Date(statsStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    const e = new Date(statsEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    return `${s} - ${e}`;
                  } catch (e) { return 'Range Kustom'; }
                }
                return statsRange;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Line Chart */}
        <div className="col-span-1 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-surface-dark dark:ring-white/10 lg:col-span-2 transition-colors duration-200">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Arus Uang
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {(() => {
                  if (chartRange === 'custom') {
                    if (!customStart || !customEnd) return 'Pilih rentang tanggal';
                    const s = new Date(customStart);
                    const e = new Date(customEnd);
                    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                    return `${s.toLocaleDateString('id-ID', options)} - ${e.toLocaleDateString('id-ID', options)}`;
                  }

                  const now = new Date();
                  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                  let start = new Date(now);
                  if (chartRange === 'week') start.setDate(now.getDate() - (now.getDay() || 7) + 1);
                  if (chartRange === 'month') start.setDate(1);
                  if (chartRange === 'year') start.setMonth(0, 1);

                  const end = new Date(now);

                  if (chartRange === 'day') return now.toLocaleDateString('id-ID', options);

                  return `${start.toLocaleDateString('id-ID', options)} - ${end.toLocaleDateString('id-ID', options)}`;
                })()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {chartRange === 'custom' && (
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
                value={chartRange}
                onChange={(e) => setChartRange(e.target.value)}
                className="rounded-lg border border-slate-200 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:border-primary dark:border-slate-700 dark:text-slate-400"
              >
                <option value="day">Hari Ini</option>
                <option value="week">Minggu Ini</option>
                <option value="month">Bulan Ini</option>
                <option value="year">Tahun Ini</option>
                <option value="custom">Kustom</option>
              </select>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
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
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10B981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                  name="Pemasukan"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#EF4444"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                  name="Pengeluaran"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="col-span-1 flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-surface-dark dark:ring-white/10 transition-colors duration-200">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Pengeluaran
              </h3>
              <select
                value={categoryRange}
                onChange={(e) => setCategoryRange(e.target.value)}
                className="rounded-lg border border-slate-200 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:border-primary dark:border-slate-700 dark:text-slate-400"
              >
                <option value="day">Hari Ini</option>
                <option value="week">Minggu Ini</option>
                <option value="month">Bulan Ini</option>
                <option value="year">Tahun Ini</option>
                <option value="custom">Kustom</option>
              </select>
            </div>
            {categoryRange === 'custom' && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="date"
                  value={catStart}
                  onChange={(e) => setCatStart(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-600 outline-none dark:text-slate-300 w-full"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={catEnd}
                  onChange={(e) => setCatEnd(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-600 outline-none dark:text-slate-300 w-full"
                />
              </div>
            )}
          </div>

          <div className="relative flex-1 flex items-center justify-center min-h-[250px]">
            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-xs font-medium text-slate-400">Total</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(categoryData.reduce((acc: number, curr: any) => acc + curr.value, 0))}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 text-sm">Tidak ada data pengeluaran</div>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {categoryData.slice(0, 3).map((category: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || COLORS[index % COLORS.length] }}></div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {category.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {Math.round(category.percentage)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-surface-dark dark:ring-white/10 transition-colors duration-200">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Transaksi Terakhir
          </h3>
          <a href="/transaksi" className="text-sm font-bold text-primary hover:text-blue-700">
            LIHAT SEMUA
          </a>
        </div>
        <div className="flex flex-col gap-4">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction: any) => (
              <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${transaction.type === 'income'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {transaction.icon || (transaction.type === 'income' ? '💰' : '💸')}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {transaction.category_name || transaction.description}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatDate(transaction.transaction_date, {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })} • {transaction.time || '00:00'}
                    </p>
                  </div>
                </div>
                <span className={`font-bold ${transaction.type === 'income'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                  }`}>
                  {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              Belum ada transaksi.
            </div>
          )}
        </div>
      </div>
    </div >
  );
}
