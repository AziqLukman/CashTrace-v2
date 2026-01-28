'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Theme State
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Load user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setFormData(prev => ({
        ...prev,
        name: parsedUser.name || '',
        email: parsedUser.email || ''
      }));
      
      // Load theme per-user
      const userId = parsedUser.id || parsedUser._id;
      const savedTheme = localStorage.getItem(`theme_${userId}`);
      if (savedTheme) {
        setTheme(savedTheme);
      } else if (document.documentElement.classList.contains('dark')) {
        setTheme('dark');
      }
    }

    // Listen for theme changes from other components
    const handleThemeChange = (e: CustomEvent) => {
      setTheme(e.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange as EventListener);
    };
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      // Update profile (name only - email change not supported in backend)
      if (formData.name !== user?.name) {
        const res = await api.updateProfile({ name: formData.name });
        
        // Update local storage
        const updatedUser = { ...user, ...res.data?.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      // Change password if provided
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          alert('Harap masukkan password saat ini!');
          setLoading(false);
          return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
          alert('Password baru tidak cocok!');
          setLoading(false);
          return;
        }
        
        // Call the correct endpoint for password change
        await api.changePassword({
          oldPassword: formData.currentPassword,
          newPassword: formData.newPassword
        });
      }
      
      setSuccessMessage('Profil berhasil diperbarui!');
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error: any) {
      alert(error.message || 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = (newTheme: string) => {
    setTheme(newTheme);
    
    // Save theme per-user
    if (user) {
      const userId = user.id || user._id;
      localStorage.setItem(`theme_${userId}`, newTheme);
    }
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 w-full text-slate-900 dark:text-white">
      <div className="max-w-[800px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div>
           <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
             Pengaturan
           </h1>
           <p className="text-slate-500 dark:text-slate-400">
             Kelola akun dan preferensi aplikasi Anda.
           </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Profil Akun
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'preferences'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Tampilan
          </button>
        </div>

        {/* Content */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6 animate-in fade-in duration-300">
            {successMessage && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-semibold border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                {successMessage}
              </div>
            )}
            
            {/* Personal Info */}
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Informasi Pribadi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
                  />
                </label>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ganti Password</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">Kosongkan jika tidak ingin mengganti password.</p>
              
              <div className="flex flex-col gap-4">
                 <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password Saat Ini</span>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                    placeholder="Masukkan password lama untuk konfirmasi"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
                  />
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password Baru</span>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Konfirmasi Password</span>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:bg-blue-700 hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                   <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                   <span className="material-symbols-outlined text-[20px]">save</span>
                )}
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}

        {activeTab === 'preferences' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-6 transition-colors">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tampilan Aplikasi</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Pilih mode tampilan yang nyaman untuk mata Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => toggleTheme('light')}
                  className={`group relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    theme === 'light' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <span className="material-symbols-outlined">light_mode</span>
                  </div>
                  <div>
                    <p className={`font-bold ${theme === 'light' ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>Light Mode</p>
                    <p className="text-xs text-slate-500">Tampilan cerah standar</p>
                  </div>
                  {theme === 'light' && (
                    <div className="absolute top-4 right-4 text-primary">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => toggleTheme('dark')}
                  className={`group relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    theme === 'dark' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined">dark_mode</span>
                  </div>
                  <div>
                    <p className={`font-bold ${theme === 'dark' ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>Dark Mode</p>
                    <p className="text-xs text-slate-500">Tampilan gelap nyaman</p>
                  </div>
                  {theme === 'dark' && (
                    <div className="absolute top-4 right-4 text-primary">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
