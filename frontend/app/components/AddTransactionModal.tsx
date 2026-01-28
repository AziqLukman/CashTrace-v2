'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getTodayLocal, toInputDateFormat } from '../lib/dateUtils';

interface TransactionData {
  id?: number;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  transaction_date?: string;
  category_name?: string;
  category_id?: number;
}

interface AddTransactionModalProps {
  onSuccess: () => void;
  onClose: () => void;
  editMode?: boolean;
  initialData?: TransactionData | null;
}

export default function AddTransactionModal({
  onSuccess,
  onClose,
  editMode = false,
  initialData = null
}: AddTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    date: getTodayLocal(),
    description: ''
  });

  // Initialize form with existing data when editing
  useEffect(() => {
    if (editMode && initialData) {
      setType(initialData.type);
      setFormData({
        amount: String(initialData.amount),
        categoryId: String(initialData.category_id || ''),
        date: toInputDateFormat(initialData.transaction_date),
        description: initialData.description || ''
      });
    }
  }, [editMode, initialData]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.getCategories();
        setCategories(res.data);
      } catch (error) {
        console.error('Failed to fetch categories', error);
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        categoryId: parseInt(formData.categoryId),
        type,
        transactionDate: formData.date,
        description: formData.description
      };

      if (editMode && initialData?.id) {
        await api.updateTransaction(initialData.id, payload);
      } else {
        await api.createTransaction(payload);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert(`Gagal ${editMode ? 'mengupdate' : 'menyimpan'} transaksi`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Type Selector */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {/* Pemasukan (Income) - LEFT */}
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${type === 'income'
            ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">trending_down</span>
            Pemasukan
          </div>
        </button>
        {/* Pengeluaran (Expense) - RIGHT */}
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${type === 'expense'
            ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-rose-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">trending_up</span>
            Pengeluaran
          </div>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Amount */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jumlah (Rp)</span>
          <input
            type="number"
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-bold text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
            placeholder="0"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kategori</span>
            <div className="relative">
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
              >
                <option value="">Pilih Kategori</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
          </label>

          {/* Date */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal</span>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
            />
          </label>
        </div>

        {/* Description */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keterangan</span>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all resize-none h-24"
            placeholder="Tulis catatan tambahan..."
          />
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:bg-blue-700 hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            <span className="material-symbols-outlined text-[20px]">check</span>
          )}
          {editMode ? 'Update' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}
