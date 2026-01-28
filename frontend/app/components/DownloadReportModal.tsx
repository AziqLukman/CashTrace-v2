'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { getTodayLocal } from '../lib/dateUtils';

interface DownloadReportModalProps {
  onClose: () => void;
}

export default function DownloadReportModal({ onClose }: DownloadReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState('month');
  
  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const now = new Date();
  const [formData, setFormData] = useState({
    startDate: formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: getTodayLocal(),
    format: 'pdf'
  });

  const handleRangeSelect = (range: string) => {
    setSelectedRange(range);
    const now = new Date();
    let start: Date, end: Date;

    if (range === 'day') {
      start = now;
      end = now;
    } else if (range === 'week') {
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      end = now;
    } else if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    } else if (range === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
    } else {
      return; // custom, don't auto-fill
    }

    setFormData({
      ...formData,
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end)
    });
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.downloadReport({
        startDate: formData.startDate,
        endDate: formData.endDate,
        format: formData.format
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      if (formData.format === 'excel') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Keuangan_${formData.startDate}_${formData.endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Keuangan_${formData.startDate}_${formData.endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Note: We can't revoke immediately if opening in new tab sometimes, 
      // but usually okay. For safety, maybe set timeout or just let it be handled by browser GC eventually
      // window.URL.revokeObjectURL(url);

      onClose();
    } catch (error: any) {
      alert(error.message || 'Gagal mengunduh laporan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleDownload} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {/* Quick Range Buttons */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Periode Cepat</span>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'day', label: 'Hari Ini' },
              { value: 'week', label: 'Minggu' },
              { value: 'month', label: 'Bulan' },
              { value: 'year', label: 'Tahun' }
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRangeSelect(option.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedRange === option.value
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dari Tanggal</span>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => {
                setFormData({ ...formData, startDate: e.target.value });
                setSelectedRange('custom');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sampai Tanggal</span>
            <input
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => {
                setFormData({ ...formData, endDate: e.target.value });
                setSelectedRange('custom');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
            />
          </label>
        </div>

        {/* Format */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Format File</span>
          <div className="grid grid-cols-2 gap-4">
            <label className={`
              flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all
              ${formData.format === 'pdf'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}
            `}>
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={formData.format === 'pdf'}
                onChange={() => setFormData({ ...formData, format: 'pdf' })}
                className="sr-only"
              />
              <div className="bg-red-100 text-red-600 p-2 rounded-lg">
                <span className="material-symbols-outlined">picture_as_pdf</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-white">PDF</span>
                <span className="text-xs text-slate-500">Siap cetak</span>
              </div>
            </label>

            <label className={`
              flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all
              ${formData.format === 'excel'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}
            `}>
              <input
                type="radio"
                name="format"
                value="excel"
                checked={formData.format === 'excel'}
                onChange={() => setFormData({ ...formData, format: 'excel' })}
                className="sr-only"
              />
              <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                <span className="material-symbols-outlined">table_view</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-white">Excel</span>
                <span className="text-xs text-slate-500">Format .xlsx</span>
              </div>
            </label>
          </div>
        </div>
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
            <span className="material-symbols-outlined text-[20px]">download</span>
          )}
          Unduh Laporan
        </button>
      </div>
    </form>
  );
}
