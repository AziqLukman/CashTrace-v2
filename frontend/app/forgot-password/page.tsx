'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    display: 'swap',
});

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            // Assuming the API exists and returns a message
            await api.forgotPassword({ email });
            setMessage('Jika email terdaftar, tautan reset password akan dikirim.');
        } catch (err: any) {
            // For security, it's often better to show a generic message or handle specific known errors
            setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark font-display transition-colors duration-200 ${montserrat.className}`}>
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    <h1 className="font-bold text-2xl mb-2 text-[#111318] dark:text-white">Lupa Password</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Masukkan email Anda dan kami akan mengirimkan tautan untuk mereset password Anda.
                    </p>
                </div>

                {message && (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm px-4 py-3 rounded-lg mb-4 text-center">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="relative group">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-12 placeholder:text-gray-400 p-[15px] text-base font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                        />
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">mail</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(36,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(36,99,235,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Memproses...' : 'Kirim Tautan Reset'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/login" className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                        Kembali ke Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
