'use client';

import { useState, useEffect } from 'react';
import { User, LogOut, Settings } from 'lucide-react';
import { getCurrentUser, signOut } from '@/lib/auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserMenuProps {
  onLoginClick: () => void;
}

export function UserMenu({ onLoginClick }: UserMenuProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { user } = await getCurrentUser();
    setUser(user);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative">
      {/* User avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
          {user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-300">
          {user.email}
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Free Plan
              </p>
            </div>

            <div className="p-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // TODO: Open settings modal
                  alert('Settings coming soon!');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <Settings size={16} />
                Settings
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
