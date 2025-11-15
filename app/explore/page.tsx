'use client';

import { useEffect, useState } from 'react';
import { searchPublicNotebooks, type Notebook } from '@/lib/notebooks';
import Link from 'next/link';

export default function ExplorePage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPublicNotebooks();
  }, []);

  async function loadPublicNotebooks() {
    try {
      const data = await searchPublicNotebooks();
      setNotebooks(data);
    } catch (error) {
      console.error('Error loading public notebooks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    setLoading(true);
    try {
      const data = await searchPublicNotebooks(searchQuery);
      setNotebooks(data);
    } catch (error) {
      console.error('Error searching notebooks:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading public notebooks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Explore Public Notebooks</h1>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search notebooks..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {notebooks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No public notebooks found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {notebook.title}
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  {notebook.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>
                    {new Date(notebook.updated_at!).toLocaleDateString()}
                  </span>
                </div>
                <Link
                  href={`/share/${notebook.share_token}`}
                  className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Notebook
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
