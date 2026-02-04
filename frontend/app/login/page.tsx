'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import styles from './Login.module.css';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

type FormMode = 'signIn' | 'signUp' | 'forgotPassword';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [formMode, setFormMode] = useState<FormMode>('signIn');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.register({ email: formData.email, password: formData.password, name: formData.name || 'User' });
      setSuccessMsg('Registrasi berhasil! Silahkan login.');
      setFormData({ email: '', password: '', name: '', newPassword: '', confirmNewPassword: '' });
      setFormMode('signIn');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat registrasi');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Login using name instead of email
      const response = await api.login({ name: formData.name, password: formData.password });

      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));

          // Restore user's theme preference before redirecting
          const userId = response.data.user.id || response.data.user._id;
          const savedTheme = localStorage.getItem(`theme_${userId}`);
          if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
          }
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Nama atau password salah');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    // Validate passwords match
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError('Password baru tidak cocok!');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

    try {
      await api.forgotPassword({
        name: formData.name,
        email: formData.email,
        newPassword: formData.newPassword
      });
      setSuccessMsg('Password berhasil diubah! Silakan login dengan password baru.');
      setFormData({ email: '', password: '', name: '', newPassword: '', confirmNewPassword: '' });
      setFormMode('signIn');
    } catch (err: any) {
      setError(err.message || 'Nama atau email tidak sesuai');
    } finally {
      setLoading(false);
    }
  };

  // Determine container class based on mode
  const getContainerClass = () => {
    let base = styles.container + ' bg-white dark:bg-[#1e293b] shadow-card dark:shadow-2xl border border-gray-100 dark:border-gray-800';
    if (formMode === 'signUp') {
      base += ' ' + styles.active;
    } else if (formMode === 'forgotPassword') {
      base += ' ' + styles.forgotActive;
    }
    return base;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex items-center justify-center flex-col transition-colors duration-200">
      <div className={getContainerClass()} id="container">

        {/* Sign Up Form */}
        <div className={`${styles.formContainer} ${styles.signUp} bg-white dark:bg-[#1e293b]`}>
          <form onSubmit={handleRegister} suppressHydrationWarning>
            <h1 className="font-bold text-2xl mb-2 text-[#111318] dark:text-white">Buat Akun</h1>
            <span className="text-xs mb-4 text-gray-500 dark:text-gray-400">Daftar dengan nama dan email</span>

            {error && formMode === 'signUp' && <div className="text-red-500 text-xs mb-2">{error}</div>}

            <div className="relative group w-full mb-2">
              <input
                type="text"
                placeholder="Nama"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </div>

            <div className="relative group w-full mb-2">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">mail</span>
              </div>
            </div>

            <div className="relative group w-full mb-2">
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
            </div>

            <button disabled={loading} className="mt-4 w-full h-10 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(36,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(36,99,235,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? 'Processing...' : 'Daftar'}
            </button>
          </form>
        </div>

        {/* Sign In Form - Using Name */}
        <div className={`${styles.formContainer} ${styles.signIn} bg-white dark:bg-[#1e293b] ${formMode === 'forgotPassword' ? styles.slideOut : ''}`}>
          <form onSubmit={handleLogin} suppressHydrationWarning>
            <h1 className="font-bold text-2xl mb-2 text-[#111318] dark:text-white">Masuk</h1>
            <span className="text-xs mb-4 text-gray-500 dark:text-gray-400">Login dengan nama dan password</span>

            {successMsg && formMode === 'signIn' && <div className="text-green-600 text-xs mb-2">{successMsg}</div>}
            {error && formMode === 'signIn' && <div className="text-red-500 text-xs mb-2">{error}</div>}

            <div className="relative group w-full mb-2">
              <input
                type="text"
                placeholder="Nama"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </div>

            <div className="relative group w-full mb-2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11 pr-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-hidden"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setFormMode('forgotPassword'); setError(''); setSuccessMsg(''); }}
              className="text-xs font-semibold text-primary hover:text-blue-700 dark:hover:text-blue-400 transition-colors mt-1 mb-2"
            >
              Lupa Password?
            </button>
            <button disabled={loading} className="mt-2 w-full h-10 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(36,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(36,99,235,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? 'Processing...' : 'Masuk'}
            </button>
          </form>
        </div>

        {/* Forgot Password Form */}
        <div className={`${styles.formContainer} ${styles.forgot} bg-white dark:bg-[#1e293b] ${formMode === 'forgotPassword' ? styles.forgotVisible : ''}`}>
          <form onSubmit={handleForgotPassword} suppressHydrationWarning>
            <h1 className="font-bold text-2xl mb-2 text-[#111318] dark:text-white">Reset Password</h1>
            <span className="text-xs mb-4 text-gray-500 dark:text-gray-400">Masukkan nama dan email yang terdaftar</span>

            {successMsg && formMode === 'forgotPassword' && <div className="text-green-600 text-xs mb-2">{successMsg}</div>}
            {error && formMode === 'forgotPassword' && <div className="text-red-500 text-xs mb-2">{error}</div>}

            <div className="relative group w-full mb-2">
              <input
                type="text"
                placeholder="Nama"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </div>

            <div className="relative group w-full mb-2">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">mail</span>
              </div>
            </div>

            <div className="relative group w-full mb-2">
              <input
                type="password"
                placeholder="Password Baru"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
            </div>

            <div className="relative group w-full mb-2">
              <input
                type="password"
                placeholder="Konfirmasi Password Baru"
                value={formData.confirmNewPassword}
                onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })}
                required
                className="peer flex w-full resize-none overflow-hidden rounded-xl text-[#111318] dark:text-white focus:outline-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-10 placeholder:text-gray-400 p-[15px] text-sm font-normal leading-normal focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pl-11"
                suppressHydrationWarning
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-primary transition-colors pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
            </div>

            <button disabled={loading} className="mt-2 w-full h-10 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(36,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(36,99,235,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? 'Processing...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => { setFormMode('signIn'); setError(''); setSuccessMsg(''); }}
              className="mt-3 text-xs font-semibold text-primary hover:text-blue-700 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Kembali ke Login
            </button>
          </form>
        </div>

        {/* Toggle Container */}
        <div className={styles.toggleContainer}>
          <div className={`${styles.toggle} bg-primary bg-gradient-to-r from-blue-400 to-primary dark:from-blue-700 dark:to-primary`}>
            <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
              <h1 className="font-bold text-2xl mb-4 text-white">Welcome Back!</h1>
              <p className="mb-8 text-white">Gimana, udah punya akun? :D</p>
              <button className={`border border-white rounded-lg px-8 py-2 text-white font-semibold hover:bg-white hover:text-primary transition-colors`} onClick={() => setFormMode('signIn')}>Masuk</button>
            </div>
            <div className={`${styles.togglePanel} ${styles.toggleRight}`}>
              <h1 className="font-bold text-2xl mb-4 text-white">Hello, Friend!</h1>
              <p className="mb-8 text-white">Daftar dulu kalau belum punya akun! :D</p>
              <button className={`border border-white rounded-lg px-8 py-2 text-white font-semibold hover:bg-white hover:text-primary transition-colors`} onClick={() => setFormMode('signUp')}>Daftar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
