'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load theme on mount and listen for changes from other components
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const userId = parsedUser.id || parsedUser._id;
        const savedTheme = localStorage.getItem(`theme_${userId}`) as 'light' | 'dark' | null;
        if (savedTheme) {
          setTheme(savedTheme);
          if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch (e) {
        // Fallback to light
      }
    }

    // Listen for theme changes from other components (e.g., Settings page)
    const handleThemeChange = (e: CustomEvent) => {
      setTheme(e.detail as 'light' | 'dark');
    };
    
    window.addEventListener('themeChanged', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange as EventListener);
    };
  }, []);

  const toggleTheme = () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    
    try {
      const parsedUser = JSON.parse(storedUser);
      const userId = parsedUser.id || parsedUser._id;
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem(`theme_${userId}`, newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Dispatch custom event to notify other components (e.g., Settings page)
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
    } catch (e) {
      // Fallback
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 w-full bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold text-lg">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span>CashTrace</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme Toggle Mobile */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
          >
            <span className="material-symbols-outlined text-xl">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
          <button 
            onClick={toggleSidebar}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">
              {isOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 
        transition-transform duration-300 ease-in-out z-50 flex flex-col justify-between
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        pt-16 lg:pt-0
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="flex flex-col gap-8">
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
                  CashTrace
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Financial Manager
                </p>
              </div>
            </div>
            
            <nav className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                onClick={closeSidebar}
                className={`group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive('/dashboard') ? 'fill-1' : ''}`}>dashboard</span>
                <span className="text-sm font-semibold">Dashboard</span>
              </Link>

              <Link
                href="/transaksi"
                onClick={closeSidebar}
                className={`group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive('/transaksi')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive('/transaksi') ? 'fill-1' : ''}`}>receipt_long</span>
                <span className="text-sm font-medium">Transaksi</span>
              </Link>

              <Link
                href="/laporan"
                onClick={closeSidebar}
                className={`group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive('/laporan')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive('/laporan') ? 'fill-1' : ''}`}>pie_chart</span>
                <span className="text-sm font-medium">Laporan</span>
              </Link>

              <Link
                href="/settings"
                onClick={closeSidebar}
                className={`group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive('/settings')
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive('/settings') ? 'fill-1' : ''}`}>settings</span>
                <span className="text-sm font-medium">Settings</span>
              </Link>
            </nav>
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-6 dark:border-slate-700">
            {/* Theme Toggle Desktop */}
            <button
              onClick={toggleTheme}
              className="group flex items-center gap-3 rounded-lg px-4 py-3 text-slate-600 transition-all hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <div className="relative w-6 h-6 overflow-hidden">
                <span 
                  className={`material-symbols-outlined absolute inset-0 transition-all duration-300 ${
                    theme === 'light' 
                      ? 'translate-y-0 opacity-100 text-amber-500' 
                      : '-translate-y-full opacity-0'
                  }`}
                >
                  light_mode
                </span>
                <span 
                  className={`material-symbols-outlined absolute inset-0 transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'translate-y-0 opacity-100 text-indigo-400' 
                      : 'translate-y-full opacity-0'
                  }`}
                >
                  dark_mode
                </span>
              </div>
              <span className="text-sm font-medium">
                {theme === 'light' ? 'Mode Terang' : 'Mode Gelap'}
              </span>
              <div className={`ml-auto w-10 h-5 rounded-full relative transition-colors duration-300 ${
                theme === 'dark' ? 'bg-indigo-500' : 'bg-amber-400'
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                  theme === 'dark' ? 'left-5' : 'left-0.5'
                }`} />
              </div>
            </button>

            <button
              onClick={() => {
                // Reset theme to light before logout
                document.documentElement.classList.remove('dark');
                // Clear user data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                closeSidebar();
                router.push('/login');
              }}
              className="w-full group flex items-center gap-3 rounded-lg px-4 py-3 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

