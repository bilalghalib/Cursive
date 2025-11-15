'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in to view your profile
          </h2>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">User ID</label>
              <p className="text-gray-600 text-sm font-mono">{user.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Account Created</label>
              <p className="text-gray-900">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/notebooks')}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              <div className="font-medium text-gray-900">My Notebooks</div>
              <div className="text-sm text-gray-600">View and manage your notebooks</div>
            </button>
            <button
              onClick={() => router.push('/explore')}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              <div className="font-medium text-gray-900">Explore</div>
              <div className="text-sm text-gray-600">Browse public notebooks</div>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition"
            >
              <div className="font-medium text-red-900">Sign Out</div>
              <div className="text-sm text-red-600">Sign out of your account</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
