'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDrawings, saveDrawings, createShareLink } from '@/lib/notebooks';
import { Canvas } from '@/components/Canvas';
import { Toolbar } from '@/components/Toolbar';

export default function NotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as string;

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const url = await createShareLink(notebookId);
      setShareUrl(url);
      navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/notebooks')}
            className="px-3 py-1 text-gray-600 hover:text-gray-900"
          >
            ← Back to Notebooks
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {sharing ? 'Creating link...' : 'Share'}
          </button>
        </div>
      </div>

      <Toolbar />

      <div className="flex-1 overflow-hidden">
        <Canvas notebookId={notebookId} />
      </div>

      {shareUrl && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md">
          <p className="text-sm text-green-800 mb-2">✓ Share link created and copied!</p>
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="w-full px-2 py-1 text-sm bg-white border border-green-300 rounded"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => setShareUrl(null)}
            className="mt-2 text-sm text-green-600 hover:text-green-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
