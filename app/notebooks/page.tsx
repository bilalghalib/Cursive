'use client';

import { useEffect, useState } from 'react';
import { getAllNotebooks, createNotebook, deleteNotebook, type Notebook } from '@/lib/notebooks';
import Link from 'next/link';

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    loadNotebooks();
  }, []);

  async function loadNotebooks() {
    try {
      const data = await getAllNotebooks();
      setNotebooks(data);
    } catch (error) {
      console.error('Error loading notebooks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;

    try {
      await createNotebook({
        title: newTitle,
        description: '',
        is_public: false
      });
      setNewTitle('');
      setCreating(false);
      await loadNotebooks();
    } catch (error) {
      console.error('Error creating notebook:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this notebook?')) return;

    try {
      await deleteNotebook(id);
      await loadNotebooks();
    } catch (error) {
      console.error('Error deleting notebook:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading notebooks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Notebooks</h1>
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            New Notebook
          </button>
        </div>

        {creating && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Notebook title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewTitle('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {notebooks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No notebooks yet</p>
            <button
              onClick={() => setCreating(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Notebook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <Link href={`/notebook/${notebook.id}`}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {notebook.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4">
                    {notebook.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {new Date(notebook.updated_at!).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded ${notebook.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {notebook.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </Link>
                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                  <Link
                    href={`/notebook/${notebook.id}`}
                    className="flex-1 text-center px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => handleDelete(notebook.id!)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
