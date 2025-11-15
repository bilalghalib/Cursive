'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getNotebookByShareToken, getDrawings, type Notebook } from '@/lib/notebooks';
import { Canvas } from '@/components/Canvas';

export default function SharedNotebookPage() {
  const params = useParams();
  const shareToken = params.token as string;

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedNotebook();
  }, [shareToken]);

  async function loadSharedNotebook() {
    try {
      const data = await getNotebookByShareToken(shareToken);
      if (!data) {
        setError('Notebook not found or not shared');
      } else {
        setNotebook(data);
      }
    } catch (err) {
      console.error('Error loading shared notebook:', err);
      setError('Failed to load notebook');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading shared notebook...</div>
      </div>
    );
  }

  if (error || !notebook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Notebook not found'}
          </h2>
          <p className="text-gray-600">This notebook may be private or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">{notebook.title}</h1>
        {notebook.description && (
          <p className="text-sm text-gray-600 mt-1">{notebook.description}</p>
        )}
        <div className="mt-2 text-xs text-gray-500">
          Shared notebook - View only
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Canvas notebookId={notebook.id!} readOnly={true} />
      </div>
    </div>
  );
}
